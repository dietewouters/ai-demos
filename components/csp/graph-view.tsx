"use client";

import React from "react";
import {
  type CSP,
  type Snapshot,
  type Constraint,
} from "@/components/csp/lib/csp-types";
import { cn } from "@/lib/utils";

type Props = {
  csp: CSP;
  snapshot: Snapshot | null;
  highlight?: {
    variable?: string;
    edge?: [string, string];
    neighbor?: string;
    tryingValue?: string | null;
  } | null;
};

function layoutPositions(csp: CSP, width: number, height: number) {
  if (csp.positions) return csp.positions;
  const n = csp.variables.length;
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.35;
  const pos: Record<string, { x: number; y: number }> = {};
  csp.variables.forEach((v, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    pos[v] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
  return pos;
}

function valueToColor(val?: string | null) {
  const v = (val ?? "").toLowerCase();
  if (["r", "red", "rood"].includes(v)) return "#ef4444";
  if (["g", "green", "groen"].includes(v)) return "#22c55e";
  if (["b", "blue", "blauw"].includes(v)) return "#3b82f6";
  if (["y", "yellow", "geel"].includes(v)) return "#eab308";
  if (["p", "purple", "paars"].includes(v)) return "#a855f7";
  if (["o", "orange", "oranje"].includes(v)) return "#f97316";
  return "#9ca3af";
}

function symbolFor(c: Constraint): string {
  if (c.label) return c.label;
  if (c.type === "neq") return "≠";
  if (c.type === "eq") return "=";
  return "⋆";
}

export default function GraphView({ csp, snapshot, highlight }: Props) {
  const width = 900;
  const height = 420;
  const positions = layoutPositions(csp, width, height);
  const assigned = snapshot?.assignment ?? {};
  const currentVar = highlight?.variable;
  const currentEdge = highlight?.edge;
  const prunedThisStep = snapshot?.prunedThisStep ?? [];

  const edgeMap = new Map<
    string,
    { a: string; b: string; constraints: Constraint[] }
  >();
  const unaryConstraintsByVar: Record<string, Constraint[]> = {};

  for (const c of csp.constraints) {
    if (c.scope.length === 1) {
      const v = c.scope[0];
      if (!unaryConstraintsByVar[v]) unaryConstraintsByVar[v] = [];
      unaryConstraintsByVar[v].push(c);
    } else if (c.scope.length === 2) {
      const [a, b] = c.scope;
      const key = [a, b].sort().join("|");
      const existing = edgeMap.get(key);
      if (existing) existing.constraints.push(c);
      else
        edgeMap.set(key, {
          a: key.split("|")[0],
          b: key.split("|")[1],
          constraints: [c],
        });
    }
  }
  const edges = Array.from(edgeMap.values());

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[360px] md:h-[420px]"
      >
        {edges.map((e) => {
          const a = e.a;
          const b = e.b;
          const posA = positions[a];
          const posB = positions[b];
          const isHL =
            currentEdge &&
            ((currentEdge[0] === a && currentEdge[1] === b) ||
              (currentEdge[0] === b && currentEdge[1] === a));
          const stroke = isHL ? "#f59e0b" : "#d1d5db";
          const strokeWidth = isHL ? 4 : 2;

          const mx = (posA.x + posB.x) / 2;
          const my = (posA.y + posB.y) / 2;
          const dx = posB.x - posA.x;
          const dy = posB.y - posA.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const offset = 16;
          const lx = mx + nx * offset;
          const ly = my + ny * offset;

          const labelTexts = e.constraints.map(
            (c) => `${c.scope[0]} ${symbolFor(c)} ${c.scope[1]}`
          );
          const label = labelTexts.join(" ∧ ");
          const approxW = Math.max(28, label.length * 7 + 10);
          const approxH = 18;

          return (
            <g key={`${a}-${b}`}>
              <line
                x1={posA.x}
                y1={posA.y}
                x2={posB.x}
                y2={posB.y}
                stroke={stroke}
                strokeWidth={strokeWidth}
              />
              <rect
                x={lx - approxW / 2}
                y={ly - approxH / 2}
                width={approxW}
                height={approxH}
                rx={4}
                ry={4}
                fill={
                  isHL ? "rgba(255, 237, 213, 0.95)" : "rgba(255,255,255,0.9)"
                }
                stroke={isHL ? "#f59e0b" : "#e5e7eb"}
                strokeWidth={1}
              />
              <text
                x={lx}
                y={ly + 5}
                textAnchor="middle"
                className="fill-zinc-700"
                style={{ fontSize: 12, fontWeight: 600 }}
              >
                {label}
              </text>
            </g>
          );
        })}

        {csp.variables.map((v) => {
          const pos = positions[v];
          const val = assigned[v];
          const isAssigned = val != null;
          const isCurrent = currentVar === v;
          const fill = isAssigned ? valueToColor(val) : "#f3f4f6";
          const stroke = isCurrent ? "#10b981" : "#6b7280";
          const ring = isCurrent ? 6 : 3;

          return (
            <g key={v} transform={`translate(${pos.x}, ${pos.y})`}>
              <circle
                r={22 + ring}
                fill="none"
                stroke={isCurrent ? "#a7f3d0" : "transparent"}
                strokeWidth={isCurrent ? 6 : 0}
                opacity={0.7}
              />
              <circle
                r={22}
                fill={fill}
                stroke={stroke}
                strokeWidth={isCurrent ? 3 : 1.5}
              />
              <text
                textAnchor="middle"
                y={6}
                className="fill-black font-medium"
              >
                {v}
              </text>
              {unaryConstraintsByVar[v]?.map((c, i) => (
                <text
                  key={`label-${v}-${i}`}
                  textAnchor="middle"
                  y={-30 - i * 14}
                  className="fill-zinc-500 font-mono"
                  style={{ fontSize: 15 }}
                >
                  {symbolFor(c)}
                </text>
              ))}
              {prunedThisStep.some((p) => p.variable === v) && (
                <circle
                  r={32}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={2}
                  opacity={0.6}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
