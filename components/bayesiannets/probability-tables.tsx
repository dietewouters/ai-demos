"use client";

import React from "react";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProbabilityTablesProps {
  network: {
    nodes: Array<{ id: string; name: string; parents: string[] }>;
    probabilities: Record<string, any>;
    evidence: Record<string, boolean>;
  };
  updateProbability: (
    nodeId: string,
    context: string,
    value: string,
    newProb: number
  ) => void;
}

export default function ProbabilityTables({
  network,
  updateProbability,
}: ProbabilityTablesProps) {
  const [selectedNode, setSelectedNode] = useState<string>(
    network.nodes[0]?.id || ""
  );

  const getNodeDisplayName = (nodeId: string) => {
    return network.nodes.find((node) => node.id === nodeId)?.name || nodeId;
  };

  const renderRootNodeTable = (nodeId: string) => {
    const probs = network.probabilities[nodeId];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Prior Kans voor {getNodeDisplayName(nodeId)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waarde</TableHead>
                <TableHead>Kans</TableHead>
                <TableHead>Aanpassen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Waar</TableCell>
                <TableCell>{(probs.true * 100).toFixed(1)}%</TableCell>
                <TableCell className="w-[200px]">
                  <Slider
                    value={[probs.true * 100]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([value]) => {
                      updateProbability(nodeId, "", "true", value / 100);
                    }}
                  />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Onwaar</TableCell>
                <TableCell>{(probs.false * 100).toFixed(1)}%</TableCell>
                <TableCell>
                  <Slider
                    value={[probs.false * 100]}
                    min={0}
                    max={100}
                    step={1}
                    disabled
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const renderConditionalTable = (nodeId: string) => {
    const node = network.nodes.find((n) => n.id === nodeId);
    if (!node) return null;

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
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">
            Voorwaardelijke Kansen voor {getNodeDisplayName(nodeId)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm mb-2">
            Elke rij toont P({getNodeDisplayName(nodeId)} | ouders)
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                {parentNames.map((name) => (
                  <TableHead key={name}>{name}</TableHead>
                ))}
                <TableHead>Waarde</TableHead>
                <TableHead>Kans</TableHead>
                <TableHead>Aanpassen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parentCombinations.map((combo) => {
                const conditions = combo.split(",");
                const probTable = network.probabilities[nodeId][combo];

                return (
                  <React.Fragment key={combo}>
                    <TableRow>
                      {conditions.map((cond) => {
                        const [_, value] = cond.split("=");
                        return (
                          <TableCell key={cond}>
                            {value === "true" ? "Waar" : "Onwaar"}
                          </TableCell>
                        );
                      })}
                      <TableCell>Waar</TableCell>
                      <TableCell>
                        {(probTable.true * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="w-[200px]">
                        <Slider
                          value={[probTable.true * 100]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={([value]) => {
                            updateProbability(
                              nodeId,
                              combo,
                              "true",
                              value / 100
                            );
                          }}
                        />
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-b-2 border-b-gray-200">
                      {conditions.map(() => (
                        <TableCell key={`empty-${Math.random()}`} />
                      ))}
                      <TableCell>Onwaar</TableCell>
                      <TableCell>
                        {(probTable.false * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Slider
                          value={[probTable.false * 100]}
                          min={0}
                          max={100}
                          step={1}
                          disabled
                        />
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium">Kanstabellen</h3>
        <p className="text-sm text-muted-foreground">
          Bekijk en pas de kansen in het Bayesiaans netwerk aan met de sliders.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {network.nodes.map((node) => (
          <button
            key={node.id}
            className={`px-3 py-1 rounded-md text-sm ${
              selectedNode === node.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary hover:bg-secondary/80"
            }`}
            onClick={() => setSelectedNode(node.id)}
          >
            {node.name}
          </button>
        ))}
      </div>

      {selectedNode && (
        <div>
          {network.nodes.find((n) => n.id === selectedNode)?.parents.length ===
          0
            ? renderRootNodeTable(selectedNode)
            : renderConditionalTable(selectedNode)}
        </div>
      )}
    </div>
  );
}
