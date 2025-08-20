"use client";

import type {
  DPLLTree,
  DPLLStep,
  Clause,
  Assignment,
  Literal,
} from "@/components/solvers/lib/dpll-types";
import React from "react";

const NEG = "¬";

function literalTruth(varName: string, negated: boolean, asgn: Assignment) {
  const v = asgn[varName];
  if (v === undefined) return null; // onbepaald → geen kleur
  return negated ? !v : v; // true → groen, false → rood
}

export function ColorizedClause({
  text,
  asgn,
  className,
}: {
  text: string;
  asgn: Assignment;
  className?: string;
}) {
  // leeg/□ gewoon tonen
  if (text.includes("□")) return <span className={className}>{text}</span>;

  const trimmed = text.trim();
  const hadParens = /^\(.*\)$/.test(trimmed);
  const inner = hadParens ? trimmed.slice(1, -1).trim() : trimmed;

  // splits op unicode ∨ of ascii " v "
  const parts = inner
    .split(/∨|(\s+v\s+)/i)
    .filter((p) => p && !/^\s+v\s+$/i.test(p))
    .map((p) => p.trim());

  return (
    <span className={className}>
      {hadParens && "("}
      <span>
        {parts.map((p, i) => {
          const neg = p.startsWith(NEG);
          const name = neg ? p.slice(1).trim() : p;
          const truth = literalTruth(name, neg, asgn);

          const color =
            truth === true
              ? "text-green-600 font-semibold"
              : truth === false
              ? "text-red-600 font-semibold"
              : "";

          return (
            <React.Fragment key={`${i}-${p}`}>
              {i > 0 && <span className="mx-1">∨</span>}
              <span className={color}>
                {neg && NEG}
                {name}
              </span>
            </React.Fragment>
          );
        })}
      </span>
      {hadParens && ")"}
    </span>
  );
}

function litToString(v: string, neg: boolean) {
  return (neg ? "¬" : "") + v;
}
function clauseToString(c: Clause): string {
  if (!c || c.literals.length === 0) return "□";
  const s = c.literals.map((l) => litToString(l.variable, l.negated)).join("∨");
  return c.literals.length > 1 ? `(${s})` : s;
}

function diffAssignments(
  parent: Assignment | undefined,
  current?: Assignment
): Array<[string, boolean]> {
  const out: Array<[string, boolean]> = [];
  const p = parent ?? {};
  const c = current ?? {};
  for (const [k, v] of Object.entries(c)) {
    if (v === undefined) continue;
    if (p[k] === undefined || p[k] !== v) out.push([k, v as boolean]);
  }
  out.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return out;
}

function buildFallbackDelta(step: DPLLStep): Array<[string, boolean]> {
  if (
    step.type === "split" &&
    step.variable !== undefined &&
    step.value !== undefined
  ) {
    return [[step.variable, step.value]];
  }
  if (step.type === "unit-propagation" && step.unitClauses?.length) {
    const out: Array<[string, boolean]> = [];
    const seen = new Set<string>();
    for (const c of step.unitClauses) {
      if (!c.literals.length) continue;
      const lit = c.literals[0];
      if (seen.has(lit.variable)) continue;
      out.push([lit.variable, !lit.negated]);
      seen.add(lit.variable);
    }
    out.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return out;
  }
  return [];
}

function applyDeltaToClause(
  clause: Clause,
  delta: Array<[string, boolean]>
): { status: "satisfied" | "reduced" | "unchanged" | "empty"; after?: Clause } {
  let satisfied = false;
  const newLits: Literal[] = [];

  outer: for (const lit of clause.literals) {
    for (const [v, val] of delta) {
      if (lit.variable === v) {
        const litVal = lit.negated ? !val : val;
        if (litVal) {
          satisfied = true;
          break outer;
        } else {
          continue outer; // literal wordt false → weg
        }
      }
    }
    newLits.push(lit); // geen info voor deze literal
  }

  if (satisfied) return { status: "satisfied" };
  if (newLits.length === 0) return { status: "empty", after: { literals: [] } };
  if (newLits.length !== clause.literals.length)
    return { status: "reduced", after: { literals: newLits } };
  return { status: "unchanged", after: { literals: newLits } };
}

export function ClauseEffects({
  tree,
  activeStepId,
}: {
  tree: DPLLTree;
  activeStepId: string;
}) {
  const currentStep = tree.steps.get(activeStepId);
  if (!currentStep) return null;

  const parent = currentStep.parentId
    ? tree.steps.get(currentStep.parentId)
    : undefined;

  // huidige (deel)toekenning ophalen; val terug op lege map
  const step = tree.steps.get(activeStepId);
  const assignment = ((step as any)?.assignment ??
    (step as any)?.valuation ??
    (step as any)?.model ??
    (step as any)?.env ??
    {}) as Record<string, boolean | undefined>;

  // Basisformule bepalen en normaliseren naar Clause[]
  const baseFormulaRaw =
    (currentStep as any).inputFormula ??
    (parent as any)?.inputFormula ??
    (parent as any)?.formula ??
    (currentStep as any).formula;

  const clauses: Clause[] = Array.isArray(baseFormulaRaw)
    ? (baseFormulaRaw as Clause[])
    : baseFormulaRaw?.clauses ?? [];

  // Delta (welke variabelen in deze stap gezet/geflipd zijn)
  let delta: Array<[string, boolean]> =
    currentStep.deltaApplied?.map(({ variable, value }) => [variable, value]) ??
    [];

  if (delta.length === 0) {
    delta = diffAssignments(
      (parent as any)?.assignment,
      (currentStep as any).assignment
    );
  }
  if (delta.length === 0) {
    delta = buildFallbackDelta(currentStep);
  }

  const rows = clauses.map((cl) => {
    const before = clauseToString(cl);
    if (!delta.length) return { before, note: "⇒ unchanged" };
    const t = applyDeltaToClause(cl, delta);
    if (t.status === "satisfied") return { before, note: "⇒ satisfied" };
    if (t.status === "empty") return { before, note: "⇒ □" };
    if (t.status === "reduced" && t.after)
      return { before, note: `⇒ ${clauseToString(t.after)}` };
    return { before, note: "⇒ unchanged" };
  });

  return (
    <div className="pt-2">
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground">(No clauses)</div>
      ) : (
        <div className="space-y-1">
          {rows.map((r, i) => (
            <div key={i} className="text-xs font-mono">
              <ColorizedClause text={r.before} asgn={assignment} />
              &nbsp;<span className="text-muted-foreground">{r.note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
