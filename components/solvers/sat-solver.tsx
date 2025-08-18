"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { parseFormula } from "@/components/solvers/lib/formula-parser";
import { DPLLSolver } from "@/components/solvers/lib/dpll-algorithm";
import { TreeVisualization } from "@/components/solvers/tree-visualisation";
import type { DPLLTree, DPLLStep } from "@/components/solvers/lib/dpll-types";
import { ClauseEffects } from "./clause-effects";

const EXAMPLE_FORMULAS = [
  { name: "Example of DPLL", formula: "(x ∨ w) ∧ (y ∨ z)" },
  {
    name: "Exercise 1.1",
    formula: "(¬A∨C ∨¬D)∧(A∨B ∨C ∨¬D)∧(¬A∨¬E)∧¬C ∧(A∨D)∧(A∨C ∨E)∧(D ∨E)",
  },
  {
    name: "Exercise 1.2",
    formula:
      "(E ∨ A) ∧ (B ∨ ¬A ∨ C) ∧ (E ∨ ¬D) ∧ (B ∨ ¬C) ∧ (¬B ∨ D) ∧ (¬E ∨ ¬A ∨ ¬D ∨ ¬B)",
  },
  {
    name: "Exercise 2",
    formula:
      "(¬A ∨ ¬B ∨ ¬C) ∧ (¬A ∨ ¬B ∨ C ∨ D) ∧ (¬A ∨ B ∨ C ∨ D) ∧ (¬A ∨ ¬B ∨ C ∨ ¬D)",
  },
];

function getStepOrder(tree: DPLLTree): string[] {
  return Array.from(tree.steps.values())
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
    .map((s) => s.id);
}

