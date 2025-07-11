import type { NetworkNode } from "./network-types";

export function findDSeparatedNodes(
  nodes: NetworkNode[],
  targetNode: string,
  evidenceNodes: Set<string>
): Set<string> {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const dSeparated = new Set<string>();

  // For each non-evidence, non-target node, check if it's d-separated from target
  for (const node of nodes) {
    if (node.id !== targetNode && !evidenceNodes.has(node.id)) {
      if (isDSeparated(nodeMap, targetNode, node.id, evidenceNodes)) {
        dSeparated.add(node.id);
      }
    }
  }

  return dSeparated;
}

function isDSeparated(
  nodeMap: Map<string, NetworkNode>,
  start: string,
  end: string,
  evidenceNodes: Set<string>
): boolean {
  // Simple implementation: find all paths and check if all are blocked
  const allPaths = findAllPaths(nodeMap, start, end);

  // A path is blocked if it contains a collider with evidence or a non-collider in evidence
  return allPaths.every((path) => isPathBlocked(nodeMap, path, evidenceNodes));
}

function findAllPaths(
  nodeMap: Map<string, NetworkNode>,
  start: string,
  end: string,
  visited: Set<string> = new Set(),
  currentPath: string[] = []
): string[][] {
  if (start === end) {
    return [[...currentPath, start]];
  }

  if (visited.has(start)) {
    return [];
  }

  visited.add(start);
  const paths: string[][] = [];
  const node = nodeMap.get(start);

  if (node) {
    // Check children
    for (const child of node.children) {
      const childPaths = findAllPaths(nodeMap, child, end, new Set(visited), [
        ...currentPath,
        start,
      ]);
      paths.push(...childPaths);
    }

    // Check parents
    for (const parent of node.parents) {
      const parentPaths = findAllPaths(nodeMap, parent, end, new Set(visited), [
        ...currentPath,
        start,
      ]);
      paths.push(...parentPaths);
    }
  }

  return paths;
}

function isPathBlocked(
  nodeMap: Map<string, NetworkNode>,
  path: string[],
  evidenceNodes: Set<string>
): boolean {
  if (path.length < 3) return false;

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const current = path[i];
    const next = path[i + 1];
    const currentNode = nodeMap.get(current);

    if (!currentNode) continue;

    // Check if current node is a collider (both edges point to it)
    const isCollider =
      currentNode.parents.includes(prev) && currentNode.parents.includes(next);

    if (isCollider) {
      // Collider blocks unless it or its descendants have evidence
      if (
        !evidenceNodes.has(current) &&
        !hasDescendantEvidence(nodeMap, current, evidenceNodes)
      ) {
        return true;
      }
    } else {
      // Non-collider blocks if it has evidence
      if (evidenceNodes.has(current)) {
        return true;
      }
    }
  }

  return false;
}

function hasDescendantEvidence(
  nodeMap: Map<string, NetworkNode>,
  nodeId: string,
  evidenceNodes: Set<string>,
  visited: Set<string> = new Set()
): boolean {
  if (visited.has(nodeId)) return false;
  visited.add(nodeId);

  const node = nodeMap.get(nodeId);
  if (!node) return false;

  for (const child of node.children) {
    if (
      evidenceNodes.has(child) ||
      hasDescendantEvidence(nodeMap, child, evidenceNodes, visited)
    ) {
      return true;
    }
  }

  return false;
}

export interface PathInfo {
  path: string[];
  isBlocked: boolean;
  blockingNode?: string;
  blockingReason?: string;
  blockingIndex?: number; // Index where blocking occurs
}

export interface PathSegment {
  from: string;
  to: string;
  direction: "forward" | "backward";
  isBlocked: boolean;
}

export function analyzeAllPaths(
  nodes: NetworkNode[],
  targetNode: string,
  evidenceNodes: Set<string>
): Map<string, PathInfo[]> {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const pathAnalysis = new Map<string, PathInfo[]>();

  for (const node of nodes) {
    if (node.id !== targetNode && !evidenceNodes.has(node.id)) {
      const paths = findAllPathsDetailed(nodeMap, targetNode, node.id);
      const pathInfos = paths.map((path) =>
        analyzePathBlocking(nodeMap, path, evidenceNodes)
      );
      pathAnalysis.set(node.id, pathInfos);
    }
  }

  return pathAnalysis;
}

