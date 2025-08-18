// ClauseEffects.tsx
"use client";

import type {
  DPLLTree,
  DPLLStep,
  Clause,
  Assignment,
  Literal,
} from "@/components/solvers/lib/dpll-types";

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
  current: Assignment
): Array<[string, boolean]> {
  const out: Array<[string, boolean]> = [];
  const p = parent ?? {};
  for (const [k, v] of Object.entries(current)) {
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

  // Basisformule robuust bepalen en normaliseren naar Clause[]
  const baseFormulaRaw =
    currentStep.inputFormula ??
    parent?.inputFormula ??
    parent?.formula ??
    currentStep.formula;

  const clauses: Clause[] = Array.isArray(baseFormulaRaw)
    ? (baseFormulaRaw as Clause[])
    : baseFormulaRaw?.clauses ?? [];

  // Delta bepalen
  let delta: Array<[string, boolean]> =
    currentStep.deltaApplied?.map(({ variable, value }) => [variable, value]) ??
    [];

  if (delta.length === 0) {
    delta = diffAssignments(parent?.assignment, currentStep.assignment);
  }
  if (delta.length === 0) {
    delta = buildFallbackDelta(currentStep);
  }

  const appliedText =
    delta.length > 0
      ? delta.map(([v, val]) => `${v}=${val ? "1" : "0"}`).join(", ")
      : "(No new allocation in this step)";

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
      <h4 className="font-medium text-sm mb-1"></h4>

      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground">(No clauses)</div>
      ) : (
        <div className="space-y-1">
          {rows.map((r, i) => (
            <div key={i} className="text-xs font-mono">
              <span>{r.before}</span>{" "}
              <span className="text-muted-foreground">{r.note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
