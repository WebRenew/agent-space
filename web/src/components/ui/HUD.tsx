"use client";

import { useEffect } from "react";
import { useDemoStore } from "@/stores/useDemoStore";
import { STATUS_LABELS, AGENT_COLORS } from "@/types";
import type { AgentStatus } from "@/types";
import { Minimap } from "./Minimap";

const STATUS_DOT: Record<AgentStatus, string> = {
  idle: "bg-slate-400",
  thinking: "bg-yellow-400 animate-pulse",
  streaming: "bg-green-400 animate-pulse",
  tool_calling: "bg-violet-400 animate-pulse",
  waiting: "bg-orange-400",
  error: "bg-red-500 animate-pulse",
  done: "bg-cyan-400",
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function AgentCard({ agentId }: { agentId: string }) {
  const agent = useDemoStore((s) => s.agents.find((a) => a.id === agentId));
  const selectedId = useDemoStore((s) => s.selectedAgentId);
  const selectAgent = useDemoStore((s) => s.selectAgent);

  if (!agent) return null;

  const isSelected = selectedId === agent.id;
  const borderColor = AGENT_COLORS[agent.agent_type];

  return (
    <button
      onClick={() => selectAgent(isSelected ? null : agent.id)}
      className={`w-full rounded-lg border p-3 text-left transition ${
        isSelected
          ? "border-white/30 bg-white/10"
          : "border-white/5 bg-white/[0.03] hover:bg-white/[0.06]"
      }`}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: borderColor }}
        />
        <span className="text-xs font-semibold text-white">{agent.name}</span>
        <span className={`ml-auto h-1.5 w-1.5 rounded-full ${STATUS_DOT[agent.status]}`} />
        <span className="text-[10px] text-white/50">
          {STATUS_LABELS[agent.status]}
        </span>
      </div>
      <div className="mb-1 truncate text-[11px] text-white/40">
        {agent.currentTask}
      </div>
      <div className="flex gap-3 text-[10px] text-white/30">
        <span>{formatTokens(agent.tokens_input)} in</span>
        <span>{formatTokens(agent.tokens_output)} out</span>
        <span>{agent.files_modified} files</span>
        {agent.commitCount > 0 && (
          <span className="text-green-400/60">{agent.commitCount} commits</span>
        )}
      </div>
    </button>
  );
}

function ToastStack() {
  const toasts = useDemoStore((s) => s.toasts);
  const removeToast = useDemoStore((s) => s.removeToast);

  useEffect(() => {
    const timeouts = toasts.map((toast) =>
      setTimeout(() => removeToast(toast.id), 4000)
    );
    return () => timeouts.forEach(clearTimeout);
  }, [toasts, removeToast]);

  return (
    <div className="fixed right-6 bottom-20 z-40 flex flex-col gap-2 md:bottom-32">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-in slide-in-from-right rounded-lg border px-3 py-2 text-xs backdrop-blur-sm ${
            toast.type === "error"
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : toast.type === "success"
                ? "border-green-500/30 bg-green-500/10 text-green-300"
                : "border-white/10 bg-white/5 text-white/70"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

export function HUD() {
  const agents = useDemoStore((s) => s.agents);

  const totalTokens = agents.reduce(
    (sum, a) => sum + a.tokens_input + a.tokens_output,
    0
  );
  const activeCount = agents.filter(
    (a) => a.status !== "idle" && a.status !== "done"
  ).length;

  return (
    <>
      {/* Logo — top left */}
      <div className="fixed top-6 left-6 z-30">
        <div className="text-xl font-bold text-white drop-shadow-lg">
          <span className="text-[#4ECDC4]">Agent</span> Space
        </div>
      </div>

      {/* Aggregate stats — top center */}
      <div className="fixed top-6 left-1/2 z-30 -translate-x-1/2">
        <div className="flex gap-4 rounded-full border border-white/10 bg-black/50 px-5 py-1.5 text-xs text-white/60 backdrop-blur-sm">
          <span>
            <span className="font-bold text-white">{activeCount}</span>
            <span className="text-white/40">/{agents.length}</span> active
          </span>
          <span className="text-white/20">|</span>
          <span>
            <span className="font-bold text-white">
              {formatTokens(totalTokens)}
            </span>{" "}
            tokens
          </span>
        </div>
      </div>

      {/* Skip to content — top right */}
      <div className="fixed top-6 right-6 z-30">
        <a
          href="#features"
          className="text-sm text-white/50 transition hover:text-white"
        >
          Skip to site →
        </a>
      </div>

      {/* Agent cards — left panel */}
      <div className="fixed top-20 left-6 z-30 hidden w-56 flex-col gap-2 md:flex">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agentId={agent.id} />
        ))}
      </div>

      {/* Minimap — bottom right */}
      <div className="fixed right-6 bottom-6 z-30 hidden md:block">
        <Minimap />
      </div>

      {/* Toasts */}
      <ToastStack />
    </>
  );
}
