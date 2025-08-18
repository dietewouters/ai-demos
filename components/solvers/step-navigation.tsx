"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type {
  DPLLTree,
  DPLLStep,
  Clause,
  Assignment,
  Literal,
} from "@/components/solvers/lib/dpll-types";
import {
  getNextStepId,
  getPreviousStepId,
  getStepPosition,
} from "@/components/solvers/lib/tree-navigation";
import { formatAssignment } from "@/components/solvers/lib/formula-parser";

interface StepNavigationProps {
  tree: DPLLTree;
  activeStepId: string;
  onStepChange: (stepId: string) => void;
  onReset: () => void;
}

/* ---------- helpers: formatting ---------- */
function litToString(v: string, neg: boolean) {
  return (neg ? "¬" : "") + v;
}
function clauseToString(c: Clause): string {
  if (!c || c.literals.length === 0) return "□";
  const s = c.literals.map((l) => litToString(l.variable, l.negated)).join("∨");
  return c.literals.length > 1 ? `(${s})` : s;
}

/* ---------- helpers: delta bepalen ---------- */
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

/* ---------- helpers: clause transformeren met delta ---------- */
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
          // literal wordt false → skip hem
          continue outer;
        }
      }
    }
    // geen info voor deze literal → blijft staan
    newLits.push(lit);
  }

  if (satisfied) return { status: "satisfied" };
  if (newLits.length === 0) return { status: "empty", after: { literals: [] } };
  if (newLits.length !== clause.literals.length)
    return { status: "reduced", after: { literals: newLits } };
  return { status: "unchanged", after: { literals: newLits } };
}

export function StepNavigation({
  tree,
  activeStepId,
  onStepChange,
  onReset,
}: StepNavigationProps) {
  const currentStep = tree.steps.get(activeStepId);
  const nextStepId = getNextStepId(tree, activeStepId);
  const previousStepId = getPreviousStepId(tree, activeStepId);
  const position = getStepPosition(tree, activeStepId);

  const handleNextStep = () => nextStepId && onStepChange(nextStepId);
  const handlePreviousStep = () =>
    previousStepId && onStepChange(previousStepId);
  const handleReset = () => {
    onStepChange(tree.rootId);
    onReset();
  };

  const getStepTypeColor = (type: string) => {
    switch (type) {
      case "split":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "unit-propagation":
        return "bg-green-100 text-green-800 border-green-200";
      case "result":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };
  const getResultColor = (result?: string) => {
    switch (result) {
      case "SAT":
        return "bg-green-500 text-white";
      case "UNSAT":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  if (!currentStep) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No step selected</p>
        </CardContent>
      </Card>
    );
  }

  // ---------- Clause-explain input + delta ----------
  const parent = currentStep.parentId
    ? tree.steps.get(currentStep.parentId)
    : undefined;

  // 1) input-formule zo robuust mogelijk bepalen
  const baseFormula =
    currentStep.inputFormula ??
    parent?.inputFormula ?? // ← eerst parent.inputFormula
    parent?.formula ?? // dan pas parent.formula
    currentStep.formula;
  // 2) delta bepalen (voorkeur: deltaApplied)
  let delta: Array<[string, boolean]> =
    currentStep.deltaApplied?.map(({ variable, value }) => [variable, value]) ??
    [];

  if (delta.length === 0) {
    // 1) probeer diff t.o.v. parent-assignment
    delta = diffAssignments(parent?.assignment, currentStep.assignment);
  }
  if (delta.length === 0) {
    // 2) ultieme fallback: afleiden uit step-type
    delta = buildFallbackDelta(currentStep);
  }

  // 3) per clause uitleg genereren
  const clauses: Clause[] = Array.isArray(baseFormula)
    ? (baseFormula as Clause[]) // formule is al een array
    : baseFormula?.clauses ?? [];
  const clauseRows = clauses.map((cl) => {
    const before = clauseToString(cl);
    if (!delta.length) return { before, note: "⇒ unchanged" };

    const t = applyDeltaToClause(cl, delta);
    if (t.status === "satisfied") return { before, note: "⇒ satisfied" };
    if (t.status === "empty") return { before, note: "⇒ □" };
    if (t.status === "reduced" && t.after)
      return { before, note: `⇒ ${clauseToString(t.after)}` };
    return { before, note: "⇒ unchanged" };
  });

  const appliedText =
    delta.length > 0
      ? delta.map(([v, val]) => `${v}=${val ? "T" : "F"}`).join(", ")
      : "(no new assignment at this step)";

  return (
    <Card className="sticky top-6">
      <CardContent className="p-6 space-y-4">
        {/* Step Progress */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Step {position.current} of {position.total}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStepTypeColor(currentStep.type)}>
              {currentStep.type === "split"
                ? "Split"
                : currentStep.type === "unit-propagation"
                ? "Unit Prop"
                : "Result"}
            </Badge>
            <Badge className={getResultColor(currentStep.result)}>
              {currentStep.result || "UNKNOWN"}
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(position.current / position.total) * 100}%` }}
          />
        </div>

        {/* Current Step Information */}
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm mb-1">Current Step:</h4>
            <p className="text-sm text-foreground">{currentStep.explanation}</p>
          </div>

          {currentStep.type === "split" && currentStep.variable && (
            <div>
              <h4 className="font-medium text-sm mb-1">Variable Assignment:</h4>
              <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                {currentStep.variable} = {currentStep.value ? "T" : "F"}
              </span>
            </div>
          )}

          <div>
            <h4 className="font-medium text-sm mb-1">Current Assignment:</h4>
            <span className="font-mono text-sm text-muted-foreground">
              {formatAssignment(currentStep.assignment)}
            </span>
          </div>

          {/* ALWAYS show the clause effects block */}
          <div className="pt-2">
            <h4 className="font-medium text-sm mb-1">
              Clause effects this step
            </h4>
            <div className="text-xs text-muted-foreground mb-1">
              Applied:{" "}
              <span className="font-mono text-foreground">{appliedText}</span>
            </div>

            {clauseRows.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                (No clauses to display)
              </div>
            ) : (
              <div className="space-y-1">
                {clauseRows.map((row, i) => (
                  <div key={i} className="text-xs font-mono">
                    <span>{row.before}</span>{" "}
                    <span className="text-muted-foreground">{row.note}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-1 bg-transparent"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousStep}
            disabled={!previousStepId}
            className="flex items-center gap-1 bg-transparent"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextStep}
            disabled={!nextStepId}
            className="flex items-center gap-1 bg-transparent"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Hints */}
        <div className="text-xs text-muted-foreground text-center">
          {!previousStepId && !nextStepId
            ? "This is the only step"
            : !previousStepId
            ? "This is the first step"
            : !nextStepId
            ? "This is the final step"
            : "Use Next/Previous to navigate through steps"}
        </div>
      </CardContent>
    </Card>
  );
}