function findAllPathsDetailed(
  nodeMap: Map<string, NetworkNode>,
  start: string,
  end: string,
  visited: Set<string> = new Set(),
  currentPath: string[] = [],
  maxDepth = 6
): string[][] {
  if (currentPath.length > maxDepth) return [];

  if (start === end) {
    return [[...currentPath, start]];
  }

  if (visited.has(start)) {
    return [];
  }

  visited.add(start);
  const paths: string[][] = [];
  const node = nodeMap.get(start);

  if (node) {
    // Check all connected nodes (parents and children)
    const connectedNodes = [...node.children, ...node.parents];

    for (const connected of connectedNodes) {
      const connectedPaths = findAllPathsDetailed(
        nodeMap,
        connected,
        end,
        new Set(visited),
        [...currentPath, start],
        maxDepth
      );
      paths.push(...connectedPaths);
    }
  }

  return paths;
}

function analyzePathBlocking(
  nodeMap: Map<string, NetworkNode>,
  path: string[],
  evidenceNodes: Set<string>
): PathInfo {
  if (path.length < 3) {
    return { path, isBlocked: false };
  }

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const current = path[i];
    const next = path[i + 1];
    const currentNode = nodeMap.get(current);

    if (!currentNode) continue;

    // Determine the relationship structure
    const prevIsParent = currentNode.parents.includes(prev);
    const nextIsParent = currentNode.parents.includes(next);
    const prevIsChild = currentNode.children.includes(prev);
    const nextIsChild = currentNode.children.includes(next);

    let isCollider = false;
    let pathType = "";

    if (prevIsParent && nextIsParent) {
      // Both coming from parents - this is a collider (v-structure)
      isCollider = true;
      pathType = "collider";
    } else if (prevIsChild && nextIsChild) {
      // Both going to children - this is a fork
      pathType = "fork";
    } else if ((prevIsParent && nextIsChild) || (prevIsChild && nextIsParent)) {
      // One parent, one child - this is a chain
      pathType = "chain";
    }

    if (isCollider) {
      // Collider blocks unless it or its descendants have evidence
      if (
        !evidenceNodes.has(current) &&
        !hasDescendantEvidence(nodeMap, current, evidenceNodes)
      ) {
        return {
          path,
          isBlocked: true,
          blockingNode: current,
          blockingIndex: i,
          blockingReason: `Collider ${current} blocks the path (no evidence on ${current} or its descendants)`,
        };
      }
    } else {
      // Non-collider (fork or chain) blocks if it has evidence
      if (evidenceNodes.has(current)) {
        return {
          path,
          isBlocked: true,
          blockingNode: current,
          blockingIndex: i,
          blockingReason: `${
            pathType === "fork" ? "Fork" : "Chain"
          } at ${current} blocks the path (${current} is observed)`,
        };
      }
    }
  }

  return { path, isBlocked: false };
}

export function getPathSegments(
  nodeMap: Map<string, NetworkNode>,
  path: string[],
  blockingIndex?: number
): PathSegment[] {
  const segments: PathSegment[] = [];

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const fromNode = nodeMap.get(from);
    const toNode = nodeMap.get(to);

    if (!fromNode || !toNode) continue;

    // Determine direction based on parent-child relationship
    let direction: "forward" | "backward" = "forward";
    if (fromNode.children.includes(to)) {
      direction = "forward"; // Following the directed edge
    } else if (fromNode.parents.includes(to)) {
      direction = "backward"; // Going against the directed edge
    }

    // Determine if this segment is blocked
    const isBlocked = blockingIndex !== undefined && i >= blockingIndex;

    segments.push({
      from,
      to,
      direction,
      isBlocked,
    });
  }

  return segments;
}
