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

// Stopping criteria options
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

// Loop breaking options
const loopBreakingOptions = [
  {
    value: "on",
    label: "On",
    description: "Prevents revisiting nodes (efficient)",
  },
  {
    value: "off",
    label: "Off",
    description: "Allows revisiting nodes (can cause loops)",
  },
];

interface SearchDemoProps {
  algorithms: Algorithm[];
}

export default function SearchDemo({ algorithms }: SearchDemoProps) {
  const [selectedGraph, setSelectedGraph] = useState<string>("tree");
  const [algorithmId, setAlgorithmId] = useState<string>("bfs");
  const [stoppingCriterion, setStoppingCriterion] = useState<string>("late");
  const [loopBreaking, setLoopBreaking] = useState<string>("on");
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

  // Update start/goal nodes when graph changes
  useEffect(() => {
    const defaults = defaultNodes[selectedGraph];
    if (defaults) {
      setStartNode(defaults.start);
      setGoalNode(defaults.goal);
    }
  }, [selectedGraph]);

  // Build adjacency list
  const buildAdjacencyList = useCallback(() => {
    const adjList: { [key: string]: string[] } = {};
    currentGraph.nodes.forEach((node) => {
      adjList[node.id] = [];
    });
    currentGraph.edges.forEach((edge) => {
      adjList[edge.from].push(edge.to);
      adjList[edge.to].push(edge.from); // Undirected graph
    });
    return adjList;
  }, [currentGraph]);

  // Generate all search steps using the selected algorithm
  const generateSearchSteps = useCallback(() => {
    if (!currentAlgorithm) return [];

    const adjList = buildAdjacencyList();
    const earlyStop = stoppingCriterion === "early";
    const useLoopBreaking = loopBreaking === "on";
    return currentAlgorithm.execute(
      adjList,
      startNode,
      goalNode,
      earlyStop,
      useLoopBreaking,
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
    beamWidth,
  ]);

  // Reset search state
  const resetSearch = useCallback(() => {
    const steps = generateSearchSteps();
    setSearchState({
      steps,
      currentStepIndex: -1,
      isComplete: false,
    });
  }, [generateSearchSteps]);

  // Next step
  const nextStep = useCallback(() => {
    setSearchState((prev) => {
      const nextIndex = prev.currentStepIndex + 1;

      if (nextIndex >= prev.steps.length) {
        return prev;
      }

      const nextStep = prev.steps[nextIndex];
      const isComplete = nextStep && nextStep.stepType === "goal_found";

      return {
        ...prev,
        currentStepIndex: nextIndex,
        isComplete,
      };
    });
  }, []);

  // Reset when parameters change
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

  // Get current step data
  const getCurrentStep = (): SearchStep | null => {
    if (
      searchState.currentStepIndex < 0 ||
      searchState.currentStepIndex >= searchState.steps.length
    ) {
      return null;
    }
    return searchState.steps[searchState.currentStepIndex];
  };

  // Get node state for styling
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
    ) {
      return "current";
    }

    if (nodeId === startNode) return "start";
    if (nodeId === goalNode) return "goal";
    if (currentStep.finalPath && currentStep.finalPath.includes(nodeId))
      return "path";

    if (currentStep.visited.has(nodeId)) return "visited";
    if (currentStep.frontier.includes(nodeId)) return "frontier";
    return "unvisited";
  };

  // Node styling
  const getNodeStyle = (state: NodeState) => {
    const baseStyle = "transition-all duration-500 ease-in-out";
    switch (state) {
      case "current":
        return `${baseStyle} fill-orange-400 stroke-orange-600 stroke-3`;
      case "start":
        return `${baseStyle} fill-red-500 stroke-red-700 stroke-3`;
      case "goal":
        return `${baseStyle} fill-green-500 stroke-green-700 stroke-3`;
      case "frontier":
        return `${baseStyle} fill-yellow-300 stroke-yellow-500 stroke-2`;
      case "visited":
        return `${baseStyle} fill-blue-400 stroke-blue-600 stroke-2`;
      case "path":
        return `${baseStyle} fill-purple-500 stroke-purple-700 stroke-3`;
      case "unvisited":
        return `${baseStyle} fill-gray-200 stroke-gray-400 stroke-1`;
    }
  };

  // Check if edge should be highlighted
  const shouldHighlightEdge = (
    from: string,
    to: string
  ): "highlight" | "path" | "explore" | "none" => {
    const currentStep = getCurrentStep();
    if (!currentStep) return "none";

    // Path edges take priority
    if (currentStep.finalPath && shouldShowPathEdge(from, to)) return "path";

    // Exploration arrow
    if (
      currentStep.exploredEdge &&
      ((currentStep.exploredEdge.from === from &&
        currentStep.exploredEdge.to === to) ||
        (currentStep.exploredEdge.from === to &&
          currentStep.exploredEdge.to === from))
    )
      return "explore";

    // Highlighted edges
    if (currentStep.highlightedEdges) {
      const isHighlighted = currentStep.highlightedEdges.some(
        (edge) =>
          (edge.from === from && edge.to === to) ||
          (edge.from === to && edge.to === from)
      );
      if (isHighlighted) return "highlight";
    }

    return "none";
  };

  const shouldShowPathEdge = (from: string, to: string): boolean => {
    const currentStep = getCurrentStep();
    if (!currentStep || !currentStep.finalPath) return false;

    const path = currentStep.finalPath;
    for (let i = 0; i < path.length - 1; i++) {
      if (
        (path[i] === from && path[i + 1] === to) ||
        (path[i] === to && path[i + 1] === from)
      ) {
        return true;
      }
    }
    return false;
  };

  // Get edge style
  const getEdgeStyle = (from: string, to: string) => {
    const edgeType = shouldHighlightEdge(from, to);
    switch (edgeType) {
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
  const selectedStoppingOption = stoppingOptions.find(
    (option) => option.value === stoppingCriterion
  );
  const selectedLoopBreakingOption = loopBreakingOptions.find(
    (option) => option.value === loopBreaking
  );
  const currentStep = getCurrentStep();

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Graph Type</label>
              <Select value={selectedGraph} onValueChange={setSelectedGraph}>
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
                <Select value={algorithmId} onValueChange={setAlgorithmId}>
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
                        <SelectItem key={option.value} value={option.value}>
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
              algorithmId === "id") && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Loop Breaking</label>
                <Select value={loopBreaking} onValueChange={setLoopBreaking}>
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
                {selectedLoopBreakingOption && (
                  <p className="text-xs text-muted-foreground">
                    {selectedLoopBreakingOption.description}
                  </p>
                )}
              </div>
            )}
            {algorithmId === "beam" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Beam Width</label>
                <Select
                  value={beamWidth.toString()}
                  onValueChange={(value) => setBeamWidth(Number(value))}
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
                    {currentGraph.nodes.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.id}
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
                    {currentGraph.nodes.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={nextStep}
                disabled={!canTakeNextStep}
                className="flex-1"
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                Next Step
              </Button>
              <Button onClick={resetSearch} variant="outline">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            {searchState.isComplete && (
              <div className="text-green-600 font-medium text-center">
                Goal Found!
              </div>
            )}

            {/* Current Step Info */}
            {currentStep && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">
                  {currentStep.description}
                </div>
                {/* Path Queue Display */}
                <div className="mt-3">
                  <div className="text-xs font-medium text-gray-700 mb-1">
                    Path Queue ({algorithmId.toUpperCase()}):
                  </div>
                  <div className="text-xs text-gray-600 space-y-1 max-h-20 overflow-y-auto">
                    {currentStep.pathQueue.length > 0 ? (
                      currentStep.pathQueue.map((path, index) => (
                        <div
                          key={index}
                          className="bg-white px-2 py-1 rounded border"
                        >
                          {path.join(" → ")}
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-400 italic">Empty</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {algorithmId === "idastar" &&
              (currentStep?.bound !== undefined ||
                currentStep?.fNew !== undefined) && (
                <div className="text-xs text-gray-500 mb-2">
                  {currentStep?.bound !== undefined && (
                    <>f-bound: {currentStep.bound}</>
                  )}
                  {currentStep?.fNew !== undefined && (
                    <>
                      {" "}
                      | f-new:{" "}
                      {currentStep.fNew === Infinity ? "∞" : currentStep.fNew}
                    </>
                  )}
                </div>
              )}
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
                {/* Edges */}
                {currentGraph.edges.map((edge, index) => {
                  const fromNode = currentGraph.nodes.find(
                    (n) => n.id === edge.from
                  )!;
                  const toNode = currentGraph.nodes.find(
                    (n) => n.id === edge.to
                  )!;
                  const edgeType = shouldHighlightEdge(edge.from, edge.to);
                  const edgeCost = currentGraph.costs?.find(
                    (c) =>
                      (c.from === edge.from && c.to === edge.to) ||
                      (c.from === edge.to && c.to === edge.from)
                  )?.cost;

                  const midX = (fromNode.x + toNode.x) / 2;
                  const midY = (fromNode.y + toNode.y) / 2;

                  return (
                    <g key={index}>
                      <line
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        className={getEdgeStyle(edge.from, edge.to)}
                      />

                      {/* UCS Edge Cost */}
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

                {/* Nodes */}
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
                        algorithmId === "idastar") &&
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

            {/* Legend */}
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
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-300 rounded-full"></div>
                    <span>In Frontier</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
