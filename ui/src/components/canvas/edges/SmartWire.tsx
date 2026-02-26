"use client";

import { memo } from "react";
import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

function SmartWire({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const d = data as Record<string, string> | undefined;
  const wireType = d?.wireType || "scene-link";

  // Subtle color based on source handle type
  const color = wireType === "video" ? "rgba(239,68,68,0.45)" : wireType === "audio" ? "rgba(168,85,247,0.35)" : "rgba(184,15,173,0.25)";

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        ...style,
        stroke: color,
        strokeWidth: 1.5,
      }}
    />
  );
}

export default memo(SmartWire);
