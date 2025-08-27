"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Info, Check, X } from "lucide-react";
import ExplanationPanel from "./explanation-panel";
import CustomProbabilitySlider from "./custom-probability-slider";
import { predefinedNetworks } from "./predefined-networks";

/* =========================
   Force-directed layout
   ========================= */
const applyForceDirectedLayout = (
  nodes: {
    id: string;
    x: number;
    y: number;
    parents: string[];
    fixed?: boolean;
  }[],
  iterations = 100
) => {
  const k = 200;
  const nodesCopy: any[] = JSON.parse(JSON.stringify(nodes));

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < nodesCopy.length; i++) {
      nodesCopy[i].fx = 0;
      nodesCopy[i].fy = 0;

      for (let j = 0; j < nodesCopy.length; j++) {
        if (i !== j) {
          const dx = nodesCopy[i].x - nodesCopy[j].x;
          const dy = nodesCopy[i].y - nodesCopy[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (k * k) / distance;
          nodesCopy[i].fx += (dx / distance) * force;
          nodesCopy[i].fy += (dy / distance) * force;
        }
      }
    }

    for (let i = 0; i < nodesCopy.length; i++) {
      for (const parentId of nodesCopy[i].parents) {
        const parentIndex = nodesCopy.findIndex((n: any) => n.id === parentId);
        if (parentIndex !== -1) {
          const dx = nodesCopy[i].x - nodesCopy[parentIndex].x;
          const dy = nodesCopy[i].y - nodesCopy[parentIndex].y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (distance * distance) / k;
          nodesCopy[i].fx -= (dx / distance) * force;
          nodesCopy[i].fy -= (dy / distance) * force;
          nodesCopy[parentIndex].fx += (dx / distance) * force;
          nodesCopy[parentIndex].fy += (dy / distance) * force;
        }
      }
    }

    for (let i = 0; i < nodesCopy.length; i++) {
      if (nodesCopy[i].fixed) continue;
      const scale = 0.1;
      nodesCopy[i].x += nodesCopy[i].fx * scale;
      nodesCopy[i].y += nodesCopy[i].fy * scale;
      nodesCopy[i].x = Math.max(150, Math.min(850, nodesCopy[i].x));
      nodesCopy[i].y = Math.max(150, Math.min(450, nodesCopy[i].y));
    }
  }

  return nodesCopy;
};

/* =========================
   Utils
   ========================= */
const getProbabilityColor = (probability: number) => {
  if (probability > 0.8) return "bg-green-100 border-green-500";
  if (probability > 0.6) return "bg-lime-100 border-lime-500";
  if (probability > 0.4) return "bg-yellow-100 border-yellow-500";
  if (probability > 0.2) return "bg-orange-100 border-orange-500";
  return "bg-red-100 border-red-500";
};

type Network = {
  nodes: {
    id: string;
    name: string;
    x: number;
    y: number;
    parents: string[];
  }[];
  probabilities: Record<
    string,
    | { true: number; false: number } // root prior
    | Record<string, { true: number; false: number }> // CPT keyed by "A=true,B=false"
  >;
  evidence: Record<string, boolean>;
};

/* =========================
   Exact Inference (Enumeration)
   ========================= */
/** Topological sort to ensure parents come before children. */
const topoSort = (net: Network): string[] => {
  const indeg: Record<string, number> = {};
  const children: Record<string, string[]> = {};
  net.nodes.forEach((n) => {
    indeg[n.id] = n.parents.length;
    n.parents.forEach((p) => {
      if (!children[p]) children[p] = [];
      children[p].push(n.id);
    });
  });
  const q: string[] = Object.keys(indeg).filter((id) => indeg[id] === 0);
  const order: string[] = [];
  while (q.length) {
    const u = q.shift()!;
    order.push(u);
    (children[u] || []).forEach((v) => {
      indeg[v]--;
      if (indeg[v] === 0) q.push(v);
    });
  }
  // Fallback if graph had issues (shouldn't happen in DAG)
  if (order.length !== net.nodes.length) {
    return net.nodes.map((n) => n.id);
  }
  return order;
};

