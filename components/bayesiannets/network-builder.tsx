"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface NetworkBuilderProps {
  network: {
    nodes: Array<{
      id: string;
      name: string;
      parents: string[];
      x: number;
      y: number;
    }>;
    probabilities: Record<string, any>;
    evidence: Record<string, boolean>;
  };
  setNetwork: (network: any) => void;
}

export default function NetworkBuilder({
  network,
  setNetwork,
}: NetworkBuilderProps) {
  const [newNodeName, setNewNodeName] = useState("");
  const [selectedParents, setSelectedParents] = useState<
    Record<string, boolean>
  >({});

  const handleAddNode = () => {
    if (!newNodeName.trim()) return;

    // Generate a unique ID
    const newId = newNodeName.toLowerCase().replace(/\s+/g, "_");

    // Check if ID already exists
    if (network.nodes.some((node) => node.id === newId)) {
      alert("Een node met deze naam bestaat al.");
      return;
    }

    // Get selected parents
    const parents = Object.entries(selectedParents)
      .filter(([_, selected]) => selected)
      .map(([id]) => id);

    // Calculate position (simple positioning for demo)
    const baseX = 300;
    const baseY = 200;
    const offset = network.nodes.length * 30;

    // Create new node
    const newNode = {
      id: newId,
      name: newNodeName,
      parents,
      x: baseX + Math.sin(network.nodes.length) * offset,
      y: baseY + Math.cos(network.nodes.length) * offset,
    };

    // Create probability tables
    const newProbabilities = { ...network.probabilities };

    if (parents.length === 0) {
      // Root node
      newProbabilities[newId] = { true: 0.5, false: 0.5 };
    } else if (parents.length === 1) {
      // One parent
      newProbabilities[newId] = {
        [`${parents[0]}=true`]: { true: 0.5, false: 0.5 },
        [`${parents[0]}=false`]: { true: 0.5, false: 0.5 },
      };
    } else if (parents.length === 2) {
      // Two parents (for simplicity we only handle up to 2 parents in this demo)
      newProbabilities[newId] = {
        [`${parents[0]}=true,${parents[1]}=true`]: { true: 0.5, false: 0.5 },
        [`${parents[0]}=true,${parents[1]}=false`]: { true: 0.5, false: 0.5 },
        [`${parents[0]}=false,${parents[1]}=true`]: { true: 0.5, false: 0.5 },
        [`${parents[0]}=false,${parents[1]}=false`]: { true: 0.5, false: 0.5 },
      };
    }

    // Update network
    setNetwork({
      ...network,
      nodes: [...network.nodes, newNode],
      probabilities: newProbabilities,
    });

    // Reset form
    setNewNodeName("");
    setSelectedParents({});
  };

  const handleDeleteNode = (nodeId: string) => {
    // Filter out the node
    const updatedNodes = network.nodes.filter((node) => node.id !== nodeId);

    // Remove any references to this node as a parent
    updatedNodes.forEach((node) => {
      node.parents = node.parents.filter((id) => id !== nodeId);
    });

    // Remove probability entries
    const { [nodeId]: removedProb, ...restProbs } = network.probabilities;

    // Remove evidence if it exists
    const { [nodeId]: removedEvidence, ...restEvidence } = network.evidence;

    // Update network
    setNetwork({
      ...network,
      nodes: updatedNodes,
      probabilities: restProbs,
      evidence: restEvidence,
    });
  };

  const handleParentChange = (nodeId: string, checked: boolean) => {
    setSelectedParents({
      ...selectedParents,
      [nodeId]: checked,
    });
  };

  return (
    <Card className="mt-4">
      <CardContent className="pt-4">
        <h3 className="text-lg font-medium mb-4">Netwerk Aanpassen</h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="new-node-name">Nieuwe Variabele Toevoegen</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="new-node-name"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                placeholder="Naam van nieuwe variabele"
              />
              <Button onClick={handleAddNode} size="sm">
                <Plus className="mr-1 h-4 w-4" /> Toevoegen
              </Button>
            </div>
          </div>

          {newNodeName && (
            <div>
              <Label className="mb-2 block">Selecteer ouders (max 2):</Label>
              <div className="grid grid-cols-2 gap-2">
                {network.nodes.map((node) => (
                  <div key={node.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`parent-${node.id}`}
                      checked={!!selectedParents[node.id]}
                      onCheckedChange={(checked) =>
                        handleParentChange(node.id, checked === true)
                      }
                      disabled={
                        Object.values(selectedParents).filter(Boolean).length >=
                          2 && !selectedParents[node.id]
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

          <div className="border-t pt-4 mt-4">
            <h4 className="text-md font-medium mb-2">Bestaande Variabelen</h4>
            <div className="grid grid-cols-2 gap-2">
              {network.nodes.map((node) => (
                <div
                  key={node.id}
                  className="flex items-center justify-between border p-2 rounded"
                >
                  <div>
                    <div className="font-medium">{node.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {node.parents.length === 0
                        ? "Geen ouders"
                        : `Ouders: ${node.parents
                            .map(
                              (p) => network.nodes.find((n) => n.id === p)?.name
                            )
                            .join(", ")}`}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteNode(node.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
