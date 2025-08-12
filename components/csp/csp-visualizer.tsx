"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltips";
import {
  Pause,
  Play,
  RotateCcw,
  StepForward,
  ChevronRight,
  Settings,
} from "lucide-react";

import {
  type CSP,
  type CSPStepWithSnapshot,
  type SolveOptions,
} from "@/components/csp/lib/csp-types";
import { EXERCISES } from "@/components/csp/lib/csp-exercises";
import { solveCSP } from "@/components/csp/lib/csp-solver";
import GraphView from "@/components/csp/graph-view";
import DomainTable from "@/components/csp/domain-table";

type AlgoKey = "BT" | "BT_FC" | "BT_AC3";
type VarOrderKey = "alpha" | "mrv";
type ValOrderKey = "alpha" | "lcv";

const DEFAULT_OPTIONS: SolveOptions = {
  algorithm: "BT",
  variableOrdering: "alpha",
  valueOrdering: "alpha",
  stepThroughFC: true,
  stepThroughAC3: true,
};

export default function CSPVisualizer() {
  const [exerciseId, setExerciseId] = useState<string>("4houses");
  const exercise = useMemo<CSP>(
    () => EXERCISES.find((e) => e.id === exerciseId)!,
    [exerciseId]
  );

  const [algo, setAlgo] = useState<AlgoKey>(
    DEFAULT_OPTIONS.algorithm as AlgoKey
  );
  const [varOrder, setVarOrder] = useState<VarOrderKey>(
    DEFAULT_OPTIONS.variableOrdering as VarOrderKey
  );
  const [valOrder, setValOrder] = useState<ValOrderKey>(
    DEFAULT_OPTIONS.valueOrdering as ValOrderKey
  );
  const [stepFC, setStepFC] = useState<boolean>(true);
  const [stepAC3, setStepAC3] = useState<boolean>(true);

  const [steps, setSteps] = useState<CSPStepWithSnapshot[]>([]);
  const [idx, setIdx] = useState<number>(-1); // -1 = before first step
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(40); // ms per step unit
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const options = useMemo<SolveOptions>(() => {
    return {
      algorithm: algo,
      variableOrdering: varOrder,
      valueOrdering: valOrder,
      stepThroughFC: stepFC,
      stepThroughAC3: stepAC3,
    };
  }, [algo, varOrder, valOrder, stepFC, stepAC3]);

  const atStart = idx < 0;
  const atEnd = steps.length > 0 && idx >= steps.length - 1;
  const currentStep = idx >= 0 && idx < steps.length ? steps[idx] : null;
  const currentSnapshot = currentStep?.snapshot ?? null;

  const recompute = useCallback(() => {
    const result = solveCSP(exercise, options);
    setSteps(result.steps);
    setIdx(-1);
    setPlaying(false);
  }, [exercise, options]);

  useEffect(() => {
    // Recompute whenever exercise or options change
    recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId, algo, varOrder, valOrder, stepFC, stepAC3]);

  useEffect(() => {
    if (playing && !atEnd) {
      const interval = Math.max(10, 200 - speed); // faster when speed increases
      timerRef.current = setTimeout(() => {
        setIdx((i) => Math.min(steps.length - 1, i + 1));
      }, interval);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
    if (playing && atEnd) {
      setPlaying(false);
    }
  }, [playing, idx, steps.length, speed, atEnd]);

  const handleStart = () => {
    if (steps.length === 0) return;
    setIdx(0);
  };

  const handleStep = () => {
    if (atEnd) return;
    setIdx((i) => Math.min(steps.length - 1, i + 1));
  };

  const handlePlay = () => {
    if (steps.length === 0) return;
    if (atEnd) setIdx(0);
    setPlaying(true);
  };

  const handlePause = () => {
    setPlaying(false);
  };

  const handleReset = () => {
    setIdx(-1);
    setPlaying(false);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-4">
        <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-1"></div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary">Exercise</Badge>
            <Select value={exerciseId} onValueChange={setExerciseId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Kies oefening" />
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
            <div className="lg:col-span-3 space-y-4">
              <div className="space-y-2">
                <Label>Algorithm</Label>
                <Select
                  value={algo}
                  onValueChange={(v) => setAlgo(v as AlgoKey)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kies algoritme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BT">Backtracking</SelectItem>
                    <SelectItem value="BT_FC">
                      Backtracking + Forward Checking
                    </SelectItem>
                    <SelectItem value="BT_AC3">Backtracking + AC-3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1">
                <div className="space-y-2">
                  <Label>Variable ordering</Label>
                  <Select
                    value={varOrder}
                    onValueChange={(v) => setVarOrder(v as VarOrderKey)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alpha">Alphabetically</SelectItem>
                      <SelectItem value="mrv">
                        MRV (Most remaining values) + Tiebreak (Most
                        constraints)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-1">
                <div className="space-y-2">
                  <Label>Value ordering</Label>
                  <Select
                    value={valOrder}
                    onValueChange={(v) => setValOrder(v as ValOrderKey)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alpha">Alphabetically</SelectItem>
                      <SelectItem value="lcv">
                        LCV (Least constraining value)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">
                    Step through Forward Checking
                  </Label>
                  <Switch
                    checked={stepFC}
                    onCheckedChange={setStepFC}
                    disabled={algo !== "BT_FC"}
                    aria-label="Step through FC"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Step through AC-3</Label>
                  <Switch
                    checked={stepAC3}
                    onCheckedChange={setStepAC3}
                    disabled={algo !== "BT_AC3"}
                    aria-label="Step through AC3"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-2 pt-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={handleStep}
                      disabled={atEnd}
                    >
                      <StepForward className="h-4 w-4 mr-2" />
                      Step
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next step</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" onClick={handleReset}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back to start</TooltipContent>
                </Tooltip>
              </div>

              <div className="whitespace-pre-wrap font-mono leading-5 text-sm">
                {idx >= 0 && steps[idx] ? (
                  <>
                    <div className="font-medium text-foreground"></div>
                    <div
                      className={
                        steps[idx].kind === "success"
                          ? "text-green-600 font-semibold"
                          : "text-muted-foreground"
                      }
                    >
                      {steps[idx].description}
                    </div>
                  </>
                ) : (
                  <div></div>
                )}
              </div>
            </div>

            <div className="lg:col-span-9 space-y-4">
              <Card className="p-3">
                <GraphView
                  csp={exercise}
                  snapshot={currentSnapshot}
                  highlight={currentStep?.highlight}
                />
              </Card>
              <Card className="p-3">
                <DomainTable
                  variables={exercise.variables}
                  initialDomains={exercise.domains}
                  snapshot={currentSnapshot}
                  highlight={currentStep?.highlight}
                />
              </Card>
            </div>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}
