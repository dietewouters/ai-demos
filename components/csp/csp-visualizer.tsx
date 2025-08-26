"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltips";
import { RotateCcw, StepForward, Maximize2 } from "lucide-react";

import {
  type CSP,
  type CSPStepWithSnapshot,
  type SolveOptions,
} from "@/components/csp/lib/csp-types";
import { EXERCISES } from "@/components/csp/lib/csp-exercises";
import { solveCSP } from "@/components/csp/lib/csp-solver";
import GraphView from "@/components/csp/graph-view";
import DomainTable from "@/components/csp/domain-table";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* =========================================================================
   Types & helpers for Backtracking Tree
   ========================================================================= */

type AlgoKey = "BT" | "BT_FC" | "BT_AC3";
type VarOrderKey = "alpha" | "mrv";
type ValOrderKey = "alpha" | "lcv";

const DEFAULT_OPTIONS: SolveOptions = {
  algorithm: "BT",
  variableOrdering: "alpha",
  valueOrdering: "alpha",
  stepThroughFC: true,
  stepThroughAC3: true,
};

type Assignments = Record<string, string | number | boolean>;

type TreeNode = {
  id: string;
  var?: string;
  value?: string;
  depth: number;
  children: TreeNode[];
  stepIndex?: number; // committed in snapshot
  status?: "explore" | "success" | "failure";
  appearStep?: number; // first moment this *branch* shows this try/assign
  acceptStep?: number; // confirmed/assigned
  rejectStep?: number; // rejected/backtracked
};

type Positioned = {
  id: string;
  parentId?: string;
  x: number;
  y: number;
  node: TreeNode;
};

// Parse only numeric "Var = 3" from descriptions to avoid picking up "A = D - 1"
const TRY_RE_DESC = /\b([A-Za-z]\w*)\s*=\s*([0-9]+(?:\.[0-9]+)?)\b/g;
const REJECT_RE =
  /(reject(ed)?|inconsistent|contradiction|fail|dead\s*end|backtrack|invalid)/i;

function getAssignmentsFromSnapshot(
  snapshot: any,
  variables: string[]
): Assignments {
  if (!snapshot) return {};
  if (snapshot.assignments && typeof snapshot.assignments === "object") {
    return snapshot.assignments as Assignments;
  }
  const out: Assignments = {};
  const domains = snapshot?.domains ?? snapshot?.domain ?? null;
  if (domains && typeof domains === "object") {
    for (const v of variables) {
      const dom = (domains as any)[v];
      if (Array.isArray(dom) && dom.length === 1) out[v] = String(dom[0]);
    }
  }
  return out;
}

function ensureChildNode(
  parent: TreeNode,
  varName: string,
  value: string,
  depth: number,
  appearAt: number
): TreeNode {
  let found = parent.children.find(
    (c) => c.var === varName && String(c.value) === String(value)
  );
  if (!found) {
    found = {
      id: `${parent.id}->${varName}=${value}`,
      var: varName,
      value,
      depth,
      children: [],
      status: "explore",
      appearStep: appearAt,
    };
    parent.children.push(found);
  } else if (found.appearStep === undefined || appearAt < found.appearStep) {
    found.appearStep = appearAt;
  }
  return found;
}

function ensurePrefixPath(
  root: TreeNode,
  variables: string[],
  prefix: Assignments,
  appearAt: number
): TreeNode {
  let node = root;
  for (let d = 0; d < variables.length; d++) {
    const v = variables[d];
    const val = prefix[v];
    if (val === undefined) break;
    node = ensureChildNode(node, v, String(val), d + 1, appearAt);
  }
  return node;
}

