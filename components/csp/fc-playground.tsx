"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  type CSP,
  type CSPStepWithSnapshot,
  type Snapshot,
  type Constraint,
} from "@/components/csp/lib/csp-types";
import { EXERCISES } from "@/components/csp/lib/csp-exercises";
import GraphView from "@/components/csp/graph-view";
import DomainTable from "@/components/csp/domain-table";

/* ---------- Small helpers (kept local so this file works standalone) ---------- */

function deepCloneDomains(
  domains: Record<string, string[]>
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const k in domains) out[k] = [...domains[k]];
  return out;
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

/** Format like your GraphView/opText; handles "= k", comparators with ±k, and |X-Y| op k */
function formatConstraintOriented(
  c: Constraint,
  left: string,
  right: string
): string {
  const raw = (c.label ?? symbolFor(c)).trim();
  if (c.scope.length === 1) return `${left} ${raw}`;
  const forward = c.scope[0] === left && c.scope[1] === right;

  // |X - Y| op k
  const mAbs = raw.match(
    /^\|\s*[A-Za-z]+\s*-\s*[A-Za-z]+\s*\|\s*(≥|<=|>=|≤|<|>)\s*([+-]?\d+)$/
  );
  if (mAbs) {
    const op = mAbs[1] === ">=" ? "≥" : mAbs[1] === "<=" ? "≤" : mAbs[1];
    const k = parseInt(mAbs[2], 10);
    return `|${left} - ${right}| ${op} ${k}`;
  }
  // "= k" → left = right ± k  (flip sign if reversed)
  const mEqDiff = raw.match(/^=\s*([+-]?\d+)$/);
  if (mEqDiff) {
    let k = parseInt(mEqDiff[1], 10);
    if (!forward) k = -k;
    const sign = k >= 0 ? "+ " : "- ";
    return `${left} = ${right} ${sign}${Math.abs(k)}`;
  }
  // "op k" with comparator
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
  // bare operator (≠, =, >, <, ≥, ≤)
  return `${left} ${forward ? raw : invertOp(raw)} ${right}`;
}

/** Call predicate that may be declared as predicate(...args) or predicate({a,b}) */
function callPredicate(c: Constraint, scopeVals: string[]): boolean {
  if (!c.predicate) return true;
  const valsMap: Record<string, string> = {};
  const valsLower: Record<string, string> = {};
  for (let i = 0; i < c.scope.length; i++) {
    valsMap[c.scope[i]] = scopeVals[i];
    valsLower[c.scope[i].toLowerCase()] = scopeVals[i];
  }
  const bag = { ...valsMap, ...valsLower };

  const results: boolean[] = [];
  try {
    if ((c.predicate as any).length >= c.scope.length) {
      const r = (c.predicate as any)(...scopeVals);
      if (typeof r === "boolean") results.push(r);
    }
  } catch {}
  try {
    const r2 = (c.predicate as any)(bag);
    if (typeof r2 === "boolean") results.push(r2);
  } catch {}

  if (results.includes(false)) return false;
  if (results.includes(true)) return true;
  return true; // default permissive
}

function constraintSatisfied(c: Constraint, ...args: string[]): boolean {
  if (c.type === "eq" && c.scope.length === 2) return args[0] === args[1];
  if (c.type === "neq" && c.scope.length === 2) return args[0] !== args[1];
  if (c.predicate) return callPredicate(c, args);
  return true;
}

