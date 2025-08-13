"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface UnificationStep {
  step: number;
  workingSet: string[];
  currentEquality: string;
  case: number;
  caseDescription: string;
  action: string;
  failed: boolean;
  skipped?: boolean;
}

const predefinedExercises = [
  {
    name: "Exercise 1.1",
    left: "p(f(y),w,g(z,y))",
    right: "p(x,x,g(z,A))",
  },
  {
    name: "Exercise 1.2",
    left: "p(A,x,f(g(y)))",
    right: "p(z,f(z),f(A))",
  },
  {
    name: "Exercise 1.3",
    left: "q(x,x)",
    right: "q(y,f(y))",
  },
  {
    name: "Exercise 1.4",
    left: "f(x,g(f(a),u))",
    right: "f(g(u,v),x)",
  },
];

export default function UnificationDemo() {
  const [leftTerm, setLeftTerm] = useState("p(f(y),w,g(z,y))");
  const [rightTerm, setRightTerm] = useState("p(x,x,g(z,A))");
  const [steps, setSteps] = useState<UnificationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  const loadExample = (example: (typeof predefinedExercises)[0]) => {
    setLeftTerm(example.left);
    setRightTerm(example.right);
    reset();
  };

  const reset = () => {
    setSteps([]);
    setCurrentStep(0);
    setIsRunning(false);
    setCompleted(false);
  };

  const runUnification = () => {
    setIsRunning(true);
    setCompleted(false);

    // Initialize working set with the initial equality
    const initialWorkingSet = [`${leftTerm} = ${rightTerm}`];
    const newSteps: UnificationStep[] = [];
    const finalSubstitutions: string[] = []; // Track final substitutions separately

    const workingSet = [...initialWorkingSet];
    let stepCount = 0;
    let stop = false;

    // Add initial step
    newSteps.push({
      step: stepCount++,
      workingSet: [...workingSet],
      currentEquality: workingSet[0],
      case: 0,
      caseDescription: "Initialize with input equality",
      action: `Working set := {${workingSet[0]}}`,
      failed: false,
    });

    while (!stop && workingSet.length > 0 && stepCount < 20) {
      const currentEq = workingSet[0];
      const [s, t] = currentEq.split(" = ").map((term) => term.trim());

      // Determine which case applies
      let caseNum = 0;
      let caseDesc = "";
      let action = "";
      let failed = false;

      if (isVariable(t) && !isVariable(s)) {
        // Case 1: t is variable, s is not
        caseNum = 1;
        caseDesc = "t is a variable, s is not a variable";
        action = `Replace ${s} = ${t} by ${t} = ${s} in mgu`;
        workingSet[0] = `${t} = ${s}`;
      } else if (isVariable(s) && s === t) {
        // Case 2: s is variable, t is same variable
        caseNum = 2;
        caseDesc = "s is a variable, t is the SAME variable";
        action = `Delete ${s} = ${t} from mgu`;
        workingSet.shift();
      } else if (isVariable(s) && !isVariable(t) && containsVariable(t, s)) {
        // Case 3: occurs check
        caseNum = 3;
        caseDesc = "s is a variable, t is not a variable and contains s";
        action = "FAIL: occurs check violation";
        stop = true;
        failed = true;
      } else if (
        isVariable(s) &&
        (!isVariable(t) || (isVariable(t) && s !== t))
      ) {
        // Case 4: substitute variable
        caseNum = 4;

        const hasOccurrences =
          workingSet.slice(1).some((eq) => containsVariable(eq, s)) ||
          finalSubstitutions.some((eq) => containsVariable(eq, s));

        if (isVariable(t)) {
          caseDesc = "s is a variable, t is a different variable";
        } else {
          caseDesc = "s is a variable, t does not contain s";
        }

        if (hasOccurrences) {
          action = `Substitute all occurrences of ${s} with ${t}`;

          for (let i = 1; i < workingSet.length; i++) {
            workingSet[i] = substituteInEquality(workingSet[i], s, t);
          }

          for (let i = 0; i < finalSubstitutions.length; i++) {
            finalSubstitutions[i] = substituteInEquality(
              finalSubstitutions[i],
              s,
              t
            );
          }

          const processedEquality = workingSet.shift()!;
          finalSubstitutions.push(processedEquality);
        } else {
          // No occurrences to substitute - just move to final substitutions without showing step
          const processedEquality = workingSet.shift()!;
          finalSubstitutions.push(processedEquality);
          continue; // Skip adding this step
        }
      } else {
        // Case 5: compound terms or atoms
        caseNum = 5;

        const sIsCompound = isCompoundTerm(s);
        const tIsCompound = isCompoundTerm(t);

        if (sIsCompound && tIsCompound) {
          // Both are compound terms
          const [sFunc, sArgs] = parseCompoundTerm(s);
          const [tFunc, tArgs] = parseCompoundTerm(t);

          if (sFunc !== tFunc || sArgs.length !== tArgs.length) {
            caseDesc = `Different functors or dimensions: ${sFunc}(dimension = ${sArgs.length}) vs ${tFunc}(dimension = ${tArgs.length})`;
            action = "FAIL: functors or dimensions don't match";
            stop = true;
            failed = true;
          } else {
            caseDesc = `Decompose ${sFunc} terms`;
            const newEqualities = sArgs.map((arg, i) => `${arg} = ${tArgs[i]}`);
            action = `Replace ${s} = ${t} by ${newEqualities.join(", ")}`;
            workingSet.shift();
            workingSet.unshift(...newEqualities);
          }
        } else if (sIsCompound || tIsCompound) {
          // One is compound, one is not
          if (sIsCompound) {
            const [sFunc, sArgs] = parseCompoundTerm(s);
            caseDesc = `Different functors or dimensions: ${sFunc}(dimension = ${sArgs.length}) vs atom(dimension = 0)`;
          } else {
            const [tFunc, tArgs] = parseCompoundTerm(t);
            caseDesc = `Different functors or dimensions: atom(dimension = 0) vs ${tFunc}(dimension = ${tArgs.length})`;
          }
          action = "FAIL: compound term cannot unify with atom";
          stop = true;
          failed = true;
        } else {
          // Both are atoms
          if (s === t) {
            caseNum = 2;
            caseDesc = "Terms are identical";
            action = `Delete ${s} = ${t} from working set`;
            workingSet.shift();
          } else {
            caseDesc = "Different atoms cannot be unified";
            action = "FAIL: different atoms";
            stop = true;
            failed = true;
          }
        }
      }

      const displayWorkingSet = [...workingSet, ...finalSubstitutions];

      newSteps.push({
        step: stepCount++,
        workingSet: displayWorkingSet,
        currentEquality: currentEq,
        case: caseNum,
        caseDescription: caseDesc,
        action: action,
        failed: failed,
      });

      if (failed) break;
    }
    if (!stop && workingSet.length === 0 && finalSubstitutions.length > 0) {
      // Check if we have a valid MGU (all substitutions are variable = term)
      const isValidMGU = finalSubstitutions.every((eq) => {
        const [s, t] = eq.split(" = ").map((term) => term.trim());
        return isVariable(s) && !isVariable(t);
      });

      if (isValidMGU) {
        newSteps.push({
          step: stepCount++,
          workingSet: [...finalSubstitutions],
          currentEquality: "",
          case: 0,
          caseDescription: "Unification completed successfully",
          action: ``,
          failed: false,
        });
      }
    }
    setSteps(newSteps);
    setCompleted(true);
  };

  const isVariable = (term: string): boolean => {
    return /^[a-z][a-zA-Z0-9]*$/.test(term.trim());
  };

  const isCompoundTerm = (term: string): boolean => {
    return term.includes("(") && term.includes(")");
  };

  const parseCompoundTerm = (term: string): [string, string[]] => {
    const match = term.match(/^(\w+)\((.*)$/);
    if (!match) return [term, []];

    const func = match[1];
    const argsStr = match[2];

    if (!argsStr) return [func, []];

    // Parse arguments handling nested parentheses
    const args: string[] = [];
    let current = "";
    let depth = 0;

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      if (char === "(") depth++;
      else if (char === ")") {
        if (depth === 0) break;
        depth--;
      } else if (char === "," && depth === 0) {
        args.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }
    if (current.trim()) args.push(current.trim());

    return [func, args];
  };

  const containsVariable = (term: string, variable: string): boolean => {
    const regex = new RegExp(`\\b${variable}\\b`);
    return regex.test(term);
  };

  const substituteInEquality = (
    equality: string,
    variable: string,
    replacement: string
  ): string => {
    const [left, right] = equality.split(" = ");
    const newLeft = substituteInTerm(left.trim(), variable, replacement);
    const newRight = substituteInTerm(right.trim(), variable, replacement);
    return `${newLeft} = ${newRight}`;
  };

  const substituteInTerm = (
    term: string,
    variable: string,
    replacement: string
  ): string => {
    const regex = new RegExp(`\\b${variable}\\b`, "g");
    return term.replace(regex, replacement);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="space-y-6">
      {/* Exercise Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select or Enter Exercise</h3>
        <div className="flex flex-wrap gap-2">
          {predefinedExercises.map((example, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => loadExample(example)}
            >
              {example.name}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="left-term">Left Term</Label>
            <Input
              id="left-term"
              value={leftTerm}
              onChange={(e) => setLeftTerm(e.target.value)}
              placeholder="e.g., p(f(y),w,g(z,y))"
            />
          </div>
          <div>
            <Label htmlFor="right-term">Right Term</Label>
            <Input
              id="right-term"
              value={rightTerm}
              onChange={(e) => setRightTerm(e.target.value)}
              placeholder="e.g., p(x,x,g(z,A))"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={runUnification} disabled={isRunning}>
            Run Unification
          </Button>
          {steps.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                Previous Step
              </Button>
              <Button
                variant="outline"
                onClick={nextStep}
                disabled={currentStep === steps.length - 1}
              >
                Next Step
              </Button>
            </>
          )}
          <Button variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>
      </div>

      {/* Algorithm Visualization */}
      {steps.length > 0 && (
        <div className="space-y-4">
          <Separator />

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Step-by-Step Execution</h3>
            <span className="px-3 py-1 bg-gray-100 rounded text-sm"></span>
          </div>

          {currentStepData && (
            <Card className={currentStepData.failed ? "border-red-500" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Step {currentStepData.step + 1}
                  {currentStepData.case > 0 && (
                    <Badge
                      variant={
                        currentStepData.failed ? "destructive" : "default"
                      }
                    >
                      Case {currentStepData.case}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">
                    MGU working Set:
                  </Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded border">
                    {currentStepData.workingSet.length > 0 ? (
                      <code className="text-sm">
                        {"{" + currentStepData.workingSet.join(", ") + "}"}
                      </code>
                    ) : (
                      <code className="text-sm text-green-600">
                        ∅ (empty set)
                      </code>
                    )}
                  </div>
                </div>

                {currentStepData.currentEquality && (
                  <div>
                    <Label className="text-sm font-medium">
                      Processing Equality:
                    </Label>
                    <div className="mt-1 p-2 bg-yellow-50 rounded border">
                      <code className="text-sm font-mono">
                        {currentStepData.currentEquality}
                      </code>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">
                    Case Description:
                  </Label>
                  <p className="mt-1 text-sm text-gray-700">
                    {currentStepData.caseDescription}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Action:</Label>
                  <p
                    className={`mt-1 text-sm ${
                      currentStepData.failed
                        ? "text-red-600 font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    {currentStepData.action}
                  </p>
                </div>

                {currentStepData.failed && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-800">
                      <strong>Unification Failed!</strong> The terms cannot be
                      unified.
                    </AlertDescription>
                  </Alert>
                )}

                {currentStep === steps.length - 1 &&
                  !currentStepData.failed &&
                  currentStepData.workingSet.length > 0 &&
                  currentStepData.workingSet.every((eq) => {
                    const [s, t] = eq.split(" = ").map((term) => term.trim());
                    return isVariable(s) && !isVariable(t);
                  }) && (
                    <Alert className="border-green-200 bg-green-50">
                      <AlertDescription className="text-green-800">
                        <strong>Success!</strong> Most General Unifier (MGU):{" "}
                        {"{" + currentStepData.workingSet.join(", ") + "}"}
                      </AlertDescription>
                    </Alert>
                  )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Algorithm Reference */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Algorithm Explanation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono">
            <div>
              <strong>Unify(a,b)</strong>
            </div>
            <div>- mgu := {"{a=b}"}; stop := false;</div>
            <div>- WHILE (not(stop) AND mgu contains s=t)</div>
            <div className="ml-4">
              <div>
                <strong>Case 1:</strong> t is a variable, s is not a variable:
              </div>
              <div className="ml-4">- Replace s=t by t=s in mgu</div>
              <div>
                <strong>Case 2:</strong> s is a variable, t is the SAME
                variable:
              </div>
              <div className="ml-4">- Delete s=t from mgu</div>
              <div>
                <strong>Case 3:</strong> s is a variable, t is not a variable
                and contains s:
              </div>
              <div className="ml-4">- stop := true</div>
              <div>
                <strong>Case 4:</strong> s is a variable, t is not identical to
                nor contains s:
              </div>
              <div className="ml-4">
                - Replace all occurrences of s in mgu by t
              </div>
              <div>
                <strong>Case 5:</strong> s is of the form f(s₁,...,sₙ), t of
                g(t₁,...,tₘ):
              </div>
              <div className="ml-4">- If f ≠ g or m ≠ n then stop := true</div>
              <div className="ml-4">
                - Else replace s=t in mgu by s₁=t₁, ..., sₙ=tₙ
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
