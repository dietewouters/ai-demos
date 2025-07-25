"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";
import CustomProbabilitySlider from "./custom-probability-slider";
import { exerciseNetworks } from "./exercise-networks";

interface BayesianNetworkDemoProps {
  networkName: keyof typeof exerciseNetworks;
}

// Force-directed graph layout algoritme
const applyForceDirectedLayout = (
  nodes: { id: string; x: number; y: number; parents: string[] }[],
  iterations = 100
) => {
  const k = 200; // Optimale afstand tussen nodes (verhoogd voor meer ruimte)
  const nodesCopy = JSON.parse(JSON.stringify(nodes));

  // Bereken aantrekkende en afstotende krachten
  for (let iter = 0; iter < iterations; iter++) {
    // Afstotende krachten tussen alle nodes
    for (let i = 0; i < nodesCopy.length; i++) {
      nodesCopy[i].fx = 0;
      nodesCopy[i].fy = 0;
      for (let j = 0; j < nodesCopy.length; j++) {
        if (i !== j) {
          const dx = nodesCopy[i].x - nodesCopy[j].x;
          const dy = nodesCopy[i].y - nodesCopy[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          // Afstotende kracht (omgekeerd evenredig met afstand)
          const force = (k * k) / distance;
          nodesCopy[i].fx += (dx / distance) * force;
          nodesCopy[i].fy += (dy / distance) * force;
        }
      }
    }

    // Aantrekkende krachten tussen verbonden nodes
    for (let i = 0; i < nodesCopy.length; i++) {
      for (const parentId of nodesCopy[i].parents) {
        const parentIndex = nodesCopy.findIndex(
          (n: { id: string; x: number; y: number; parents: string[] }) =>
            n.id === parentId
        );
        if (parentIndex !== -1) {
          const dx = nodesCopy[i].x - nodesCopy[parentIndex].x;
          const dy = nodesCopy[i].y - nodesCopy[parentIndex].y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          // Aantrekkende kracht (evenredig met afstand)
          const force = (distance * distance) / k;
          nodesCopy[i].fx -= (dx / distance) * force;
          nodesCopy[i].fy -= (dy / distance) * force;
          nodesCopy[parentIndex].fx += (dx / distance) * force;
          nodesCopy[parentIndex].fy += (dy / distance) * force;
        }
      }
    }

    // Update posities
    for (let i = 0; i < nodesCopy.length; i++) {
      if (nodesCopy[i].fixed) continue;
      const scale = 0.1; // Schaalfactor om grote sprongen te voorkomen
      nodesCopy[i].x += nodesCopy[i].fx * scale;
      nodesCopy[i].y += nodesCopy[i].fy * scale;
      // Begrens posities binnen het zichtbare gebied
      nodesCopy[i].x = Math.max(150, Math.min(850, nodesCopy[i].x));
      nodesCopy[i].y = Math.max(150, Math.min(450, nodesCopy[i].y));
    }
  }

  return nodesCopy;
};

// Functie om kleur te bepalen op basis van kans
const getProbabilityColor = (probability: number) => {
  if (probability > 0.8) return "bg-green-100 border-green-500";
  if (probability > 0.6) return "bg-lime-100 border-lime-500";
  if (probability > 0.4) return "bg-yellow-100 border-yellow-500";
  if (probability > 0.2) return "bg-orange-100 border-orange-500";
  return "bg-red-100 border-red-500";
};

export default function BayesianNetworkDemo({
  networkName,
}: BayesianNetworkDemoProps) {
  const [network, setNetwork] = useState<{
    nodes: {
      id: string;
      name: string;
      x: number;
      y: number;
      parents: string[];
    }[];
    probabilities: Record<string, any>;
    evidence: Record<string, boolean>;
  }>(exerciseNetworks.LISP);
  const [inferenceProbabilities, setInferenceProbabilities] = useState<
    Record<string, { true: number; false: number }>
  >({});
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Laad het geselecteerde netwerk
  useEffect(() => {
    if (networkName in exerciseNetworks) {
      const newNetwork = JSON.parse(
        JSON.stringify(exerciseNetworks[networkName])
      );
      // Pas force-directed layout toe
      newNetwork.nodes = applyForceDirectedLayout(newNetwork.nodes);
      setNetwork(newNetwork);
      setSelectedNode(null);
    }
  }, [networkName]);

  // Pas force-directed layout toe bij initialisatie
  useEffect(() => {
    computeSimpleInference();
  }, [network]);

  const computeSimpleInference = () => {
    // Vereenvoudigde inferentie voor demonstratiedoeleinden
    const result: Record<string, { true: number; false: number }> = {};

    // Bereken marginale kansen voor elke variabele
    network.nodes.forEach((node) => {
      try {
        if (network.evidence[node.id] !== undefined) {
          // Als we evidence hebben, is de kansverdeling deterministisch
          const value = network.evidence[node.id];
          result[node.id] = {
            true: value ? 1.0 : 0.0,
            false: value ? 0.0 : 1.0,
          };
        } else if (node.parents.length === 0) {
          // Voor root-nodes gebruiken we gewoon de prior
          if (network.probabilities[node.id]) {
            result[node.id] = { ...network.probabilities[node.id] };
          } else {
            result[node.id] = { true: 0.5, false: 0.5 };
          }
        } else {
          // Voor niet-root nodes zonder evidence berekenen we een gewogen gemiddelde
          const parentConfigurations = getParentConfigurations(
            node,
            network,
            result
          );
          let probTrue = 0;
          let totalWeight = 0;

          for (const { config, weight } of parentConfigurations) {
            if (
              network.probabilities[node.id] &&
              network.probabilities[node.id][config]
            ) {
              const cpt = network.probabilities[node.id][config];
              probTrue += cpt.true * weight;
              totalWeight += weight;
            }
          }

          if (totalWeight > 0) {
            result[node.id] = {
              true: probTrue / totalWeight,
              false: 1 - probTrue / totalWeight,
            };
          } else {
            result[node.id] = { true: 0.5, false: 0.5 };
          }
        }
      } catch (error) {
        console.error(`Error computing inference for node ${node.id}:`, error);
        result[node.id] = { true: 0.5, false: 0.5 };
      }
    });

    setInferenceProbabilities(result);
  };

  const getParentConfigurations = (
    node: { id: string; x: number; y: number; parents: string[] },
    network: {
      nodes: { id: string; x: number; y: number; parents: string[] }[];
      probabilities: Record<string, any>;
      evidence: Record<string, boolean>;
    },
    inferred: Record<string, { true: number; false: number }>
  ) => {
    if (!node || !node.parents || node.parents.length === 0)
      return [{ config: "", weight: 1 }];

    const configurations = [];
    // Voor eenvoud behandelen we alleen het geval met 1 of 2 ouders in deze demo
    if (node.parents.length === 1) {
      const parent = node.parents[0];
      if (inferred[parent]) {
        configurations.push({
          config: `${parent}=true`,
          weight: inferred[parent]?.true || 0.5,
        });
        configurations.push({
          config: `${parent}=false`,
          weight: inferred[parent]?.false || 0.5,
        });
      }
    } else if (node.parents.length === 2) {
      const [p1, p2] = node.parents;
      if (inferred[p1] && inferred[p2]) {
        configurations.push({
          config: `${p1}=true,${p2}=true`,
          weight: (inferred[p1]?.true || 0.5) * (inferred[p2]?.true || 0.5),
        });
        configurations.push({
          config: `${p1}=true,${p2}=false`,
          weight: (inferred[p1]?.true || 0.5) * (inferred[p2]?.false || 0.5),
        });
        configurations.push({
          config: `${p1}=false,${p2}=true`,
          weight: (inferred[p1]?.false || 0.5) * (inferred[p2]?.true || 0.5),
        });
        configurations.push({
          config: `${p1}=false,${p2}=false`,
          weight: (inferred[p1]?.false || 0.5) * (inferred[p2]?.false || 0.5),
        });
      }
    }

    return configurations.length > 0
      ? configurations
      : [{ config: "", weight: 1 }];
  };

  const updateProbability = (
    nodeId: string,
    context: string,
    value: string,
    newProb: number
  ) => {
    const updatedNetwork = { ...network };
    if (!context) {
      // Update voor root-nodes
      updatedNetwork.probabilities[nodeId] = {
        true: newProb,
        false: 1 - newProb,
      };
    } else {
      // Update voor CPT met context
      updatedNetwork.probabilities[nodeId][context] = {
        true:
          value === "true"
            ? newProb
            : updatedNetwork.probabilities[nodeId][context].true,
        false:
          value === "false"
            ? newProb
            : updatedNetwork.probabilities[nodeId][context].false,
      };
      // Normaliseren (zorg ervoor dat true + false = 1)
      const sum =
        updatedNetwork.probabilities[nodeId][context].true +
        updatedNetwork.probabilities[nodeId][context].false;
      if (sum !== 1) {
        updatedNetwork.probabilities[nodeId][context].true /= sum;
        updatedNetwork.probabilities[nodeId][context].false /= sum;
      }
    }
    setNetwork(updatedNetwork);
  };

  const setEvidence = (nodeId: string, value: boolean) => {
    const updatedNetwork = { ...network };
    if (network.evidence[nodeId] === value) {
      // Als dezelfde waarde opnieuw wordt geklikt, verwijder evidence
      const { [nodeId]: removed, ...rest } = updatedNetwork.evidence;
      updatedNetwork.evidence = rest;
    } else {
      // Zet nieuwe evidence
      updatedNetwork.evidence = {
        ...updatedNetwork.evidence,
        [nodeId]: value,
      };
    }
    setNetwork(updatedNetwork);
  };

  const getNodeDisplayName = (nodeId: string) => {
    return network.nodes.find((node) => node.id === nodeId)?.name || nodeId;
  };

  const renderProbabilityTable = (nodeId: string) => {
    const node = network.nodes.find((n) => n.id === nodeId);
    if (!node) return null;

    if (node.parents.length === 0) {
      // Root node
      const probs = network.probabilities[nodeId];
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Prior change of {node.name}</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <CustomProbabilitySlider
              value={probs.true * 100}
              onChange={(value) =>
                updateProbability(nodeId, "", "true", value / 100)
              }
            />
          </div>
        </div>
      );
    } else {
      // Node with parents
      const parentNames = node.parents.map((p) => getNodeDisplayName(p));
      // Generate all possible parent combinations
      const parentCombinations: string[] = [];
      const generateCombinations = (
        parents: string[],
        currentIndex: number,
        currentCombo: string[] = []
      ) => {
        if (currentIndex === parents.length) {
          if (currentCombo.length > 0) {
            parentCombinations.push(currentCombo.join(","));
          }
          return;
        }
        generateCombinations(parents, currentIndex + 1, [
          ...currentCombo,
          `${parents[currentIndex]}=true`,
        ]);
        generateCombinations(parents, currentIndex + 1, [
          ...currentCombo,
          `${parents[currentIndex]}=false`,
        ]);
      };

      generateCombinations(node.parents, 0);

      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">
            Conditional probabilities for {node.name}
          </h3>
          <div className="text-sm mb-2">
            Each row shows P({node.name} | parent)
          </div>
          <div className="overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {parentNames.map((name) => (
                    <TableHead key={name}>{name}</TableHead>
                  ))}
                  <TableHead className="w-[60%]">
                    Chance of {node.name}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parentCombinations.map((combo) => {
                  const conditions = combo.split(",");
                  const probTable = network.probabilities[nodeId][combo];
                  return (
                    <TableRow key={combo}>
                      {conditions.map((cond) => {
                        const [_, value] = cond.split("=");
                        return (
                          <TableCell key={cond} className="whitespace-nowrap">
                            {value === "true" ? (
                              <span className="flex items-center text-green-600">
                                <Check className="h-4 w-4 mr-1" /> True
                              </span>
                            ) : (
                              <span className="flex items-center text-red-600">
                                <X className="h-4 w-4 mr-1" /> False
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <div className="text-center w-16">
                            {(probTable.true * 100).toFixed(0)}%
                          </div>
                          <div className="flex-1">
                            <CustomProbabilitySlider
                              value={probTable.true * 100}
                              onChange={(value) =>
                                updateProbability(
                                  nodeId,
                                  combo,
                                  "true",
                                  value / 100
                                )
                              }
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }
  };

  // Render het netwerk diagram
  const renderNetworkDiagram = () => {
    return (
      <div className="relative border rounded-md h-[500px]">
        <svg width="100%" height="100%" className="w-full">
          {/* Edges (pijlen) */}
          {network.nodes.map((node) =>
            node.parents.map((parentId) => {
              const parent = network.nodes.find((n) => n.id === parentId);
              if (!parent) return null;

              // Bereken de aansluitpunten voor de pijl
              const angle = Math.atan2(node.y - parent.y, node.x - parent.x);
              const nodeRadius = 45;
              const startX = parent.x + Math.cos(angle) * nodeRadius;
              const startY = parent.y + Math.sin(angle) * nodeRadius;
              const endX = node.x - Math.cos(angle) * nodeRadius;
              const endY = node.y - Math.sin(angle) * nodeRadius;

              // Bereken het middelpunt voor de pijlpunt
              const midX = endX - 10 * Math.cos(angle);
              const midY = endY - 10 * Math.sin(angle);

              // Bereken coördinaten voor de pijlpunt
              const arrowSize = 10;
              const arrowAngle = Math.PI / 6; // 30 graden
              const arrowPoint1X =
                midX + arrowSize * Math.cos(angle + Math.PI - arrowAngle);
              const arrowPoint1Y =
                midY + arrowSize * Math.sin(angle + Math.PI - arrowAngle);
              const arrowPoint2X =
                midX + arrowSize * Math.cos(angle + Math.PI + arrowAngle);
              const arrowPoint2Y =
                midY + arrowSize * Math.sin(angle + Math.PI + arrowAngle);

              return (
                <g key={`${parentId}-${node.id}`}>
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke="black"
                    strokeWidth={2}
                    strokeOpacity={0.7}
                  />
                  <polygon
                    points={`${endX},${endY} ${arrowPoint1X},${arrowPoint1Y} ${arrowPoint2X},${arrowPoint2Y}`}
                    fill="black"
                    opacity={0.7}
                  />
                </g>
              );
            })
          )}
        </svg>

        {/* HTML-elementen voor de nodes */}
        {network.nodes.map((node) => {
          const probability = inferenceProbabilities[node.id]?.true || 0.5;
          const hasEvidence = network.evidence[node.id] !== undefined;
          const isSelected = selectedNode === node.id;

          // Bepaal de kleur op basis van de kans of evidence
          let nodeColor = getProbabilityColor(probability);
          if (hasEvidence) {
            nodeColor = network.evidence[node.id]
              ? "bg-green-100 border-green-500"
              : "bg-red-100 border-red-500";
          }
          if (isSelected) {
            nodeColor += " ring-2 ring-primary ring-offset-2";
          }

          return (
            <div
              key={node.id}
              className={`absolute w-[90px] h-[90px] transform -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${nodeColor} flex flex-col items-center justify-center p-1 shadow-sm transition-colors duration-200 cursor-pointer`}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                zIndex: isSelected ? 20 : 10,
              }}
              onClick={() => setSelectedNode(node.id)}
            >
              <span className="font-medium text-sm">{node.name}</span>
              {hasEvidence ? (
                <Badge
                  variant="outline"
                  className={
                    network.evidence[node.id] ? "bg-green-200" : "bg-red-200"
                  }
                >
                  {network.evidence[node.id] ? (
                    <span className="flex items-center">
                      <Check className="h-3 w-3 mr-1" /> True
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <X className="h-3 w-3 mr-1" /> False
                    </span>
                  )}
                </Badge>
              ) : (
                <div className="text-xs font-medium">
                  {(probability * 100).toFixed(0)}%
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 flex justify-center space-x-1 -mb-8">
                <Button
                  size="sm"
                  variant={
                    network.evidence[node.id] === false
                      ? "destructive"
                      : "outline"
                  }
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEvidence(node.id, false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={
                    network.evidence[node.id] === true ? "default" : "outline"
                  }
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEvidence(node.id, true);
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Bayesian Netwerk Demo</h2>
      </div>

      {/* Netwerk diagram (altijd zichtbaar) */}
      <div className="mb-6">{renderNetworkDiagram()}</div>

      {/* Kanstabellen (onder het diagram) */}
      {selectedNode && (
        <Card>
          <CardContent className="p-4">
            {renderProbabilityTable(selectedNode)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