/** FC engine from a partial assignment (step-through friendly) */
function runFCFromPartial(
  csp: CSP,
  partial: Record<string, string | null>,
  stepThrough: boolean
): { steps: CSPStepWithSnapshot[]; finalDomains: Record<string, string[]> } {
  const steps: CSPStepWithSnapshot[] = [];
  const assignment: Record<string, string | null> = {};
  for (const v of csp.variables) assignment[v] = partial[v] ?? null;

  const domains = deepCloneDomains(csp.domains);

  // Start step
  steps.push({
    step: { kind: "forward-check-start", variable: "(partial)" as any },
    snapshot: snapshotOf(csp, assignment, domains, undefined, [], undefined),
    description: "Forward Checking from partial assignment",
    highlight: {},
  });

  // Iterate to fixpoint: each assigned var prunes neighbors
  let changed = true;
  while (changed) {
    changed = false;

    for (const src of csp.variables) {
      const srcVal = assignment[src];
      if (srcVal == null) continue;

      for (const nb of csp.variables) {
        if (nb === src) continue;
        if (assignment[nb] != null) continue;

        const before = domains[nb].length;
        const keep: string[] = [];
        const removedBatch: string[] = [];

        for (const nbVal of domains[nb]) {
          // Find first blocking constraint for nb=nbVal with current assignment (+ src)
          const culprit = (() => {
            const relevant = csp.constraints.filter((c) =>
              c.scope.includes(nb)
            );
            for (const c of relevant) {
              const vals: Record<string, string> = { [nb]: nbVal };
              let ready = true;
              for (const v of c.scope) {
                if (v === nb) continue;
                const a = (v === src ? srcVal : assignment[v]) ?? null;
                if (a == null) {
                  ready = false; // not evaluable yet
                  break;
                }
                vals[v] = a;
              }
              if (!ready) continue;
              const args = c.scope.map((v) => vals[v]);
              if (!constraintSatisfied(c, ...args)) {
                return { c, args };
              }
            }
            return null;
          })();

          if (!culprit) {
            keep.push(nbVal);
          } else {
            changed = true;
            removedBatch.push(nbVal);

            if (stepThrough) {
              const { c, args } = culprit;
              const neighbor = c.scope.find((v) => v !== nb) ?? nb;
              const label = formatConstraintOriented(c, nb, neighbor);
              steps.push({
                step: {
                  kind: "forward-check-eliminate",
                  from: src,
                  to: nb,
                  valueEliminated: nbVal,
                  reason: "Constraint",
                },
                snapshot: snapshotOf(
                  csp,
                  assignment,
                  {
                    ...domains,
                    [nb]: [
                      ...keep,
                      ...domains[nb].slice(domains[nb].indexOf(nbVal) + 1),
                    ],
                  },
                  nb,
                  [{ variable: nb, value: nbVal }],
                  undefined
                ),
                description:
                  `FC: remove ${nbVal} from domain(${nb}) because ${label} ` +
                  `for (${c.scope
                    .map((v, i) => `${v}=${args[i]}`)
                    .join(", ")})`,
                highlight: {
                  edge: [nb, neighbor],
                  variable: nb,
                  constraintStatus: "fail",
                },
              });
            }
          }
        }

        // apply new domain
        domains[nb] = keep;

        if (domains[nb].length === 0) {
          steps.push({
            step: { kind: "forward-check-end", eliminatedCount: before },
            snapshot: snapshotOf(csp, assignment, domains, nb, [], undefined),
            description: `FC stops: empty domain at ${nb}`,
            highlight: { variable: nb, constraintStatus: "fail" },
          });
          return { steps, finalDomains: domains };
        }

        if (!stepThrough && removedBatch.length > 0) {
          steps.push({
            step: {
              kind: "forward-check-eliminate",
              from: src,
              to: nb,
              valueEliminated: "(multiple)" as any,
              reason: "Constraint",
            },
            snapshot: snapshotOf(csp, assignment, domains, nb, [], undefined),
            description: `FC: updated domain(${nb}) — removed ${
              removedBatch.length
            } value${removedBatch.length === 1 ? "" : "s"}`,
            highlight: {
              variable: nb,
              edge: [src, nb],
              constraintStatus: "checking",
            },
          });
        }
      }
    }
  }

  steps.push({
    step: { kind: "forward-check-end", eliminatedCount: 0 },
    snapshot: snapshotOf(csp, assignment, domains, undefined, [], undefined),
    description: stepThrough ? "FC completed" : "FC: domains updated",
    highlight: { constraintStatus: "ok" },
  });

  return { steps, finalDomains: domains };
}

/* --------------------------------- UI --------------------------------- */

export default function FCPlayground() {
  const [exerciseId, setExerciseId] = useState<string>("4houses");
  const csp = useMemo<CSP>(
    () => EXERCISES.find((e) => e.id === exerciseId)!,
    [exerciseId]
  );

  // partial assignment (controlled via selects)
  const [assignment, setAssignment] = useState<Record<string, string | null>>(
    {}
  );
  useEffect(() => {
    // reset assignment when switching exercise
    const init: Record<string, string | null> = {};
    for (const v of csp.variables) init[v] = null;
    setAssignment(init);
  }, [csp]);

  const [stepThrough, setStepThrough] = useState(true);

  const [steps, setSteps] = useState<CSPStepWithSnapshot[]>([]);
  const [idx, setIdx] = useState<number>(-1);

  const current = idx >= 0 && idx < steps.length ? steps[idx] : null;
  const snapshot = current?.snapshot ?? null;

  const recompute = useCallback(() => {
    const { steps } = runFCFromPartial(csp, assignment, stepThrough);
    setSteps(steps);
    setIdx(-1);
  }, [csp, assignment, stepThrough]);

  useEffect(() => {
    recompute();
  }, [recompute]);

  const nextStep = () => {
    if (!steps.length) return;
    setIdx((i) => Math.min(steps.length - 1, i + 1));
  };
  const resetSteps = () => setIdx(-1);

  const domainOf = (v: string) => csp.domains[v] ?? [];
  const updateAssignment = (v: string, val: string | null) => {
    setAssignment((prev) => ({ ...prev, [v]: val }));
  };

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-4">
      <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-1"></div>
        <div className="flex items-center gap-2">
          <Label>Exercise</Label>
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
          {/* Left: controls & step explanation */}
          <div className="lg:col-span-4 space-y-4">
            <div className="space-y-2">
              <Label>
                Partial assignments <Badge variant="secondary"></Badge>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {csp.variables.map((v) => {
                  const dom = domainOf(v);
                  const value = assignment[v] ?? "";
                  return (
                    <div key={v} className="space-y-1">
                      <div className="text-xs text-muted-foreground">{v}</div>
                      <Select
                        value={value || ""}
                        onValueChange={(val) =>
                          updateAssignment(v, val === "" ? null : val)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-">—</SelectItem>
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
              <Button
                onClick={nextStep}
                disabled={steps.length === 0 || idx >= steps.length - 1}
              >
                Next step
              </Button>
              <Button variant="ghost" onClick={resetSteps}>
                Reset
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {idx >= 0 && steps[idx] ? (
                <div className="whitespace-pre-wrap font-mono leading-5 text-sm">
                  {steps[idx].description}
                </div>
              ) : (
                <div className="whitespace-pre-wrap font-mono leading-5 text-sm">
                  Set some partial assignments and click <b>Next step</b>.
                </div>
              )}
            </div>
          </div>

          {/* Right: graph + domains */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="p-3">
              <GraphView
                csp={csp}
                snapshot={snapshot}
                highlight={current?.highlight}
              />
            </Card>
            <Card className="p-3">
              <DomainTable
                variables={csp.variables}
                initialDomains={csp.domains}
                snapshot={snapshot}
                highlight={current?.highlight}
              />
            </Card>
          </div>
        </div>
      </Card>
    </div>
  );
}
