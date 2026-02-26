import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.services.storage import list_workflows, load_workflow, delete_workflow, rename_workflow, save_workflow

router = APIRouter(prefix="/api/projects")


class RenameRequest(BaseModel):
    title: str


class ImportRequest(BaseModel):
    workflow_json: dict
    title: Optional[str] = None


class SaveProjectRequest(BaseModel):
    workflow_id: str
    user_input: str = ""
    result: dict = {}
    status: str = "manual"


@router.post("/save")
async def save_project(req: SaveProjectRequest):
    """Save or update a project (used by manual workflows and auto-save)."""
    save_workflow(req.workflow_id, req.user_input, req.result, status=req.status)
    return {"status": "saved", "workflow_id": req.workflow_id}


@router.get("")
async def get_projects():
    """List all saved projects (metadata only)."""
    return list_workflows()


@router.get("/{workflow_id}")
async def get_project(workflow_id: str):
    """Load a full project by workflow ID."""
    data = load_workflow(workflow_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return data


@router.patch("/{workflow_id}/rename")
async def rename_project(workflow_id: str, req: RenameRequest):
    """Rename a project's campaign title."""
    if not rename_workflow(workflow_id, req.title):
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "renamed", "title": req.title}


@router.delete("/{workflow_id}")
async def remove_project(workflow_id: str):
    """Delete a project."""
    if not delete_workflow(workflow_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "deleted"}


@router.post("/import")
async def import_project(req: ImportRequest):
    """Import a full workflow JSON. Assigns a new workflow_id and saves."""
    new_id = f"imported-{uuid.uuid4().hex[:8]}"
    data = req.workflow_json

    # Extract result — could be the full saved format or just the result dict
    if "result" in data:
        result = data["result"]
        user_input = data.get("user_input", "")
    else:
        result = data
        user_input = ""

    # Override title if provided
    if req.title:
        brief = result.get("creative_brief", {}) or {}
        brief["campaign_title"] = req.title
        result["creative_brief"] = brief

    save_workflow(new_id, user_input, result, status="imported")
    return {"workflow_id": new_id, "status": "imported"}
