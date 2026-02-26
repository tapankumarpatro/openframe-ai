"""Persistent storage for completed workflows using JSON files."""
import json
import os
import shutil
from datetime import datetime, timezone
from typing import Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "workflows")
EXAMPLES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "examples", "workflows")
os.makedirs(DATA_DIR, exist_ok=True)


def _seed_examples():
    """Copy example workflows into data/workflows/ on first run (if empty)."""
    if not os.path.isdir(EXAMPLES_DIR):
        return
    existing = [f for f in os.listdir(DATA_DIR) if f.endswith(".json")]
    if existing:
        return  # Already has workflows, skip seeding
    for fname in os.listdir(EXAMPLES_DIR):
        if not fname.endswith(".json"):
            continue
        src = os.path.join(EXAMPLES_DIR, fname)
        dst = os.path.join(DATA_DIR, fname)
        shutil.copy2(src, dst)


_seed_examples()


def save_workflow(workflow_id: str, user_input: str, result: dict, status: str = "completed"):
    """Save a completed workflow to disk."""
    payload = {
        "workflow_id": workflow_id,
        "user_input": user_input,
        "status": status,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "result": result,
    }
    path = os.path.join(DATA_DIR, f"{workflow_id}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)


def list_workflows() -> list[dict]:
    """List all saved workflows (metadata only, no full result)."""
    projects = []
    for fname in os.listdir(DATA_DIR):
        if not fname.endswith(".json"):
            continue
        path = os.path.join(DATA_DIR, fname)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            # Extract summary metadata
            result = data.get("result", {}) or {}
            brief = result.get("creative_brief", {}) or {}
            shot_list = result.get("shot_list", {}) or {}
            casting = result.get("casting_brief", {}) or {}
            projects.append({
                "workflow_id": data["workflow_id"],
                "user_input": data.get("user_input", ""),
                "status": data.get("status", "unknown"),
                "created_at": data.get("created_at", ""),
                "campaign_title": brief.get("campaign_title", ""),
                "tagline": brief.get("tagline", ""),
                "scene_count": len(shot_list.get("scenes", [])),
                "cast_count": len(casting.get("cast_members", [])),
            })
        except Exception:
            continue

    # Sort by created_at descending (newest first)
    projects.sort(key=lambda p: p.get("created_at", ""), reverse=True)
    return projects


def load_workflow(workflow_id: str) -> Optional[dict]:
    """Load a full workflow from disk."""
    path = os.path.join(DATA_DIR, f"{workflow_id}.json")
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def rename_workflow(workflow_id: str, new_title: str) -> bool:
    """Rename a workflow's campaign title."""
    path = os.path.join(DATA_DIR, f"{workflow_id}.json")
    if not os.path.exists(path):
        return False
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    result = data.get("result", {}) or {}
    brief = result.get("creative_brief", {}) or {}
    brief["campaign_title"] = new_title
    result["creative_brief"] = brief
    data["result"] = result
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return True


def delete_workflow(workflow_id: str) -> bool:
    """Delete a workflow file."""
    path = os.path.join(DATA_DIR, f"{workflow_id}.json")
    if os.path.exists(path):
        os.remove(path)
        return True
    return False