// Find latest visible leaf (no earlier reject) in a subtree up to step t
function latestVisibleUnrejectedLeaf(
  node: TreeNode,
  t: number
): TreeNode | null {
  const visibleAt = (n: TreeNode) =>
    n.appearStep ?? n.stepIndex ?? Number.POSITIVE_INFINITY;
  const isVisible = (n: TreeNode) => visibleAt(n) <= t;

  let best: TreeNode | null = null;
  const stack: TreeNode[] = [node];

  while (stack.length) {
    const cur = stack.pop()!;
    const childrenVis = cur.children.filter(isVisible);

    const isLeaf = cur.var && isVisible(cur) && childrenVis.length === 0;
    const unrejected = cur.rejectStep === undefined || cur.rejectStep! > t;

    if (isLeaf && unrejected) {
      const curAppear = visibleAt(cur);
      const bestAppear = best ? visibleAt(best) : -1;
      if (!best || curAppear > bestAppear || cur.depth > (best?.depth ?? 0)) {
        best = cur;
      }
    }

    for (const c of childrenVis) stack.push(c);
  }
  return best;
}

/* ---------- tree building ---------- */

export function buildBacktrackingTree(
  variables: string[],
  steps: CSPStepWithSnapshot[]
): TreeNode {
  const root: TreeNode = { id: "root", depth: 0, children: [] };
  let stack: TreeNode[] = [root];
  let prevAssigns: Record<string, any> = {};
  const openAttemptByVar = new Map<string, TreeNode>(); // last “try” not yet accepted

  const keyList = (A: Record<string, any>) =>
    variables.filter((v) => A[v] !== undefined);
  const valAt = (A: Record<string, any>, idx: number) => A[variables[idx]];

  steps.forEach((step, i) => {
    const snapshot = (step as any).snapshot;
    const curAssigns = getAssignmentsFromSnapshot(snapshot, variables);
    const domains = snapshot?.domains ?? null;

    const prevKeys = keyList(prevAssigns);
    const curKeys = keyList(curAssigns);

    // LCA depth
    let commonDepth = 0;
    while (
      commonDepth < prevKeys.length &&
      commonDepth < curKeys.length &&
      prevKeys[commonDepth] === curKeys[commonDepth] &&
      String(valAt(prevAssigns, commonDepth)) ===
        String(valAt(curAssigns, commonDepth))
    ) {
      commonDepth++;
    }

    // Backtrack pops → mark the popped node and the last visible leaf as rejected now
    while (stack.length - 1 > commonDepth) {
      const popped = stack.pop()!;
      if (popped && popped.id !== "root") {
        const lastLeaf = latestVisibleUnrejectedLeaf(popped, i);
        if (lastLeaf && lastLeaf.rejectStep === undefined)
          lastLeaf.rejectStep = i;
        if (popped.rejectStep === undefined) popped.rejectStep = i;
        if (popped.var) openAttemptByVar.delete(popped.var);
      }
    }

    // Push newly committed assignments (accept in this branch)
    for (let d = commonDepth; d < curKeys.length; d++) {
      const v = curKeys[d];
      const val = String(curAssigns[v]);
      const parent = stack[stack.length - 1];
      const node = ensureChildNode(parent, v, val, d + 1, i);

      if (node.stepIndex === undefined) node.stepIndex = i;
      if (node.acceptStep === undefined) node.acceptStep = i;
      if (node.appearStep === undefined) node.appearStep = i;

      openAttemptByVar.delete(v);
      stack.push(node);
    }

    const desc = (step as any).description ?? "";

    // Tries mentioned explicitly in description (numeric only)
    if (typeof desc === "string" && desc.length) {
      TRY_RE_DESC.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = TRY_RE_DESC.exec(desc)) !== null) {
        const varName = m[1];
        const value = String(m[2]);
        const varIdx = variables.indexOf(varName);
        if (varIdx < 0) continue;

        // parent = current prefix (committed) up to varIdx - 1
        const parentPrefix: Assignments = {};
        for (let d = 0; d < varIdx; d++) {
          const pv = variables[d];
          if (curAssigns[pv] !== undefined) parentPrefix[pv] = curAssigns[pv];
        }
        const parent = ensurePrefixPath(root, variables, parentPrefix, i);
        const node = ensureChildNode(parent, varName, value, varIdx + 1, i);

        // previous open attempt for same var becomes rejected now
        const prevOpen = openAttemptByVar.get(varName);
        if (
          prevOpen &&
          prevOpen !== node &&
          prevOpen.rejectStep === undefined
        ) {
          prevOpen.rejectStep = i;
        }
        openAttemptByVar.set(varName, node);

        if (REJECT_RE.test(desc)) {
          node.rejectStep =
            node.rejectStep !== undefined ? Math.min(node.rejectStep, i) : i;
        }
      }
    }

    // Immediate reject via domain elimination for still-open tries
    if (domains && typeof domains === "object") {
      for (const [varName, node] of Array.from(openAttemptByVar.entries())) {
        if (node.rejectStep !== undefined) continue;
        if (curAssigns[varName] !== undefined) continue; // committed instead
        const dom = (domains as any)[varName];
        if (
          Array.isArray(dom) &&
          !dom.map(String).includes(String(node.value))
        ) {
          node.rejectStep = i; // value no longer allowed
        }
      }
    }

    // Optional: mark node-level status
    const kind = (step as any).kind;
    if (kind === "success" && stack.length) {
      stack[stack.length - 1].status = "success";
    } else if (
      /(fail|dead[-\s]?end|contradiction)/i.test(desc) &&
      stack.length
    ) {
      stack[stack.length - 1].status = "failure";
    }

    prevAssigns = curAssigns;
  });

  // Ensure appearStep exists if only accept/reject known
  const ensureAppear = (n: TreeNode) => {
    if (n.id !== "root") {
      const cands = [
        n.appearStep,
        n.stepIndex,
        n.acceptStep,
        n.rejectStep,
      ].filter((x) => x !== undefined) as number[];
      if (cands.length) {
        const earliest = Math.min(...cands);
        if (n.appearStep === undefined || earliest < n.appearStep)
          n.appearStep = earliest;
      }
    }
    n.children.forEach(ensureAppear);
  };
  ensureAppear(root);

  return root;
}

