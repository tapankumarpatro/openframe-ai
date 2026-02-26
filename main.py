import json
import os
from dotenv import load_dotenv
from rich.console import Console
from rich.traceback import install as install_rich_traceback
from rich.panel import Panel
from rich.table import Table
from rich import print as rprint

# Enable Rich tracebacks globally — colorized, with local variables
install_rich_traceback(show_locals=True, width=120)

load_dotenv()

console = Console()

from src.graph import app


def save_graph_visualization():
    """Generate a PNG diagram of the agent workflow."""
    try:
        img_bytes = app.get_graph().draw_mermaid_png()
        with open("openframe_workflow_graph.png", "wb") as f:
            f.write(img_bytes)
        console.print("[green]✓ Graph visualization saved as openframe_workflow_graph.png[/green]")
    except Exception as e:
        console.print(f"[yellow]⚠ Could not generate graph visualization: {e}[/yellow]")


def run_pipeline(user_input: str) -> dict:
    """Run the full OpenFrame production pipeline."""
    console.print(Panel.fit(
        f"[bold white]Input:[/bold white] {user_input}",
        title="[bold magenta]OPENFRAME PRODUCTION LINE[/bold magenta]",
        subtitle="[dim]Fashion Luxury Ad Framework[/dim]",
        border_style="magenta",
    ))
    console.print()

    initial_state = {
        "user_input": user_input,
        "creative_brief": None,
        "visual_identity": None,
        "product_specs": None,
        "casting_brief": None,
        "camera_specs": None,
        "shot_list": None,
        "audio_specs": None,
    }

    final_state = app.invoke(initial_state)

    return final_state


def save_output(state: dict, filename: str = "output/final_output.json"):
    """Serialize the final state to JSON."""
    output = {}

    if state.get("creative_brief"):
        output["creative_brief"] = state["creative_brief"].model_dump()
    if state.get("visual_identity"):
        output["visual_identity"] = state["visual_identity"].model_dump()
    if state.get("product_specs"):
        output["product_specs"] = state["product_specs"].model_dump()
    if state.get("casting_brief"):
        output["casting_brief"] = state["casting_brief"].model_dump()
    if state.get("camera_specs"):
        output["camera_specs"] = state["camera_specs"].model_dump()
    if state.get("shot_list"):
        output["shot_list"] = state["shot_list"].model_dump()
    if state.get("audio_specs"):
        output["audio_specs"] = state["audio_specs"].model_dump()

    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    console.print(f"\n[green]✓ Final output saved to {filename}[/green]")


def print_summary(state: dict):
    """Pretty-print a summary of the final state."""
    console.print()

    if state.get("creative_brief"):
        brief = state["creative_brief"]
        console.print(Panel(
            f"[bold]{brief.campaign_title}[/bold]\n"
            f"[italic]{brief.concept_summary}[/italic]\n\n"
            f"[dim]Mood:[/dim] {', '.join(brief.mood_keywords)}\n"
            f"[dim]Tagline:[/dim] [bold cyan]{brief.tagline}[/bold cyan]",
            title="[bold yellow]Creative Brief[/bold yellow]",
            border_style="yellow",
        ))

    if state.get("visual_identity"):
        vi = state["visual_identity"]
        console.print(Panel(
            f"[dim]Palette:[/dim] {', '.join(vi.color_palette)}\n"
            f"[dim]Textures:[/dim] {vi.textures_materials}\n"
            f"[dim]Composition:[/dim] {vi.composition_style}",
            title="[bold blue]Visual Identity[/bold blue]",
            border_style="blue",
        ))

    if state.get("product_specs"):
        ps = state["product_specs"]
        console.print(Panel(
            f"{ps.visual_product_description}",
            title="[bold green]Product Specs[/bold green]",
            border_style="green",
        ))

    if state.get("casting_brief"):
        cb = state["casting_brief"]
        drivers_text = "\n".join(
            f"  • {m.name} ({m.driver_type}): {m.visual_prompt[:80]}..."
            for m in cb.cast_members
        )
        console.print(Panel(
            f"[dim]Key Drivers ({len(cb.cast_members)}):[/dim]\n{drivers_text}\n\n"
            f"[dim]Setting A:[/dim] {cb.setting_a_description}\n\n"
            f"[dim]Setting B:[/dim] {cb.setting_b_description}",
            title="[bold red]Casting & Locations[/bold red]",
            border_style="red",
        ))

    if state.get("camera_specs"):
        cs = state["camera_specs"]
        console.print(Panel(
            f"[dim]Lighting:[/dim] {cs.lighting}\n"
            f"[dim]Tech Block:[/dim] {cs.technical_prompt_block}",
            title="[bold cyan]Camera Specs[/bold cyan]",
            border_style="cyan",
        ))

    if state.get("shot_list"):
        sl = state["shot_list"]
        table = Table(title="Shot List", border_style="magenta", show_lines=True)
        table.add_column("#", style="bold", width=4)
        table.add_column("Shot", style="cyan", width=12)
        table.add_column("Action", width=30)
        table.add_column("Image Prompt", style="dim", width=60)
        for scene in sl.scenes:
            table.add_row(
                str(scene.scene_number),
                scene.shot_type,
                scene.action_movement,
                scene.start_image_prompt[:80] + "...",
            )
        console.print(table)

    if state.get("audio_specs"):
        audio = state["audio_specs"]
        console.print(Panel(
            f"[bold italic]{audio.voiceover_script}[/bold italic]\n\n"
            f"[dim]Music Prompt:[/dim] {audio.music_prompt_technical}",
            title="[bold white]Audio[/bold white]",
            border_style="white",
        ))


if __name__ == "__main__":
    # Generate graph visualization
    save_graph_visualization()

    # Run the pipeline
    test_input = "A futuristic bamboo wristwatch"
    final_state = run_pipeline(test_input)

    # Print summary and save
    print_summary(final_state)
    save_output(final_state)
