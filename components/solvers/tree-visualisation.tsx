"use client";

import type { DPLLTree, DPLLStep } from "@/components/solvers/lib/dpll-types";
import { TreeNode } from "./tree-node";
import { useMemo, useRef, useState, useLayoutEffect } from "react";

interface TreeVisualizationProps {
  tree: DPLLTree;
  activeStepId?: string;
  onStepClick?: (stepId: string) => void;
  /** Alleen nodes renderen met createdAt <= visibleEvent (progressive reveal) */
  visibleEvent?: number;
}

/** Layout constants */
const NODE_W = 240;
const NODE_H = 72;
const H_GAP = 48;
const V_GAP = 120;
const EDGE_STUB = 18;

type Pos = { x: number; y: number; w: number; depth: number };

function isVisible(step: DPLLStep | undefined, cutoff: number): boolean {
  if (!step) return false;
  const created = step.createdAt ?? 0;
  return created <= cutoff;
}

function measureVisible(tree: DPLLTree, id: string, cutoff: number): number {
  const step = tree.steps.get(id);
  if (!isVisible(step, cutoff)) return 0;

  const kids = (step!.children ?? []).filter((cid) =>
    isVisible(tree.steps.get(cid), cutoff)
  );
  if (kids.length === 0) return NODE_W;

  const widths = kids.map((cid) => measureVisible(tree, cid, cutoff));
  return widths.reduce((a, b) => a + b, 0) + H_GAP * (kids.length - 1);
}

function layoutVisible(
  tree: DPLLTree,
  id: string,
  left: number,
  top: number,
  depth: number,
  cutoff: number,
  pos: Map<string, Pos>
) {
  const step = tree.steps.get(id);
  if (!isVisible(step, cutoff)) return;

  const w = Math.max(measureVisible(tree, id, cutoff), NODE_W);
  const cx = left + w / 2;
  const cy = top + NODE_H / 2;
  pos.set(id, { x: cx, y: cy, w, depth });

  const kids = (step!.children ?? []).filter((cid) =>
    isVisible(tree.steps.get(cid), cutoff)
  );
  if (kids.length === 0) return;

  let cursor = left;
  for (const cid of kids) {
    const cw = Math.max(measureVisible(tree, cid, cutoff), NODE_W);
    layoutVisible(
      tree,
      cid,
      cursor,
      top + NODE_H + V_GAP,
      depth + 1,
      cutoff,
      pos
    );
    cursor += cw + H_GAP;
  }
}

/** Delta-tekst voor arc (split e.d.). Voor unit gebruiken we een aparte capsule. */
function arcLabel(tree: DPLLTree, parentId: string, childId: string): string {
  const child = tree.steps.get(childId);
  const parent = tree.steps.get(parentId);
  if (!child || !parent) return "";
  if (child.type === "unit-propagation") return ""; // unit krijgt eigen capsule
  if (child.edgeLabel) return child.edgeLabel;

  const pa = parent.assignment ?? {};
  const ca = child.assignment ?? {};
  const deltas: string[] = [];
  for (const [k, v] of Object.entries(ca)) {
    if (pa[k] === undefined || pa[k] !== v)
      deltas.push(`${k} = ${v ? "1" : "0"}`);
  }
  return deltas.join(", ");
}

