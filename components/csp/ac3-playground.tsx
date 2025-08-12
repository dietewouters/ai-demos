"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { EXERCISES } from "@/components/csp/lib/csp-exercises";
import GraphView from "@/components/csp/graph-view";
import DomainTable from "@/components/csp/domain-table";

import {
  type CSP,
  type Snapshot,
  type Constraint,
  type CSPStepWithSnapshot,
} from "@/components/csp/lib/csp-types";

/* ----------------------------- helpers ----------------------------- */

const CLEAR = "__clear__"; // sentinel i.p.v. lege string

function deepCloneDomains(domains: Record<string, string[]>) {
  const out: Record<string, string[]> = {};
  for (const k in domains) out[k] = [...domains[k]];
  return out;
}

function neighborsMap(csp: CSP): Record<string, string[]> {
  const map: Record<string, Set<string>> = {};
  csp.variables.forEach((v) => (map[v] = new Set()));
  csp.constraints.forEach((c) => {
    for (const v of c.scope) {
      for (const u of c.scope) {
        if (v !== u) map[v].add(u);
      }
    }
  });
  const res: Record<string, string[]> = {};
  for (const v in map) res[v] = Array.from(map[v]);
  return res;
}

function snapshotOf(
  csp: CSP,
  assignment: Record<string, string | null>,
  domains: Record<string, string[]>,
  focusVar?: string,
  prunedThisStep?: Array<{ variable: string; value: string }>,
  queue?: Array<[string, string]>
): Snapshot {
  const asn: Record<string, string | null> = {};
  for (const v of csp.variables) asn[v] = assignment[v] ?? null;
  const doms: Record<string, string[]> = {};
  for (const v of csp.variables) doms[v] = [...(domains[v] ?? [])];
  return {
    assignment: asn,
    domains: doms,
    focus: focusVar ? { variable: focusVar } : undefined,
    prunedThisStep: prunedThisStep ? [...prunedThisStep] : [],
    queue: queue ? [...queue] : undefined,
  };
}

function pushStep(
  acc: CSPStepWithSnapshot[],
  csp: CSP,
  step: CSPStepWithSnapshot["step"],
  assignment: Record<string, string | null>,
  domains: Record<string, string[]>,
  desc: string,
  highlight?: CSPStepWithSnapshot["highlight"],
  prunedThisStep?: Array<{ variable: string; value: string }>,
  queue?: Array<[string, string]>
) {
  acc.push({
    step,
    snapshot: snapshotOf(
      csp,
      assignment,
      domains,
      highlight?.variable,
      prunedThisStep,
      queue
    ),
    description: desc,
    highlight,
  });
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

function findConstraint(
  csp: CSP,
  a: string,
  b: string
): Constraint | undefined {
  return csp.constraints.find(
    (c) =>
      c.scope.length === 2 &&
      ((c.scope[0] === a && c.scope[1] === b) ||
        (c.scope[0] === b && c.scope[1] === a))
  );
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
    return `${left} = ${right} ${sign}${Math.abs(k)}`;
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
    return `${left} ${op} ${right} ${sign}${Math.abs(k)}`;
  }

  let op = raw;
  if (!forward) op = invertOp(op);
  return `${left} ${op} ${right}`;
}

function opText(csp: CSP, from: string, to: string): string {
  const cons = findConstraint(csp, from, to);
  if (!cons) return `${from} ? ${to}`;
  return formatEdgeLabel(cons, from, to);
}

function constraintSatisfied(c: Constraint, ...args: string[]): boolean {
  if (c.type === "eq" && c.scope.length === 2) return args[0] === args[1];
  if (c.type === "neq" && c.scope.length === 2) return args[0] !== args[1];
  if (c.predicate) {
    // Zowel objectvorm als positional ondersteunen
    const vals: Record<string, string> = {};
    for (let i = 0; i < c.scope.length; i++) {
      vals[c.scope[i]] = args[i];
      vals[c.scope[i].toLowerCase()] = args[i];
    }
    try {
      const r = (c.predicate as any)(vals);
      if (typeof r === "boolean") return r;
    } catch {}
    try {
      const r2 = (c.predicate as any)(...args);
      if (typeof r2 === "boolean") return r2;
    } catch {}
  }
  return true;
}

/* --------------------------- AC-3 (stepping) --------------------------- */