/* ---------- prune & layout ---------- */

function pruneTreeForStep(root: TreeNode, t: number): TreeNode {
  const visibleAt = (n: TreeNode) =>
    n.appearStep ?? n.stepIndex ?? Number.POSITIVE_INFINITY;
  const isVisible = (n: TreeNode) => visibleAt(n) <= t;

  const clone = (n: TreeNode): TreeNode | null => {
    if (n.id === "root") {
      const kids = n.children.map(clone).filter(Boolean) as TreeNode[];
      return { ...n, children: kids };
    }
    if (!isVisible(n)) return null;
    const kids = n.children.map(clone).filter(Boolean) as TreeNode[];
    return { ...n, children: kids };
  };
  return (clone(root) as TreeNode) ?? { id: "root", depth: 0, children: [] };
}

function layoutTree(
  root: TreeNode,
  opts?: {
    levelGap?: number;
    siblingGap?: number;
    margin?: number;
    labelArea?: number;
  }
) {
  const levelGap = opts?.levelGap ?? 120;
  const siblingGap = opts?.siblingGap ?? 120;
  const margin = opts?.margin ?? 36;
  const labelArea = opts?.labelArea ?? 100;

  const nodes: Positioned[] = [];
  let nextX = 0;

  function dfs(
    n: TreeNode,
    parentId: string | undefined,
    depth: number
  ): number {
    const y = margin + depth * levelGap;
    let x: number;

    if (!n.children.length) {
      x = labelArea + margin + nextX * siblingGap;
      nextX++;
    } else {
      const childXs = n.children.map((c) => dfs(c, n.id, depth + 1));
      x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    }

    nodes.push({ id: n.id, parentId, x, y, node: n });
    return x;
  }

  dfs(root, undefined, 0);

  // clamp so nodes never overlap the label column
  const nodeWForClamp = 70;
  const minAllowedX = labelArea + margin + nodeWForClamp / 2;
  const nodeXs = nodes.filter((p) => p.node.var).map((p) => p.x);
  const minNodeX = nodeXs.length ? Math.min(...nodeXs) : minAllowedX;
  const shift = isFinite(minNodeX) ? Math.max(0, minAllowedX - minNodeX) : 0;
  if (shift > 0) for (const p of nodes) p.x += shift;

  // base width/height from nodes
  let width =
    (nodes.length ? Math.max(...nodes.map((p) => p.x)) : 0) + margin + 24;
  let height =
    (nodes.length ? Math.max(...nodes.map((p) => p.y)) : 0) + margin + 24;

  // guarantee a minimum canvas so labels are fully visible even at idx = -1
  width = Math.max(width, labelArea + margin * 2 + 200);
  height = Math.max(height, margin + (Math.max(4, 4) + 1) * levelGap); // at least 4 rows (A..D)

  const byId = new Map(nodes.map((p) => [p.id, p]));
  return { nodes, width, height, byId, labelArea, levelGap, margin };
}

