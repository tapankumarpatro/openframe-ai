import uuid
import re
import threading
import queue
import json
import traceback
from typing import Optional
from rich.console import Console
from dotenv import load_dotenv

load_dotenv()

console = Console()

# In-memory store for workflow runs
_workflows: dict[str, dict] = {}
_event_queues: dict[str, list[queue.Queue]] = {}
_lock = threading.Lock()

AGENT_ORDER = [
    "creative_director",
    "brand_stylist",
    "product_stylist",
    "casting_scout",
    "cinematographer",
    "director",
    "sound_designer",
]


def _serialize_state(state: dict) -> dict:
    """Convert Pydantic objects in state to dicts for JSON serialization."""
    result = {}
    for key, value in state.items():
        if value is None or isinstance(value, str):
            result[key] = value
        elif hasattr(value, "model_dump"):
            result[key] = value.model_dump()
        else:
            result[key] = value
    return result


def _emit_event(workflow_id: str, event: dict):
    """Send event to all SSE listeners for this workflow."""
    with _lock:
        listeners = _event_queues.get(workflow_id, [])
        for q in listeners:
            q.put(event)


def _run_workflow(workflow_id: str, user_input: str, ad_type: str | None = None, product_image: str | None = None, agent_models: dict | None = None):
    """Execute the LangGraph pipeline in a background thread, emitting SSE events."""
    from src.graph import app

    try:
        initial_state = {
            "user_input": user_input,
            "ad_type": ad_type,
            "product_image": product_image,
            "agent_models": agent_models,
            "creative_brief": None,
            "creative_critique": None,
            "visual_identity": None,
            "product_specs": None,
            "casting_brief": None,
            "camera_specs": None,
            "shot_list": None,
            "audio_specs": None,
        }

        # Use stream to get per-node updates
        prev_keys = set(k for k, v in initial_state.items() if v is not None)
        prev_keys.add("user_input")

        # Map state keys to agent names (creative_brief handled separately via reflect cycle)
        key_to_agent = {
            "visual_identity": "brand_stylist",
            "product_specs": "product_stylist",
            "casting_brief": "casting_scout",
            "camera_specs": "cinematographer",
            "shot_list": "director",
            "audio_specs": "sound_designer",
        }

        # Track which parallel agents have completed for fan-in detection
        parallel_done = set()
        PARALLEL_AGENTS = {"product_stylist", "casting_scout", "cinematographer"}

        # Reflect cycle flag: set True after creative_critique appears,
        # the next chunk is from creative_revise (overwrites creative_brief).
        revise_pending = False

        # Emit "running" for first agent
        _emit_event(workflow_id, {
            "agent": "creative_director",
            "status": "running",
        })

        for chunk in app.stream(initial_state, stream_mode="values"):
            # Detect which new keys appeared
            new_keys = set(k for k, v in chunk.items() if v is not None) - prev_keys

            # --- Reflect cycle handling ---
            if revise_pending:
                # creative_revise just completed (creative_brief overwritten, no new keys)
                revise_pending = False
                value = chunk["creative_brief"]
                data = value.model_dump() if hasattr(value, "model_dump") else value
                _emit_event(workflow_id, {
                    "agent": "creative_director",
                    "status": "done",
                    "data": data,
                })
                _emit_event(workflow_id, {
                    "agent": "brand_stylist",
                    "status": "running",
                })
                prev_keys = set(k for k, v in chunk.items() if v is not None)
                prev_keys.add("user_input")
                with _lock:
                    _workflows[workflow_id]["state"] = chunk
                continue

            if "creative_brief" in new_keys:
                # Draft produced — don't emit "done" yet, reflect cycle starts
                new_keys.discard("creative_brief")

            if "creative_critique" in new_keys:
                # Critique done — next chunk will be the revise step
                revise_pending = True
                new_keys.discard("creative_critique")

            # --- Normal agent handling ---
            for key in new_keys:
                agent_name = key_to_agent.get(key)
                if agent_name:
                    # This agent just completed
                    value = chunk[key]
                    data = value.model_dump() if hasattr(value, "model_dump") else value
                    _emit_event(workflow_id, {
                        "agent": agent_name,
                        "status": "done",
                        "data": data,
                    })

                    # Determine next agent(s) to mark as "running"
                    if agent_name == "brand_stylist":
                        # Fan-out: mark 3 parallel agents running
                        for next_agent in ["product_stylist", "casting_scout", "cinematographer"]:
                            _emit_event(workflow_id, {
                                "agent": next_agent,
                                "status": "running",
                            })
                    elif agent_name in PARALLEL_AGENTS:
                        # Fan-in: track completion, mark director running when all 3 done
                        parallel_done.add(agent_name)
                        if parallel_done >= PARALLEL_AGENTS:
                            _emit_event(workflow_id, {
                                "agent": "director",
                                "status": "running",
                            })
                    elif agent_name == "director":
                        _emit_event(workflow_id, {
                            "agent": "sound_designer",
                            "status": "running",
                        })

            prev_keys = set(k for k, v in chunk.items() if v is not None)
            prev_keys.add("user_input")

            # Store latest state
            with _lock:
                _workflows[workflow_id]["state"] = chunk

        # Final state
        with _lock:
            _workflows[workflow_id]["status"] = "completed"
            final = _workflows[workflow_id].get("state", {})
            _workflows[workflow_id]["result"] = _serialize_state(final)

        # Persist to disk
        from api.services.storage import save_workflow
        try:
            save_workflow(workflow_id, user_input, _workflows[workflow_id]["result"])
            console.print(f"[green]Workflow {workflow_id} saved to disk[/green]")
        except Exception as e:
            console.print(f"[yellow]Failed to save workflow {workflow_id}: {e}[/yellow]")

        _emit_event(workflow_id, {
            "agent": "__workflow__",
            "status": "completed",
        })

    except Exception as e:
        console.print(f"[red]Workflow {workflow_id} error: {e}[/red]")
        traceback.print_exc()
        with _lock:
            _workflows[workflow_id]["status"] = "error"
            _workflows[workflow_id]["error"] = str(e)

        # Persist partial results so the project still shows in the list
        from api.services.storage import save_workflow
        try:
            with _lock:
                partial = _workflows[workflow_id].get("state")
            partial_result = _serialize_state(partial) if partial else {}
            save_workflow(workflow_id, user_input, partial_result, status="error")
            console.print(f"[yellow]Workflow {workflow_id} error state saved to disk[/yellow]")
        except Exception as save_err:
            console.print(f"[yellow]Failed to save error state for {workflow_id}: {save_err}[/yellow]")

        _emit_event(workflow_id, {
            "agent": "__workflow__",
            "status": "error",
            "error": str(e),
        })
    finally:
        # Send terminal event so SSE clients know to close
        _emit_event(workflow_id, {"agent": "__done__", "status": "done"})


