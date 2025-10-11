"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { RotateCcw, Settings, ChevronRight } from "lucide-react";
import { getAlgorithmById } from "./algorithms";
import { graphs, defaultNodes } from "./app/graphs";
import type { SearchStep } from "./app/search";
import type { Algorithm } from "./algorithms/types";

type NodeState =
  | "unvisited"
  | "visited"
  | "current"
  | "start"
  | "goal"
  | "frontier"
  | "path";

interface SearchState {
  steps: SearchStep[];
  currentStepIndex: number;
  isComplete: boolean;
}

const stoppingOptions = [
  {
    value: "late",
    label: "Late Stopping",
    description: "Stops when goal is processed from frontier",
  },
  {
    value: "early",
    label: "Early Stopping",
    description: "Stops when goal is added to frontier",
  },
];

const loopBreakingOptions = [
  {
    value: "none",
    label: "Off",
    description: "No loop avoidance, revisits allowed",
  },
  {
    value: "path",
    label: "On",
    description: "Rejects paths that revisit nodes",
  },
  {
    value: "closed",
    label: "Redundant Path Elimination with closed set",
    description: "Rejects nodes that were already expanded",
  },
];

interface SearchDemoProps {
  algorithms: Algorithm[];
}

export default function SearchDemo({ algorithms }: SearchDemoProps) {
  const [selectedGraph, setSelectedGraph] = useState<string>("tree");
  const [algorithmId, setAlgorithmId] = useState<string>("bfs");
  const [stoppingCriterion, setStoppingCriterion] = useState<string>("late");
  const [loopBreaking, setLoopBreaking] = useState<string>("none");
  const [startNode, setStartNode] = useState<string>("S");
  const [goalNode, setGoalNode] = useState<string>("G");
  const [searchState, setSearchState] = useState<SearchState>({
    steps: [],
    currentStepIndex: -1,
    isComplete: false,
  });
  const [beamWidth, setBeamWidth] = useState<number>(2);

  const currentGraph = graphs[selectedGraph];
  const currentAlgorithm = getAlgorithmById(algorithmId);

  useEffect(() => {
    const defaults = defaultNodes[selectedGraph];
    if (defaults) {
      setStartNode(defaults.start);
      setGoalNode(defaults.goal);
    }
  }, [selectedGraph]);

  const buildAdjacencyList = useCallback(() => {
    const adjList: { [key: string]: string[] } = {};
    currentGraph.nodes.forEach((node) => {
      adjList[node.id] = [];
    });
    currentGraph.edges.forEach((edge) => {
      adjList[edge.from].push(edge.to);
      adjList[edge.to].push(edge.from);
    });
    return adjList;
  }, [currentGraph]);

  const generateSearchSteps = useCallback(() => {
    if (!currentAlgorithm) return [];
    const adjList = buildAdjacencyList();
    const earlyStop = stoppingCriterion === "early";
    const usePathLoopBreaking = loopBreaking === "path";
    const useClosedSet = loopBreaking === "closed";

    return currentAlgorithm.execute(
      adjList,
      startNode,
      goalNode,
      earlyStop,
      usePathLoopBreaking,
      useClosedSet,
      selectedGraph,
      { beamWidth }
    );
  }, [
    currentAlgorithm,
    startNode,
    goalNode,
    buildAdjacencyList,
    stoppingCriterion,
    loopBreaking,
    selectedGraph,
    beamWidth,
  ]);

  const resetSearch = useCallback(() => {
    const steps = generateSearchSteps();
    setSearchState({ steps, currentStepIndex: -1, isComplete: false });
  }, [generateSearchSteps]);

  const nextStep = useCallback(() => {
    setSearchState((prev) => {
      const nextIndex = prev.currentStepIndex + 1;
      if (nextIndex >= prev.steps.length) return prev;
      const step = prev.steps[nextIndex];
      return {
        ...prev,
        currentStepIndex: nextIndex,
        isComplete: step?.stepType === "goal_found",
      };
    });
  }, []);

  useEffect(() => {
    resetSearch();
  }, [
    resetSearch,
    selectedGraph,
    algorithmId,
    startNode,
    goalNode,
    stoppingCriterion,
    loopBreaking,
    beamWidth,
  ]);

  const getCurrentStep = (): SearchStep | null => {
    if (
      searchState.currentStepIndex < 0 ||
      searchState.currentStepIndex >= searchState.steps.length
    )
      return null;
    return searchState.steps[searchState.currentStepIndex];
  };

  const getNodeState = (nodeId: string): NodeState => {
    const currentStep = getCurrentStep();
    if (!currentStep) {
      if (nodeId === startNode) return "start";
      if (nodeId === goalNode) return "goal";
      return "unvisited";
    }
    if (
      currentStep.currentNode === nodeId &&
      currentStep.stepType !== "goal_found"
    )
      return "current";
    if (nodeId === startNode) return "start";
    if (nodeId === goalNode) return "goal";
    if (currentStep.finalPath && currentStep.finalPath.includes(nodeId))
      return "path";
    if (currentStep.visited.has(nodeId)) return "visited";
    if (currentStep.frontier.includes(nodeId)) return "frontier";
    return "unvisited";
  };

  const getNodeStyle = (state: NodeState) => {
    const base = "transition-all duration-500 ease-in-out";
    switch (state) {
      case "current":
        return `${base} fill-orange-400 stroke-orange-600 stroke-3`;
      case "start":
        return `${base} fill-red-500 stroke-red-700 stroke-3`;
      case "goal":
        return `${base} fill-green-500 stroke-green-700 stroke-3`;
      case "frontier":
        return `${base} fill-yellow-300 stroke-yellow-500 stroke-2`;
      case "visited":
        return `${base} fill-blue-400 stroke-blue-600 stroke-2`;
      case "path":
        return `${base} fill-purple-500 stroke-purple-700 stroke-3`;
      case "unvisited":
        return `${base} fill-gray-200 stroke-gray-400 stroke-1`;
    }
  };

  const shouldHighlightEdge = (
    from: string,
    to: string
  ): "highlight" | "path" | "explore" | "none" => {
    const currentStep = getCurrentStep();
    if (!currentStep) return "none";
    if (currentStep.finalPath && shouldShowPathEdge(from, to)) return "path";
    if (
      currentStep.exploredEdge &&
      ((currentStep.exploredEdge.from === from &&
        currentStep.exploredEdge.to === to) ||
        (currentStep.exploredEdge.from === to &&
          currentStep.exploredEdge.to === from))
    )
      return "explore";
    if (currentStep.highlightedEdges) {
      const hl = currentStep.highlightedEdges.some(
        (e) =>
          (e.from === from && e.to === to) || (e.from === to && e.to === from)
      );
      if (hl) return "highlight";
    }
    return "none";
  };

  const shouldShowPathEdge = (from: string, to: string): boolean => {
    const currentStep = getCurrentStep();
    if (!currentStep || !currentStep.finalPath) return false;
    const p = currentStep.finalPath;
    for (let i = 0; i < p.length - 1; i++) {
      if (
        (p[i] === from && p[i + 1] === to) ||
        (p[i] === to && p[i + 1] === from)
      )
        return true;
    }
    return false;
  };

  const getEdgeStyle = (from: string, to: string) => {
    const t = shouldHighlightEdge(from, to);
    switch (t) {
      case "path":
        return "stroke-purple-500 stroke-4";
      case "highlight":
        return "stroke-blue-500 stroke-3 animate-pulse";
      default:
        return "stroke-gray-400 stroke-2";
    }
  };

  const canTakeNextStep =
    searchState.currentStepIndex < searchState.steps.length - 1;
  const selectedLoopBreakingOption = loopBreakingOptions.find(
    (o) => o.value === loopBreaking
  );
  const currentStep = getCurrentStep();

  const getEdgeCost = (a: string, b: string): number => {
    const c = graphs[selectedGraph].costs?.find(
      (x) => (x.from === a && x.to === b) || (x.from === b && x.to === a)
    )?.cost;
    return c ?? 1;
  };

  const gCostOfPath = (path: string[]): number => {
    if (path.length < 2) return 0;
    let g = 0;
    for (let i = 0; i < path.length - 1; i++)
      g += getEdgeCost(path[i], path[i + 1]);
    return g;
  };

  const hOfNode = (nodeId: string): number | undefined =>
    graphs[selectedGraph].heuristics?.[nodeId];

  const fOfPath = (path: string[]): number | undefined => {
    const h = hOfNode(path[path.length - 1]);
    if (h === undefined) return undefined;
    return gCostOfPath(path) + h;
  };

  const fmt = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(2));

  const formatQueueTag = (path: string[]): string | null => {
    if (!path?.length) return null;
    if (algorithmId === "greedy" || algorithmId === "beam") {
      const h = hOfNode(path[path.length - 1]);
      return h !== undefined ? `h=${fmt(h)}` : null;
    }
    if (algorithmId === "ucs") return `g=${fmt(gCostOfPath(path))}`;
    if (algorithmId === "astar" || algorithmId === "idastar") {
      const f = fOfPath(path);
      return f !== undefined ? `f=${fmt(f)}` : `g=${fmt(gCostOfPath(path))}`;
    }
    return null; // BFS/DFS/ID
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Controls */}
        <Card className="lg:col-span-1 min-h-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Controls
            </CardTitle>
          </CardHeader>

          {/* Scrollbare kolom mét sticky knoppen */}
          <CardContent className="p-4 min-h-0">
            {/* h = viewport minus wat marge voor header/padding; pas desnoods 12rem aan */}
            <ScrollArea className="h-[calc(100dvh-12rem)]">
              <div className="relative">
                {/* Contentblok met extra bottom padding zodat het niet onder de sticky bar valt */}
                <div className="space-y-4 pb-24">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Graph Type</label>
                    <Select
                      value={selectedGraph}
                      onValueChange={setSelectedGraph}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(graphs).map(([key, graph]) => (
                          <SelectItem key={key} value={key}>
                            {graph.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Algorithm</label>
                      <Select
                        value={algorithmId}
                        onValueChange={setAlgorithmId}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {algorithms.map((algorithm) => (
                            <SelectItem key={algorithm.id} value={algorithm.id}>
                              {algorithm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(algorithmId === "greedy" ||
                    algorithmId === "dfs" ||
                    algorithmId === "bfs" ||
                    algorithmId === "ucs" ||
                    algorithmId === "id") && (
                    <div className="grid grid-cols-1">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Stopping</label>
                        <Select
                          value={stoppingCriterion}
                          onValueChange={setStoppingCriterion}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {stoppingOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {(algorithmId === "greedy" ||
                    algorithmId === "dfs" ||
                    algorithmId === "bfs" ||
                    algorithmId === "beam" ||
                    algorithmId === "id") && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Loop Breaking
                      </label>
                      <Select
                        value={loopBreaking}
                        onValueChange={setLoopBreaking}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {loopBreakingOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {selectedLoopBreakingOption?.description}
                      </p>
                    </div>
                  )}

                  {algorithmId === "beam" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Beam Width</label>
                      <Select
                        value={beamWidth.toString()}
                        onValueChange={(v) => setBeamWidth(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3].map((w) => (
                            <SelectItem key={w} value={w.toString()}>
                              {w}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start</label>
                      <Select value={startNode} onValueChange={setStartNode}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currentGraph.nodes.map((n) => (
                            <SelectItem key={n.id} value={n.id}>
                              {n.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Goal</label>
                      <Select value={goalNode} onValueChange={setGoalNode}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currentGraph.nodes.map((n) => (
                            <SelectItem key={n.id} value={n.id}>
                              {n.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-start">
                    <Button
                      onClick={nextStep}
                      disabled={!canTakeNextStep}
                      size="sm"
                      className="px-3 whitespace-nowrap w-auto"
                    >
                      <ChevronRight className="w-3 h-3 mr-1" />
                      Next Step
                    </Button>

                    <Button
                      onClick={resetSearch}
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Current Step Info */}
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2 min-h-[24px]">
                      {currentStep?.description ?? "\u00A0"}
                    </div>
                    <div className="mt-3">
                      <div className="text-xs font-medium text-gray-700 mb-1">
                        Path Queue ({algorithmId.toUpperCase()}):
                      </div>
                      <div className="text-xs text-gray-600 space-y-1 max-h-24 min-h-24 overflow-y-auto pr-1">
                        {currentStep?.pathQueue?.length ? (
                          currentStep.pathQueue.map((path, index) => {
                            const tag = formatQueueTag(path);
                            return (
                              <div
                                key={index}
                                className="bg-white px-2 py-1 rounded border"
                              >
                                {path.join(" → ")}
                                {tag && (
                                  <span className="ml-1 text-[11px] text-gray-500">
                                    ({tag})
                                  </span>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-gray-400 italic">Empty</div>
                        )}
                      </div>
                    </div>

                    {algorithmId === "idastar" && (
                      <div className="text-xs text-gray-500 mt-2 min-h-[16px]">
                        {currentStep?.bound !== undefined && (
                          <>f-bound: {currentStep.bound}</>
                        )}
                        {currentStep?.fNew !== undefined && (
                          <>
                            {" "}
                            {currentStep?.bound !== undefined &&
                              "|"} f-new:{" "}
                            {currentStep.fNew === Infinity
                              ? "∞"
                              : currentStep.fNew}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sticky knoppen binnen dezelfde scroller */}
                <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t pt-2 -mx-1 px-1">
                  {searchState.isComplete && (
                    <div className="text-green-600 font-medium text-center mt-2">
                      Goal Found!
                    </div>
                  )}
                </div>
              </div>

              {/* Forceer zichtbare scrollbar, ook bij overlay OS scrollbars */}
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Visualization */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Graph Exploration</CardTitle>
            <CardDescription>
              {searchState.isComplete
                ? `${currentAlgorithm?.name} found the goal!`
                : canTakeNextStep
                ? `${currentAlgorithm?.name} is exploring step by step...`
                : searchState.steps.length > 0
                ? "Ready to start - Click 'Next Step' to begin"
                : "Exploration complete"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-96 border rounded-lg bg-gray-50 relative overflow-hidden">
              <svg
                width="100%"
                height="100%"
                viewBox={
                  selectedGraph === "ex31" ? "0 -25 550 420" : "0 0 500 320"
                }
              >
                {currentGraph.edges.map((edge, index) => {
                  const fromNode = currentGraph.nodes.find(
                    (n) => n.id === edge.from
                  )!;
                  const toNode = currentGraph.nodes.find(
                    (n) => n.id === edge.to
                  )!;

                  return (
                    <g key={index}>
                      <line
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        className={getEdgeStyle(edge.from, edge.to)}
                      />
                      {(algorithmId === "ucs" ||
                        algorithmId === "astar" ||
                        algorithmId === "idastar") && (
                        <text
                          x={
                            (fromNode.x + toNode.x) / 2 +
                            (Math.abs(fromNode.y - toNode.y) < 10 ? 0 : 10)
                          }
                          y={
                            (fromNode.y + toNode.y) / 2 +
                            (Math.abs(fromNode.x - toNode.x) < 10 ? 0 : -10)
                          }
                          textAnchor="middle"
                          className="text-xs fill-green-700"
                        >
                          {graphs[selectedGraph].costs?.find(
                            (c) =>
                              (c.from === edge.from && c.to === edge.to) ||
                              (c.to === edge.from && c.from === edge.to)
                          )?.cost ?? ""}
                        </text>
                      )}
                    </g>
                  );
                })}

                {currentGraph.nodes.map((node) => {
                  const state = getNodeState(node.id);
                  const heuristicValue = currentGraph.heuristics?.[node.id];
                  return (
                    <g key={node.id}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="20"
                        className={getNodeStyle(state)}
                      />
                      <text
                        x={node.x}
                        y={node.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-sm font-bold fill-white pointer-events-none"
                      >
                        {node.id}
                      </text>
                      {(algorithmId === "greedy" ||
                        algorithmId === "astar" ||
                        algorithmId === "idastar" ||
                        algorithmId === "beam") &&
                        heuristicValue !== undefined && (
                          <text
                            x={node.x - 20}
                            y={node.y - 25}
                            textAnchor="middle"
                            className="text-xs fill-blue-700"
                          >
                            h: {heuristicValue}
                          </text>
                        )}
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span>Start Node</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span>Goal Node</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-400 rounded-full"></div>
                  <span>Currently Processing</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-300 rounded-full"></div>
                  <span>In Frontier</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
                  <span>Already Processed</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