export function TreeVisualization({
  tree,
  activeStepId,
  onStepClick,
  visibleEvent,
}: TreeVisualizationProps) {
  // Niets tonen tot visibleEvent verhoogd wordt
  const cutoff = visibleEvent ?? Number.NEGATIVE_INFINITY;

  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    pos,
    totalW,
    totalH,
    edges,
    visibleIds,
    splitMarkers,
    unitEdgeBadges,
  } = useMemo(() => {
    const p = new Map<string, Pos>();
    const root = tree.rootId;
    const rootStep = tree.steps.get(root);
    const rootCreated = rootStep?.createdAt ?? 0;

    const effCutoff = Math.max(cutoff, rootCreated - 1);

    const w = Math.max(measureVisible(tree, root, effCutoff), NODE_W);
    layoutVisible(tree, root, 0, 0, 0, effCutoff, p);

    const depths = Array.from(p.values()).map((v) => v.depth);
    const dmax = depths.length ? Math.max(...depths) : 0;
    const h = (dmax + 1) * NODE_H + dmax * V_GAP;

    const vids = Array.from(p.keys());

    const es: Array<{ from: string; to: string; label: string }> = [];
    const unitBadges: Array<{ x: number; y: number; text: string }> = [];

    for (const id of vids) {
      const step = tree.steps.get(id)!;
      const kids = (step.children ?? []).filter((cid) => p.has(cid));

      for (const cid of kids) {
        const child = tree.steps.get(cid)!;
        es.push({ from: id, to: cid, label: arcLabel(tree, id, cid) });

        if (child.type === "unit-propagation") {
          // Plaats capsule op het verticale stuk vlak voor de unit-node
          const p0 = p.get(id)!;
          const p1 = p.get(cid)!;

          const x1 = p0.x;
          const y1 = p0.y + NODE_H / 2;
          const x2 = p1.x;
          const y2 = p1.y - NODE_H / 2;
          const midY2 = y2 - EDGE_STUB; // begin van verticale segment boven de node

          // neem punt tussen (midY2) en (y2) (dus dichter bij node)
          const badgeX = x2;
          const badgeY = (midY2 + y2) / 2 - 14; // iets hoger zodat hij niet botst met node

          const litText =
            child.variable !== undefined && child.value !== undefined
              ? `${child.variable} = ${child.value ? "1" : "0"}`
              : ""; // fallback

          unitBadges.push({
            x: badgeX,
            y: badgeY,
            text: `Unit Prop • ${litText}`,
          });
        }
      }
    }

    // Split markers op de stub onder de ouder
    const splits: Array<{ x: number; y: number }> = [];
    for (const id of vids) {
      const step = tree.steps.get(id)!;
      const pp = p.get(id)!;
      const vkids = (step.children ?? []).filter((cid) => p.has(cid));
      if (vkids.length >= 2) {
        splits.push({ x: pp.x, y: pp.y + NODE_H / 2 + EDGE_STUB / 2 });
      }
    }

    return {
      pos: p,
      totalW: Math.max(w, NODE_W),
      totalH: Math.max(h, NODE_H),
      edges: es,
      visibleIds: vids,
      splitMarkers: splits,
      unitEdgeBadges: unitBadges,
    };
  }, [tree, cutoff]);

  // zoom/pan
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [panning, setPanning] = useState(false);
  const panStart = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
  } | null>(null);

  const startPan = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    panStart.current = { x: e.clientX, y: e.clientY, tx, ty };
    setPanning(true);
  };
  const onMove = (e: React.MouseEvent) => {
    if (!panning || !panStart.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y; // ← fix
    setTx(panStart.current.tx + dx);
    setTy(panStart.current.ty + dy);
  };
  const endPan = () => {
    setPanning(false);
    panStart.current = null;
  };

  const zoomBy = (k: number) =>
    setScale((s) => Math.min(2, Math.max(0.2, s * k)));

  const fitToScreen = () => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth - 24;
    const ch = el.clientHeight - 24;
    const sx = cw / Math.max(totalW, 1);
    const sy = ch / Math.max(totalH, 1);
    const s = Math.min(1, Math.max(0.2, Math.min(sx, sy)));
    setScale(s);
    setTx((cw - totalW * s) / 2);
    setTy((ch - totalH * s) / 2);
  };

  const resetView = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  // initial fit zodra er iets zichtbaar is
  const didInitialFit = useRef(false);
  const prevVisibleCount = useRef(0);
  useLayoutEffect(() => {
    if (
      visibleIds.length > 0 &&
      (!didInitialFit.current || prevVisibleCount.current === 0)
    ) {
      fitToScreen();
      didInitialFit.current = true;
    }
    prevVisibleCount.current = visibleIds.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds.length]);

  // auto-focus op actieve zichtbare step
  const posRef = useRef(pos);
  useLayoutEffect(() => {
    posRef.current = pos;
  }, [pos]);

  useLayoutEffect(() => {
    if (!activeStepId) return;
    const p0 = posRef.current.get(activeStepId);
    const el = containerRef.current;
    if (!p0 || !el) return;
    if (!visibleIds.includes(activeStepId)) return;

    const cw = el.clientWidth;
    const ch = el.clientHeight;
    setTx(cw / 2 - scale * p0.x);
    setTy(ch / 2 - scale * p0.y);
  }, [activeStepId, scale, visibleIds]);

  if (!tree.steps.has(tree.rootId)) {
    return (
      <div className="text-center text-muted-foreground p-8">
        No tree data available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={
        fullscreen
          ? "fixed inset-0 z-50 bg-background"
          : "relative w-full h-[calc(100vh-8rem)] overflow-hidden rounded-md border"
      }
    >
      {/* Toolbar */}
      <div className="absolute top-2 right-2 z-20 flex gap-1">
        <button
          onClick={() => zoomBy(1.1)}
          className="px-2 py-1 rounded border bg-white text-xs"
        >
          ＋
        </button>
        <button
          onClick={() => zoomBy(1 / 1.1)}
          className="px-2 py-1 rounded border bg-white text-xs"
        >
          －
        </button>
        <button
          onClick={fitToScreen}
          className="px-2 py-1 rounded border bg-white text-xs"
        >
          Fit
        </button>
        <button
          onClick={resetView}
          className="px-2 py-1 rounded border bg-white text-xs"
        >
          Reset
        </button>
        {!fullscreen ? (
          <button
            onClick={() => setFullscreen(true)}
            className="px-2 py-1 rounded border bg-white text-xs"
          >
            Fullscreen
          </button>
        ) : (
          <button
            onClick={() => setFullscreen(false)}
            className="px-2 py-1 rounded border bg-white text-xs"
          >
            Back to controls
          </button>
        )}
      </div>

      {/* Stage */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={startPan}
        onMouseMove={onMove}
        onMouseUp={endPan}
        onMouseLeave={endPan}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        {/* Edges + arc labels + type markers */}
        <svg width={totalW} height={totalH} className="absolute top-0 left-0">
          {/* edges */}
          {edges.map(({ from, to, label }, i) => {
            const p0 = pos.get(from);
            const p1 = pos.get(to);
            if (!p0 || !p1) return null;

            const x1 = p0.x,
              y1 = p0.y + NODE_H / 2;
            const x2 = p1.x,
              y2 = p1.y - NODE_H / 2;
            const midY1 = y1 + EDGE_STUB;
            const midY2 = y2 - EDGE_STUB;
            const points = `${x1},${y1} ${x1},${midY1} ${x2},${midY2} ${x2},${y2}`;
            const lx = (x1 + x2) / 2;
            const ly = (midY1 + midY2) / 2 - 8;

            return (
              <g key={i}>
                <polyline
                  points={points}
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth={1.5}
                />
                {label && (
                  <foreignObject
                    x={lx - 60}
                    y={ly - 12}
                    width={120}
                    height={24}
                  >
                    <div className="flex items-center justify-center">
                      <span className="bg-white border border-gray-300 rounded px-2 py-0.5 text-xs text-gray-700 shadow-sm">
                        {label}
                      </span>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Split markers (op de verticale stub onder de parent) */}
          {splitMarkers.map((m, i) => (
            <foreignObject
              key={`split-${i}`}
              x={m.x - 24}
              y={m.y - 12}
              width={48}
              height={24}
            >
              <div className="flex items-center justify-center">
                <span className="px-2 py-0.5 rounded border text-xs shadow-sm bg-blue-50 text-blue-700 border-blue-200">
                  Split
                </span>
              </div>
            </foreignObject>
          ))}

          {/* Unit badges (OP DE ARC, met expliciete keuze) */}
          {unitEdgeBadges.map((m, i) => (
            <foreignObject
              key={`unit-${i}`}
              x={m.x - 60}
              y={m.y - 12}
              width={120}
              height={24}
            >
              <div className="flex items-center justify-center">
                <span className="px-2 py-0.5 rounded border text-xs shadow-sm bg-green-50 text-green-700 border-green-300">
                  {m.text}
                </span>
              </div>
            </foreignObject>
          ))}
        </svg>

        {/* Nodes – alleen zichtbare ids */}
        {visibleIds.map((id) => {
          const p0 = pos.get(id);
          const step = tree.steps.get(id);
          if (!p0 || !step) return null;

          const left = p0.x - NODE_W / 2;
          const top = p0.y - NODE_H / 2;
          const isActive = activeStepId === id;

          const decisionStamp = step.resolvedAt ?? step.createdAt ?? 0;
          const resolvedShown = cutoff >= decisionStamp;
          const showModels = resolvedShown && step.modelCount !== undefined;

          const visualStep: DPLLStep = {
            ...step,
            result: resolvedShown ? step.result : "UNKNOWN",
            modelCount: showModels ? step.modelCount : undefined,
          };

          const hasVisibleChildren = (step.children ?? []).some((cid) =>
            pos.has(cid)
          );
          const showNodeSplitChip =
            step.type === "split" &&
            !hasVisibleChildren &&
            step.id !== tree.rootId && // ⬅️ nooit bij de root
            (step.variable !== undefined || (step.children?.length ?? 0) > 0);

          return (
            <div
              key={id}
              className="absolute"
              style={{ left, top, width: NODE_W, height: NODE_H }}
              onClick={(e) => {
                e.stopPropagation();
                onStepClick?.(id);
              }}
            >
              {/* Toon 'Split' alvast boven de node (geen root, nog geen zichtbare kinderen) */}
              {showNodeSplitChip && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                  <span className="px-2 py-0.5 rounded border text-xs shadow-sm bg-blue-50 text-blue-700 border-blue-200">
                    Split
                  </span>
                </div>
              )}

              <TreeNode
                step={visualStep}
                isActive={isActive}
                onClick={() => onStepClick?.(id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