def _resume_workflow(workflow_id: str, user_input: str, ad_type: str | None, product_image: str | None,
                     existing_outputs: dict, agent_models: dict | None = None):
    """Resume a pipeline from where it failed, skipping already-completed agents."""
    import importlib
    from src.models.schemas import (
        CreativeBrief, CreativeCritique, VisualIdentity, ProductSpecs,
        CastingBrief, CameraSpecs, ShotList, AudioSpecs,
    )
    from concurrent.futures import ThreadPoolExecutor, as_completed

    schema_map = {
        "creative_brief": CreativeBrief,
        "creative_critique": CreativeCritique,
        "visual_identity": VisualIdentity,
        "product_specs": ProductSpecs,
        "casting_brief": CastingBrief,
        "camera_specs": CameraSpecs,
        "shot_list": ShotList,
        "audio_specs": AudioSpecs,
    }

    agent_to_key = {
        "creative_director": "creative_brief",
        "brand_stylist": "visual_identity",
        "product_stylist": "product_specs",
        "casting_scout": "casting_brief",
        "cinematographer": "camera_specs",
        "director": "shot_list",
        "sound_designer": "audio_specs",
    }

    agent_funcs = {
        "creative_director": ("src.agents.agent_1_creative", "agent_1_creative"),
        "creative_critic": ("src.agents.agent_1_1_critique", "agent_1_1_critique"),
        "creative_revise": ("src.agents.agent_1_creative", "agent_1_creative_revise"),
        "brand_stylist": ("src.agents.agent_2_brand", "agent_2_brand"),
        "product_stylist": ("src.agents.agent_3_product", "agent_3_product"),
        "casting_scout": ("src.agents.agent_4_casting", "agent_4_casting"),
        "cinematographer": ("src.agents.agent_5_cine", "agent_5_cine"),
        "director": ("src.agents.agent_6_director", "agent_6_director"),
        "sound_designer": ("src.agents.agent_7_sound", "agent_7_sound"),
    }

    # Pipeline execution order (groups run sequentially; items within a group run in parallel)
    pipeline_stages = [
        ["creative_director"],       # + critic + revise (handled specially)
        ["brand_stylist"],
        ["product_stylist", "casting_scout", "cinematographer"],  # fan-out parallel
        ["director"],                # fan-in
        ["sound_designer"],
    ]

    def _reconstruct(key):
        raw = existing_outputs.get(key)
        if raw and isinstance(raw, dict):
            cls = schema_map.get(key)
            if cls:
                try:
                    return cls(**raw)
                except Exception:
                    return None
        return None

    def _run_agent(name, state):
        mod_path, fn_name = agent_funcs[name]
        mod = importlib.import_module(mod_path)
        fn = getattr(mod, fn_name)
        return fn(state)

    def _serialize_val(v):
        if hasattr(v, "model_dump"):
            return v.model_dump()
        return v

    try:
        # Rebuild state from existing outputs
        state = {
            "user_input": user_input,
            "ad_type": ad_type,
            "product_image": product_image,
            "agent_models": agent_models,
            "creative_brief": _reconstruct("creative_brief"),
            "creative_critique": _reconstruct("creative_critique"),
            "visual_identity": _reconstruct("visual_identity"),
            "product_specs": _reconstruct("product_specs"),
            "casting_brief": _reconstruct("casting_brief"),
            "camera_specs": _reconstruct("camera_specs"),
            "shot_list": _reconstruct("shot_list"),
            "audio_specs": _reconstruct("audio_specs"),
        }

        # Determine which stages are already complete
        for stage in pipeline_stages:
            all_done = all(state.get(agent_to_key.get(a)) is not None for a in stage)
            if all_done:
                # Mark these agents as done (emit events so UI updates)
                for a in stage:
                    key = agent_to_key[a]
                    _emit_event(workflow_id, {
                        "agent": a,
                        "status": "done",
                        "data": _serialize_val(state[key]),
                    })
                console.print(f"[dim]  ↪ Skipping completed stage: {stage}[/dim]")
                continue

            # This stage needs to run
            console.print(f"[cyan]  ▸ Resuming stage: {stage}[/cyan]")

            if stage == ["creative_director"]:
                # Special: run creative_director → critic → revise cycle
                _emit_event(workflow_id, {"agent": "creative_director", "status": "running"})
                result = _run_agent("creative_director", state)
                state.update(result)
                # Critic
                result = _run_agent("creative_critic", state)
                state.update(result)
                # Revise
                result = _run_agent("creative_revise", state)
                state.update(result)
                data = _serialize_val(state["creative_brief"])
                _emit_event(workflow_id, {"agent": "creative_director", "status": "done", "data": data})

            elif len(stage) == 1:
                # Single agent stage
                agent_name = stage[0]
                _emit_event(workflow_id, {"agent": agent_name, "status": "running"})
                result = _run_agent(agent_name, state)
                state.update(result)
                key = agent_to_key[agent_name]
                data = _serialize_val(state[key])
                _emit_event(workflow_id, {"agent": agent_name, "status": "done", "data": data})

            else:
                # Parallel fan-out stage — run agents that aren't already done
                agents_to_run = [a for a in stage if state.get(agent_to_key.get(a)) is None]
                agents_already_done = [a for a in stage if a not in agents_to_run]

                # Emit done for already-completed ones
                for a in agents_already_done:
                    key = agent_to_key[a]
                    _emit_event(workflow_id, {"agent": a, "status": "done", "data": _serialize_val(state[key])})

                # Emit running for ones we need to execute
                for a in agents_to_run:
                    _emit_event(workflow_id, {"agent": a, "status": "running"})

                # Run in parallel
                with ThreadPoolExecutor(max_workers=len(agents_to_run)) as pool:
                    futures = {pool.submit(_run_agent, a, dict(state)): a for a in agents_to_run}
                    for future in as_completed(futures):
                        a = futures[future]
                        result = future.result()
                        state.update(result)
                        key = agent_to_key[a]
                        data = _serialize_val(state[key])
                        _emit_event(workflow_id, {"agent": a, "status": "done", "data": data})

            # Store latest state
            with _lock:
                _workflows[workflow_id]["state"] = state

        # All done
        with _lock:
            _workflows[workflow_id]["status"] = "completed"
            _workflows[workflow_id]["result"] = _serialize_state(state)

        from api.services.storage import save_workflow
        try:
            save_workflow(workflow_id, user_input, _workflows[workflow_id]["result"])
            console.print(f"[green]Workflow {workflow_id} (resumed) saved to disk[/green]")
        except Exception as e:
            console.print(f"[yellow]Failed to save workflow {workflow_id}: {e}[/yellow]")

        _emit_event(workflow_id, {"agent": "__workflow__", "status": "completed"})

    except Exception as e:
        console.print(f"[red]Resume workflow {workflow_id} error: {e}[/red]")
        traceback.print_exc()
        with _lock:
            _workflows[workflow_id]["status"] = "error"
            _workflows[workflow_id]["error"] = str(e)

        from api.services.storage import save_workflow
        try:
            with _lock:
                partial = _workflows[workflow_id].get("state")
            partial_result = _serialize_state(partial) if partial else {}
            save_workflow(workflow_id, user_input, partial_result, status="error")
        except Exception:
            pass

        _emit_event(workflow_id, {"agent": "__workflow__", "status": "error", "error": str(e)})
    finally:
        _emit_event(workflow_id, {"agent": "__done__", "status": "done"})


