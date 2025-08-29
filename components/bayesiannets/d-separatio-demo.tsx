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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight } from "lucide-react";

export type DSeparationDemoProps = {
  /** Accepts either an array of networks or an object map (like your predefinedNetworks). */
  networks: BayesianNetwork[] | Record<string, any>;
  /** Optionally preselect a network by name (for maps, this is the object key). */
  defaultNetworkName?: string;
  /** Optional: map internal names/keys to pretty labels shown in the dropdown */
  labels?: Record<string, string>;
  /** Optional: explicit ordering of the dropdown by internal names/keys */
  order?: string[];
  /** Optional UI niceties */
  title?: string;
  className?: string;
  /** Hide the how-to panel if you embed this elsewhere */
  showInstructions?: boolean;
};

const EMPTY_NETWORK: BayesianNetwork = {
  name: "—",
  description: "No network provided",
  nodes: [],
  edges: [],
};

// --- helpers ---
type MinimalNode = {
  id: string;
  parents?: string[];
  children?: string[]; // mag ontbreken in data
  x?: number;
  y?: number;
  name?: string;
  fixed?: boolean;
};

type RegistryMap = Record<
  string,
  {
    nodes: MinimalNode[];
    probabilities?: any;
    evidence?: Record<string, boolean>;
    description?: string;
  }
>;

function nodesWithChildren(nodes: MinimalNode[]) {
  // clone en garandeer children-array
  const cloned = nodes.map((n) => ({
    ...n,
    children: Array.isArray(n.children) ? [...n.children] : ([] as string[]),
  }));
  const byId = new Map(cloned.map((n) => [n.id, n]));
  for (const n of cloned) {
    for (const p of n.parents ?? []) {
      const parent = byId.get(p);
      if (parent) parent.children!.push(n.id);
    }
  }
  return cloned;
}

function edgesFromParents(nodes: MinimalNode[]) {
  const edges: { from: string; to: string }[] = [];
  for (const n of nodes)
    (n.parents ?? []).forEach((p) => edges.push({ from: p, to: n.id }));
  return edges;
}

function normalizeNetworks(
  input: BayesianNetwork[] | RegistryMap
): BayesianNetwork[] {
  if (Array.isArray(input)) {
    return input.map((n, i) => {
      const nodes = nodesWithChildren(
        ((n as any).nodes ?? []) as MinimalNode[]
      );
      return {
        name: (n as any).name ?? `Network ${i + 1}`,
        description: (n as any).description ?? "",
        nodes,
        edges: (n as any).edges ?? edgesFromParents(nodes),
        probabilities: (n as any).probabilities,
        evidence: (n as any).evidence ?? {},
      } as any;
    });
  }
  // object-map: key wordt de naam
  return Object.entries(input).map(([key, net]) => {
    const nodes = nodesWithChildren((net.nodes ?? []) as MinimalNode[]);
    return {
      name: key,
      description: net.description ?? "",
      nodes,
      edges: edgesFromParents(nodes),
      probabilities: net.probabilities,
      evidence: net.evidence ?? {},
    } as any;
  });
}

