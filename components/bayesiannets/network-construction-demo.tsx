"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

interface ConstructionStep {
  step: number;
  title: string;
  description: string;
  explanation: string;
  nodes: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    isNew?: boolean;
  }>;
  edges: Array<{
    from: string;
    to: string;
    isNew?: boolean;
  }>;
}

const constructionSteps: ConstructionStep[] = [
  {
    step: 0,
    title: "Start: Identify which variables to include",
    description: "",
    explanation:
      "In this example we have the core temperature (T), the gauge reading (G), the alarm (A), and potential faults in the gauge (FG) and alarm (FA). We will build a Bayesian network to represent these relationships.",
    nodes: [],
    edges: [],
  },
  {
    step: 1,
    title: "Step 1: first variable",
    description: "",
    explanation:
      "T (Temperature) is a root node because it is the starting point of our causal chain. It represents the actual core temperature, which can be either high or normal. We will add this node first. It is not dependent on any other variables yet, so it has no incoming edges.",
    nodes: [{ id: "T", name: "T", x: 200, y: 150, isNew: true }],
    edges: [],
  },
  {
    step: 2,
    title: "Step 2",
    description: "",
    explanation:
      "FG (Fault Gauge) depends on the temperature (T). If the temperature is high, it can damage the gauge, making it faulty. We will add FG and draw an arrow from T to FG to represent the dependency.",
    nodes: [
      { id: "T", name: "T", x: 200, y: 150 },
      { id: "FG", name: "FG", x: 400, y: 150, isNew: true },
    ],
    edges: [{ from: "T", to: "FG", isNew: true }],
  },
  {
    step: 3,
    title: "Step 3",
    description: "",
    explanation:
      "G (Gauge reading) depends on T and FG. If the gauge is faulty, it will not show the correct reading. We’ll add G as a new node and draw arrows from both T and FG into G.",
    nodes: [
      { id: "T", name: "T", x: 200, y: 150 },
      { id: "FG", name: "FG", x: 400, y: 150 },
      { id: "G", name: "G", x: 300, y: 280, isNew: true },
    ],
    edges: [
      { from: "T", to: "FG" },
      { from: "T", to: "G", isNew: true },
      { from: "FG", to: "G", isNew: true },
    ],
  },
  {
    step: 4,
    title: "Step 4",
    description: "",
    explanation:
      "FA (Fault Alarm) is a root node because it represents whether the alarm itself is faulty. It does not depend on any other variables. We will add FA as a new node.",
    nodes: [
      { id: "T", name: "T", x: 200, y: 150 },
      { id: "FG", name: "FG", x: 400, y: 150 },
      { id: "G", name: "G", x: 300, y: 280 },
      { id: "FA", name: "FA", x: 500, y: 280, isNew: true },
    ],
    edges: [
      { from: "T", to: "FG" },
      { from: "T", to: "G" },
      { from: "FG", to: "G" },
    ],
  },
  {
    step: 5,
    title: "Step 5",
    description: "",
    explanation:
      "A (Alarm) depends on the gauge reading (G) and on the fact that the alarm is faulty or not (FA). For example if the gauge reading is high and the alarm is not faulty, the alarm will sound, but if he is faulty, he will not sound. We will add A as a new node with an arrow from G and FA.",
    nodes: [
      { id: "T", name: "T", x: 200, y: 150 },
      { id: "FG", name: "FG", x: 400, y: 150 },
      { id: "G", name: "G", x: 300, y: 280 },
      { id: "FA", name: "FA", x: 500, y: 280 },
      { id: "A", name: "A", x: 400, y: 410, isNew: true },
    ],
    edges: [
      { from: "T", to: "FG" },
      { from: "T", to: "G" },
      { from: "FG", to: "G" },
      { from: "G", to: "A", isNew: true },
      { from: "FA", to: "A", isNew: true },
    ],
  },
  {
    step: 6,
    title: "Done: complete network",
    description: "",
    explanation: "",
    nodes: [
      { id: "T", name: "T", x: 200, y: 150 },
      { id: "FG", name: "FG", x: 400, y: 150 },
      { id: "G", name: "G", x: 300, y: 280 },
      { id: "FA", name: "FA", x: 500, y: 280 },
      { id: "A", name: "A", x: 400, y: 410 },
    ],
    edges: [
      { from: "T", to: "FG" },
      { from: "T", to: "G" },
      { from: "FG", to: "G" },
      { from: "G", to: "A" },
      { from: "FA", to: "A" },
    ],
  },
];

