"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PathNode } from "./path-node";
import { NetworkEdge } from "./network-edge";
import type { BayesianNetwork, NetworkState } from "./network-types";
import { findDSeparatedNodes } from "./d-separation";
import { PathVisualizationPanel } from "./path-visualization-panel";
import {
  analyzeAllPaths,
  getPathSegments,
  type PathInfo,
} from "./d-separation";

interface DSeparationDemoProps {
  network: BayesianNetwork;
}

export default function DSeparationDemo({ network }: DSeparationDemoProps) {
  const [networkState, setNetworkState] = useState<NetworkState>({
    evidenceNodes: new Set(),
    targetNode: null,
    dSeparatedNodes: new Set(),
  });

  const [selectedNodeForAnalysis, setSelectedNodeForAnalysis] = useState<
    string | null
  >(null);
  const [selectedPath, setSelectedPath] = useState<string[] | null>(null);

  // Reset state when the network prop changes
  useEffect(() => {
    setNetworkState({
      evidenceNodes: new Set(),
      targetNode: null,
      dSeparatedNodes: new Set(),
    });
    setSelectedNodeForAnalysis(null);
    setSelectedPath(null);
  }, [network]);

  const dSeparatedNodes = useMemo(() => {
    if (!networkState.targetNode) return new Set<string>();
    return findDSeparatedNodes(
      network.nodes,
      networkState.targetNode,
      networkState.evidenceNodes
    );
  }, [networkState.targetNode, networkState.evidenceNodes, network.nodes]);

  const pathAnalysis = useMemo(() => {
    if (!networkState.targetNode) return new Map();
    return analyzeAllPaths(
      network.nodes,
      networkState.targetNode,
      networkState.evidenceNodes
    );
  }, [networkState.targetNode, networkState.evidenceNodes, network.nodes]);

  const handleToggleEvidence = (nodeId: string) => {
    setNetworkState((prev) => {
      const newEvidence = new Set(prev.evidenceNodes);
      if (newEvidence.has(nodeId)) {
        newEvidence.delete(nodeId);
      } else {
        newEvidence.add(nodeId);
      }
      return {
        ...prev,
        evidenceNodes: newEvidence,
      };
    });
  };

  const handleSetTarget = (nodeId: string) => {
    setNetworkState((prev) => ({
      ...prev,
      targetNode: nodeId,
    }));
    setSelectedNodeForAnalysis(null);
    setSelectedPath(null);
  };

  const handleNodeAnalysis = (nodeId: string) => {
    if (nodeId === networkState.targetNode) return;
    if (networkState.evidenceNodes.has(nodeId)) return;
    setSelectedNodeForAnalysis(nodeId);
    setSelectedPath(null);
  };

  const handleClear = () => {
    setNetworkState({
      evidenceNodes: new Set(),
      targetNode: null,
      dSeparatedNodes: new Set(),
    });
    setSelectedNodeForAnalysis(null);
    setSelectedPath(null);
  };

  // Map de string-gebaseerde edges naar NetworkNode objecten voor de NetworkEdge component
  const nodeMap = useMemo(
    () => new Map(network.nodes.map((node) => [node.id, node])),
    [network.nodes]
  );

  const dynamicHeight = useMemo(() => {
    const maxY = network.nodes.reduce((max, node) => Math.max(max, node.y), 0);
    // Voeg padding toe (bijv. 100px) en zorg voor een minimale hoogte (bijv. 400px)
    return Math.max(maxY + 100, 400);
  }, [network.nodes]);

  const displayEdges = useMemo(() => {
    return network.edges.map((edge) => ({
      from: nodeMap.get(edge.from)!,
      to: nodeMap.get(edge.to)!,
    }));
  }, [network.edges, nodeMap]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{network.name} - D-Separation Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="relative w-full border border-gray-300 rounded-lg bg-gray-50"
            style={{ height: `${dynamicHeight}px` }}
            onClick={(e) => {
              // Check if click was on a node
              const target = e.target as HTMLElement;
              if (!target.closest(".absolute")) {
                setSelectedNodeForAnalysis(null);
                setSelectedPath(null);
              }
            }}
          >
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#374151" />
                </marker>
              </defs>
              {displayEdges.map((edge, index) => {
                let isHighlighted = false;
                let isBlocked = false;
                let isPathSegment = false;
                let pathDirection: "forward" | "backward" | undefined;
                let isBlockedFromHere = false;

                if (selectedPath && selectedNodeForAnalysis) {
                  const currentPathInfo = pathAnalysis
                    .get(selectedNodeForAnalysis)
                    ?.find(
                      (p: PathInfo) =>
                        p.path.join("→") === selectedPath.join("→")
                    );

                  if (currentPathInfo) {
                    const pathSegments = getPathSegments(
                      nodeMap,
                      selectedPath,
                      currentPathInfo.blockingIndex
                    );

                    // Check if this edge is part of the selected path
                    const segment = pathSegments.find(
                      (seg) =>
                        (seg.from === edge.from.id && seg.to === edge.to.id) ||
                        (seg.from === edge.to.id && seg.to === edge.from.id)
                    );

                    if (segment) {
                      isPathSegment = true;
                      pathDirection = segment.direction;
                      isBlockedFromHere = segment.isBlocked;

                      if (currentPathInfo.isBlocked && segment.isBlocked) {
                        isBlocked = true;
                      } else {
                        isHighlighted = true;
                      }
                    }
                  }
                }

                return (
                  <NetworkEdge
                    key={index}
                    from={edge.from}
                    to={edge.to}
                    isHighlighted={isHighlighted}
                    isBlocked={isBlocked}
                    isPathSegment={isPathSegment}
                    pathDirection={pathDirection}
                    isBlockedFromHere={isBlockedFromHere}
                  />
                );
              })}
            </svg>

            {network.nodes.map((node) => (
              <PathNode
                key={node.id}
                node={node}
                isEvidence={networkState.evidenceNodes.has(node.id)}
                isTarget={networkState.targetNode === node.id}
                isDSeparated={dSeparatedNodes.has(node.id)}
                isInActivePath={
                  selectedPath ? selectedPath.includes(node.id) : false
                }
                isBlockingNode={
                  selectedPath
                    ? pathAnalysis
                        .get(selectedNodeForAnalysis || "")
                        ?.some(
                          (p: PathInfo) =>
                            p.path.join("→") === selectedPath.join("→") &&
                            p.blockingNode === node.id
                        ) || false
                    : false
                }
                onToggleEvidence={handleToggleEvidence}
                onSetTarget={(nodeId) => {
                  // If we already have a target and this is not the target or evidence, analyze paths
                  if (
                    networkState.targetNode &&
                    nodeId !== networkState.targetNode &&
                    !networkState.evidenceNodes.has(nodeId)
                  ) {
                    handleNodeAnalysis(nodeId);
                  } else {
                    // Otherwise set as target
                    handleSetTarget(nodeId);
                  }
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Target Node</CardTitle>
          </CardHeader>
          <CardContent>
            {networkState.targetNode ? (
              <Badge variant="default" className="bg-blue-500">
                {networkState.targetNode}
              </Badge>
            ) : (
              <p className="text-gray-500">No target selected</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evidence Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            {networkState.evidenceNodes.size > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Array.from(networkState.evidenceNodes).map((nodeId) => (
                  <Badge
                    key={nodeId}
                    variant="default"
                    className="bg-green-500"
                  >
                    {nodeId}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No evidence selected</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">D-Separated Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            {dSeparatedNodes.size > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Array.from(dSeparatedNodes).map((nodeId) => (
                  <Badge key={nodeId} variant="destructive">
                    {nodeId}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">
                {networkState.targetNode
                  ? "No nodes are d-separated"
                  : "Select a target node first"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <PathVisualizationPanel
        targetNode={networkState.targetNode}
        selectedNode={selectedNodeForAnalysis}
        pathInfos={
          selectedNodeForAnalysis
            ? pathAnalysis.get(selectedNodeForAnalysis) || []
            : []
        }
        onSelectPath={setSelectedPath}
        selectedPath={selectedPath}
      />

      <div className="flex justify-center">
        <Button onClick={handleClear} variant="outline">
          Clear All Selections
        </Button>
      </div>
    </div>
  );
}