export default function DSeparationDemo({
  networks,
  defaultNetworkName,
  labels,
  order,
  title,
  className,
  showInstructions = true,
}: DSeparationDemoProps) {
  // Normalize input (array or object) into an array with names & edges
  const normalized = useMemo(() => normalizeNetworks(networks), [networks]);

  // Apply optional ordering
  const ordered = useMemo(() => {
    const arr = [...normalized];
    if (order && order.length) {
      const pos = new Map(order.map((k, i) => [k, i]));
      arr.sort(
        (a, b) =>
          (pos.get(a.name ?? "") ?? Number.POSITIVE_INFINITY) -
          (pos.get(b.name ?? "") ?? Number.POSITIVE_INFINITY)
      );
    }
    return arr;
  }, [normalized, order]);

  // Restrict selector to named networks (like your original did)
  const namedNetworks = useMemo(
    () =>
      ordered.filter((n) => typeof n.name === "string" && n.name.length > 0),
    [ordered]
  );

  const initialByDefaultName = useMemo(
    () =>
      defaultNetworkName
        ? ordered.find((n) => n.name === defaultNetworkName)
        : undefined,
    [ordered, defaultNetworkName]
  );

  const initialNetwork: BayesianNetwork =
    initialByDefaultName ?? namedNetworks[0] ?? ordered[0] ?? EMPTY_NETWORK;

  const [selectedNetworkName, setSelectedNetworkName] = useState(
    initialNetwork.name ?? ""
  );
  const [currentNetwork, setCurrentNetwork] =
    useState<BayesianNetwork>(initialNetwork);

  const [networkState, setNetworkState] = useState<NetworkState>({
    evidenceNodes: new Set(),
    targetNode: null,
    dSeparatedNodes: new Set(),
  });

  const [selectedNodeForAnalysis, setSelectedNodeForAnalysis] = useState<
    string | null
  >(null);
  const [selectedPath, setSelectedPath] = useState<string[] | null>(null);

  // When the available networks OR the selected name changes, sync `currentNetwork` and reset UI state
  useEffect(() => {
    const byName = ordered.find((n) => n.name === selectedNetworkName);
    const next = byName ?? namedNetworks[0] ?? ordered[0] ?? EMPTY_NETWORK;
    setCurrentNetwork(next);
    setNetworkState({
      evidenceNodes: new Set(),
      targetNode: null,
      dSeparatedNodes: new Set(),
    });
    setSelectedNodeForAnalysis(null);
    setSelectedPath(null);
  }, [selectedNetworkName, ordered, namedNetworks]);

  // If the caller changes `defaultNetworkName` later, respect that when no explicit selection yet
  useEffect(() => {
    if (!selectedNetworkName && defaultNetworkName) {
      const exists = ordered.find((n) => n.name === defaultNetworkName);
      if (exists) setSelectedNetworkName(defaultNetworkName);
    }
  }, [defaultNetworkName, ordered, selectedNetworkName]);

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
      if (newEvidence.has(nodeId)) newEvidence.delete(nodeId);
      else newEvidence.add(nodeId);
      return { ...prev, evidenceNodes: newEvidence };
    });
  };

  const handleSetTarget = (nodeId: string) => {
    setNetworkState((prev) => ({
      ...prev,
      targetNode: prev.targetNode === nodeId ? null : nodeId,
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

  const nodeMap = useMemo(
    () => new Map(currentNetwork.nodes.map((node) => [node.id, node])),
    [currentNetwork.nodes]
  );

  const dynamicHeight = useMemo(() => {
    if (!currentNetwork.nodes.length) return 400;
    const maxY = currentNetwork.nodes.reduce(
      (max, node) => Math.max(max, (node as any).y ?? 0),
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

  const displayTitle = useMemo(() => {
    const base = "D-Separation Demo";
    return title ?? `${base}`;
  }, [title]);

  return (
    <div
      className={`w-full max-w-6xl mx-auto p-4 space-y-6 ${className ?? ""}`}
    >
      {showInstructions && (
        <Card className="mt-8">
          <details className="group">
            <summary
              className="flex items-center gap-2 cursor-pointer select-none p-4 font-medium
                            list-none [&::-webkit-details-marker]:hidden"
            >
              <ChevronRight
                className="h-4 w-4 transition-transform duration-200 group-open:rotate-90"
                strokeWidth={1.2}
              />
              Instructions
            </summary>
            <CardContent className="pt-0 pb-2 px-4 text-[14px] leading-5 text-slate-700">
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Click on a node to set it as the{" "}
                  <span className="text-blue-600 font-semibold">
                    target node
                  </span>
                  . Click again to deselect.
                </li>
                <li>
                  Shift+Click on nodes to toggle them as{" "}
                  <span className="text-green-600 font-semibold">evidence</span>
                  .
                </li>
                <li>
                  Click on any other node (not target or evidence) to see{" "}
                  <strong>detailed path analysis</strong> between target and
                  that node.
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
            </CardContent>
          </details>
        </Card>
      )}

      {/* Target / Evidence / D-Separated */}
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

      {/* Network visualization */}
      <Card>
        <CardHeader>
          <CardTitle>{displayTitle}</CardTitle>
          {currentNetwork.description && (
            <p className="text-sm text-gray-600">
              {currentNetwork.description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {namedNetworks.length > 0 ? (
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
                <SelectTrigger id="network-select" className="w-[260px]">
                  <SelectValue placeholder="Select a network" />
                </SelectTrigger>
                <SelectContent>
                  {namedNetworks.map((net, i) => (
                    <SelectItem
                      key={net.name ?? `unnamed-${i}`}
                      value={net.name ?? `unnamed-${i}`}
                      disabled={net.name === undefined}
                    >
                      {labels?.[net.name ?? ""] ?? net.name ?? "– onbekend –"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="mb-4 text-sm text-gray-500">
              No named networks available.
            </div>
          )}

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
                  const currentPathInfo = (
                    pathAnalysis as Map<string, PathInfo[]>
                  )
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
                        (seg.from === (edge as any).from.id &&
                          seg.to === (edge as any).to.id) ||
                        (seg.from === (edge as any).to.id &&
                          seg.to === (edge as any).from.id)
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
                    ? (pathAnalysis as Map<string, PathInfo[]>)
                        .get(selectedNodeForAnalysis || "")
                        ?.some(
                          (p: PathInfo) =>
                            p.path.join("→") ===
                              (selectedPath as string[]).join("→") &&
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
            ? (pathAnalysis as Map<string, PathInfo[]>).get(
                selectedNodeForAnalysis
              ) || []
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
