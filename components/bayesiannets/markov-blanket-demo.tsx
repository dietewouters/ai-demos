"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  BayesianNetwork,
  NetworkNode,
  StepType,
  MarkovBlanketStep,
} from "./network-types";
import { predefinedNetworks } from "./network-registry";

interface MarkovBlanketDemoProps {
  width?: number;
  height?: number;
}

export default function MarkovBlanketDemo({
  width = 500,
  height = 400,
}: MarkovBlanketDemoProps) {
  const [selectedNetworkName, setSelectedNetworkName] = useState(
    predefinedNetworks[0].name
  );
  const [currentNetwork, setCurrentNetwork] = useState<BayesianNetwork>(
    predefinedNetworks[0]
  );

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<StepType>("select");
  const [markovBlanket, setMarkovBlanket] = useState<string[]>([]);
  const [steps, setSteps] = useState<MarkovBlanketStep[]>([]);

  // Calculate network bounds to ensure all nodes are visible
  const calculateNetworkBounds = useCallback(() => {
    if (!currentNetwork?.nodes || currentNetwork.nodes.length === 0) {
      return { minX: 0, maxX: width, minY: 0, maxY: height };
    }
    const padding = 80; // Extra padding around nodes
    const nodeRadius = 25;
    const minX =
      Math.min(...currentNetwork.nodes.map((node) => node.x)) -
      nodeRadius -
      padding;
    const maxX =
      Math.max(...currentNetwork.nodes.map((node) => node.x)) +
      nodeRadius +
      padding;
    const minY =
      Math.min(...currentNetwork.nodes.map((node) => node.y)) -
      nodeRadius -
      padding;
    const maxY =
      Math.max(...currentNetwork.nodes.map((node) => node.y)) +
      nodeRadius +
      padding;
    return { minX, maxX, minY, maxY };
  }, [currentNetwork.nodes, width, height]);

  // Reset state when network changes
  useEffect(() => {
    const newNetwork = predefinedNetworks.find(
      (net) => net.name === selectedNetworkName
    );
    if (newNetwork) {
      setCurrentNetwork(newNetwork);
      setSelectedNode(null);
      setCurrentStep("select");
      setMarkovBlanket([]);
      setSteps([]);
    }
  }, [selectedNetworkName]);

  const getNodeById = useCallback(
    (id: string) => currentNetwork?.nodes.find((node) => node.id === id),
    [currentNetwork]
  );

  const calculateMarkovBlanket = useCallback(
    (nodeId: string) => {
      const blanket = new Set<string>();
      const stepList: MarkovBlanketStep[] = [];
      const targetNode = getNodeById(nodeId);
      if (!targetNode) return { blanket: [], steps: [] };

      // Stap 1: Ouders toevoegen
      const parents = new Set<string>();
      if (targetNode.parents) {
        targetNode.parents.forEach((parent) => parents.add(parent));
      }
      if (parents.size > 0) {
        parents.forEach((parent) => blanket.add(parent));
      }
      stepList.push({
        type: "parents",
        nodes: Array.from(parents),
        description: `Stap 1: Voeg alle ouders toe van ${getNodeLabel(
          targetNode
        )}`,
      });

      // Stap 2: Kinderen toevoegen
      const children = new Set<string>();
      if (targetNode.children) {
        targetNode.children.forEach((child) => children.add(child));
      }
      if (children.size > 0) {
        children.forEach((child) => blanket.add(child));
      }
      stepList.push({
        type: "children",
        nodes: Array.from(children),
        description: `Stap 2: Voeg alle kinderen toe van ${getNodeLabel(
          targetNode
        )}`,
      });

      // Stap 3: Co-ouders (andere ouders van kinderen) toevoegen
      const coparents = new Set<string>();
      children.forEach((childId) => {
        const childNode = getNodeById(childId);
        if (childNode && childNode.parents) {
          childNode.parents.forEach((parent) => {
            if (parent !== nodeId) {
              // Zorg ervoor dat de target node zelf niet als co-ouder wordt toegevoegd
              coparents.add(parent);
            }
          });
        }
      });
      if (coparents.size > 0) {
        coparents.forEach((coparent) => blanket.add(coparent));
      }
      stepList.push({
        type: "coparents",
        nodes: Array.from(coparents),
        description: `Stap 3: Voeg co-ouders toe (andere ouders van kinderen van ${getNodeLabel(
          targetNode
        )})`,
      });

      return { blanket: Array.from(blanket), steps: stepList };
    },
    [getNodeById]
  );

  // Error handling - if no network is selected or invalid
  const networkError =
    !currentNetwork ||
    !currentNetwork.nodes ||
    !Array.isArray(currentNetwork.nodes);

  const handleNodeClick = (nodeId: string) => {
    if (currentStep !== "select") return;
    setSelectedNode((prev) => (prev === nodeId ? null : nodeId));
  };

  const startDemo = () => {
    if (!selectedNode) return;
    const result = calculateMarkovBlanket(selectedNode);
    setMarkovBlanket(result.blanket);
    setSteps(result.steps);
    setCurrentStep("parents");
  };

  const nextStep = () => {
    const stepOrder: StepType[] = [
      "parents",
      "children",
      "coparents",
      "complete",
    ];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const reset = () => {
    setSelectedNode(null);
    setCurrentStep("select");
    setMarkovBlanket([]);
    setSteps([]);
  };

  // Returns an object with fill and stroke colors for a node
  const getNodeColors = (nodeId: string) => {
    let fillColor = "#e5e7eb"; // Default light gray
    let strokeColor = "#9ca3af"; // Default medium gray border

    if (selectedNode === nodeId) {
      fillColor = "#3b82f6"; // Blue
      strokeColor = "#2563eb"; // Darker blue
    } else if (currentStep !== "select") {
      const currentStepData = steps.find((step) => step.type === currentStep);
      if (currentStepData && currentStepData.nodes.includes(nodeId)) {
        switch (currentStep) {
          case "parents":
            fillColor = "#ef4444"; // Red
            strokeColor = "#dc2626"; // Darker red
            break;
          case "children":
            fillColor = "#10b981"; // Green
            strokeColor = "#059669"; // Darker green
            break;
          case "coparents":
            fillColor = "#f59e0b"; // Orange
            strokeColor = "#d97706"; // Darker orange
            break;
        }
      } else if (currentStep === "complete" && markovBlanket.includes(nodeId)) {
        fillColor = "#ec4899"; // Pink
        strokeColor = "#db2777"; // Darker pink
      }
    }
    return { fill: fillColor, stroke: strokeColor };
  };

  const getCurrentStepDescription = () => {
    if (currentStep === "select") {
      return "Selecteer één node door erop te klikken";
    }
    const stepData = steps.find((step) => step.type === currentStep);
    return stepData?.description || "";
  };

  const getNodeLabel = (node: NetworkNode) => {
    return node.label || node.name || node.id;
  };

  const NODE_RADIUS = 35; // Define node radius as a constant

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {currentNetwork.name || "Bayesian Network"} - Markov Blanket Demo
          </CardTitle>
          <CardDescription>{currentNetwork.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {networkError ? (
            <div className="mb-6 flex items-center gap-4">
              <label
                htmlFor="network-select"
                className="font-medium text-gray-700"
              >
                Select Network:
              </label>
              <Select
                value={selectedNetworkName}
                onValueChange={setSelectedNetworkName}
              >
                <SelectTrigger id="network-select" className="w-[200px]">
                  <SelectValue placeholder="Select a network" />
                </SelectTrigger>
                <SelectContent>
                  {predefinedNetworks.map((net) => (
                    <SelectItem
                      key={net.name}
                      value={net.name ?? ""}
                      disabled={net.name === undefined}
                    >
                      {net.name ?? "– onbekend –"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="mb-6 flex items-center gap-4">
              <label
                htmlFor="network-select"
                className="font-medium text-gray-700"
              >
                Select Network:
              </label>
              <Select
                value={selectedNetworkName}
                onValueChange={setSelectedNetworkName}
              >
                <SelectTrigger id="network-select" className="w-[200px]">
                  <SelectValue placeholder="Select a network" />
                </SelectTrigger>
                <SelectContent>
                  {predefinedNetworks.map((net) => (
                    <SelectItem
                      key={net.name}
                      value={net.name ?? ""}
                      disabled={net.name === undefined}
                    >
                      {net.name ?? "– onbekend –"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Network Visualisation */}
            <div className="flex-1">
              <div className="border rounded-lg p-4 bg-white">
                <svg
                  width={width}
                  height={height}
                  viewBox={`${calculateNetworkBounds().minX} ${
                    calculateNetworkBounds().minY
                  } ${
                    calculateNetworkBounds().maxX -
                    calculateNetworkBounds().minX
                  } ${
                    calculateNetworkBounds().maxY -
                    calculateNetworkBounds().minY
                  }`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Edges */}
                  {currentNetwork.edges &&
                    currentNetwork.edges.map((edge, index) => {
                      const fromNode = getNodeById(edge.from);
                      const toNode = getNodeById(edge.to);
                      if (!fromNode || !toNode) return null;

                      // Calculate vector from fromNode to toNode
                      const dx = toNode.x - fromNode.x;
                      const dy = toNode.y - fromNode.y;
                      const distance = Math.sqrt(dx * dx + dy * dy);

                      // Normalize vector
                      const unitDx = dx / distance;
                      const unitDy = dy / distance;

                      // Adjust end point to stop at the circumference of the target node
                      const adjustedX2 = toNode.x - unitDx * NODE_RADIUS;
                      const adjustedY2 = toNode.y - unitDy * NODE_RADIUS;

                      // Adjust start point to start at the circumference of the source node
                      const adjustedX1 = fromNode.x + unitDx * NODE_RADIUS;
                      const adjustedY1 = fromNode.y + unitDy * NODE_RADIUS;

                      return (
                        <line
                          key={index}
                          x1={adjustedX1}
                          y1={adjustedY1}
                          x2={adjustedX2}
                          y2={adjustedY2}
                          stroke="#6b7280" // Line color
                          strokeWidth="2"
                          markerEnd="url(#arrowhead)"
                        />
                      );
                    })}
                  {/* Arrow marker */}
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="7"
                      refX="10"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />{" "}
                      {/* Arrow color matches line color */}
                    </marker>
                  </defs>
                  {/* Nodes */}
                  {currentNetwork.nodes.map((node) => {
                    const { fill, stroke } = getNodeColors(node.id); // Haal zowel vul- als randkleur op
                    return (
                      <g key={node.id}>
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={NODE_RADIUS} // Use the constant for radius
                          fill={fill}
                          stroke={stroke} // Randkleur is nu de dynamische strokeColor
                          strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleNodeClick(node.id)}
                        />
                        <text
                          x={node.x}
                          y={node.y + 5}
                          textAnchor="middle"
                          className="text-sm font-medium fill-black pointer-events-none" // Black text
                        >
                          {node.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
            {/* Controls and Info */}
            <div className="w-full lg:w-80 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Controles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedNode && (
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Geselecteerde node:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <Badge key={selectedNode} variant="default">
                          {selectedNode} ({getNodeById(selectedNode)?.label})
                        </Badge>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {currentStep === "select" && (
                      <Button
                        onClick={startDemo}
                        disabled={!selectedNode}
                        className="flex-1"
                      >
                        Start Demo
                      </Button>
                    )}
                    {currentStep !== "select" && currentStep !== "complete" && (
                      <Button onClick={nextStep} className="flex-1">
                        Next step
                      </Button>
                    )}
                    <Button onClick={reset} variant="outline">
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>
              {/* Step Information */}
              {currentStep !== "select" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Markov Blanket Construction
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm">{getCurrentStepDescription()}</p>
                    <div className="border-t border-gray-200 my-4"></div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Legende:</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-blue-500 border border-blue-700"></div>
                          <span>Geselecteerde node</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-red-500 border border-red-700"></div>
                          <span>Ouders</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-green-500 border border-green-700"></div>
                          <span>Kinderen</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-amber-500 border border-amber-700"></div>
                          <span>Co-ouders</span>
                        </div>
                        {currentStep === "complete" && (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-pink-500 border border-pink-700"></div>
                            <span>Complete Markov Blanket</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {currentStep === "complete" && markovBlanket.length > 0 && (
                      <>
                        <div className="border-t border-gray-200 my-4"></div>
                        <div>
                          <h4 className="font-medium text-sm mb-2">
                            Complete Markov Blanket:
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {markovBlanket.map((nodeId) => {
                              const node = getNodeById(nodeId);
                              return (
                                <Badge key={nodeId} variant="secondary">
                                  {nodeId} ({node ? getNodeLabel(node) : nodeId}
                                  )
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          {networkError && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                Please select a valid BayesianNetwork object with nodes and
                edges.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
