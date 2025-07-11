"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type StepType = "select" | "parents" | "children" | "coparents" | "complete";

interface NetworkNode {
  id: string;
  name?: string;
  label?: string;
  parents: string[];
  children: string[];
  x: number;
  y: number;
  fixed?: boolean;
}

interface NetworkEdge {
  from: string;
  to: string;
}

interface BayesianNetwork {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  name?: string;
  description?: string;
  probabilities?: Record<string, any>;
  evidence?: Record<string, any>;
}

interface MarkovBlanketStep {
  type: StepType;
  nodes: string[];
  description: string;
}

interface MarkovBlanketDemoProps {
  network?: BayesianNetwork;
  width?: number;
  height?: number;
}

export default function MarkovBlanketDemo({
  network,
  width = 500,
  height = 400,
}: MarkovBlanketDemoProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null); // AANGEPAST: Nu een enkele node ID of null
  const [currentStep, setCurrentStep] = useState<StepType>("select");
  const [markovBlanket, setMarkovBlanket] = useState<string[]>([]);
  const [steps, setSteps] = useState<MarkovBlanketStep[]>([]);

  const calculateMarkovBlanket = useCallback(
    (nodeId: string) => {
      // AANGEPAST: Accepteert nu een enkele node ID
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
        )}`, // AANGEPAST
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
        )}`, // AANGEPAST
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
        )})`, // AANGEPAST
      });

      return { blanket: Array.from(blanket), steps: stepList };
    },
    [network]
  );

  const getNodeById = (id: string) =>
    network?.nodes.find((node) => node.id === id);

  // Error handling - if network is not provided or invalid
  if (!network || !network.nodes || !Array.isArray(network.nodes)) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-red-600">Network Error</CardTitle>
          <CardDescription>
            No valid network provided to the component.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Please provide a valid BayesianNetwork object with nodes and edges.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate network bounds to ensure all nodes are visible
  const calculateNetworkBounds = () => {
    if (!network?.nodes || network.nodes.length === 0) {
      return { minX: 0, maxX: width, minY: 0, maxY: height };
    }

    const padding = 80; // Extra padding around nodes
    const nodeRadius = 25;

    const minX =
      Math.min(...network.nodes.map((node) => node.x)) - nodeRadius - padding;
    const maxX =
      Math.max(...network.nodes.map((node) => node.x)) + nodeRadius + padding;
    const minY =
      Math.min(...network.nodes.map((node) => node.y)) - nodeRadius - padding;
    const maxY =
      Math.max(...network.nodes.map((node) => node.y)) + nodeRadius + padding;

    return { minX, maxX, minY, maxY };
  };

  const bounds = calculateNetworkBounds();
  const viewBoxWidth = bounds.maxX - bounds.minX;
  const viewBoxHeight = bounds.maxY - bounds.minY;

  const handleNodeClick = (nodeId: string) => {
    if (currentStep !== "select") return;

    setSelectedNode((prev) => (prev === nodeId ? null : nodeId)); // AANGEPAST: Toggle selectie
  };

  const startDemo = () => {
    if (!selectedNode) return; // AANGEPAST: Controleer op enkele geselecteerde node

    const result = calculateMarkovBlanket(selectedNode); // AANGEPAST: Geef enkele node ID door
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
    setSelectedNode(null); // AANGEPAST
    setCurrentStep("select");
    setMarkovBlanket([]);
    setSteps([]);
  };

  const getNodeColor = (nodeId: string) => {
    if (selectedNode === nodeId) return "#3b82f6"; // AANGEPAST: Controleer op enkele geselecteerde node

    if (currentStep === "select") return "#e5e7eb"; // Grijs voor niet-geselecteerd

    const currentStepData = steps.find((step) => step.type === currentStep);
    if (currentStepData && currentStepData.nodes.includes(nodeId)) {
      switch (currentStep) {
        case "parents":
          return "#ef4444"; // Rood voor ouders
        case "children":
          return "#10b981"; // Groen voor kinderen
        case "coparents":
          return "#f59e0b"; // Oranje voor co-ouders
        default:
          return "#e5e7eb";
      }
    }

    if (currentStep === "complete" && markovBlanket.includes(nodeId)) {
      return "#8b5cf6"; // Paars voor complete Markov blanket
    }

    return "#e5e7eb";
  };

  const getCurrentStepDescription = () => {
    if (currentStep === "select") {
      return "Selecteer één node door erop te klikken"; // AANGEPAST
    }

    const stepData = steps.find((step) => step.type === currentStep);
    return stepData?.description || "";
  };

  const getNodeLabel = (node: NetworkNode) => {
    return node.label || node.name || node.id;
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {network.name || "Bayesian Network"} - Markov Blanket Demo
          </CardTitle>
          <CardDescription></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Network Visualisatie */}
            <div className="flex-1">
              <div className="border rounded-lg p-4 bg-white">
                <svg
                  width={width}
                  height={height}
                  viewBox={`${bounds.minX} ${bounds.minY} ${viewBoxWidth} ${viewBoxHeight}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Edges */}
                  {network.edges &&
                    network.edges.map((edge, index) => {
                      const fromNode = getNodeById(edge.from);
                      const toNode = getNodeById(edge.to);
                      if (!fromNode || !toNode) return null;

                      return (
                        <line
                          key={index}
                          x1={fromNode.x}
                          y1={fromNode.y}
                          x2={toNode.x}
                          y2={toNode.y}
                          stroke="#6b7280"
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
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                    </marker>
                  </defs>

                  {/* Nodes */}
                  {network.nodes.map((node) => (
                    <g key={node.id}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="25"
                        fill={getNodeColor(node.id)}
                        stroke="#374151"
                        strokeWidth="2"
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleNodeClick(node.id)}
                      />
                      <text
                        x={node.x}
                        y={node.y + 5}
                        textAnchor="middle"
                        className="text-sm font-medium fill-white pointer-events-none"
                      >
                        {node.id}
                      </text>
                      <text
                        x={node.x}
                        y={node.y + 45}
                        textAnchor="middle"
                        className="text-xs fill-gray-600 pointer-events-none"
                      >
                        {getNodeLabel(node)}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Controls en Info */}
            <div className="w-full lg:w-80 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Controles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedNode && ( // AANGEPAST: Controleer op enkele geselecteerde node
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Geselecteerde node:
                      </p>{" "}
                      {/* AANGEPAST */}
                      <div className="flex flex-wrap gap-1">
                        {/* AANGEPAST: Toon alleen de geselecteerde node */}
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
                        {" "}
                        {/* AANGEPAST */}
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

              {/* Stap Informatie */}
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
                          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                          <span>Geselecteerde node</span> {/* AANGEPAST */}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-red-500"></div>
                          <span>Ouders</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-green-500"></div>
                          <span>Kinderen</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                          <span>Co-ouders</span>
                        </div>
                        {currentStep === "complete" && (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
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
        </CardContent>
      </Card>
    </div>
  );
}
