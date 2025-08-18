"use client";

import type { DPLLTree, DPLLStep } from "@/components/solvers/lib/dpll-types";
import { TreeNode } from "./tree-node";
import { useMemo, useRef, useState, useLayoutEffect } from "react";

interface TreeVisualizationProps {
  tree: DPLLTree;
  activeStepId?: string;
  onStepClick?: (stepId: string) => void;
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
  const created = step.createdAt ?? 0; // ← steps zonder createdAt zijn zichtbaar
  return created <= cutoff;
}

/** breedte van zichtbare subtree */
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

/** plaatsing van zichtbare nodes */
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

function arcLabel(tree: DPLLTree, parentId: string, childId: string): string {
  const child = tree.steps.get(childId);
  const parent = tree.steps.get(parentId);
  if (!child || !parent) return "";
  if (child.edgeLabel) return child.edgeLabel;

  const pa = parent.assignment ?? {};
  const ca = child.assignment ?? {};
  const deltas: string[] = [];
  for (const [k, v] of Object.entries(ca)) {
    if (pa[k] === undefined || pa[k] !== v)
      deltas.push(`${k} = ${v ? "T" : "F"}`);
  }
  return deltas.join(", ");
}

export function TreeVisualization({
  tree,
  activeStepId,
  onStepClick,
  visibleEvent,
}: TreeVisualizationProps) {
  const cutoff = visibleEvent ?? Number.POSITIVE_INFINITY;
  const [fullscreen, setFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // layout + edges
  const { pos, totalW, totalH, edges, visibleIds } = useMemo(() => {
    const p = new Map<string, Pos>();
    const root = tree.rootId;
    const rootStep = tree.steps.get(root);
    const rootCreated = rootStep?.createdAt ?? 0;

    const effCutoff = Math.max(cutoff, rootCreated);

    const w = Math.max(measureVisible(tree, root, effCutoff), NODE_W);
    layoutVisible(tree, root, 0, 0, 0, effCutoff, p);

    const depths = Array.from(p.values()).map((v) => v.depth);
    const dmax = depths.length ? Math.max(...depths) : 0;
    const h = (dmax + 1) * NODE_H + dmax * V_GAP;

    const vids = Array.from(p.keys());

    const es: Array<{ from: string; to: string; label: string }> = [];
    for (const id of vids) {
      const step = tree.steps.get(id)!;
      const kids = (step.children ?? []).filter((cid) => p.has(cid));
      kids.forEach((cid) =>
        es.push({ from: id, to: cid, label: arcLabel(tree, id, cid) })
      );
    }

    return {
      pos: p,
      totalW: Math.max(w, NODE_W),
      totalH: Math.max(h, NODE_H),
      edges: es,
      visibleIds: vids,
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
    const dy = e.clientY - panStart.current.y;
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
    const sx = cw / totalW;
    const sy = ch / totalH;
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

  // initial fit only
  const didInitialFit = useRef(false);
  useLayoutEffect(() => {
    if (!didInitialFit.current) {
      fitToScreen();
      didInitialFit.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const didFinalFit = useRef(false);
  useLayoutEffect(() => {
    if (!isFinite(visibleEvent ?? 0)) {
      if (!didFinalFit.current) {
        // zorg dat volledige boom in beeld komt
        fitToScreen();
        didFinalFit.current = true;
      }
    } else {
      // zodra je weer in stapmodus komt mag hij opnieuw fitten bij een volgende FINISH
      didFinalFit.current = false;
    }
  }, [visibleEvent]); // ← vaste deps, geen Map o.i.d. hier
  // auto-focus op actieve zichtbare step (zonder zoomen)
  // keep a ref to the latest pos so we don't add the Map to the deps
  const posRef = useRef(pos);
  useLayoutEffect(() => {
    posRef.current = pos;
  }, [pos]);

  useLayoutEffect(() => {
    if (!activeStepId) return;
    if (!isFinite(visibleEvent ?? 0)) return; // bij FINISH niet centreren op 1 node

    const p = posRef.current.get(activeStepId);
    const el = containerRef.current;
    if (!p || !el) return;

    const cw = el.clientWidth;
    const ch = el.clientHeight;
    setTx(cw / 2 - scale * p.x);
    setTy(ch / 2 - scale * p.y);
  }, [visibleEvent, activeStepId, scale]);

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
        {/* Edges */}
        <svg width={totalW} height={totalH} className="absolute top-0 left-0">
          {edges.map(({ from, to, label }, i) => {
            const p0 = pos.get(from)!;
            const p1 = pos.get(to)!;
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
        </svg>

        {/* Nodes */}
        {visibleIds.map((id) => {
          const p = pos.get(id)!;
          const step = tree.steps.get(id)!;
          const left = p.x - NODE_W / 2;
          const top = p.y - NODE_H / 2;
          const isActive = activeStepId === id;

          const cutoff = visibleEvent ?? 0;
          const decisionStamp = step.resolvedAt ?? step.createdAt ?? 0;
          const resolvedShown = cutoff >= decisionStamp;

          const showModels = resolvedShown && step.modelCount !== undefined;

          const visualStep: DPLLStep = {
            ...step,
            result: resolvedShown ? step.result : "UNKNOWN",
            modelCount: showModels ? step.modelCount : undefined,
          };

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
