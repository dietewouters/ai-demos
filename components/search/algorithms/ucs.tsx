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
  cost: number;
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

  type FrontierItem = { node: string; path: string[]; cost: number };

  const frontier: FrontierItem[] = [
    { node: startNode, path: [startNode], cost: 0 },
  ];
  const visited = new Set<string>(); // altijd gebruiken voor “blauw”
  const useNoLoopBreaking = !usePathLoopBreaking && !useClosedSet;
  const gScore: Record<string, number> = { [startNode]: 0 };

  const getPathQueue = () =>
    frontier
      .slice()
      .sort((a, b) => a.cost - b.cost)
      .map((f) => f.path);

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
      cost: gCost,
    } = frontier.shift()!;

    // ✳️ voeg altijd toe aan visited (voor blauwe markering)
    visited.add(currentNode);

    // Alleen overslaan in CLOSED-modus
    if (
      useClosedSet &&
      Array.from(visited).slice(0, -1).includes(currentNode)
    ) {
      steps.push({
        stepType: "skip_closed",
        currentNode,
        visited: new Set(visited),
        frontier: frontier.map((f) => f.node),
        parent: {},
        pathQueue: getPathQueue(),
        description: `Skipping ${currentNode} (already CLOSED).`,
      });
      continue;
    }

    steps.push({
      stepType: "take_from_frontier",
      currentNode,
      visited: new Set(visited),
      frontier: frontier.map((f) => f.node),
      parent: {},
      pathQueue: getPathQueue(),
      takenNode: currentNode,
      exploredEdge:
        currentPath.length > 1
          ? { from: currentPath[currentPath.length - 2], to: currentNode }
          : undefined,
      description: `Taking lowest-cost path: ${currentPath.join(
        " → "
      )} (cost: ${gCost})`,
    });

    if (currentNode === goalNode) {
      steps.push({
        stepType: "goal_found",
        currentNode,
        visited: new Set(visited),
        frontier: frontier.map((f) => f.node),
        parent: {},
        pathQueue: getPathQueue(),
        finalPath: currentPath,
        description: `Goal ${goalNode} found! Final path: ${currentPath.join(
          " → "
        )} (Total cost: ${gCost})`,
      });
      return steps;
    }

    const orderedNeighbors = sortByDirection(
      currentNode,
      adjList[currentNode] || []
    );

    const neighbors = useNoLoopBreaking
      ? orderedNeighbors
      : orderedNeighbors.filter((n) => {
          if (usePathLoopBreaking && currentPath.includes(n)) return false;
          if (useClosedSet && Array.from(visited).slice(0, -1).includes(n))
            return false;
          return true;
        });

    steps.push({
      stepType: "highlight_edges",
      currentNode,
      visited: new Set(visited),
      frontier: frontier.map((f) => f.node),
      parent: {},
      pathQueue: getPathQueue(),
      highlightedEdges: neighbors.map((n) => ({ from: currentNode, to: n })),
      description: `Exploring neighbors of ${currentNode}: ${neighbors.join(
        ", "
      )}`,
    });

    const addedNeighbors: string[] = [];

    for (const neighbor of neighbors) {
      const tentativeG = gCost + getCost(currentNode, neighbor);
      const newPath = [...currentPath, neighbor];

      if (useNoLoopBreaking) {
        frontier.push({ node: neighbor, path: newPath, cost: tentativeG });
        addedNeighbors.push(neighbor);
      } else {
        if (gScore[neighbor] === undefined || tentativeG < gScore[neighbor]) {
          gScore[neighbor] = tentativeG;
          const existingIdx = frontier.findIndex(
            (f) => f.node === neighbor && f.cost > tentativeG
          );
          if (existingIdx !== -1) frontier.splice(existingIdx, 1);
          frontier.push({ node: neighbor, path: newPath, cost: tentativeG });
          addedNeighbors.push(neighbor);
          if (earlyStop && neighbor === goalNode) {
            steps.push({
              stepType: "goal_found",
              currentNode: neighbor,
              visited: new Set(visited),
              frontier: [],
              parent: {},
              finalPath: newPath,
              pathQueue: [],
              description: `Goal ${goalNode} found early. Path: ${newPath.join(
                " → "
              )} (Total cost: ${tentativeG})`,
            });
            return steps;
          }
        }
      }
    }

    steps.push({
      stepType: "add_to_frontier",
      currentNode,
      visited: new Set(visited),
      frontier: frontier
        .slice()
        .sort((a, b) => a.cost - b.cost)
        .map((f) => f.node),
      parent: {},
      pathQueue: frontier
        .slice()
        .sort((a, b) => a.cost - b.cost)
        .map((f) => f.path),
      addedNodes: addedNeighbors,
      description:
        addedNeighbors.length === 0
          ? `No new nodes added to frontier.`
          : `Adding to frontier:\n${frontier
              .filter((f) => addedNeighbors.includes(f.node))
              .sort((a, b) => a.cost - b.cost)
              .map((f) => `${f.path.join(" → ")} (cost: ${f.cost})`)
              .join(",\n")}`,
    });
  }

  if (stepCounter >= MAX_STEPS) {
    steps.push({
      stepType: "error",
      currentNode: "",
      visited: new Set(visited),
      frontier: [],
      parent: {},
      pathQueue: [],
      description: `Search stopped after ${MAX_STEPS} steps to prevent infinite loop.`,
    });
  } else {
    steps.push({
      stepType: "add_to_frontier",
      currentNode: "",
      visited: new Set(visited),
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
  description: "Expands the node with the lowest cumulative path cost.",
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
