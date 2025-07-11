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
import { predefinedNetworks } from "./network-registry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DSeparationDemo() {
  const [selectedNetworkName, setSelectedNetworkName] = useState(
    predefinedNetworks[0].name
  );
  const [currentNetwork, setCurrentNetwork] = useState<BayesianNetwork>(
    predefinedNetworks[0]
  );

  const [networkState, setNetworkState] = useState<NetworkState>({
    evidenceNodes: new Set(),
    targetNode: null,
    dSeparatedNodes: new Set(),
  });

  const [selectedNodeForAnalysis, setSelectedNodeForAnalysis] = useState<
    string | null
  >(null);
  const [selectedPath, setSelectedPath] = useState<string[] | null>(null);

  // Reset state when network changes
  useEffect(() => {
    const newNetwork = predefinedNetworks.find(
      (net) => net.name === selectedNetworkName
    );
    if (newNetwork) {
      setCurrentNetwork(newNetwork);
      setNetworkState({
        evidenceNodes: new Set(),
        targetNode: null,
        dSeparatedNodes: new Set(),
      });
      setSelectedNodeForAnalysis(null);
      setSelectedPath(null);
    }
  }, [selectedNetworkName]);

  const dSeparatedNodes = useMemo(() => {
    if (!networkState.targetNode) return new Set<string>();
    return findDSeparatedNodes(
      currentNetwork.nodes,
      networkState.targetNode,
      networkState.evidenceNodes
    );
  }, [
    networkState.targetNode,
    networkState.evidenceNodes,
    currentNetwork.nodes,
  ]);

  const pathAnalysis = useMemo(() => {
    if (!networkState.targetNode) return new Map();
    return analyzeAllPaths(
      currentNetwork.nodes,
      networkState.targetNode,
      networkState.evidenceNodes
    );
  }, [
    networkState.targetNode,
    networkState.evidenceNodes,
    currentNetwork.nodes,
  ]);

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
    setNetworkState((prev) => {
      // Deselect if already target, otherwise set as target
      const newTarget = prev.targetNode === nodeId ? null : nodeId;
      return {
        ...prev,
        targetNode: newTarget,
      };
    });
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

  const nodeMap = useMemo(
    () => new Map(currentNetwork.nodes.map((node) => [node.id, node])),
    [currentNetwork.nodes]
  );

  const dynamicHeight = useMemo(() => {
    const maxY = currentNetwork.nodes.reduce(
      (max, node) => Math.max(max, node.y),
      0
    );
    return Math.max(maxY + 100, 400);
  }, [currentNetwork.nodes]);

  const displayEdges = useMemo(() => {
    return currentNetwork.edges.map((edge) => ({
      from: nodeMap.get(edge.from)!,
      to: nodeMap.get(edge.to)!,
    }));
  }, [currentNetwork.edges, nodeMap]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Instructies bovenaan */}
      <Card>
        <CardHeader>
          <CardTitle>D-Separation Demo Instructions</CardTitle>
          <div className="text-sm text-gray-600 space-y-2 mt-4">
            <p>
              <strong>Instructions:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Click on a node to set it as the{" "}
                <span className="text-blue-600 font-semibold">target node</span>
                . Click again to deselect.
              </li>
              <li>
                Shift+Click on nodes to toggle them as{" "}
                <span className="text-green-600 font-semibold">evidence</span>.
              </li>
              <li>
                Click on any other node (not target or evidence) to see{" "}
                <strong>detailed path analysis</strong> between target and that
                node.
              </li>
              <li>
                Nodes highlighted in{" "}
                <span className="text-red-600 font-semibold">red</span> are
                d-separated from the target.
              </li>
              <li>
                <span className="text-orange-600 font-semibold">Orange</span>{" "}
                nodes are blocking a highlighted path.
              </li>
              <li>
                <span className="text-yellow-600 font-semibold">Yellow</span>{" "}
                nodes are part of the highlighted path.
              </li>
            </ul>
          </div>
        </CardHeader>
      </Card>

      {/* Target Node, Evidence Nodes en D-Separated Nodes */}
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

      {/* Netwerkvisualisatie */}
      <Card>
        <CardHeader>
          <CardTitle>{currentNetwork.name} - D-Separation Demo</CardTitle>
          <p className="text-sm text-gray-600">{currentNetwork.description}</p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
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
                    value={net.name ?? ""}
                    disabled={net.name === undefined}
                  >
                    {net.name ?? "– onbekend –"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className="relative w-full border border-gray-300 rounded-lg bg-gray-50"
            style={{ height: `${dynamicHeight}px` }}
            onClick={(e) => {
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

            {currentNetwork.nodes.map((node) => (
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
                  if (
                    networkState.targetNode &&
                    nodeId !== networkState.targetNode &&
                    !networkState.evidenceNodes.has(nodeId)
                  ) {
                    handleNodeAnalysis(nodeId);
                  } else {
                    handleSetTarget(nodeId);
                  }
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Path Visualization Panel */}
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

      {/* Clear All Selections button */}
      <div className="flex justify-center">
        <Button onClick={handleClear} variant="outline">
          Clear All Selections
        </Button>
      </div>
    </div>
  );
}
