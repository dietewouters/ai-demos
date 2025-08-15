"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { parseFormula } from "@/components/solvers/lib/formula-parser";
import { DPLLSolver } from "@/components/solvers/lib/dpll-algorithm";
import { TreeVisualization } from "@/components/solvers/tree-visualisation";
import { getStepTraversalOrder } from "@/components/solvers/lib/tree-navigation";
import type { DPLLTree } from "@/components/solvers/lib/dpll-types";
import { Settings } from "lucide-react";

const EXAMPLE_FORMULAS = [
  {
    name: "Example of DPLL",
    formula: "(X∨W) ∧ (Y∨Z)",
  },
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

export function SATSolverDemo() {
  const [selectedExample, setSelectedExample] = useState<string>("");
  const [customFormula, setCustomFormula] = useState<string>("");
  const [algorithm, setAlgorithm] = useState<string>("dpll");
  const [unitPropagation, setUnitPropagation] = useState<boolean>(false);
  const [earlyStopping, setEarlyStopping] = useState<boolean>(false);
  const [currentFormula, setCurrentFormula] = useState<string>("");
  const [dpllTree, setDpllTree] = useState<DPLLTree | null>(null);
  const [activeStepId, setActiveStepId] = useState<string>("");
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [stepOrder, setStepOrder] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // simpele pre-order traversal (root -> children)
  const computeTraversal = (tree: DPLLTree): string[] => {
    const order: string[] = [];
    const visit = (id: string) => {
      const step = tree.steps.get(id);
      if (!step) return;
      order.push(id);
      for (const cid of step.children) visit(cid);
    };
    visit(tree.rootId);
    return order;
  };

  const handleExampleSelect = (value: string) => {
    setSelectedExample(value);
    const example = EXAMPLE_FORMULAS.find((f) => f.name === value);
    if (example) {
      setCurrentFormula(example.formula);
      setCustomFormula("");
    }
  };

  const handleCustomFormulaChange = (value: string) => {
    setCustomFormula(value);
    setCurrentFormula(value);
    setSelectedExample("");
  };

  const handleStartSolver = () => {
    setErrorMsg("");
    setDpllTree(null);
    setActiveStepId("");
    setCurrentStepIndex(0);
    setStepOrder([]);

    if (!currentFormula) return;

    try {
      const parsedFormula = parseFormula(currentFormula);
      const solver = new DPLLSolver({ unitPropagation, earlyStopping });

      const tree: DPLLTree =
        algorithm === "sat"
          ? solver.solveSAT(parsedFormula)
          : solver.solve(parsedFormula);

      // fallback op lokale traversal
      const order = computeTraversal(tree);

      setDpllTree(tree);
      setStepOrder(order);
      setActiveStepId(tree.rootId);
      setCurrentStepIndex(0);
    } catch (error: any) {
      console.error("Error:", error);
      setErrorMsg(error?.message ?? "Onbekende fout tijdens parsen/solven");
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < stepOrder.length - 1) {
      const newIndex = currentStepIndex + 1;
      setCurrentStepIndex(newIndex);
      setActiveStepId(stepOrder[newIndex]);
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);
      setActiveStepId(stepOrder[newIndex]);
    }
  };

  const handleReset = () => {
    if (dpllTree) {
      setActiveStepId(dpllTree.rootId);
      setCurrentStepIndex(0);
    }
  };

  const getCurrentStep = () => {
    if (!dpllTree || !activeStepId) return null;
    return dpllTree.steps.get(activeStepId);
  };

  const currentStep = getCurrentStep();
  const isReadyToSolve = currentFormula.trim() !== "";

  const visibleEvent = Math.max(
    currentStep?.createdAt ?? 0,
    currentStep?.resolvedAt ?? 0
  );
  return (
    <div className="flex h-screen bg-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Settings className="w-5 h-5" aria-hidden="true" />
          <span className="not-sr-only inline-block text-foreground">
            Controls
          </span>
        </CardTitle>
      </CardHeader>

      <div className="w-80 shrink-0 border-r bg-card p-6 overflow-y-auto sticky top-0 max-h-screen">
        <div className="space-y-6">
          {/* Formula Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Choose Formula</Label>
            <Select value={selectedExample} onValueChange={handleExampleSelect}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select example..." />
              </SelectTrigger>
              <SelectContent>
                {EXAMPLE_FORMULAS.map((example) => (
                  <SelectItem
                    key={example.name}
                    value={example.name}
                    className="text-xs"
                  >
                    {example.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="text-center text-xs text-muted-foreground">or</div>

            <Textarea
              placeholder="Enter custom formula..."
              value={customFormula}
              onChange={(e) => handleCustomFormulaChange(e.target.value)}
              className="min-h-16 text-xs font-mono"
            />

            {currentFormula && (
              <div className="p-2 bg-muted rounded text-xs font-mono break-all">
                {currentFormula}
              </div>
            )}
          </div>

          {/* Algorithm Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Algorithm</Label>
            <Select value={algorithm} onValueChange={setAlgorithm}>
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
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="unit-prop"
                    checked={unitPropagation}
                    onCheckedChange={(checked) =>
                      setUnitPropagation(checked as boolean)
                    }
                  />
                  <Label htmlFor="unit-prop" className="text-xs">
                    Unit Propagation
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="early-stop"
                    checked={earlyStopping}
                    onCheckedChange={(checked) =>
                      setEarlyStopping(checked as boolean)
                    }
                  />
                  <Label htmlFor="early-stop" className="text-xs">
                    Early Stopping
                  </Label>
                </div>
              </div>
            )}
          </div>
          {errorMsg && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {errorMsg}
            </div>
          )}

          {/* Start Button */}
          <Button
            onClick={handleStartSolver}
            disabled={!isReadyToSolve}
            className="w-full"
          >
            Start Solving
          </Button>

          {/* Step Navigation */}
          {dpllTree && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Step Navigation</Label>
                  <Badge variant="outline" className="text-xs">
                    {currentStepIndex + 1} / {stepOrder.length}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousStep}
                    disabled={currentStepIndex === 0}
                    className="flex-1 text-xs bg-transparent"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextStep}
                    disabled={currentStepIndex === stepOrder.length - 1}
                    className="flex-1 text-xs bg-transparent"
                  >
                    Next
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="w-full text-xs"
                >
                  Reset
                </Button>
              </div>

              {/* Current Step Info */}
              {currentStep && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Current Step</Label>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            currentStep.result === "SAT"
                              ? "default"
                              : currentStep.result === "UNSAT"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {currentStep.type === "split"
                            ? "Split"
                            : currentStep.type === "unit-propagation"
                            ? "Unit Prop"
                            : currentStep.result || "Processing"}
                        </Badge>
                        {currentStep.modelCount !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {currentStep.modelCount} models
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {currentStep.explanation}
                      </div>

                      {Object.keys(currentStep.assignment).length > 0 && (
                        <div className="text-xs">
                          <div className="font-medium">Assignment:</div>
                          <div className="font-mono">
                            {Object.entries(currentStep.assignment)
                              .map(
                                ([var_, val]) => `${var_}=${val ? "T" : "F"}`
                              )
                              .join(", ")}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {/* Visualization Area */}
      <div className="flex-1 p-6">
        {dpllTree ? (
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">
                {algorithm === "sat" ? "#SAT" : "DPLL"} Algorithm Tree
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full overflow-auto">
              <TreeVisualization
                tree={dpllTree}
                activeStepId={activeStepId}
                visibleEvent={visibleEvent}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Ready to Start</h3>
              <p className="text-sm">
                Choose a formula and click "Start Solving" to begin
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