export default function NetworkConstructionDemo() {
  const [currentStep, setCurrentStep] = useState(0);

  const currentStepData = constructionSteps[currentStep];

  const nextStep = () => {
    if (currentStep < constructionSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetDemo = () => {
    setCurrentStep(0);
  };

  const renderNetworkDiagram = () => {
    return (
      <div className="relative border rounded-md h-[500px] bg-gray-50">
        <svg width="100%" height="100%" className="w-full">
          {/* Render edges */}
          {currentStepData.edges.map((edge, index) => {
            const fromNode = currentStepData.nodes.find(
              (n) => n.id === edge.from
            );
            const toNode = currentStepData.nodes.find((n) => n.id === edge.to);

            if (!fromNode || !toNode) return null;

            // Calculate arrow positions
            const angle = Math.atan2(
              toNode.y - fromNode.y,
              toNode.x - fromNode.x
            );
            const nodeRadius = 35;
            const startX = fromNode.x + Math.cos(angle) * nodeRadius;
            const startY = fromNode.y + Math.sin(angle) * nodeRadius;
            const endX = toNode.x - Math.cos(angle) * nodeRadius;
            const endY = toNode.y - Math.sin(angle) * nodeRadius;

            // Arrow head
            const arrowSize = 8;
            const arrowAngle = Math.PI / 6;
            const arrowPoint1X =
              endX - arrowSize * Math.cos(angle - arrowAngle);
            const arrowPoint1Y =
              endY - arrowSize * Math.sin(angle - arrowAngle);
            const arrowPoint2X =
              endX - arrowSize * Math.cos(angle + arrowAngle);
            const arrowPoint2Y =
              endY - arrowSize * Math.sin(angle + arrowAngle);

            return (
              <g key={`${edge.from}-${edge.to}`}>
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={edge.isNew ? "#ef4444" : "#374151"}
                  strokeWidth={edge.isNew ? 3 : 2}
                  strokeOpacity={0.8}
                  className={edge.isNew ? "animate-pulse" : ""}
                />
                <polygon
                  points={`${endX},${endY} ${arrowPoint1X},${arrowPoint1Y} ${arrowPoint2X},${arrowPoint2Y}`}
                  fill={edge.isNew ? "#ef4444" : "#374151"}
                  opacity={0.8}
                  className={edge.isNew ? "animate-pulse" : ""}
                />
              </g>
            );
          })}
        </svg>

        {/* Render nodes */}
        {currentStepData.nodes.map((node) => (
          <div
            key={node.id}
            className={`absolute w-[70px] h-[70px] transform -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center shadow-sm transition-all duration-500 ${
              node.isNew
                ? "bg-red-100 border-red-500 animate-pulse scale-110"
                : "bg-white border-gray-400"
            }`}
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
            }}
          >
            <span
              className={`font-bold text-lg ${
                node.isNew ? "text-red-700" : "text-gray-700"
              }`}
            >
              {node.name}
            </span>
          </div>
        ))}

        {/* Step indicator */}
        <div className="absolute top-4 right-4">
          <Badge variant="outline" className="text-sm">
            Stap {currentStep} van {constructionSteps.length - 1}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          Bayesian Network Construction Demo
        </h2>
        <Button variant="outline" size="sm" onClick={resetDemo}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Network diagram */}
      <div className="mb-6">{renderNetworkDiagram()}</div>

      {/* Step information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 font-medium">
            {currentStepData.description}
          </p>
          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <p className="text-sm text-blue-800">
              {currentStepData.explanation}
            </p>
          </div>

          {/* Variable explanations for current step */}
          {currentStep > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Variabelen in dit netwerk:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {currentStepData.nodes.map((node) => {
                  const descriptions: Record<string, string> = {
                    T: "Core temperature (normal/high)",
                    FG: "Gauge is faulty (yes/no)",
                    G: "Gauge measurement (normal/high)",
                    FA: "Alarm is faulty (yes/no)",
                    A: "Alarm sounds (yes/no)",
                  };
                  return (
                    <div
                      key={node.id}
                      className={`p-2 rounded ${
                        node.isNew
                          ? "bg-red-50 border border-red-200"
                          : "bg-gray-50"
                      }`}
                    >
                      <span className="font-medium">{node.name}:</span>{" "}
                      {descriptions[node.id]}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Show causale relaties */}
          {currentStep >= 2 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Causale relaties tot nu toe:</h4>
              <div className="space-y-1 text-sm">
                {currentStepData.edges.map((edge) => {
                  const relations: Record<string, string> = {
                    "T→FG":
                      "High temperature can damage the gauge and make it faulty",
                    "T→G": "True temperature affects the gauge measurement",
                    "FG→G": "Faulty gauge can lead to incorrect readings",
                    "G→A": "Alarm depends on what the gauge reads",
                    "FA→A": "Faultiness of the alarm affects whether it sounds",
                  };
                  const key = `${edge.from}→${edge.to}`;
                  return (
                    <div
                      key={key}
                      className={`p-2 rounded text-xs ${
                        edge.isNew
                          ? "bg-red-50 border border-red-200"
                          : "bg-gray-50"
                      }`}
                    >
                      <span className="font-medium">{key}:</span>{" "}
                      {relations[key]}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation controls */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Vorige Stap
        </Button>

        <div className="flex space-x-1">
          {constructionSteps.map((_, index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentStep
                  ? "bg-blue-500"
                  : index < currentStep
                  ? "bg-green-500"
                  : "bg-gray-300"
              }`}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>

        <Button
          variant="outline"
          onClick={nextStep}
          disabled={currentStep === constructionSteps.length - 1}
        >
          Volgende Stap
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Completion message */}
      {currentStep === constructionSteps.length - 1 && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="font-medium text-green-800 mb-2">
            🎉 Network completed!
          </h3>
        </div>
      )}
    </div>
  );
}
