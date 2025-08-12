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

import GraphView from "@/components/csp/graph-view";
import DomainTable from "@/components/csp/domain-table";
import { EXERCISES } from "@/components/csp/lib/csp-exercises";

import {
  type CSP,
  type Snapshot,
  type Constraint,
  type CSPStepWithSnapshot,
} from "@/components/csp/lib/csp-types";

/* ----------------------------- helpers ----------------------------- */

const CLEAR = "__clear__";

function deepCloneDomains(domains: Record<string, string[]>) {
  const out: Record<string, string[]> = {};
  for (const k in domains) out[k] = [...domains[k]];
  return out;
}

function neighborsMap(csp: CSP): Record<string, string[]> {
  const map: Record<string, Set<string>> = {};
  csp.variables.forEach((v) => (map[v] = new Set()));
  csp.constraints.forEach((c) => {
    for (const v of c.scope)
      for (const u of c.scope) if (v !== u) map[v].add(u);
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

function findConstraintBetween(csp: CSP, a: string, b: string) {
  return csp.constraints.filter(
    (c) =>
      c.scope.length === 2 &&
      ((c.scope[0] === a && c.scope[1] === b) ||
        (c.scope[0] === b && c.scope[1] === a))
  );
}

function formatEdgeLabel(c: Constraint, left: string, right: string): string {
  const raw = (c.label ?? symbolFor(c)).trim();
  const fwd =
    c.scope.length === 2 && c.scope[0] === left && c.scope[1] === right;

  const mAbs = raw.match(
    /^\|\s*[A-Za-z]+\s*-\s*[A-Za-z]+\s*\|\s*(≥|<=|>=|≤|<|>)\s*([+-]?\d+)$/
  );
  if (mAbs) {
    const op = mAbs[1] === ">=" ? "≥" : mAbs[1] === "<=" ? "≤" : mAbs[1];
    const k = parseInt(mAbs[2], 10);
    return `|${left} - ${right}| ${op} ${k}`;
  }
  const mEq = raw.match(/^=\s*([+-]?\d+)$/);
  if (mEq) {
    let k = parseInt(mEq[1], 10);
    if (!fwd) k = -k;
    const sign = k >= 0 ? "+ " : "- ";
    return `${left} = ${right} ${sign}${Math.abs(k)}`;
  }
  const mCmp = raw.match(/^([<>]=?|≥|≤)\s*([+-]?\d+)$/);
  if (mCmp) {
    let op = mCmp[1];
    let k = parseInt(mCmp[2], 10);
    if (!fwd) {
      op = invertOp(op);
      k = -k;
    }
    const sign = k >= 0 ? "+ " : "- ";
    return `${left} ${op} ${right} ${sign}${Math.abs(k)}`;
  }
  let op = raw;
  if (!fwd) op = invertOp(op);
  return `${left} ${op} ${right}`;
}

function opText(csp: CSP, from: string, to: string): string {
  const cons = findConstraintBetween(csp, from, to)[0];
  if (!cons) return `${from} ? ${to}`;
  return formatEdgeLabel(cons, from, to);
}

function constraintSatisfied(c: Constraint, ...args: string[]): boolean {
  if (c.type === "eq" && c.scope.length === 2) return args[0] === args[1];
  if (c.type === "neq" && c.scope.length === 2) return args[0] !== args[1];
  if (c.predicate) {
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

/* ---------- Unary pre-pass (same as in general/AC-3 demos) ---------- */
function unaryFilterDomains(
  csp: CSP,
  assignment: Record<string, string | null>,
  domains: Record<string, string[]>,
  push: (s: CSPStepWithSnapshot) => void
) {
  push({
    step: { kind: "unary-filter-start" } as any,
    snapshot: snapshotOf(csp, assignment, domains, undefined, [], undefined),
    description: "Unary constraints pre-pass: filter domains",
  });

  for (const c of csp.constraints) {
    if (c.scope.length !== 1) continue;
    const v = c.scope[0];
    const dom = domains[v];

    if (assignment[v] != null) {
      const val = assignment[v] as string;
      push({
        step: {
          kind: "check-constraint",
          variable: v,
          neighbor: v,
          edge: [v, v],
          consistent: true,
        } as any,
        snapshot: snapshotOf(csp, assignment, domains, v, [], undefined),
        description: `Check unary ${symbolFor(c)} on ${v} with ${v}=${val}`,
        highlight: { variable: v, edge: [v, v], constraintStatus: "checking" },
      });
      const ok = constraintSatisfied(c, val);
      push({
        step: {
          kind: "check-constraint-result",
          variable: v,
          neighbor: v,
          edge: [v, v],
          consistent: ok,
        } as any,
        snapshot: snapshotOf(csp, assignment, domains, v, [], undefined),
        description: `${ok ? "OK" : "Conflict"}: ${v}=${val} ${
          ok ? "satisfies" : "violates"
        } ${symbolFor(c)}`,
        highlight: {
          variable: v,
          edge: [v, v],
          constraintStatus: ok ? "ok" : "fail",
        },
      });
      continue;
    }

    let i = 0;
    while (i < dom.length) {
      const val = dom[i];
      push({
        step: {
          kind: "check-constraint",
          variable: v,
          neighbor: v,
          edge: [v, v],
          consistent: true,
        } as any,
        snapshot: snapshotOf(csp, assignment, domains, v, [], undefined),
        description: `Check unary ${symbolFor(c)} on ${v} with ${v}=${val}`,
        highlight: { variable: v, edge: [v, v], constraintStatus: "checking" },
      });
      const ok = constraintSatisfied(c, val);
      if (!ok) {
        dom.splice(i, 1);
        push({
          step: {
            kind: "unary-filter-eliminate",
            variable: v,
            valueEliminated: val,
          } as any,
          snapshot: snapshotOf(
            csp,
            assignment,
            domains,
            v,
            [{ variable: v, value: val }],
            undefined
          ),
          description: `Unary filter: remove ${val} from domain(${v}) due to ${symbolFor(
            c
          )}`,
          highlight: { variable: v, edge: [v, v], constraintStatus: "fail" },
        });
      } else {
        push({
          step: {
            kind: "check-constraint-result",
            variable: v,
            neighbor: v,
            edge: [v, v],
            consistent: true,
          } as any,
          snapshot: snapshotOf(csp, assignment, domains, v, [], undefined),
          description: `OK: ${v}=${val} satisfies ${symbolFor(c)}`,
          highlight: { variable: v, edge: [v, v], constraintStatus: "ok" },
        });
        i++;
      }
    }
  }

  push({
    step: { kind: "unary-filter-end" } as any,
    snapshot: snapshotOf(csp, assignment, domains, undefined, [], undefined),
    description: "Unary pre-pass finished",
  });
}

/* -------------------------- Forward Checking -------------------------- */

function runFCSteps(
  csp: CSP,
  baseAssignment: Record<string, string | null>,
  baseDomains: Record<string, string[]>
): CSPStepWithSnapshot[] {
  const steps: CSPStepWithSnapshot[] = [];
  const assignment = { ...baseAssignment };
  const domains = deepCloneDomains(baseDomains);

  // Zet toegewezen variabelen op singletons
  for (const v of csp.variables) {
    if (assignment[v] != null) domains[v] = [assignment[v] as string];
  }

  const push = (s: CSPStepWithSnapshot) => steps.push(s);

  // 1) Unary pre-pass (zelfde als andere demo)
  unaryFilterDomains(csp, assignment, domains, push);

  // 2) Forward Checking: enkel loggen bij échte eliminaties
  const neighs = neighborsMap(csp);
  const assignedVars = csp.variables.filter((v) => assignment[v] != null);

  push({
    step: { kind: "forward-check-start" } as any,
    snapshot: snapshotOf(csp, assignment, domains, undefined, [], undefined),
    description: "Forward Checking started",
  });

  for (const X of assignedVars) {
    const xVal = assignment[X] as string;

    for (const Y of neighs[X]) {
      if (assignment[Y] != null) continue;

      const consXY = findConstraintBetween(csp, X, Y);
      if (consXY.length === 0) continue;

      // 1 lijntje context (geen per-waarde tries)
      push({
        step: { kind: "forward-check-onto", from: X, to: Y } as any,
        snapshot: snapshotOf(csp, assignment, domains, Y, [], undefined),
        description: `Check domain(${Y}) against ${opText(csp, X, Y)}`,
        highlight: { edge: [X, Y], variable: Y, constraintStatus: "checking" },
      });

      const domY = domains[Y];
      const removedNow: string[] = [];
      let i = 0;

      while (i < domY.length) {
        const yVal = domY[i];

        // Ondersteuning checken: (a) alle X–Y constraints, (b) andere constraints met Y die nu volledig instantiëerbaar zijn
        let ok = true;
        let culprit: Constraint | null = null;

        // (a) X–Y constraints
        for (const c of consXY) {
          const args = c.scope[0] === X ? [xVal, yVal] : [yVal, xVal];
          if (!constraintSatisfied(c, ...args)) {
            ok = false;
            culprit = c;
            break;
          }
        }

        // (b) andere constraints met Y
        if (ok) {
          for (const c of csp.constraints) {
            if (!c.scope.includes(Y)) continue;
            if (c.scope.length === 2 && consXY.includes(c)) continue;

            const vals: Record<string, string> = { [Y]: yVal };
            let ready = true;
            for (const v of c.scope) {
              if (v === Y) continue;
              const av = assignment[v];
              if (av == null) {
                ready = false;
                break;
              }
              vals[v] = av;
            }
            if (!ready) continue;

            const args = c.scope.map((v) => vals[v]);
            if (!constraintSatisfied(c, ...args)) {
              ok = false;
              culprit = c;
              break;
            }
          }
        }

        if (!ok) {
          // Verwijder en log met reden (constraint label), rood highlight
          const label =
            culprit && culprit.scope.length === 2
              ? formatEdgeLabel(culprit, X, Y)
              : culprit
              ? `${
                  culprit.scope.length === 1 ? `${culprit.scope[0]} ` : ""
                }${symbolFor(culprit)}`
              : "constraint";

          domY.splice(i, 1);
          removedNow.push(yVal);

          push({
            step: {
              kind: "forward-check-eliminate",
              from: X,
              to: Y,
              valueEliminated: yVal,
              reason: label,
            } as any,
            snapshot: snapshotOf(
              csp,
              assignment,
              domains,
              Y,
              [{ variable: Y, value: yVal }],
              undefined
            ),
            description: `Remove ${yVal} from domain(${Y}) due to ${label}`,
            highlight: { edge: [X, Y], variable: Y, constraintStatus: "fail" },
          });
        } else {
          // Niets loggen als de waarde mag blijven — gewoon verder
          i++;
        }
      }

      // Als domein leeg wordt: stop en meld inconsistentie
      if (domains[Y].length === 0) {
        push({
          step: { kind: "forward-check-end", result: "inconsistent" } as any,
          snapshot: snapshotOf(csp, assignment, domains, Y, [], undefined),
          description: `FC stopped: empty domain at ${Y}`,
          highlight: { variable: Y, constraintStatus: "fail" },
        });
        return steps;
      }

      // Eventueel korte samenvatting per Y
      if (removedNow.length) {
        push({
          step: { kind: "forward-check-summary", to: Y } as any,
          snapshot: snapshotOf(csp, assignment, domains, Y, [], undefined),
          description: `Pruned from ${Y}: {${removedNow.join(", ")}}`,
          highlight: { variable: Y, constraintStatus: "ok" },
        });
      }
    }
  }

  push({
    step: { kind: "forward-check-end", result: "done" } as any,
    snapshot: snapshotOf(csp, assignment, domains, undefined, [], undefined),
    description: "Forward Checking finished",
  });

  return steps;
}
// Kleine, lokale FC-runner met step-through output (geen opties nodig)
function forwardCheckStepwise(
  csp: CSP,
  variable: string,
  value: string,
  domains: Record<string, string[]>,
  assignment: Record<string, string | null>,
  push: (s: CSPStepWithSnapshot) => void
) {
  let eliminatedCount = 0;
  const pruned: Array<{ variable: string; value: string }> = [];

  // Startstap
  push({
    step: { kind: "forward-check-start", variable } as any,
    snapshot: snapshotOf(csp, assignment, domains, variable, [], undefined),
    description: `Forward Checking started for ${variable} = ${value}`,
    highlight: { variable },
  });

  // assignment incl. (variable=value)
  const augmented: Record<string, string | null> = {
    ...assignment,
    [variable]: value,
  };

  // helper om als eerste falende constraint te rapporteren
  const firstFail = (
    nb: string,
    nbVal: string
  ): { c: Constraint; args: string[]; other: string } | null => {
    for (const c of csp.constraints) {
      if (!c.scope.includes(nb)) continue;

      const vals: Record<string, string> = { [nb]: nbVal };
      let ready = true;
      for (const v2 of c.scope) {
        if (v2 === nb) continue;
        const vv = v2 === variable ? value : (augmented[v2] as string | null);
        if (vv == null) {
          ready = false;
          break;
        }
        vals[v2] = vv;
      }
      if (!ready) continue;

      const args = c.scope.map((v) => vals[v]);
      // zelfde constraintSatisfied als in solver
      if (
        (c.type === "eq" && c.scope.length === 2 && args[0] !== args[1]) ||
        (c.type === "neq" && c.scope.length === 2 && args[0] === args[1]) ||
        (c.predicate &&
          (() => {
            try {
              const obj: any = {};
              c.scope.forEach((v, i) => {
                obj[v] = args[i];
                obj[v.toLowerCase()] = args[i];
              });
              const r1 = (c.predicate as any)(obj);
              if (typeof r1 === "boolean") return !r1;
            } catch {}
            try {
              const r2 = (c.predicate as any)(...args);
              if (typeof r2 === "boolean") return !r2;
            } catch {}
            return false;
          })())
      ) {
        const other = c.scope.find((s) => s !== nb) ?? nb;
        return { c, args, other };
      }
    }
    return null;
  };

  // loop alle niet-toegewezen buren
  for (const nb of csp.variables) {
    if (nb === variable) continue;
    if (assignment[nb] != null) continue;

    const nbDom = domains[nb];
    for (let i = nbDom.length - 1; i >= 0; i--) {
      const v = nbDom[i];
      const fail = firstFail(nb, v);
      if (!fail) continue;

      // verwijder v
      nbDom.splice(i, 1);
      eliminatedCount++;
      pruned.push({ variable: nb, value: v });

      // beschrijving + highlight constraint rood
      const nice = formatEdgeLabel(fail.c, fail.other, nb);
      const scopeVals = fail.c.scope
        .map((vv, k) => `${vv}=${fail.args[k]}`)
        .join(", ");

      push({
        step: {
          kind: "forward-check-eliminate",
          from: variable,
          to: nb,
          valueEliminated: v,
          reason: nice,
        } as any,
        snapshot: snapshotOf(
          csp,
          assignment,
          domains,
          nb,
          [{ variable: nb, value: v }],
          undefined
        ),
        description: `FC: remove ${v} from domain(${nb}) because ${nice} for (${scopeVals})`,
        highlight: {
          edge: fail.c.scope.length === 1 ? [nb, nb] : [fail.other, nb],
          variable: nb,
          constraintStatus: "fail",
        },
      });

      if (nbDom.length === 0) {
        push({
          step: { kind: "forward-check-end", eliminatedCount } as any,
          snapshot: snapshotOf(
            csp,
            assignment,
            domains,
            variable,
            pruned,
            undefined
          ),
          description: `FC completed: removed ${eliminatedCount} values — empty domain at ${nb}`,
          highlight: { variable },
        });
        return;
      }
    }
  }

  // eindstap
  push({
    step: { kind: "forward-check-end", eliminatedCount } as any,
    snapshot: snapshotOf(csp, assignment, domains, variable, pruned, undefined),
    description: `FC completed: removed ${eliminatedCount} value${
      eliminatedCount === 1 ? "" : "s"
    }`,
    highlight: { variable },
  });
}

function buildFCStepsSequential(
  csp: CSP,
  partial: Record<string, string | null>,
  baseDomains: Record<string, string[]>
): CSPStepWithSnapshot[] {
  const steps: CSPStepWithSnapshot[] = [];
  const domains = deepCloneDomains(baseDomains);
  const asn: Record<string, string | null> = {};
  for (const v of csp.variables) asn[v] = null;

  for (const v of csp.variables) {
    const val = partial[v];
    if (val == null) continue;

    asn[v] = val;
    domains[v] = [val];
    steps.push({
      step: { kind: "assign", variable: v, value: val } as any,
      snapshot: snapshotOf(csp, asn, domains, v, [], undefined),
      description: `Assume partial: ${v} = ${val}`,
      highlight: { variable: v },
    });

    // HIER de lokale FC call
    forwardCheckStepwise(csp, v, val, domains, asn, (s) => steps.push(s));

    if (Object.values(domains).some((d) => d.length === 0)) break;
  }
  return steps;
}

/* ----------------------------- Component ----------------------------- */

export default function FCPlayground() {
  const [exerciseId, setExerciseId] = useState<string>(EXERCISES[0].id);
  const csp = useMemo<CSP>(
    () => EXERCISES.find((e) => e.id === exerciseId)!,
    [exerciseId]
  );

  const [assignment, setAssignment] = useState<Record<string, string | null>>(
    () =>
      Object.fromEntries(csp.variables.map((v) => [v, null])) as Record<
        string,
        string | null
      >
  );

  const [steps, setSteps] = useState<CSPStepWithSnapshot[]>([]);
  const [idx, setIdx] = useState<number>(-1);
  const currentStep = idx >= 0 && idx < steps.length ? steps[idx] : null;
  const snapshot = currentStep?.snapshot ?? null;

  const resetAll = useCallback(() => {
    setAssignment(
      Object.fromEntries(csp.variables.map((v) => [v, null])) as Record<
        string,
        string | null
      >
    );
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
    const s = buildFCStepsSequential(csp, assignment, csp.domains);
    setSteps(s);
    setIdx(s.length > 0 ? 0 : -1);
  };

  const nextStep = () => {
    if (steps.length === 0) return prepareAndRun();
    setIdx((i) => Math.min(steps.length - 1, i + 1));
  };

  const resetSteps = () => setIdx(-1);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <Label className="text-sm">Exercise</Label>
          <Select
            value={exerciseId}
            onValueChange={(v) => {
              setExerciseId(v);
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
          {/* LEFT: controls + explanation */}
          <div className="lg:col-span-4 space-y-4">
            <div className="space-y-2">
              <Label>
                Partial assignments <Badge variant="secondary"></Badge>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {csp.variables.map((v) => {
                  const dom = domainOf(v);
                  const current = assignment[v];
                  const sel =
                    current && dom.includes(current) ? current : CLEAR;
                  return (
                    <div key={v} className="space-y-1">
                      <div className="text-xs text-muted-foreground">{v}</div>
                      <Select
                        value={sel}
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
                  <div className="text-foreground"></div>
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