/* ---------- SVG renderer (plain SVG; parent provides scroll/pan) ---------- */

function BacktrackingTreeSVG({
  root,
  variables,
  currentStepIndex,
  zoom = 1,
  reveal = "hide",
}: {
  root: TreeNode;
  variables: string[];
  currentStepIndex: number;
  zoom?: number;
  reveal?: "hide" | "ghost";
}) {
  const COLORS = {
    edge: "#94a3b8",
    labelStroke: "#94a3b8",
    labelText: "#475569",
    nodeStrokeDefault: "#64748b",
    nodeStrokeCurrent: "#2563eb",
    nodeStrokeSuccess: "#16a34a",
    nodeStrokeFailure: "#dc2626",
    nodeFill: "#ffffff",
    text: "#111827",
    cursor: "#f59e0b",
  };

  const pruned = useMemo(
    () => pruneTreeForStep(root, currentStepIndex),
    [root, currentStepIndex]
  );
  const { nodes, width, height, byId, labelArea, levelGap, margin } = useMemo(
    () => layoutTree(pruned),
    [pruned]
  );

  const nodeW = 70;
  const nodeH = 30;

  const visibleAt = (n: TreeNode) =>
    n.appearStep ?? n.stepIndex ?? Number.POSITIVE_INFINITY;
  const isVisible = (n: TreeNode, t: number) => visibleAt(n) <= t;

  const nodeColorState = (n: TreeNode, t: number) => {
    const accepted = n.acceptStep !== undefined && t >= n.acceptStep;
    const rejected = n.rejectStep !== undefined && t >= n.rejectStep;
    if (rejected) return "rejected";
    if (accepted) return "accepted";
    return "testing";
  };

  const visibleNodes = nodes.filter(
    (p) => p.node.var && isVisible(p.node, currentStepIndex)
  );
  const current =
    nodes.find((p) => p.node.var && visibleAt(p.node) === currentStepIndex) ??
    (visibleNodes.length ? visibleNodes[visibleNodes.length - 1] : null);

  const highlightIds = new Set<string>();
  let walk = current?.id;
  while (walk) {
    highlightIds.add(walk);
    const parentId = byId.get(walk)?.parentId;
    walk = parentId;
  }

  return (
    <svg
      width={width * zoom}
      height={height * zoom}
      viewBox={`0 0 ${Math.max(width, 360)} ${Math.max(height, 360)}`}
      role="img"
      style={{ display: "block" }}
    >
      {/* variable labels */}
      {variables.map((v, i) => (
        <g
          key={v}
          transform={`translate(${margin}, ${margin + (i + 1) * levelGap})`}
        >
          <rect
            x={0}
            y={-nodeH / 2}
            width={labelArea - 12}
            height={nodeH}
            rx={8}
            fill="none"
            stroke={COLORS.labelStroke}
            strokeWidth={1.5}
          />
          <text
            x={(labelArea - 12) / 2}
            y={4}
            textAnchor="middle"
            fontSize="12"
            fill={COLORS.labelText}
          >
            {v}
          </text>
        </g>
      ))}

      {/* edges */}
      {nodes
        .filter((p) => p.parentId && p.node.var)
        .map((p) => {
          const parent = byId.get(p.parentId!);
          if (!parent) return null;

          const childVisible = isVisible(p.node, currentStepIndex);
          const parentVisible = parent.node.var
            ? isVisible(parent.node, currentStepIndex)
            : true;

          if (reveal === "hide" && (!childVisible || !parentVisible))
            return null;
          const opacity = childVisible && parentVisible ? 1 : 0.12;
          const highlighted =
            highlightIds.has(p.id) && highlightIds.has(parent.id);

          return (
            <line
              key={`e-${p.id}`}
              x1={parent.x}
              y1={parent.y + nodeH / 2}
              x2={p.x}
              y2={p.y - nodeH / 2}
              stroke={COLORS.edge}
              strokeWidth={highlighted ? 2.5 : 1.25}
              opacity={opacity}
            />
          );
        })}

      {/* nodes */}
      {nodes
        .filter((p) => p.node.var)
        .map((p) => {
          const n = p.node;
          const visible = isVisible(n, currentStepIndex);
          if (reveal === "hide" && !visible) return null;

          const isCurrent = current?.id === p.id;
          const colorState = nodeColorState(n, currentStepIndex);
          const stroke = isCurrent
            ? COLORS.nodeStrokeCurrent
            : colorState === "accepted"
            ? COLORS.nodeStrokeSuccess
            : colorState === "rejected"
            ? COLORS.nodeStrokeFailure
            : COLORS.nodeStrokeDefault;

          const strokeW = isCurrent ? 3 : colorState !== "testing" ? 2 : 1.25;
          const opacity = visible ? 1 : 0.15;

          return (
            <g
              key={p.id}
              transform={`translate(${p.x - nodeW / 2}, ${p.y - nodeH / 2})`}
            >
              <rect
                width={nodeW}
                height={nodeH}
                rx={8}
                fill={COLORS.nodeFill}
                stroke={stroke}
                strokeWidth={strokeW}
                opacity={opacity}
              />
              <text
                x={nodeW / 2}
                y={nodeH / 2 + 4}
                textAnchor="middle"
                fontSize="12"
                fill={COLORS.text}
                opacity={opacity}
              >
                {n.var} = {n.value}
              </text>
            </g>
          );
        })}
    </svg>
  );
}

