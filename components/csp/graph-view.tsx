"use client";

import React from "react";
import {
  type CSP,
  type Snapshot,
  type Constraint,
} from "@/components/csp/lib/csp-types";

type Props = {
  csp: CSP;
  snapshot: Snapshot | null;
  highlight?: {
    variable?: string;
    edge?: [string, string];
    neighbor?: string;
    tryingValue?: string | null;
    constraintStatus?: "enqueue" | "dequeue" | "checking" | "ok" | "fail";
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

function invertOp(op: string): string {
  if (op === ">") return "<";
  if (op === "<") return ">";
  if (op === "≥" || op === ">=") return "≤";
  if (op === "≤" || op === "<=") return "≥";
  return op;
}

function formatEdgeLabel(c: Constraint, left: string, right: string): string {
  const raw = (c.label ?? symbolFor(c)).trim();
  const forward =
    c.scope.length === 2 && c.scope[0] === left && c.scope[1] === right;

  const mAbs = raw.match(
    /^\|\s*[A-Za-z]+\s*-\s*[A-Za-z]+\s*\|\s*(≥|<=|>=|≤|<|>)\s*([+-]?\d+)$/
  );
  if (mAbs) {
    const op = mAbs[1] === ">=" ? "≥" : mAbs[1] === "<=" ? "≤" : mAbs[1];
    const k = parseInt(mAbs[2], 10);
    return `|${left} - ${right}| ${op} ${k}`;
  }

  const mEqDiff = raw.match(/^=\s*([+-]?\d+)$/);
  if (mEqDiff) {
    let k = parseInt(mEqDiff[1], 10);
    if (!forward) k = -k;
    const sign = k >= 0 ? "+ " : "- ";
    const abs = Math.abs(k);
    return `${left} = ${right} ${sign}${abs}`;
  }

  const mCmp = raw.match(/^([<>]=?|≥|≤)\s*([+-]?\d+)$/);
  if (mCmp) {
    let op = mCmp[1];
    let k = parseInt(mCmp[2], 10);
    if (!forward) {
      op = invertOp(op);
      k = -k;
    }
    const sign = k >= 0 ? "+ " : "- ";
    const abs = Math.abs(k);
    return `${left} ${op} ${right} ${sign}${abs}`;
  }

  let op = raw;
  if (!forward) op = invertOp(op);
  return `${left} ${op} ${right}`;
}

export default function GraphView({ csp, snapshot, highlight }: Props) {
  const width = 900;
  const height = 420;
  const positions = layoutPositions(csp, width, height);
  const assigned = snapshot?.assignment ?? {};
  const currentVar = highlight?.variable;
  const currentEdge = highlight?.edge;
  const status = highlight?.constraintStatus;
  const prunedThisStep = snapshot?.prunedThisStep ?? [];

  // maps opbouwen (geen JSX hier!)
  const edgeMap = new Map<
    string,
    { a: string; b: string; constraints: Constraint[] }
  >();
  const unaryConstraintsByVar: Record<string, Constraint[]> = {};

  for (const c of csp.constraints) {
    if (c.scope.length === 1) {
      const v = c.scope[0];
      (unaryConstraintsByVar[v] ??= []).push(c);
    } else if (c.scope.length === 2) {
      const [a, b] = c.scope;
      const key = [a, b].sort().join("|");
      const node = edgeMap.get(key);
      if (node) node.constraints.push(c);
      else
        edgeMap.set(key, {
          a: key.split("|")[0],
          b: key.split("|")[1],
          constraints: [c],
        });
    }
  }
  const edges = Array.from(edgeMap.values());

  const getStrokeColor = (isHL: boolean, status?: string) => {
    if (!isHL) return "#d1d5db";
    if (status === "enqueue") return "#a855f7"; // purple
    if (status === "ok") return "#22c55e"; // green
    if (status === "fail") return "#ef4444"; // red
    return "#f59e0b"; // checking / default highlight
  };

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[360px] md:h-[420px]"
      >
        {/* eerst lijnen */}
        {edges.map((e) => {
          const a = e.a;
          const b = e.b;
          const posA = positions[a];
          const posB = positions[b];
          const isHL =
            currentEdge &&
            ((currentEdge[0] === a && currentEdge[1] === b) ||
              (currentEdge[0] === b && currentEdge[1] === a));

          return (
            <line
              key={`line-${a}-${b}`}
              x1={posA.x}
              y1={posA.y}
              x2={posB.x}
              y2={posB.y}
              stroke={getStrokeColor(!!isHL, status)}
              strokeWidth={isHL ? 4 : 2}
            />
          );
        })}

        {/* dan labels */}
        {edges.map((e) => {
          const a = e.a;
          const b = e.b;
          const posA = positions[a];
          const posB = positions[b];
          const isHL =
            currentEdge &&
            ((currentEdge[0] === a && currentEdge[1] === b) ||
              (currentEdge[0] === b && currentEdge[1] === a));

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

          const labelTexts = e.constraints.map((c) =>
            formatEdgeLabel(c, c.scope[0], c.scope[1])
          );

          const label = labelTexts.join(" AND ");
          const approxW = Math.max(28, label.length * 7 + 10);
          const approxH = 18;

          return (
            <g key={`label-${a}-${b}`}>
              <rect
                x={lx - approxW / 2}
                y={ly - approxH / 2}
                width={approxW}
                height={approxH}
                rx={4}
                ry={4}
                fill={
                  isHL
                    ? status === "ok"
                      ? "rgba(220, 252, 231, 0.95)"
                      : status === "fail"
                      ? "rgba(254, 226, 226, 0.95)"
                      : "rgba(255, 237, 213, 0.95)"
                    : "rgba(255,255,255,0.9)"
                }
                stroke={
                  isHL
                    ? status === "ok"
                      ? "#22c55e"
                      : status === "fail"
                      ? "#ef4444"
                      : "#f59e0b"
                    : "#e5e7eb"
                }
                strokeWidth={1}
              />
              <text
                x={lx}
                y={ly + 5}
                textAnchor="middle"
                className="fill-zinc-700"
                style={{ fontSize: 15, fontWeight: 600 }}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* nodes + unary labels (met kleurstatus) */}
        {csp.variables.map((v) => {
          const pos = positions[v];
          const val = assigned[v];
          const isAssigned = val != null;
          const isCurrent = currentVar === v;
          const fill = isAssigned ? valueToColor(val) : "#f3f4f6";
          const stroke = isCurrent ? "#10b981" : "#6b7280";
          const ring = isCurrent ? 6 : 3;

          // unary highlight?
          const unaryActive =
            (highlight?.edge &&
              highlight.edge[0] === v &&
              highlight.edge[1] === v) ||
            (highlight?.variable === v && highlight?.neighbor === v);

          const unaryFill =
            unaryActive && status === "checking"
              ? "#f59e0b"
              : unaryActive && status === "ok"
              ? "#22c55e"
              : unaryActive && status === "fail"
              ? "#ef4444"
              : "#6b7280";

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
                r={30}
                fill={fill}
                stroke={stroke}
                strokeWidth={isCurrent ? 3 : 1.5}
              />
              <text
                textAnchor="middle"
                y={5}
                className="fill-black font-bold"
                style={{ fontSize: 20, fontWeight: 700 as any }}
              >
                {v}
              </text>

              {isAssigned ? (
                <text
                  textAnchor="middle"
                  y={15}
                  className="fill-zinc-800"
                  style={{ fontSize: 10, fontWeight: 500 }}
                >
                  {String(val)}
                </text>
              ) : (
                <text
                  textAnchor="middle"
                  y={15}
                  className="fill-zinc-400"
                  style={{ fontSize: 11 }}
                >
                  —
                </text>
              )}

              {unaryConstraintsByVar[v]?.map((c, i) => (
                <text
                  key={`label-${v}-${i}`}
                  textAnchor="middle"
                  y={-35 - i * 14}
                  style={{ fontSize: 15, fontWeight: 600, fill: unaryFill }}
                  pointerEvents="none"
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
