"use client";

import type { SearchStep } from "../app/search";
import type { Algorithm } from "../algorithms/types";
import { graphs } from "../app/graphs";

/**
 * Parse "x_y" node ids into [x,y]. Returns null for non-grid ids.
 */
const parseCoords = (id: string): [number, number] | null => {
  const parts = id.split("_");
  if (parts.length !== 2) return null;
  const x = parseInt(parts[0], 10);
  const y = parseInt(parts[1], 10);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return [x, y];
};

/**
 * Deterministic neighbor ordering: Up, Right, Left, Down, then others.
 * Falls back to lexicographic sort for non-grid ids.
 */
const sortByDirection = (current: string, neighbors: string[]) => {
  const coords = parseCoords(current);
  if (!coords) return [...neighbors].sort();

  const [cx, cy] = coords;

  const dirScore = (id: string) => {
    const c = parseCoords(id);
    if (!c) return 99; // place non-grid last
    const [x, y] = c;
    if (y < cy && x === cx) return 0; // up
    if (x > cx && y === cy) return 1; // right
    if (x < cx && y === cy) return 2; // left
    if (y > cy && x === cx) return 3; // down
    return 4; // diagonals / others
  };

  return [...neighbors].sort((a, b) => dirScore(a) - dirScore(b));
};

type FrontierItem = {
  node: string;
  path: string[];
  cost: number; // g(n)
};

const frontierSignatureSet = (items: FrontierItem[]): Set<string> => {
  const sigs = new Set<string>();
  for (const f of items) {
    sigs.add(`${f.node}|${f.cost}|${f.path.join("->")}`);
  }
  return sigs;
};