/** Get P(Y=value | Parents=assignment) from network CPTs. */
const getProbGivenParents = (
  net: Network,
  nodeId: string,
  value: boolean,
  assignment: Record<string, boolean>
): number => {
  const node = net.nodes.find((n) => n.id === nodeId);
  if (!node) return 0.5;

  const table = net.probabilities[nodeId] as any;

  // Root node: direct prior
  if (!node.parents || node.parents.length === 0) {
    const prior = table as { true: number; false: number };
    if (!prior) return value ? 0.5 : 0.5;
    return value ? prior.true ?? 0.5 : prior.false ?? 0.5;
  }

  // Node with parents: build key in the SAME order as node.parents
  const key =
    node.parents
      .map((p) => `${p}=${assignment[p] ? "true" : "false"}`)
      .join(",") || "";
  const entry = (table && table[key]) || null;

  if (!entry) {
    // Graceful fallback if CPT row is missing
    return 0.5;
  }
  return value ? entry.true : entry.false;
};

/** Enumerate all hidden variables in topological order. */
const enumerateAll = (
  vars: string[],
  net: Network,
  evidence: Record<string, boolean>
): number => {
  if (vars.length === 0) return 1;

  const Y = vars[0];
  const rest = vars.slice(1);

  if (evidence[Y] !== undefined) {
    const p = getProbGivenParents(net, Y, evidence[Y], evidence);
    return p * enumerateAll(rest, net, evidence);
  }

  // Sum over Y=true/false
  let sum = 0;
  for (const yVal of [true, false]) {
    const e2 = { ...evidence, [Y]: yVal };
    const p = getProbGivenParents(net, Y, yVal, e2);
    sum += p * enumerateAll(rest, net, e2);
  }
  return sum;
};

/** Classic enumeration-ask for a boolean variable. */
const enumerationAsk = (
  X: string,
  net: Network,
  evidence: Record<string, boolean>
): { true: number; false: number } => {
  const vars = topoSort(net);

  const eTrue = { ...evidence, [X]: true };
  const eFalse = { ...evidence, [X]: false };
  const pTrue = enumerateAll(vars, net, eTrue);
  const pFalse = enumerateAll(vars, net, eFalse);
  const norm = pTrue + pFalse || 1;

  return { true: pTrue / norm, false: pFalse / norm };
};