def resume_workflow(workflow_id: str, user_input: str, ad_type: str | None = None,
                    product_image: str | None = None, existing_outputs: dict | None = None,
                    agent_models: dict | None = None) -> str:
    """Resume a workflow from where it failed. Returns the same workflow_id."""
    with _lock:
        _workflows[workflow_id] = {
            "status": "running",
            "user_input": user_input,
            "ad_type": ad_type,
            "state": None,
            "result": None,
            "error": None,
        }
        _event_queues[workflow_id] = []

    from api.services.storage import save_workflow as _save
    try:
        _save(workflow_id, user_input, existing_outputs or {}, status="running")
    except Exception as e:
        console.print(f"[yellow]Failed to pre-save resumed workflow {workflow_id}: {e}[/yellow]")

    thread = threading.Thread(
        target=_resume_workflow,
        args=(workflow_id, user_input, ad_type, product_image, existing_outputs or {}, agent_models),
        daemon=True,
    )
    thread.start()

    return workflow_id


def _slugify(text: str, max_words: int = 5) -> str:
    """Convert user input to a URL-safe slug (lowercase, hyphenated, max N words)."""
    slug = re.sub(r"[^a-z0-9\s]", "", text.lower().strip())
    words = slug.split()[:max_words]
    return "-".join(words) if words else "project"


