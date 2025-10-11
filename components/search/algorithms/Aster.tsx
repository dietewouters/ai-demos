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
 */
const sortByDirection = (current: string, neighbors: string[]) => {
  const coords = parseCoords(current);
  if (!coords) return [...neighbors].sort();
  const [cx, cy] = coords;

  const dirScore = (id: string) => {
    const c = parseCoords(id);
    if (!c) return 99;
    const [x, y] = c;
    if (y < cy && x === cx) return 0; // up
    if (x > cx && y === cy) return 1; // right
    if (x < cx && y === cy) return 2; // left
    if (y > cy && x === cx) return 3; // down
    return 4;
  };

  return [...neighbors].sort((a, b) => dirScore(a) - dirScore(b));
};

function executeAStar(
  adjList: { [key: string]: string[] },
  startNode: string,
  goalNode: string,
  earlyStop = false,
  useClosedSet = true,
  graphId: string = "tree"
): SearchStep[] {
  const steps: SearchStep[] = [];
  const visited = new Set<string>(); // CLOSED set
  const parent: Record<string, string> = {};
  const gScore: Record<string, number> = { [startNode]: 0 };

  // Heuristics en kosten
  const heuristics = graphs[graphId]?.heuristics ?? {};
  const heuristic = (node: string) => heuristics[node] ?? Infinity;

  const costs = new Map<string, number>();
  for (const { from, to, cost } of graphs[graphId]?.costs ?? []) {
    costs.set(`${from}->${to}`, cost);
    costs.set(`${to}->${from}`, cost);
  }
  const getCost = (from: string, to: string) =>
    costs.get(`${from}->${to}`) ?? 1;

  type FrontierItem = {
    node: string;
    path: string[];
    g: number;
    h: number;
  };

  const frontier: FrontierItem[] = [
    { node: startNode, path: [startNode], g: 0, h: heuristic(startNode) },
  ];

  const getPathQueue = () =>
    frontier
      .slice()
      .sort((a, b) => a.g + a.h - (b.g + b.h))
      .map((f) => f.path);

  // Start step
  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(),
    frontier: [startNode],
    parent: {},
    pathQueue: [[startNode]],
    description: `Start A* from ${startNode}. Goal: ${goalNode}`,
  });

  let stepCounter = 0;
  const MAX_STEPS = 5000;

  while (frontier.length > 0 && stepCounter < MAX_STEPS) {
    stepCounter++;

    frontier.sort((a, b) => a.g + a.h - (b.g + b.h));
    const {
      node: currentNode,
      path: currentPath,
      g: gCost,
      h: hCost,
    } = frontier.shift()!;

    if (useClosedSet && visited.has(currentNode)) {
      steps.push({
        stepType: "skip_closed",
        currentNode,
        visited: new Set(visited),
        frontier: frontier.map((f) => f.node),
        parent: { ...parent },
        pathQueue: getPathQueue(),
        description: `Skipping ${currentNode} — already in CLOSED set.`,
      });
      continue;
    }

    if (useClosedSet) visited.add(currentNode);

    steps.push({
      stepType: "take_from_frontier",
      currentNode,
      visited: new Set(visited),
      frontier: frontier.map((f) => f.node),
      parent: { ...parent },
      pathQueue: getPathQueue(),
      takenNode: currentNode,
      exploredEdge:
        currentPath.length > 1
          ? {
              from: currentPath[currentPath.length - 2],
              to: currentNode,
            }
          : undefined,
      description: `Taking node ${currentNode} with lowest f(n)=g+h: ${currentPath.join(
        " → "
      )} (g: ${gCost}, h: ${hCost}, f: ${gCost + hCost})`,
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
        description: `Goal ${goalNode} found! Final path: ${currentPath.join(
          " → "
        )} (Total cost g: ${gCost})`,
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
      visited: new Set(visited),
      frontier: frontier.map((f) => f.node),
      parent: { ...parent },
      pathQueue: getPathQueue(),
      highlightedEdges: orderedNeighbors.map((n) => ({
        from: currentNode,
        to: n,
      })),
      description: `Exploring neighbors of ${currentNode}: ${orderedNeighbors.join(
        ", "
      )}`,
    });

    const addedNeighbors: string[] = [];

    for (const neighbor of orderedNeighbors) {
      if (useClosedSet && visited.has(neighbor)) continue;

      const tentativeG = gCost + getCost(currentNode, neighbor);
      const existing = frontier.find((f) => f.node === neighbor);

      if (!existing || tentativeG < existing.g) {
        parent[neighbor] = currentNode;
        gScore[neighbor] = tentativeG;

        const newPath = [...currentPath, neighbor];
        const newH = heuristic(neighbor);

        frontier.push({
          node: neighbor,
          path: newPath,
          g: tentativeG,
          h: newH,
        });
        addedNeighbors.push(neighbor);

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
            )} (g: ${tentativeG}, h: ${newH})`,
          });
          return steps;
        }
      }
    }

    steps.push({
      stepType: "add_to_frontier",
      currentNode,
      visited: new Set(visited),
      frontier: frontier
        .slice()
        .sort((a, b) => a.g + a.h - (b.g + b.h))
        .map((f) => f.node),
      parent: { ...parent },
      pathQueue: getPathQueue(),
      addedNodes: addedNeighbors,
      description:
        addedNeighbors.length === 0
          ? `No new nodes added to frontier.`
          : `Added to frontier:\n${frontier
              .filter((f) => addedNeighbors.includes(f.node))
              .sort((a, b) => a.g + a.h - (b.g + b.h))
              .map(
                (f) =>
                  `${f.path.join(" → ")} (g: ${f.g}, h: ${f.h}, f: ${
                    f.g + f.h
                  })`
              )
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

export const AStar: Algorithm = {
  id: "astar",
  name: "A* Search",
  description: "Search using f(n) = g(n) + h(n) with mandatory CLOSED set.",
  execute: (
    adjList,
    start,
    goal,
    earlyStop,
    _usePathLoopBreaking,
    _useClosedSet,
    graphId = "tree"
  ) => executeAStar(adjList, start, goal, earlyStop, true, graphId),
};