export function SATSolverDemo() {
  // UI
  const [selectedExample, setSelectedExample] = useState("");
  const [customFormula, setCustomFormula] = useState("");
  const [algorithm, setAlgorithm] = useState<"dpll" | "sat">("dpll");
  const [unitPropagation, setUnitPropagation] = useState(true);
  const [earlyStopping, setEarlyStopping] = useState(true);

  const FINISH_ID = "__finish__";

  // Run config snapshot (so we know how the last run was executed)
  const [runConfig, setRunConfig] = useState<{
    algo: "dpll" | "sat";
    early: boolean;
  } | null>(null);

  // Solver state
  const [tree, setTree] = useState<DPLLTree | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [activeStepId, setActiveStepId] = useState<string>("");
  const [idx, setIdx] = useState(0);

  const currentFormula = useMemo(() => {
    if (selectedExample) {
      const ex = EXAMPLE_FORMULAS.find((e) => e.name === selectedExample);
      return ex?.formula ?? "";
    }
    return customFormula;
  }, [selectedExample, customFormula]);

  const isReady = currentFormula.trim().length > 0;

  // Reveal only up to the *current step*
  const visibleEvent = useMemo(() => {
    if (!tree || !activeStepId) return 0;
    if (activeStepId === FINISH_ID) return Number.POSITIVE_INFINITY; // toon & kleur alles
    return tree.steps.get(activeStepId)?.createdAt ?? 0; // stap-voor-stap
  }, [tree, activeStepId]);

  const currentStep =
    tree && activeStepId !== FINISH_ID
      ? tree.steps.get(activeStepId)
      : undefined;

  const displayStep = useMemo(() => {
    if (!currentStep) return undefined;
    const cutoff = visibleEvent ?? 0;
    const decisionStamp = currentStep.resolvedAt ?? currentStep.createdAt ?? 0;
    const resolvedShown = cutoff >= decisionStamp;

    return {
      ...currentStep,
      result: resolvedShown ? currentStep.result : "UNKNOWN",
      modelCount: resolvedShown ? currentStep.modelCount : undefined,
    } as DPLLStep;
  }, [currentStep, visibleEvent]);

  // Do we already have model counts?
  const hasModelCounts =
    !!tree &&
    Array.from(tree.steps.values()).some((s) => s.modelCount !== undefined);

  const start = () => {
    if (!isReady) return;
    try {
      const parsed = parseFormula(currentFormula);
      const solver = new DPLLSolver({ unitPropagation, earlyStopping });
      const t =
        algorithm === "sat" ? solver.solveSAT(parsed) : solver.solve(parsed);

      const ord = getStepOrder(t);
      setTree(t);
      setOrder(ord);
      setActiveStepId(t.rootId);
      setIdx(ord.indexOf(t.rootId));
      setRunConfig({ algo: algorithm, early: earlyStopping });
      const ordWithFinish = [...ord, FINISH_ID];

      setTree(t);
      setOrder(ordWithFinish);
      setActiveStepId(t.rootId);
      setIdx(ordWithFinish.indexOf(t.rootId));
    } catch (e) {
      console.error(e);
    }
  };

  const next = () => {
    if (!tree || idx >= order.length - 1) return;
    const n = idx + 1;
    setIdx(n);
    setActiveStepId(order[n]);
  };
  const prev = () => {
    if (!tree || idx <= 0) return;
    const n = idx - 1;
    setIdx(n);
    setActiveStepId(order[n]);
  };
  const reset = () => {
    if (!tree) return;
    const i0 = order.indexOf(tree.rootId);
    setIdx(i0 >= 0 ? i0 : 0);
    setActiveStepId(tree.rootId);
  };

  const calcModels = () => {
    if (!tree) return;
    // compute in place, then clone the Map to trigger rerender
    const solver = new DPLLSolver({ unitPropagation, earlyStopping: false });
    solver.computeModelCountsInPlace(tree);
    setTree({ ...tree, steps: new Map(tree.steps) });
  };

  // Ref naar de Textarea
  const customRef = useRef<HTMLTextAreaElement>(null);

  // Tekst invoegen op cursorpositie
  function insertAtCursor(text: string) {
    const el = customRef.current;
    if (!el) return;

    // als er een voorbeeld gekozen is, overschakelen naar custom invoer
    setSelectedExample("");

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;

    const next = el.value.slice(0, start) + text + el.value.slice(end);
    setCustomFormula(next);

    // Caret achter het ingevoegde stuk
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  }

  // Toonbare knoppen (inclusief ASCII en logische varianten)
  const SYMBOLS: { label: string; insert: string; title?: string }[] = [
    { label: "¬", insert: "¬", title: "NOT" },
    { label: "∧", insert: " ∧ ", title: "AND (∧)" },
    { label: "∨", insert: " ∨ ", title: "OR (∨)" },
    { label: "(", insert: "(", title: "Open bracket" },
    { label: ")", insert: ")", title: "Close bracket" },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Controls */}
      <CardHeader className="items-start">
        <CardTitle className="flex items-center gap-2 text-left leading-6">
          <Settings className="w-5 h-5 shrink-0" />
          Controls
        </CardTitle>
      </CardHeader>

      <div className="w-80 shrink-0 border-r bg-card p-6 overflow-y-auto">
        {/* Choose Formula (dropdown + custom) */}
        <div className="space-y-2 mb-4">
          <Label className="text-sm font-medium">Choose Formula</Label>
          <Select
            value={selectedExample}
            onValueChange={(v) => {
              setSelectedExample(v);
              setCustomFormula("");
            }}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Select example..." />
            </SelectTrigger>
            <SelectContent>
              {EXAMPLE_FORMULAS.map((ex) => (
                <SelectItem key={ex.name} value={ex.name} className="text-xs">
                  {ex.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="text-center text-xs text-muted-foreground">or</div>

          {/* ⬇️ Symboolbalk */}
          <div className="flex flex-wrap gap-2 mb-2">
            {SYMBOLS.map((s) => (
              <Button
                key={s.label}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => insertAtCursor(s.insert)}
                title={s.title ?? s.label}
                className="px-2"
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>

        <Textarea
          ref={customRef}
          placeholder="Enter custom formula..."
          value={customFormula}
          onChange={(e) => {
            setCustomFormula(e.target.value);
            setSelectedExample("");
          }}
          className="min-h-16 text-xs font-mono"
        />

        {currentFormula && (
          <div className="p-2 bg-muted rounded text-xs font-mono break-all mb-4">
            {currentFormula}
          </div>
        )}

        {/* Algorithm */}
        <div className="space-y-2 mb-4">
          <Label className="text-sm font-medium">Algorithm</Label>
          <Select
            value={algorithm}
            onValueChange={(v) => setAlgorithm(v as "dpll" | "sat")}
          >
            <SelectTrigger className="text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dpll" className="text-xs">
                DPLL
              </SelectItem>
              <SelectItem value="sat" className="text-xs">
                #SAT
              </SelectItem>
            </SelectContent>
          </Select>

          {algorithm === "dpll" && (
            <div className="space-y-2 p-3 bg-muted/50 rounded">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="unit-prop"
                  checked={unitPropagation}
                  onCheckedChange={(c) => setUnitPropagation(Boolean(c))}
                />
                <Label htmlFor="unit-prop" className="text-xs">
                  Unit Propagation
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="early-stop"
                  checked={earlyStopping}
                  onCheckedChange={(c) => setEarlyStopping(Boolean(c))}
                />
                <Label htmlFor="early-stop" className="text-xs">
                  Early Stopping
                </Label>
              </div>
            </div>
          )}
        </div>

        {/* Start */}
        <Button className="w-full mb-4" disabled={!isReady} onClick={start}>
          Start Solving
        </Button>

        {/* After-run actions */}
        {tree &&
          runConfig?.algo === "dpll" &&
          runConfig?.early === false &&
          !hasModelCounts && (
            <Button
              variant="secondary"
              className="w-full mb-4"
              onClick={calcModels}
            >
              Calculate number of models
            </Button>
          )}

        {/* Step navigation */}
        {tree && (
          <>
            <Separator className="my-3" />
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Step Navigation</Label>
              <Badge variant="outline" className="text-xs">
                {idx + 1} / {order.length}
              </Badge>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs bg-transparent"
                onClick={prev}
                disabled={idx === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs bg-transparent"
                onClick={next}
                disabled={idx >= order.length - 1}
              >
                Next
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs mt-2"
              onClick={reset}
            >
              Reset
            </Button>

            {/* Current step info (gated) */}
            {displayStep && (
              <>
                <Separator className="my-3" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        displayStep.result === "SAT"
                          ? "default"
                          : displayStep.result === "UNSAT"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {displayStep.type === "split"
                        ? "Split"
                        : displayStep.type === "unit-propagation"
                        ? "Unit Prop"
                        : displayStep.result || "Processing"}
                    </Badge>

                    {typeof displayStep.modelCount === "number" && (
                      <Badge variant="outline" className="text-xs">
                        {displayStep.modelCount} models
                      </Badge>
                    )}
                  </div>

                  {/* jouw bestaande ‘korte’ uitleg */}
                  <div className="text-xs text-muted-foreground">
                    {displayStep.explanation}
                  </div>

                  {/* ⬇️ extra clausule-uitleg, direct eronder (geen extra card/knoppen) */}
                  {tree && activeStepId !== FINISH_ID && (
                    <ClauseEffects tree={tree} activeStepId={activeStepId} />
                  )}
                </div>
              </>
            )}

            {activeStepId === FINISH_ID && (
              <>
                <Separator className="my-3" />
                <div className="text-xs text-muted-foreground">
                  Finished – full tree shown.
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Visualization */}
      <div className="flex-1 p-6">
        {tree ? (
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">
                {algorithm === "sat" ? "#SAT" : "DPLL"} Algorithm Tree
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full overflow-auto">
              <TreeVisualization
                tree={tree}
                activeStepId={activeStepId}
                onStepClick={(id) => {
                  if (id === FINISH_ID) return;
                  setActiveStepId(id);
                  const i = order.indexOf(id);
                  if (i >= 0) setIdx(i);
                }}
                visibleEvent={visibleEvent}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Ready to Start</h3>
              <p className="text-sm">
                Choose a formula and click "Start Solving".
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