/* =========================================================================
   Main component (with pan/zoom in modal)
   ========================================================================= */

export default function CSPVisualizer() {
  const [exerciseId, setExerciseId] = useState<string>("4houses");
  const exercise = useMemo<CSP>(
    () => EXERCISES.find((e) => e.id === exerciseId)!,
    [exerciseId]
  );

  const [algo, setAlgo] = useState<AlgoKey>(
    DEFAULT_OPTIONS.algorithm as AlgoKey
  );
  const [varOrder, setVarOrder] = useState<VarOrderKey>(
    DEFAULT_OPTIONS.variableOrdering as VarOrderKey
  );
  const [valOrder, setValOrder] = useState<ValOrderKey>(
    DEFAULT_OPTIONS.valueOrdering as ValOrderKey
  );

  // keep both; show one toggle
  const [stepFC, setStepFC] = useState<boolean>(true);
  const [stepAC3, setStepAC3] = useState<boolean>(true);

  const [steps, setSteps] = useState<CSPStepWithSnapshot[]>([]);
  const [idx, setIdx] = useState<number>(-1);
  const [treeModalOpen, setTreeModalOpen] = useState(false);

  // zoom + scroll container for modal
  const [zoom, setZoom] = useState(1);
  const clampZoom = (z: number) => Math.max(0.5, Math.min(3, z));
  const handleZoomIn = () => setZoom((z) => clampZoom(z + 0.2));
  const handleZoomOut = () => setZoom((z) => clampZoom(z - 0.2));
  const handleZoomReset = () => setZoom(1);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });

  const onDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // left button only
    const el = scrollRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      left: el.scrollLeft,
      top: el.scrollTop,
    };
    el.classList.add("cursor-grabbing");
  };
  const onDragMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || !isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    el.scrollLeft = dragStartRef.current.left - dx;
    el.scrollTop = dragStartRef.current.top - dy;
  };
  const onDragEnd = () => {
    const el = scrollRef.current;
    isDraggingRef.current = false;
    el?.classList.remove("cursor-grabbing");
  };
  const onWheelPan = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft += e.deltaX;
    el.scrollTop += e.deltaY;
  };

  const options = useMemo<SolveOptions>(() => {
    return {
      algorithm: algo,
      variableOrdering: varOrder,
      valueOrdering: valOrder,
      stepThroughFC: stepFC,
      stepThroughAC3: stepAC3,
    };
  }, [algo, varOrder, valOrder, stepFC, stepAC3]);

  const stepToggle = useMemo(() => {
    if (algo === "BT_FC") return stepFC;
    if (algo === "BT_AC3") return stepAC3;
    return false;
  }, [algo, stepFC, stepAC3]);

  const setStepToggle = useCallback(
    (v: boolean) => {
      if (algo === "BT_FC") setStepFC(v);
      else if (algo === "BT_AC3") setStepAC3(v);
    },
    [algo]
  );

  const stepToggleLabel =
    algo === "BT_FC"
      ? "Step through Forward Checking"
      : algo === "BT_AC3"
      ? "Step through AC-3"
      : "Step through (not available)";

  const atEnd = steps.length > 0 && idx >= steps.length - 1;
  const currentStep = idx >= 0 && idx < steps.length ? steps[idx] : null;
  const currentSnapshot = currentStep?.snapshot ?? null;

  // tree is available ONLY for BT + alpha/alpha
  const treeAvailable = useMemo(
    () => algo === "BT" && varOrder === "alpha" && valOrder === "alpha",
    [algo, varOrder, valOrder]
  );

  // Close modal automatically if conditions become false
  useEffect(() => {
    if (!treeAvailable) setTreeModalOpen(false);
  }, [treeAvailable]);

  const btTree = useMemo(
    () =>
      treeAvailable
        ? buildBacktrackingTree(exercise.variables, steps)
        : ({ id: "root", depth: 0, children: [] } as TreeNode),
    [exercise.variables, steps, treeAvailable]
  );

  const recompute = useCallback(() => {
    const result = solveCSP(exercise, options);
    setSteps(result.steps);
    setIdx(-1);
  }, [exercise, options]);

  useEffect(() => {
    recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId, algo, varOrder, valOrder, stepFC, stepAC3]);

  const handleStep = () => {
    if (atEnd) return;
    setIdx((i) => Math.min(steps.length - 1, i + 1));
  };
  const handleReset = () => setIdx(-1);

  const handleFit = () => {
    const cont = scrollRef.current;
    if (!cont) return;
    const svg = cont.querySelector("svg");
    if (!svg) return;
    const vb = svg.getAttribute("viewBox");
    if (!vb) return;
    const [, , vbW, vbH] = vb.split(/\s+/).map(Number);
    const scale =
      Math.min(cont.clientWidth / vbW, cont.clientHeight / vbH) * 0.95;
    const z = clampZoom(scale);
    setZoom(z);
    requestAnimationFrame(() => {
      const contentW = vbW * z;
      const contentH = vbH * z;
      cont.scrollLeft = Math.max(0, (contentW - cont.clientWidth) / 2);
      cont.scrollTop = Math.max(0, (contentH - cont.clientHeight) / 2);
    });
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-4">
        <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-1"></div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary">Exercise</Badge>
            <Select value={exerciseId} onValueChange={setExerciseId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Choose exercise" />
              </SelectTrigger>
              <SelectContent>
                {EXERCISES.map((ex) => (
                  <SelectItem key={ex.id} value={ex.id}>
                    {ex.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        <Card className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3 space-y-4">
              <div className="space-y-2">
                <Label>Algorithm</Label>
                <Select
                  value={algo}
                  onValueChange={(v) => setAlgo(v as AlgoKey)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose algorithm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BT">Backtracking</SelectItem>
                    <SelectItem value="BT_FC">
                      Backtracking + Forward Checking
                    </SelectItem>
                    <SelectItem value="BT_AC3">Backtracking + AC-3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Variable ordering</Label>
                <Select
                  value={varOrder}
                  onValueChange={(v) => setVarOrder(v as VarOrderKey)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alpha">Alphabetically</SelectItem>
                    <SelectItem value="mrv">
                      MRV (Most remaining values) + Tiebreak (Most constraints)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Value ordering</Label>
                <Select
                  value={valOrder}
                  onValueChange={(v) => setValOrder(v as ValOrderKey)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alpha">Alphabetically</SelectItem>
                    <SelectItem value="lcv">
                      LCV (Least constraining value)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Single combined toggle with dynamic label */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{stepToggleLabel}</Label>
                  <Switch
                    checked={stepToggle}
                    onCheckedChange={setStepToggle}
                    disabled={algo === "BT"}
                    aria-label="Step through propagation"
                  />
                </div>
              </div>

              <Separator />

              {/* Controls in sidebar */}
              <div className="flex items-center gap-2 pt-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={handleStep}
                      disabled={atEnd}
                    >
                      <StepForward className="h-4 w-4 mr-2" />
                      Step
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next step</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" onClick={handleReset}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back to start</TooltipContent>
                </Tooltip>
              </div>

              {/* Backtracking tree ONLY when available */}
              {treeAvailable && (
                <Card className="p-3">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="btree">
                      <div className="flex items-center justify-between pr-1">
                        <AccordionTrigger className="flex-1">
                          Backtracking tree
                        </AccordionTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setZoom(1);
                            setTreeModalOpen(true);
                          }}
                          aria-label="Open large view"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <AccordionContent>
                        <div className="h-64 md:h-80 overflow-auto">
                          <BacktrackingTreeSVG
                            root={btTree}
                            variables={exercise.variables}
                            currentStepIndex={idx}
                            reveal="hide"
                            zoom={1}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </Card>
              )}

              {/* Description / status */}
              <div className="whitespace-pre-wrap font-mono leading-5 text-sm">
                {idx >= 0 && steps[idx] ? (
                  <>
                    <div className="font-medium text-foreground"></div>
                    <div
                      className={
                        steps[idx].kind === "success"
                          ? "text-green-600 font-semibold"
                          : "text-muted-foreground"
                      }
                    >
                      {steps[idx].description}
                    </div>
                  </>
                ) : (
                  <div></div>
                )}
              </div>
            </div>

            {/* Main area: graph + domains */}
            <div className="lg:col-span-9 space-y-4">
              <Card className="p-3">
                <GraphView
                  csp={exercise}
                  snapshot={currentSnapshot}
                  highlight={currentStep?.highlight}
                />
              </Card>
              <Card className="p-3">
                <DomainTable
                  variables={exercise.variables}
                  initialDomains={exercise.domains}
                  snapshot={currentSnapshot}
                  highlight={currentStep?.highlight}
                />
              </Card>
            </div>
          </div>
        </Card>
      </div>

      {/* Large modal with Step/Reset + Zoom + drag-to-pan + wheel pan — ONLY when available */}
      {treeAvailable && (
        <Dialog open={treeModalOpen} onOpenChange={setTreeModalOpen}>
          <DialogContent className="max-w-[95vw] w-[95vw] h-[85vh]">
            <DialogHeader>
              <DialogTitle>Backtracking tree</DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-2 mb-2">
              <Button variant="outline" onClick={handleStep} disabled={atEnd}>
                <StepForward className="h-4 w-4 mr-2" />
                Step
              </Button>
              <Button variant="ghost" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>

              <div className="ml-4 flex items-center gap-1">
                <Button variant="outline" onClick={handleZoomOut}>
                  –
                </Button>
                <Button variant="outline" onClick={handleZoomIn}>
                  +
                </Button>
                <Button variant="outline" onClick={handleZoomReset}>
                  1:1
                </Button>
                <Button variant="outline" onClick={handleFit}>
                  Fit
                </Button>
              </div>

              <span className="ml-auto text-sm text-muted-foreground">
                Step {Math.max(0, idx + 1)} / {Math.max(0, steps.length)} · Zoom{" "}
                {zoom.toFixed(2)}×
              </span>
            </div>

            <div
              ref={scrollRef}
              className="h-[calc(85vh-140px)] overflow-auto cursor-grab rounded border"
              onMouseDown={onDragStart}
              onMouseMove={onDragMove}
              onMouseLeave={onDragEnd}
              onMouseUp={onDragEnd}
              onWheel={onWheelPan}
            >
              <BacktrackingTreeSVG
                root={btTree}
                variables={exercise.variables}
                currentStepIndex={idx}
                reveal="hide"
                zoom={zoom}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </TooltipProvider>
  );
}