function executeUCS(
  adjList: { [key: string]: string[] },
  startNode: string,
  goalNode: string,
  earlyStop = false,
  usePathLoopBreaking = true,
  useClosedSet = false,
  graphId: string = "tree"
): SearchStep[] {
  const steps: SearchStep[] = [];

  const costs = new Map<string, number>();
  for (const { from, to, cost } of graphs[graphId]?.costs ?? []) {
    costs.set(`${from}->${to}`, cost);
    costs.set(`${to}->${from}`, cost);
  }
  const getCost = (from: string, to: string) =>
    costs.get(`${from}->${to}`) ?? 1;

  const frontier: FrontierItem[] = [
    { node: startNode, path: [startNode], cost: 0 },
  ];

  const closed = new Set<string>();

  const getSortedFrontier = () =>
    frontier.slice().sort((a, b) => a.cost - b.cost);

  const getPathQueue = () => getSortedFrontier().map((f) => f.path);

  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(),
    frontier: [startNode],
    parent: {},
    pathQueue: [[startNode]],
    description: `Start UCS from ${startNode}. Goal: ${goalNode}.`,
  });

  let stepCounter = 0;
  const MAX_STEPS = 5000;

  while (frontier.length > 0 && stepCounter < MAX_STEPS) {
    stepCounter++;

    frontier.sort((a, b) => a.cost - b.cost);
    const {
      node: currentNode,
      path: currentPath,
      cost: currentCost,
    } = frontier.shift()!;

    if (useClosedSet && closed.has(currentNode)) {
      steps.push({
        stepType: "skip_closed",
        currentNode,
        visited: new Set(closed),
        frontier: getSortedFrontier().map((f) => f.node),
        parent: {},
        pathQueue: getPathQueue(),
        description: `Skipping path ${currentPath.join(
          " → "
        )} because its last node (${currentNode}) is already in CLOSED set.`,
      });
      continue;
    }

    closed.add(currentNode);

    const exploredEdge =
      currentPath.length > 1
        ? {
            from: currentPath[currentPath.length - 2],
            to: currentNode,
          }
        : undefined;

    steps.push({
      stepType: "take_from_frontier",
      currentNode,
      visited: new Set(closed),
      frontier: getSortedFrontier().map((f) => f.node),
      parent: {},
      pathQueue: getPathQueue(),
      takenNode: currentNode,
      exploredEdge,
      description: `Taking lowest-cost path from frontier: ${currentPath.join(
        " → "
      )} (cost: ${currentCost})`,
    });

    if (currentNode === goalNode) {
      steps.push({
        stepType: "goal_found",
        currentNode,
        visited: new Set(closed),
        frontier: getSortedFrontier().map((f) => f.node),
        parent: {},
        pathQueue: getPathQueue(),
        finalPath: currentPath,
        description: `Goal ${goalNode} found! Final path: ${currentPath.join(
          " → "
        )} (Total cost: ${currentCost})`,
      });
      return steps;
    }

    const orderedNeighbors = sortByDirection(
      currentNode,
      adjList[currentNode] || []
    );

    steps.push({
      stepType: "highlight_edges",
      currentNode,
      visited: new Set(closed),
      frontier: getSortedFrontier().map((f) => f.node),
      parent: {},
      pathQueue: getPathQueue(),
      highlightedEdges: orderedNeighbors.map((n) => ({
        from: currentNode,
        to: n,
      })),
      description: `Exploring neighbors of ${currentNode}: ${orderedNeighbors.join(
        ", "
      )}`,
    });

    const useNoLoopBreaking = !usePathLoopBreaking && !useClosedSet;

    const validNeighbors = useNoLoopBreaking
      ? orderedNeighbors
      : orderedNeighbors.filter((n) => {
          if (usePathLoopBreaking && currentPath.includes(n)) {
            return false;
          }
          if (useClosedSet && closed.has(n)) {
            return false;
          }
          return true;
        });

    const beforeSigs = frontierSignatureSet(frontier);

    for (const neighbor of validNeighbors) {
      const newCost = currentCost + getCost(currentNode, neighbor);
      const newPath = [...currentPath, neighbor];

      frontier.push({
        node: neighbor,
        path: newPath,
        cost: newCost,
      });

      if (earlyStop && neighbor === goalNode) {
      }
    }

    const afterSorted = getSortedFrontier();
    const afterSigs = frontierSignatureSet(frontier);

    const actuallyAdded: FrontierItem[] = [];
    for (const f of frontier) {
      const sig = `${f.node}|${f.cost}|${f.path.join("->")}`;
      if (!beforeSigs.has(sig)) {
        actuallyAdded.push(f);
      }
    }

    const addedNodes = actuallyAdded.map((f) => f.node);

    steps.push({
      stepType: "add_to_frontier",
      currentNode,
      visited: new Set(closed),
      frontier: afterSorted.map((f) => f.node),
      parent: {},
      pathQueue: afterSorted.map((f) => f.path),
      addedNodes,
      description:
        actuallyAdded.length === 0
          ? `No new nodes added to frontier${
              validNeighbors.length === 0
                ? useClosedSet
                  ? " (all neighbors already in CLOSED)"
                  : usePathLoopBreaking
                  ? " (all neighbors already in current path)"
                  : ""
                : ""
            }.`
          : `Added to frontier:\n${actuallyAdded
              .map((f) => `${f.path.join(" → ")} (cost: ${f.cost})`)
              .join(",\n")}`,
    });

    if (earlyStop) {
      const hit = actuallyAdded.find((f) => f.node === goalNode);
      if (hit) {
        steps.push({
          stepType: "goal_found",
          currentNode: hit.node,
          visited: new Set(closed),
          frontier: afterSorted.map((f) => f.node),
          parent: {},
          pathQueue: afterSorted.map((f) => f.path),
          finalPath: hit.path,
          description: `Goal ${goalNode} found in frontier! Path: ${hit.path.join(
            " → "
          )} (Total cost: ${hit.cost})`,
        });
        return steps;
      }
    }
  }

  if (stepCounter >= MAX_STEPS) {
    steps.push({
      stepType: "error",
      currentNode: "",
      visited: new Set(closed),
      frontier: [],
      parent: {},
      pathQueue: [],
      description: `Search stopped after ${MAX_STEPS} steps to prevent infinite loop.`,
    });
  } else {
    steps.push({
      stepType: "add_to_frontier",
      currentNode: "",
      visited: new Set(closed),
      frontier: [],
      parent: {},
      pathQueue: [],
      addedNodes: [],
      description: `No path to goal found.`,
    });
  }

  return steps;
}

export const UCS: Algorithm = {
  id: "ucs",
  name: "Uniform Cost Search",
  description: "Expands the path with the lowest cumulative cost (g).",
  execute: (
    adjList,
    start,
    goal,
    earlyStop,
    usePathLoopBreaking,
    useClosedSet,
    graphId = "tree"
  ) =>
    executeUCS(
      adjList,
      start,
      goal,
      earlyStop,
      usePathLoopBreaking,
      useClosedSet,
      graphId
    ),
};