function runAC3Steps(
  csp: CSP,
  baseAssignment: Record<string, string | null>,
  baseDomains: Record<string, string[]>
): CSPStepWithSnapshot[] {
  const steps: CSPStepWithSnapshot[] = [];
  const assignment = { ...baseAssignment };
  const domains = deepCloneDomains(baseDomains);

  // Zet domeinen van toegewezen variabelen naar singletons
  for (const v of csp.variables) {
    if (assignment[v] != null) {
      domains[v] = [assignment[v] as string];
    }
  }

  const key = (i: string, j: string) => `${i}|${j}`;
  const formatQueue = (q: Array<[string, string]>) =>
    q.length ? q.map(([i, j]) => `${i}→${j}`).join(", ") : "∅";

  const queue: Array<[string, string]> = [];
  const inQueue = new Set<string>();

  // 1) Pas enqueueArc aan
  const enqueueArc = (i: string, j: string, reason?: string) => {
    const k = key(i, j);
    if (inQueue.has(k)) {
      // al in queue: leg uit waarom we 'm (normaal) zouden toevoegen
      pushStep(
        steps,
        csp,
        { kind: "ac3-enqueue", arc: [i, j] },
        assignment,
        domains,
        `Enqueue ${opText(csp, i, j)} — already in queue` +
          (reason ? ` (reason: ${reason})` : "") +
          `\nQueue: ${formatQueue(queue)}`,
        { edge: [i, j], constraintStatus: "enqueue" },
        [],
        queue
      );
      return;
    }
    inQueue.add(k);
    queue.push([i, j]);
    pushStep(
      steps,
      csp,
      { kind: "ac3-enqueue", arc: [i, j] },
      assignment,
      domains,
      `Enqueue ${opText(csp, i, j)}` +
        (reason ? ` (reason: ${reason})` : "") +
        `\nQueue: ${formatQueue(queue)}`,
      { edge: [i, j], constraintStatus: "enqueue" },
      [],
      queue
    );
  };

  for (const c of csp.constraints) {
    if (c.scope.length === 2) {
      const [a, b] = c.scope;
      enqueueArc(a, b, "");
      enqueueArc(b, a, "");
    }
  }

  pushStep(
    steps,
    csp,
    { kind: "ac3-start" },
    assignment,
    domains,
    "AC-3 started",
    undefined,
    [],
    queue
  );

  const neighs = neighborsMap(csp);
  const prunedAll: Array<{ variable: string; value: string }> = [];

  while (queue.length) {
    const [xi, xj] = queue.shift()!;
    inQueue.delete(key(xi, xj));

    pushStep(
      steps,
      csp,
      { kind: "ac3-dequeue", arc: [xi, xj] },
      assignment,
      domains,
      `Dequeue ${opText(csp, xi, xj)}\nQueue: ${formatQueue(queue)}`,
      { edge: [xi, xj], variable: xi, constraintStatus: "dequeue" },
      [],
      queue
    );

    const cons = findConstraint(csp, xi, xj);
    if (!cons) continue;

    const removed: string[] = [];
    const di = domains[xi];

    // Revise(xi, xj)
    for (let k = di.length - 1; k >= 0; k--) {
      const vi = di[k];
      let supported = false;
      for (const vj of domains[xj]) {
        if (
          constraintSatisfied(
            cons,
            cons.scope[0] === xi ? vi : vj,
            cons.scope[0] === xi ? vj : vi
          )
        ) {
          supported = true;
          break;
        }
      }
      if (!supported) {
        di.splice(k, 1);
        removed.push(vi);
        prunedAll.push({ variable: xi, value: vi });
      }
    }

    if (removed.length > 0) {
      pushStep(
        steps,
        csp,
        { kind: "ac3-revise", arc: [xi, xj], removed },
        assignment,
        domains,
        `Revise ${opText(csp, xi, xj)} — removed: ${removed.join(
          ", "
        )}\nQueue: ${formatQueue(queue)}`,
        { edge: [xi, xj], variable: xi, constraintStatus: "checking" },
        removed.map((v) => ({ variable: xi, value: v })),
        queue
      );

      if (domains[xi].length === 0) {
        pushStep(
          steps,
          csp,
          { kind: "ac3-end", result: "inconsistent" },
          assignment,
          domains,
          `AC-3: empty domain at ${xi}`,
          { variable: xi, constraintStatus: "fail" },
          [],
          queue
        );
        return steps;
      }

      const reason = `domain(${xi}) changed: removed {${removed.join(
        ", "
      )}} due to ${opText(csp, xi, xj)}`;

      for (const xk of neighs[xi]) {
        if (xk === xj) continue;
        enqueueArc(xk, xi, reason);
      }
    } else {
      pushStep(
        steps,
        csp,
        { kind: "ac3-revise", arc: [xi, xj], removed: [] },
        assignment,
        domains,
        `Revise ${opText(csp, xi, xj)} — no removals\nQueue: ${formatQueue(
          queue
        )}`,
        { edge: [xi, xj], variable: xi, constraintStatus: "ok" },
        [],
        queue
      );
    }
  }

  pushStep(
    steps,
    csp,
    { kind: "ac3-end", result: "consistent" },
    assignment,
    domains,
    "AC-3 finished (consistent)",
    undefined,
    [],
    []
  );

  return steps;
}

