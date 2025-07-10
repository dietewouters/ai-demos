"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

interface HMMNode {
  id: string;
  name: string;
  x: number;
  y: number;
  type: "hidden" | "observed";
  timeStep: number;
}

export default function HMMDemo() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [timeSteps, setTimeSteps] = useState([3]);
  const [knownNode, setKnownNode] = useState<string | null>(null);
  const [targetNode, setTargetNode] = useState<string | null>(null);
  const [calculationMode, setCalculationMode] = useState(false);

  // Transition probabilities (from image)
  const transitionProbs = {
    "At Work": { "At Work": 0.99, "On Holiday": 0.01 },
    "On Holiday": { "At Work": 0.1, "On Holiday": 0.9 },
  };

  // Emission probabilities (from image)
  const emissionProbs = {
    "At Work": { Responds: 0.7, "No Response": 0.3 },
    "On Holiday": { Responds: 0.05, "No Response": 0.95 },
  };

  // Create nodes for multiple time steps
  const createAllNodes = (maxTime: number): HMMNode[] => {
    const nodes: HMMNode[] = [];

    for (let t = 0; t <= maxTime; t++) {
      // Hidden state node
      nodes.push({
        id: `X${t}`,
        name: `X${t}`,
        x: 150 + t * 200,
        y: 80,
        type: "hidden",
        timeStep: t,
      });

      // Observed state node
      nodes.push({
        id: `Y${t}`,
        name: `Y${t}`,
        x: 150 + t * 200,
        y: 220,
        type: "observed",
        timeStep: t,
      });
    }

    return nodes;
  };

  const allNodes = createAllNodes(timeSteps[0]);

  // Get nodes that influence the selected node
  const getInfluencingNodes = (nodeId: string): string[] => {
    const node = allNodes.find((n) => n.id === nodeId);
    if (!node) return [];

    const influencing = [];

    if (node.type === "observed") {
      // Y_t depends on X_t
      influencing.push(`X${node.timeStep}`);
    } else if (node.type === "hidden" && node.timeStep > 0) {
      // X_t depends on X_{t-1}
      influencing.push(`X${node.timeStep - 1}`);
    }

    return influencing;
  };

  // Get calculation path from known to target
  const getCalculationPath = (knownId: string, targetId: string): string[] => {
    if (!knownId || !targetId) return [];

    const known = allNodes.find((n) => n.id === knownId);
    const target = allNodes.find((n) => n.id === targetId);

    if (!known || !target) return [];

    const path = [];

    // Simple path calculation - for hidden states, follow the chain
    if (known.type === "hidden" && target.type === "hidden") {
      const startTime = Math.min(known.timeStep, target.timeStep);
      const endTime = Math.max(known.timeStep, target.timeStep);

      for (let t = startTime; t <= endTime; t++) {
        path.push(`X${t}`);
      }
    }

    // If target is observation, include its hidden state
    if (target.type === "observed") {
      if (known.type === "hidden") {
        const startTime = Math.min(known.timeStep, target.timeStep);
        const endTime = target.timeStep;

        for (let t = startTime; t <= endTime; t++) {
          path.push(`X${t}`);
        }
      }
      path.push(targetId);
    }

    return path;
  };

  const getNodeColor = (
    node: HMMNode,
    isSelected: boolean,
    isInfluencing: boolean,
    isInPath: boolean,
    isKnown: boolean,
    isTarget: boolean
  ) => {
    if (isKnown) {
      return "#fbbf24"; // Yellow for known
    }
    if (isTarget) {
      return "#f87171"; // Red for target
    }
    if (isInPath) {
      return node.type === "hidden" ? "#a78bfa" : "#86efac"; // Purple/green for path
    }
    if (isSelected) {
      return node.type === "hidden" ? "#1d4ed8" : "#059669";
    }
    if (isInfluencing) {
      return node.type === "hidden" ? "#60a5fa" : "#34d399";
    }
    return node.type === "hidden" ? "#dbeafe" : "#d1fae5";
  };

  const getRelatedProbabilities = (nodeId: string) => {
    const node = allNodes.find((n) => n.id === nodeId);
    if (!node) return [];

    const probs = [];
    const t = node.timeStep;

    if (node.type === "observed") {
      // For Y_t, show dependency on X_t
      probs.push(`${node.name} depends ONLY on X${t}`);
      probs.push("");
      probs.push("Emission probabilities:");
      probs.push("P(Responds | At Work) = 0.70");
      probs.push("P(No Response | At Work) = 0.30");
      probs.push("P(Responds | On Holiday) = 0.0");
      probs.push("P(No Response | On Holiday) = 1.0");
    } else if (node.type === "hidden") {
      if (t === 0) {
        probs.push(`${node.name} is the initial hidden state`);
        probs.push("");
        probs.push("Initial probabilities (assumed):");
        probs.push("P(At Work) = 0.8");
        probs.push("P(On Holiday) = 0.2");
      } else {
        probs.push(`${node.name} depends on X${t - 1}`);
        probs.push("");
        probs.push("Transition probabilities:");
        probs.push("P(At Work today | At Work yesterday) = 0.99");
        probs.push("P(On Holiday today | At Work yesterday) = 0.01");
        probs.push("P(At Work today | On Holiday yesterday) = 0.10");
        probs.push("P(On Holiday today | On Holiday yesterday) = 0.90");
      }
    }

    return probs;
  };

  const getCalculationSteps = () => {
    if (!knownNode || !targetNode) return [];

    const known = allNodes.find((n) => n.id === knownNode);
    const target = allNodes.find((n) => n.id === targetNode);

    if (!known || !target) return [];

    const steps = [];
    let t = 0; // Declare the variable t here

    if (known.type === "hidden" && target.type === "hidden") {
      if (known.timeStep < target.timeStep) {
        steps.push(`Given: ${knownNode} (known state)`);
        steps.push(`Want: P(${targetNode} | ${knownNode})`);
        steps.push("");
        steps.push("Calculation path:");

        for (t = known.timeStep; t < target.timeStep; t++) {
          steps.push(
            `Step ${t + 1}: Use transition probabilities P(X${t + 1} | X${t})`
          );
        }

        steps.push("");
        steps.push("Formula:");
        steps.push(`P(${targetNode} | ${knownNode}) = ∏ P(X_{t + 1} | X_{t})`);
      }
    }

    if (known.type === "hidden" && target.type === "observed") {
      steps.push(`Given: ${knownNode} (known state)`);
      steps.push(`Want: P(${targetNode} | ${knownNode})`);
      steps.push("");

      if (known.timeStep === target.timeStep) {
        steps.push("Direct emission:");
        steps.push(`P(${targetNode} | ${knownNode}) = emission probability`);
      } else {
        steps.push("Two-step calculation:");
        steps.push(
          `1. Calculate P(X${target.timeStep} | ${knownNode}) using transitions`
        );
        steps.push(`2. Apply emission: P(${targetNode} | X${target.timeStep})`);
      }
    }

    return steps;
  };

  const influencingNodes = selectedNode
    ? getInfluencingNodes(selectedNode)
    : [];
  const calculationPath = calculationMode
    ? getCalculationPath(knownNode || "", targetNode || "")
    : [];

  const handleNodeClick = (nodeId: string) => {
    if (calculationMode) {
      if (!knownNode) {
        setKnownNode(nodeId);
      } else if (!targetNode && nodeId !== knownNode) {
        setTargetNode(nodeId);
      } else {
        // Reset
        setKnownNode(nodeId);
        setTargetNode(null);
      }
    } else {
      setSelectedNode(selectedNode === nodeId ? null : nodeId);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎓 Hidden Markov Model: Teaching Assistant
            <Badge variant="outline">HMM Demo</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium">Number of days:</span>
              <Slider
                value={timeSteps}
                onValueChange={setTimeSteps}
                max={5}
                min={1}
                step={1}
                className="w-32"
              />
              <span className="text-sm">{timeSteps[0] + 1} days</span>
              <Button
                variant={calculationMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCalculationMode(!calculationMode);
                  setKnownNode(null);
                  setTargetNode(null);
                  setSelectedNode(null);
                }}
              >
                {calculationMode ? "Exit" : "Calculation"} Mode
              </Button>
              {calculationMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setKnownNode(null);
                    setTargetNode(null);
                  }}
                >
                  Reset
                </Button>
              )}
            </div>

            {calculationMode && (
              <div className="bg-blue-50 p-3 rounded text-sm">
                <p>
                  <strong>Calculation Mode:</strong>
                </p>
                <p>1. Click a node to set as KNOWN (yellow)</p>
                <p>2. Click another node to set as TARGET (red)</p>
                <p>The path and calculation steps will be shown below.</p>
              </div>
            )}

            <div className="relative bg-gray-50 rounded-lg p-6 min-h-[400px] overflow-x-auto">
              <svg
                width={Math.max(600, (timeSteps[0] + 1) * 200 + 100)}
                height="350"
                className="absolute inset-0"
              >
                {/* Horizontal transition arrows between hidden states */}
                {Array.from({ length: timeSteps[0] }, (_, i) => (
                  <g key={`transition-${i}`}>
                    <line
                      x1={180 + i * 200}
                      y1={80}
                      x2={120 + (i + 1) * 200}
                      y2={80}
                      stroke={
                        calculationPath.includes(`X${i}`) &&
                        calculationPath.includes(`X${i + 1}`)
                          ? "#8b5cf6"
                          : "#1d4ed8"
                      }
                      strokeWidth={
                        calculationPath.includes(`X${i}`) &&
                        calculationPath.includes(`X${i + 1}`)
                          ? "4"
                          : "2"
                      }
                      markerEnd="url(#arrowhead-blue)"
                    />
                  </g>
                ))}

                {/* Vertical emission arrows from hidden to observed */}
                {Array.from({ length: timeSteps[0] + 1 }, (_, i) => (
                  <g key={`emission-${i}`}>
                    <line
                      x1={150 + i * 200}
                      y1={110}
                      x2={150 + i * 200}
                      y2={190}
                      stroke={
                        calculationPath.includes(`X${i}`) &&
                        calculationPath.includes(`Y${i}`)
                          ? "#8b5cf6"
                          : "#059669"
                      }
                      strokeWidth={
                        calculationPath.includes(`X${i}`) &&
                        calculationPath.includes(`Y${i}`)
                          ? "4"
                          : "2"
                      }
                      markerEnd="url(#arrowhead-green)"
                    />
                  </g>
                ))}

                {/* Arrow markers */}
                <defs>
                  <marker
                    id="arrowhead-blue"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#1d4ed8" />
                  </marker>
                  <marker
                    id="arrowhead-green"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#059669" />
                  </marker>
                </defs>
              </svg>

              {/* Nodes */}
              {allNodes.map((node) => {
                const isSelected = selectedNode === node.id;
                const isInfluencing = influencingNodes.includes(node.id);
                const isInPath = calculationPath.includes(node.id);
                const isKnown = knownNode === node.id;
                const isTarget = targetNode === node.id;

                return (
                  <div
                    key={node.id}
                    className={`absolute w-16 h-16 rounded-full border cursor-pointer transition-all duration-200 flex items-center justify-center text-sm font-bold text-center ${
                      isSelected || isKnown || isTarget
                        ? "scale-125 shadow-xl z-10 border-2"
                        : isInfluencing || isInPath
                        ? "scale-110 shadow-lg border-2"
                        : "hover:scale-105 shadow-md border"
                    }`}
                    style={{
                      left: node.x - 32,
                      top: node.y - 32,
                      backgroundColor: getNodeColor(
                        node,
                        isSelected,
                        isInfluencing,
                        isInPath,
                        isKnown,
                        isTarget
                      ),
                      borderColor: isKnown
                        ? "#f59e0b"
                        : isTarget
                        ? "#ef4444"
                        : node.type === "hidden"
                        ? "#1d4ed8"
                        : "#059669",
                    }}
                    onClick={() => handleNodeClick(node.id)}
                  >
                    {node.name}
                  </div>
                );
              })}

              {/* Time step labels */}
              {Array.from({ length: timeSteps[0] + 1 }, (_, i) => (
                <div
                  key={`time-${i}`}
                  className="absolute top-2"
                  style={{ left: 130 + i * 200 }}
                >
                  <Badge variant="secondary">Day {i}</Badge>
                </div>
              ))}

              {/* Legend on the diagram */}
              <div className="absolute bottom-4 left-4 bg-white p-3 rounded border shadow-sm">
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-100 rounded border border-blue-500"></div>
                    <span>Hidden States (X)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded border border-green-500"></div>
                    <span>Observations (Y)</span>
                  </div>
                  {calculationMode && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-400 rounded border border-yellow-600"></div>
                        <span>Known</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-400 rounded border border-red-600"></div>
                        <span>Target</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calculation steps */}
      {calculationMode && knownNode && targetNode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Calculation: {knownNode} → {targetNode}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getCalculationSteps().map((step, i) => (
                <div
                  key={i}
                  className={`p-2 rounded text-sm ${
                    step.includes("Given:") ||
                    step.includes("Want:") ||
                    step.includes("Formula:")
                      ? "font-semibold text-gray-700 bg-gray-100"
                      : step.trim() === ""
                      ? "h-2"
                      : "bg-gray-50"
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Probabilities panel */}
      {!calculationMode && selectedNode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Probabilities for{" "}
              {allNodes.find((n) => n.id === selectedNode)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getRelatedProbabilities(selectedNode).map((prob, i) => (
                <div
                  key={i}
                  className={`p-2 rounded text-sm ${
                    prob.includes("depends") || prob.includes("initial")
                      ? "font-semibold text-gray-700 bg-gray-100"
                      : prob.trim() === ""
                      ? "h-2"
                      : "bg-gray-50 font-mono"
                  }`}
                >
                  {prob}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
