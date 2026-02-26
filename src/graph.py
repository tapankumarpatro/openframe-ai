from langgraph.graph import StateGraph, END
from src.state import OpenFrameState
from src.agents import (
    agent_1_creative,
    agent_1_1_critique,
    agent_1_creative_revise,
    agent_2_brand,
    agent_3_product,
    agent_4_casting,
    agent_5_cine,
    agent_6_director,
    agent_7_sound,
)

# 1. Initialize the Graph
workflow = StateGraph(OpenFrameState)

# 2. Add Nodes (Register your Agent Functions)
workflow.add_node("creative_director", agent_1_creative)
workflow.add_node("creative_critic", agent_1_1_critique)
workflow.add_node("creative_revise", agent_1_creative_revise)
workflow.add_node("brand_stylist", agent_2_brand)
workflow.add_node("product_stylist", agent_3_product)
workflow.add_node("casting_scout", agent_4_casting)
workflow.add_node("cinematographer", agent_5_cine)
workflow.add_node("director", agent_6_director)
workflow.add_node("sound_designer", agent_7_sound)

# 3. Define the Edges (The Logic Flow)

# Step 1: Start -> Creative Director -> Critique -> Revise (reflect once)
workflow.set_entry_point("creative_director")
workflow.add_edge("creative_director", "creative_critic")
workflow.add_edge("creative_critic", "creative_revise")

# Step 2: Revised Creative -> Brand Stylist
workflow.add_edge("creative_revise", "brand_stylist")

# Step 3: FAN-OUT (Brand Stylist triggers 3 agents in parallel)
workflow.add_edge("brand_stylist", "product_stylist")
workflow.add_edge("brand_stylist", "casting_scout")
workflow.add_edge("brand_stylist", "cinematographer")

# Step 4: FAN-IN (All 3 agents must finish before Director starts)
workflow.add_edge("product_stylist", "director")
workflow.add_edge("casting_scout", "director")
workflow.add_edge("cinematographer", "director")

# Step 5: Director -> Sound -> End
workflow.add_edge("director", "sound_designer")
workflow.add_edge("sound_designer", END)

# 4. Compile the Application
app = workflow.compile()