def start_workflow(user_input: str, ad_type: str | None = None, product_image: str | None = None, agent_models: dict | None = None) -> str:
    """Start a new workflow run. Returns workflow_id."""
    slug = _slugify(user_input)
    short_id = str(uuid.uuid4())[:6]
    workflow_id = f"{slug}-{short_id}"

    with _lock:
        _workflows[workflow_id] = {
            "status": "running",
            "user_input": user_input,
            "ad_type": ad_type,
            "state": None,
            "result": None,
            "error": None,
        }
        _event_queues[workflow_id] = []

    # Persist immediately so the project appears in the list right away
    from api.services.storage import save_workflow as _save
    try:
        _save(workflow_id, user_input, {}, status="running")
    except Exception as e:
        console.print(f"[yellow]Failed to pre-save workflow {workflow_id}: {e}[/yellow]")

    thread = threading.Thread(
        target=_run_workflow,
        args=(workflow_id, user_input, ad_type, product_image, agent_models),
        daemon=True,
    )
    thread.start()

    return workflow_id


def subscribe(workflow_id: str) -> Optional[queue.Queue]:
    """Subscribe to SSE events for a workflow. Returns a Queue or None if not found."""
    with _lock:
        if workflow_id not in _workflows:
            return None
        q = queue.Queue()
        _event_queues.setdefault(workflow_id, []).append(q)
        return q


def unsubscribe(workflow_id: str, q: queue.Queue):
    """Remove a listener queue."""
    with _lock:
        listeners = _event_queues.get(workflow_id, [])
        if q in listeners:
            listeners.remove(q)


def get_workflow(workflow_id: str) -> Optional[dict]:
    """Get workflow status and result."""
    with _lock:
        wf = _workflows.get(workflow_id)
        if not wf:
            return None
        return {
            "workflow_id": workflow_id,
            "status": wf["status"],
            "result": wf.get("result"),
            "error": wf.get("error"),
        }