/* ----------------------------- Component ----------------------------- */

export default function AC3Playground() {
  const [exerciseId, setExerciseId] = useState<string>(EXERCISES[0].id);
  const csp = useMemo<CSP>(
    () => EXERCISES.find((e) => e.id === exerciseId)!,
    [exerciseId]
  );

  const [assignment, setAssignment] = useState<Record<string, string | null>>(
    () => {
      const a: Record<string, string | null> = {};
      for (const v of csp.variables) a[v] = null;
      return a;
    }
  );

  const [steps, setSteps] = useState<CSPStepWithSnapshot[]>([]);
  const [idx, setIdx] = useState<number>(-1);
  const resetSteps = () => setIdx(-1);
  const currentStep = idx >= 0 && idx < steps.length ? steps[idx] : null;
  const snapshot = currentStep?.snapshot ?? null;

  const resetAll = useCallback(() => {
    const a: Record<string, string | null> = {};
    for (const v of csp.variables) a[v] = null;
    setAssignment(a);
    setSteps([]);
    setIdx(-1);
  }, [csp.variables]);

  const domainOf = (v: string) => csp.domains[v] ?? [];

  const updateAssignment = (v: string, val: string | null) => {
    setAssignment((prev) => ({ ...prev, [v]: val }));
    setSteps([]);
    setIdx(-1);
  };

  const prepareAndRun = () => {
    const domains = deepCloneDomains(csp.domains);
    // enforce partial assignments (singletonize)
    for (const v of csp.variables) {
      if (assignment[v] != null) domains[v] = [assignment[v] as string];
    }
    const s = runAC3Steps(csp, assignment, domains);
    setSteps(s);
    setIdx(s.length > 0 ? 0 : -1);
  };

  const nextStep = () => {
    if (steps.length === 0) {
      prepareAndRun();
      return;
    }
    setIdx((i) => Math.min(steps.length - 1, i + 1));
  };
  const prevStep = () => {
    if (steps.length === 0) return;
    setIdx((i) => Math.max(0, i - 1));
  };
  const restartSteps = () => setIdx(steps.length > 0 ? 0 : -1);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2"></div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Exercise</Label>
          <Select
            value={exerciseId}
            onValueChange={(v) => {
              setExerciseId(v);
              // reset assign/steps on exercise change
              setTimeout(resetAll, 0);
            }}
          >
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
          {/* LEFT: controls */}
          <div className="lg:col-span-4 space-y-4">
            <div className="space-y-2">
              <Label>
                Partial assignments <Badge variant="secondary"></Badge>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {csp.variables.map((v) => {
                  const dom = domainOf(v);
                  const current = assignment[v];
                  const selVal =
                    current && dom.includes(current) ? current : CLEAR;
                  return (
                    <div key={v} className="space-y-1">
                      <div className="text-xs text-muted-foreground">{v}</div>
                      <Select
                        value={selVal}
                        onValueChange={(val) =>
                          updateAssignment(v, val === CLEAR ? null : val)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={CLEAR}>—</SelectItem>
                          {dom.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="flex gap-2 pt-2">
              <Button onClick={nextStep}>Next step</Button>
              <Button variant="ghost" onClick={resetSteps}>
                Reset
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {idx >= 0 && steps[idx] ? (
                <>
                  <div
                    className={
                      steps[idx].step.kind === "ac3-end" &&
                      (steps[idx].description.includes("consistent") ||
                        steps[idx].description.includes("finished"))
                        ? "whitespace-pre-wrap font-mono leading-5 text-sm"
                        : ""
                    }
                  ></div>
                  <div className="whitespace-pre-wrap font-mono leading-5 text-sm">
                    {steps[idx].description}
                  </div>
                </>
              ) : (
                <div className="whitespace-pre-wrap font-mono leading-5 text-sm">
                  Set some partial assignments and click <b>Next step</b>.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: graph + domains */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="p-3">
              <GraphView
                csp={csp}
                snapshot={snapshot}
                highlight={steps[idx]?.highlight}
              />
            </Card>
            <Card className="p-3">
              <DomainTable
                variables={csp.variables}
                initialDomains={csp.domains}
                snapshot={snapshot}
                highlight={steps[idx]?.highlight}
              />
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}