export default function BayesianNetworkDemo() {
  const [selectedNetworkId, setSelectedNetworkId] =
    useState<keyof typeof predefinedNetworks>("LISP");

  const [network, setNetwork] = useState<Network>(
    JSON.parse(JSON.stringify(predefinedNetworks.weather))
  );

  const [inferenceProbabilities, setInferenceProbabilities] = useState<
    Record<string, { true: number; false: number }>
  >({});

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [newNodeData, setNewNodeData] = useState<{
    name: string;
    parents: Record<string, boolean>;
  }>({ name: "", parents: {} });
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);

  /* ===========
     Load network
     =========== */
  useEffect(() => {
    if (selectedNetworkId in predefinedNetworks) {
      const newNetwork: Network = JSON.parse(
        JSON.stringify(predefinedNetworks[selectedNetworkId])
      );
      newNetwork.nodes = applyForceDirectedLayout(newNetwork.nodes) as any;
      setNetwork(newNetwork);
      setSelectedNode(null);
    }
  }, [selectedNetworkId]);

  /* =========================
     Exact inference on change
     ========================= */
  const computeExactInference = (net: Network) => {
    const result: Record<string, { true: number; false: number }> = {};
    const evi = net.evidence || {};

    net.nodes.forEach((node) => {
      // Evidence nodes still get a {1,0} or {0,1} distribution for display
      if (evi[node.id] !== undefined) {
        result[node.id] = evi[node.id]
          ? { true: 1, false: 0 }
          : { true: 0, false: 1 };
      } else {
        result[node.id] = enumerationAsk(node.id, net, evi);
      }
    });

    setInferenceProbabilities(result);
  };

  useEffect(() => {
    computeExactInference(network);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network.nodes, network.probabilities, network.evidence]);

  /* =========================
     Probability & Evidence
     ========================= */
  const updateProbability = (
    nodeId: string,
    context: string, // "" for root, else CPT key
    _value: string, // kept for API compatibility; not used
    newProb: number
  ) => {
    setNetwork((prev) => {
      const updated: Network = JSON.parse(JSON.stringify(prev));

      if (!context) {
        // Root prior
        updated.probabilities[nodeId] = {
          true: newProb,
          false: 1 - newProb,
        };
      } else {
        // CPT row: set deterministically true=p, false=1-p
        if (!updated.probabilities[nodeId]) updated.probabilities[nodeId] = {};
        (updated.probabilities[nodeId] as any)[context] = {
          true: newProb,
          false: 1 - newProb,
        };
      }

      return updated;
    });
  };

  const setEvidence = (nodeId: string, value: boolean) => {
    setNetwork((prev) => {
      const updated: Network = { ...prev, evidence: { ...prev.evidence } };
      if (prev.evidence[nodeId] === value) {
        // Toggle off if clicking same
        const { [nodeId]: _, ...rest } = updated.evidence;
        updated.evidence = rest;
      } else {
        updated.evidence[nodeId] = value;
      }
      return updated;
    });
  };

  /* =========================
     Node management
     ========================= */
  const handleAddNode = () => {
    if (!newNodeData.name.trim()) return;

    const newId = newNodeData.name.toLowerCase().replace(/\s+/g, "_");
    if (network.nodes.some((n) => n.id === newId)) {
      alert("Een node met deze naam bestaat al.");
      return;
    }

    const parents = Object.entries(newNodeData.parents)
      .filter(([_, selected]) => selected)
      .map(([id]) => id);

    const newNode = {
      id: newId,
      name: newNodeData.name,
      parents,
      x: 300 + Math.random() * 100 - 50,
      y: 200 + Math.random() * 100 - 50,
    };

    const newProbabilities: Network["probabilities"] = JSON.parse(
      JSON.stringify(network.probabilities)
    );

    if (parents.length === 0) {
      newProbabilities[newId] = { true: 0.5, false: 0.5 };
    } else {
      // Build CPT for any number of parents
      const combos: string[] = [];
      const build = (idx: number, acc: string[]) => {
        if (idx === parents.length) {
          combos.push(acc.join(","));
          return;
        }
        build(idx + 1, [...acc, `${parents[idx]}=true`]);
        build(idx + 1, [...acc, `${parents[idx]}=false`]);
      };
      build(0, []);
      const cpt: Record<string, { true: number; false: number }> = {};
      combos.forEach((k) => (cpt[k] = { true: 0.5, false: 0.5 }));
      newProbabilities[newId] = cpt;
    }

    const updatedNodes = [...network.nodes, newNode];
    const layoutedNodes = applyForceDirectedLayout(updatedNodes) as any;

    setNetwork({
      ...network,
      nodes: layoutedNodes,
      probabilities: newProbabilities,
    });

    setNewNodeData({ name: "", parents: {} });
    setShowAddNodeModal(false);
  };

  const handleDeleteNode = (nodeId: string) => {
    const updatedNodes = network.nodes
      .filter((node) => node.id !== nodeId)
      .map((n) => ({ ...n, parents: n.parents.filter((p) => p !== nodeId) }));

    const updatedProbabilities: any = JSON.parse(
      JSON.stringify(network.probabilities)
    );
    const updatedEvidence: any = { ...network.evidence };
    delete updatedProbabilities[nodeId];
    delete updatedEvidence[nodeId];

    setNetwork({
      ...network,
      nodes: updatedNodes,
      probabilities: updatedProbabilities,
      evidence: updatedEvidence,
    });

    if (selectedNode === nodeId) setSelectedNode(null);
  };

  /* =========================
     Rendering helpers
     ========================= */
  const getNodeDisplayName = (nodeId: string) =>
    network.nodes.find((n) => n.id === nodeId)?.name || nodeId;

  const renderProbabilityTable = (nodeId: string) => {
    const node = network.nodes.find((n) => n.id === nodeId);
    if (!node) return null;

    if (node.parents.length === 0) {
      const probs = network.probabilities[nodeId] as {
        true: number;
        false: number;
      };
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Prior chance for {node.name}</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <CustomProbabilitySlider
              value={(probs?.true ?? 0.5) * 100}
              onChange={(value) =>
                updateProbability(nodeId, "", "true", value / 100)
              }
            />
          </div>
        </div>
      );
    } else {
      const parentCombinations: string[] = [];
      const generateCombinations = (
        parents: string[],
        currentIndex: number,
        currentCombo: string[] = []
      ) => {
        if (currentIndex === parents.length) {
          if (currentCombo.length > 0)
            parentCombinations.push(currentCombo.join(","));
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
            Conditional chances for {node.name}
          </h3>
          <div className="text-sm mb-2">
            Each row shows P({node.name} | parents)
          </div>

          <div className="overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {node.parents.map((pid) => (
                    <TableHead key={pid}>{getNodeDisplayName(pid)}</TableHead>
                  ))}
                  <TableHead className="w-[60%]">
                    Chance of {node.name}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parentCombinations.map((combo) => {
                  const conditions = combo.split(",");
                  const probTable = (network.probabilities[nodeId] as any)[
                    combo
                  ] ?? { true: 0.5, false: 0.5 };

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

  const renderNetworkDiagram = () => {
    return (
      <div className="relative border rounded-md h-[500px]">
        <svg width="100%" height="100%" className="w-full">
          {network.nodes.map((node) =>
            node.parents.map((parentId) => {
              const parent = network.nodes.find((n) => n.id === parentId);
              if (!parent) return null;

              const angle = Math.atan2(node.y - parent.y, node.x - parent.x);
              const nodeRadius = 45;

              const startX = parent.x + Math.cos(angle) * nodeRadius;
              const startY = parent.y + Math.sin(angle) * nodeRadius;
              const endX = node.x - Math.cos(angle) * nodeRadius;
              const endY = node.y - Math.sin(angle) * nodeRadius;

              const midX = endX - 10 * Math.cos(angle);
              const midY = endY - 10 * Math.sin(angle);

              const arrowSize = 10;
              const arrowAngle = Math.PI / 6;
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

        {network.nodes.map((node) => {
          const probability = inferenceProbabilities[node.id]?.true ?? 0.5;
          const hasEvidence = network.evidence[node.id] !== undefined;
          const isSelected = selectedNode === node.id;

          let nodeColor = getProbabilityColor(probability);
          if (hasEvidence) {
            nodeColor = network.evidence[node.id]
              ? "bg-green-100 border-green-500"
              : "bg-red-100 border-red-500";
          }
          if (isSelected) nodeColor += " ring-2 ring-primary ring-offset-2";

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
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <label htmlFor="network-select" className="font-medium text-gray-700">
            Select Network:
          </label>
          <Select
            value={selectedNetworkId}
            onValueChange={(value) =>
              setSelectedNetworkId(
                value as
                  | "LISP"
                  | "NUCLEAR"
                  | "DRIVER"
                  | "HMM"
                  | "dsepNetwork"
                  | "weather"
                  | "medical"
                  | "student"
              )
            }
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Selecteer een model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LISP">Fred's LISP dilemma</SelectItem>
              <SelectItem value="NUCLEAR">Nuclear Power Plant</SelectItem>
              <SelectItem value="DRIVER">Negligent Driver</SelectItem>
              <SelectItem value="HMM">Hidden Markov Model</SelectItem>
              <SelectItem value="dsepNetwork">Network Exercise 7</SelectItem>
              <SelectItem value="weather">Weather Model</SelectItem>
              <SelectItem value="medical">Medical Model</SelectItem>
              <SelectItem value="student">Student Model</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-6">{renderNetworkDiagram()}</div>

      {selectedNode && (
        <Card>
          <CardContent className="p-4">
            {renderProbabilityTable(selectedNode)}
          </CardContent>
        </Card>
      )}

      {/* Add Node Modal */}
      <Dialog open={showAddNodeModal} onOpenChange={setShowAddNodeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new node</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="new-node-name">Name</Label>
              <Input
                id="new-node-name"
                value={newNodeData.name}
                onChange={(e) =>
                  setNewNodeData({ ...newNodeData, name: e.target.value })
                }
                placeholder="Name new variable"
              />
            </div>

            {network.nodes.length > 0 && (
              <div>
                <Label className="mb-2 block">Select Parents (max 2):</Label>
                <div className="grid grid-cols-2 gap-2">
                  {network.nodes.map((node) => (
                    <div key={node.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`parent-${node.id}`}
                        checked={!!newNodeData.parents[node.id]}
                        onCheckedChange={(checked) => {
                          setNewNodeData({
                            ...newNodeData,
                            parents: {
                              ...newNodeData.parents,
                              [node.id]: checked as boolean,
                            },
                          });
                        }}
                        disabled={
                          Object.values(newNodeData.parents).filter(Boolean)
                            .length >= 2 && !newNodeData.parents[node.id]
                        }
                      />
                      <Label htmlFor={`parent-${node.id}`} className="text-sm">
                        {node.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Explanation Modal */}
      <Dialog
        open={showExplanationModal}
        onOpenChange={setShowExplanationModal}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bayesian Networks Explanation</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <ExplanationPanel />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
