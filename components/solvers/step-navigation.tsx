"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { DPLLTree } from "@/components/solvers/lib/dpll-types";
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

  const handleNextStep = () => {
    if (nextStepId) {
      onStepChange(nextStepId);
    }
  };

  const handlePreviousStep = () => {
    if (previousStepId) {
      onStepChange(previousStepId);
    }
  };

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

          {/* Variable assignment for splits */}
          {currentStep.type === "split" && currentStep.variable && (
            <div>
              <h4 className="font-medium text-sm mb-1">Variable Assignment:</h4>
              <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                {currentStep.variable} = {currentStep.value ? "T" : "F"}
              </span>
            </div>
          )}

          {/* Current assignment */}
          <div>
            <h4 className="font-medium text-sm mb-1">Current Assignment:</h4>
            <span className="font-mono text-sm text-muted-foreground">
              {formatAssignment(currentStep.assignment)}
            </span>
          </div>

          {/* Unit clauses for unit propagation */}
          {currentStep.type === "unit-propagation" &&
            currentStep.unitClauses &&
            currentStep.unitClauses.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-1">
                  Unit Clauses Found:
                </h4>
                <div className="font-mono text-sm text-green-700">
                  {currentStep.unitClauses.map((clause, idx) => (
                    <span key={idx} className="mr-2 bg-green-50 px-1 rounded">
                      {clause.literals
                        .map((lit) => (lit.negated ? "¬" : "") + lit.variable)
                        .join("∨")}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
