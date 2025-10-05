"use client";

import type { SearchStep } from "../app/search";
import type { Algorithm } from "../algorithms/types";
import { graphs } from "../app/graphs";

/**
 * Optional helpers to stabilize neighbor ordering visually (Up, Right, Left, Down).
 * Falls back to lexicographic ordering for non-grid ids.
 */
const parseCoords = (id: string): [number, number] | null => {
  const parts = id.split("_");
  if (parts.length !== 2) return null;
  const x = parseInt(parts[0], 10);
  const y = parseInt(parts[1], 10);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return [x, y];
};

const sortByDirection = (current: string, neighbors: string[]) => {
  const cur = parseCoords(current);
  if (!cur) return [...neighbors].sort();
  const [cx, cy] = cur;

  const dirScore = (id: string) => {
    const c = parseCoords(id);
    if (!c) return 99;
    const [x, y] = c;
    if (y < cy && x === cx) return 0; // up
    if (x > cx && y === cy) return 1; // right
    if (x < cx && y === cy) return 2; // left
    if (y > cy && x === cx) return 3; // down
    return 4; // diagonals / others
  };

  return [...neighbors].sort((a, b) => dirScore(a) - dirScore(b));
};

/**
 * Greedy Best-First Search using h(n).
 *
 * Loop policy matches your interface flags:
 * - useClosedSet = true:
 *     * Skip expansion if node is already globally visited.
 *     * When generating neighbors, filter ONLY by visited (do NOT check frontier).
 *     * Duplicates in frontier are allowed (they’ll be ignored upon pop by visited check).
 * - usePathLoopBreaking = true (and useClosedSet = false):
 *     * Path-based: forbid only nodes already in the current path.
 *     * Duplicates in frontier are allowed.
 * - If both are false: no loop breaking (every neighbor allowed).
 */
function executeGreedySearch(
  adjList: { [key: string]: string[] },
  startNode: string,
  goalNode: string,
  earlyStop: boolean = false,
  usePathLoopBreaking: boolean = true,
  useClosedSet: boolean = false,
  graphId: string = "tree",
  _extra: { [key: string]: any } = {}
): SearchStep[] {
  const steps: SearchStep[] = [];
  const visited = new Set<string>();
  const parent: Record<string, string> = {};

  const heuristics = graphs[graphId]?.heuristics ?? {};
  const h = (node: string) => heuristics[node] ?? Infinity;

  type Item = { node: string; path: string[] };
  const frontier: Item[] = [{ node: startNode, path: [startNode] }];

  // Start step
  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(),
    frontier: [startNode],
    parent: {},
    pathQueue: [[startNode]],
    description: `Start Greedy Best-First from ${startNode}. Goal: ${goalNode}.`,
  });

  while (frontier.length > 0) {
    // Always expand the node with the smallest heuristic
    frontier.sort((a, b) => h(a.node) - h(b.node));
    const { node: currentNode, path: currentPath } = frontier.shift()!;

    // CLOSED-set: skip if already expanded before
    if (useClosedSet && visited.has(currentNode)) {
      continue;
    }

    steps.push({
      stepType: "take_from_frontier",
      currentNode,
      visited: new Set(visited),
      frontier: frontier.map((f) => f.node),
      parent: { ...parent },
      pathQueue: frontier.map((f) => f.path),
      takenNode: currentNode,
      exploredEdge:
        currentPath.length > 1
          ? { from: currentPath[currentPath.length - 2], to: currentNode }
          : undefined,
      description: `Taking node with lowest heuristic: ${currentPath.join(
        " → "
      )} (h: ${h(currentNode)})`,
    });

    if (currentNode === goalNode) {
      steps.push({
        stepType: "goal_found",
        currentNode,
        visited: new Set(visited),
        frontier: [],
        parent: { ...parent },
        finalPath: currentPath,
        pathQueue: [],
        description: `Goal ${goalNode} found! Path: ${currentPath.join(" → ")}`,
      });
      return steps;
    }

    visited.add(currentNode);

    // Deterministic neighbor order (visual consistency)
    const orderedNeighbors = sortByDirection(
      currentNode,
      adjList[currentNode] || []
    );

    steps.push({
      stepType: "highlight_edges",
      currentNode,
      visited: new Set(visited),
      frontier: frontier.map((f) => f.node),
      parent: { ...parent },
      pathQueue: frontier.map((f) => f.path),
      highlightedEdges: orderedNeighbors.map((n) => ({
        from: currentNode,
        to: n,
      })),
      description: `Exploring neighbors of ${currentNode}: ${orderedNeighbors.join(
        ", "
      )}`,
    });

    // Loop-handling filters
    let validNeighbors: string[];
    if (useClosedSet) {
      // Only exclude nodes already globally visited. Do NOT check frontier.
      validNeighbors = orderedNeighbors.filter((n) => !visited.has(n));
    } else if (usePathLoopBreaking) {
      // Path-based: exclude only nodes present in the current path
      validNeighbors = orderedNeighbors.filter((n) => !currentPath.includes(n));
    } else {
      // No loop breaking
      validNeighbors = orderedNeighbors;
    }

    // Track EXACT items we add now (to avoid listing old frontier entries in the log)
    const addedItems: Item[] = [];
    const addedNodes: string[] = [];

    for (const neighbor of validNeighbors) {
      const newPath = [...currentPath, neighbor];
      parent[neighbor] = currentNode;
      const newItem: Item = { node: neighbor, path: newPath };
      frontier.push(newItem);
      addedItems.push(newItem);
      addedNodes.push(neighbor);

      if (earlyStop && neighbor === goalNode) {
        steps.push({
          stepType: "goal_found",
          currentNode: neighbor,
          visited: new Set(visited),
          frontier: [],
          parent: { ...parent },
          finalPath: newPath,
          pathQueue: [],
          description: `Goal ${goalNode} found early. Path: ${newPath.join(
            " → "
          )}`,
        });
        return steps;
      }
    }

    steps.push({
      stepType: "add_to_frontier",
      currentNode,
      visited: new Set(visited),
      frontier: frontier
        .slice()
        .sort((a, b) => h(a.node) - h(b.node))
        .map((f) => f.node),
      parent: { ...parent },
      pathQueue: frontier
        .slice()
        .sort((a, b) => h(a.node) - h(b.node))
        .map((f) => f.path),
      addedNodes: addedNodes, // only the nodes we just pushed
      description:
        addedItems.length === 0
          ? `No new nodes added to frontier.`
          : `Adding to frontier (sorted by h):\n${addedItems
              .map((it) => `${it.path.join(" → ")} (h: ${h(it.node)})`)
              .join(",\n")}`,
    });
  }

  // Failure
  steps.push({
    stepType: "add_to_frontier",
    currentNode: "",
    visited: new Set(visited),
    frontier: [],
    parent: { ...parent },
    pathQueue: [],
    addedNodes: [],
    description: `No path to goal found.`,
  });

  return steps;
}

export const Greedy: Algorithm = {
  id: "greedy",
  name: "Greedy Search",
  description: "Greedy Best-First Search using h(n).",
  execute: (
    adjList,
    startNode,
    goalNode,
    earlyStop = false,
    usePathLoopBreaking = true,
    useClosedSet = false,
    graphId = "tree",
    extra = {}
  ) =>
    executeGreedySearch(
      adjList,
      startNode,
      goalNode,
      earlyStop,
      usePathLoopBreaking,
      useClosedSet,
      graphId,
      extra
    ),
};
