"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface InferencePanelProps {
  network: {
    nodes: Array<{ id: string; name: string; parents: string[] }>;
    probabilities: Record<string, any>;
    evidence: Record<string, boolean>;
  };
  inferenceProbabilities: Record<string, { true: number; false: number }>;
  setEvidence: (nodeId: string, value: boolean | null) => void;
}

export default function InferencePanel({
  network,
  inferenceProbabilities,
  setEvidence,
}: InferencePanelProps) {
  const [queryNode, setQueryNode] = useState<string | null>(null);

  const getNodeDisplayName = (nodeId: string) => {
    return network.nodes.find((node) => node.id === nodeId)?.name || nodeId;
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium">Bayesiaanse Inferentie</h3>
        <p className="text-sm text-muted-foreground">
          Bekijk de berekende kansen en experimenteer met verschillende
          evidence.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h4 className="text-md font-medium mb-4">Evidence Instellen</h4>
          <div className="space-y-3">
            {network.nodes.map((node) => (
              <div key={node.id} className="flex items-center justify-between">
                <div className="flex flex-col">
                  <Label
                    htmlFor={`evidence-${node.id}`}
                    className="text-sm font-medium"
                  >
                    {node.name}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {network.evidence[node.id] === undefined
                      ? "Geen evidence"
                      : network.evidence[node.id]
                      ? "Waar"
                      : "Onwaar"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className={`px-2 py-1 text-xs rounded ${
                      network.evidence[node.id] === false
                        ? "bg-red-200 text-red-900"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                    onClick={() => setEvidence(node.id, false)}
                  >
                    Onwaar
                  </button>
                  <Switch
                    id={`evidence-${node.id}`}
                    checked={network.evidence[node.id] === true}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setEvidence(node.id, true);
                      } else if (network.evidence[node.id] === true) {
                        setEvidence(node.id, null);
                      }
                    }}
                  />
                  <button
                    className={`px-2 py-1 text-xs rounded ${
                      network.evidence[node.id] === true
                        ? "bg-green-200 text-green-900"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                    onClick={() => setEvidence(node.id, true)}
                  >
                    Waar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="text-md font-medium mb-4">
            Berekende Posteriori Kansen
          </h4>
          <div className="space-y-4">
            {network.nodes.map((node) => {
              const probability = inferenceProbabilities[node.id]?.true || 0;
              const isEvidence = network.evidence[node.id] !== undefined;

              return (
                <div key={node.id} className="space-y-1">
                  <div className="flex justify-between">
                    <div>
                      <span className="text-sm font-medium">{node.name}</span>
                      {isEvidence && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Evidence
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {(probability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={probability * 100} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      P({node.name} = waar{isEvidence ? " | evidence" : ""})
                    </span>
                    <span>{(probability * 100).toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="text-md font-medium mb-4">
          Voorwaardelijke Kansen Verkennen
        </h4>

        <div className="grid gap-4 mb-4 md:grid-cols-3">
          {network.nodes.map((node) => {
            const probability = inferenceProbabilities[node.id]?.true || 0;
            const isEvidence = network.evidence[node.id] !== undefined;

            if (isEvidence) return null; // Skip evidence nodes for query

            return (
              <div
                key={node.id}
                className={`border rounded-md p-4 cursor-pointer hover:border-primary transition-colors ${
                  queryNode === node.id ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() =>
                  setQueryNode(queryNode === node.id ? null : node.id)
                }
              >
                <div className="text-sm font-medium">{node.name}</div>
                <div className="flex items-center mt-1">
                  <Progress
                    value={probability * 100}
                    className="h-2 flex-grow"
                  />
                  <span className="ml-2 text-xs">
                    {(probability * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Klik om te querien
                </div>
              </div>
            );
          })}
        </div>

        {queryNode && (
          <div className="mt-4 border rounded-md p-4 bg-muted/20">
            <h5 className="text-sm font-medium mb-2">
              Voorwaardelijke Kans voor {getNodeDisplayName(queryNode)}
            </h5>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex-grow">
                <div className="text-xs mb-1">
                  P({getNodeDisplayName(queryNode)} = waar | evidence)
                </div>
                <Progress
                  value={(inferenceProbabilities[queryNode]?.true || 0) * 100}
                  className="h-3"
                />
              </div>
              <div className="text-lg font-medium">
                {((inferenceProbabilities[queryNode]?.true || 0) * 100).toFixed(
                  1
                )}
                %
              </div>
            </div>

            {Object.keys(network.evidence).length > 0 && (
              <div className="text-sm">
                <div className="flex items-center gap-1 mb-1">
                  <span>Gegeven evidence:</span>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(network.evidence).map(([nodeId, value]) => (
                      <Badge
                        key={nodeId}
                        variant="outline"
                        className={value ? "bg-green-100" : "bg-red-100"}
                      >
                        {getNodeDisplayName(nodeId)} ={" "}
                        {value ? "waar" : "onwaar"}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
