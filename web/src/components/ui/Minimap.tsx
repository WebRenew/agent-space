"use client";

import { useDemoStore } from "@/stores/useDemoStore";
import type { AgentStatus } from "@/types";

const STATUS_COLOR: Record<AgentStatus, string> = {
  idle: "#94a3b8",
  thinking: "#facc15",
  streaming: "#4ade80",
  tool_calling: "#a78bfa",
  waiting: "#fb923c",
  error: "#ef4444",
  done: "#22d3ee",
};

/** Matches DESK_LAYOUT in Office.tsx — minimap coordinates */
const DESK_MAP: [number, number][] = [
  [-3, -4],
  [3, -4],
  [-3, -8],
  [3, -8],
];

const SCALE = 6;
const MAP_W = 130;
const MAP_H = 100;
const OFFSET_X = MAP_W / 2;
const OFFSET_Z = MAP_H / 2 - 15;

function worldToMap(x: number, z: number) {
  return {
    left: x * SCALE + OFFSET_X,
    top: -z * SCALE + OFFSET_Z,
  };
}

export function Minimap() {
  const agents = useDemoStore((s) => s.agents);

  return (
    <div className="relative h-[100px] w-[130px] overflow-hidden rounded-lg border border-white/20 bg-black/60 backdrop-blur-sm">
      {/* Office outline */}
      <div
        className="absolute border border-white/10"
        style={{
          left: worldToMap(-11, 4).left,
          top: worldToMap(0, 4).top,
          width: 22 * SCALE,
          height: 18 * SCALE,
        }}
      />

      {/* Agent dots at desk positions */}
      {agents.map((agent) => {
        const desk = DESK_MAP[agent.deskIndex];
        if (!desk) return null;
        const pos = worldToMap(desk[0], desk[1]);
        const color = STATUS_COLOR[agent.status];
        const pulsing =
          agent.status === "streaming" ||
          agent.status === "thinking" ||
          agent.status === "tool_calling";

        return (
          <div
            key={agent.id}
            className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/30 ${
              pulsing ? "animate-pulse" : ""
            }`}
            style={{
              left: pos.left,
              top: pos.top,
              backgroundColor: color,
            }}
            title={`${agent.name}: ${agent.currentTask}`}
          />
        );
      })}
    </div>
  );
}
