"use client";

import { useMemo } from "react";
import { RotateCcw, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore, LLM_MODELS, PROVIDER_ORDER, type AgentModelSetting, type LLMModel } from "@/lib/store";
import { AGENTS as AGENT_CHARACTERS, AgentAvatar } from "@/components/agents/ConsultTeamModal";

export default function AgentModelSettingsTab() {
  const agentModelSettings = useStore((s) => s.agentModelSettings);
  const setAgentModelSetting = useStore((s) => s.setAgentModelSetting);
  const resetAgentModelSettings = useStore((s) => s.resetAgentModelSettings);

  // Group models by provider in defined order
  const groupedModels = useMemo(() => {
    const groups: { provider: string; models: LLMModel[] }[] = [];
    for (const provider of PROVIDER_ORDER) {
      const models = LLM_MODELS.filter((m) => m.provider === provider);
      if (models.length > 0) groups.push({ provider, models });
    }
    return groups;
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-1">
        <Cpu className="w-4 h-4 text-accent-primary" />
        <h3 className="text-[15px] font-semibold text-foreground">Agent Models</h3>
      </div>
      <p className="text-[12px] text-muted mb-4 leading-relaxed">
        Configure the LLM model and creativity level for each agent.
      </p>

      {/* Agent grid — square cards */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        <div className="grid grid-cols-2 gap-3">
          {AGENT_CHARACTERS.map((char) => {
            const setting: AgentModelSetting = agentModelSettings[char.agentName] || {
              model: LLM_MODELS[0].id,
              temperature: 0.7,
            };
            const modelMeta = LLM_MODELS.find((m) => m.id === setting.model);

            return (
              <div
                key={char.agentName}
                className="relative flex flex-col rounded-xl border border-border bg-card hover:border-border-bright hover:shadow-sm transition-all overflow-hidden"
              >
                {/* Price tag — top right */}
                {modelMeta && (
                  <span className="absolute top-2 right-2 text-[8px] font-medium text-muted bg-card-hover/80 backdrop-blur-sm rounded-md px-1.5 py-0.5 z-10">
                    {modelMeta.tier === "free" ? "FREE" : `$${modelMeta.inputCost}/$${modelMeta.outputCost}`}
                  </span>
                )}

                {/* Avatar + name */}
                <div className="flex flex-col items-center pt-3 pb-2 px-3">
                  <div
                    className="w-14 h-14 rounded-xl overflow-hidden mb-1.5"
                    style={{ background: `${char.accentColor}10` }}
                  >
                    <AgentAvatar agent={char} size={56} />
                  </div>
                  <span className="text-[12px] font-semibold text-foreground leading-tight text-center">
                    {char.characterName}
                  </span>
                  <span className="text-[10px] text-muted font-medium">
                    {char.role}
                  </span>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-2 px-3 pb-3">
                  {/* Model dropdown */}
                  <select
                    value={setting.model}
                    onChange={(e) => setAgentModelSetting(char.agentName, { model: e.target.value })}
                    className="w-full text-[10px] bg-card border border-border rounded-lg px-2 py-1.5 text-foreground outline-none focus:border-accent-primary/50 cursor-pointer truncate"
                  >
                    {groupedModels.map((group) => (
                      <optgroup key={group.provider} label={`── ${group.provider} ──`}>
                        {group.models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label} {m.tier === "free" ? " ✦ FREE" : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  {/* Temperature slider */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-muted shrink-0">Temp</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={setting.temperature}
                      onChange={(e) =>
                        setAgentModelSetting(char.agentName, { temperature: parseFloat(e.target.value) })
                      }
                      className="flex-1 h-1 rounded-full appearance-none bg-border cursor-pointer accent-accent-primary"
                    />
                    <span className="text-[9px] font-mono text-accent-primary w-5 text-right shrink-0">
                      {setting.temperature.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer — reset */}
      <div className="flex items-center justify-end pt-3 border-t border-border mt-3">
        <button
          onClick={resetAgentModelSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted hover:text-foreground hover:bg-border/50 transition-all"
        >
          <RotateCcw className="w-3 h-3" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
