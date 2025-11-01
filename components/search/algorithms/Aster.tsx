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

  // Heuristics and costs
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

  const sortFrontierByF = (arr: FrontierItem[]) =>
    arr.slice().sort((a, b) => a.g + a.h - (b.g + b.h));

  const getPathQueue = () => sortFrontierByF(frontier).map((f) => f.path);

  const repairFrontier = (arr: FrontierItem[]) => {
    const bestGPerNode: Record<string, number> = {};
    for (const item of arr) {
      if (
        bestGPerNode[item.node] === undefined ||
        item.g < bestGPerNode[item.node]
      ) {
        bestGPerNode[item.node] = item.g;
      }
    }

    const repaired: FrontierItem[] = [];
    const removed: FrontierItem[] = [];

    for (const item of arr) {
      const bestG = bestGPerNode[item.node];
      if (item.g === bestG) {
        if (!repaired.find((keep) => keep.node === item.node)) {
          repaired.push(item);
        } else {
          removed.push(item);
        }
      } else {
        removed.push(item);
      }
    }

    return { repaired, removed };
  };

  let frontier: FrontierItem[] = [
    { node: startNode, path: [startNode], g: 0, h: heuristic(startNode) },
  ];

  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(),
    frontier: [startNode],
    parent: {},
    pathQueue: [[startNode]],
    description: `Start A* from ${startNode}. Goal: ${goalNode}.`,
  });

  let stepCounter = 0;
  const MAX_STEPS = 5000;

  while (frontier.length > 0 && stepCounter < MAX_STEPS) {
    stepCounter++;

    frontier = sortFrontierByF(frontier);
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
        description: `Skip ${currentNode} because it is already in the CLOSED set.`,
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
      description: `Expanding ${currentNode} with lowest f(n)=g+h along path ${currentPath.join(
        " → "
      )} (g=${gCost}, h=${hCost}, f=${gCost + hCost}).`,
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
        description: `Reached goal ${goalNode}. Final path: ${currentPath.join(
          " → "
        )} (total cost g=${gCost}).`,
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
      )}.`,
    });

    const newPathsThisIteration: FrontierItem[] = [];

    for (const neighbor of orderedNeighbors) {
      if (useClosedSet && visited.has(neighbor)) continue;

      const tentativeG = gCost + getCost(currentNode, neighbor);
      const newPath = [...currentPath, neighbor];
      const newH = heuristic(neighbor);

      const newItem: FrontierItem = {
        node: neighbor,
        path: newPath,
        g: tentativeG,
        h: newH,
      };

      parent[neighbor] = currentNode;
      gScore[neighbor] = tentativeG;
      frontier.push(newItem);
      newPathsThisIteration.push(newItem);

      if (earlyStop && neighbor === goalNode) {
        steps.push({
          stepType: "goal_found",
          currentNode: neighbor,
          visited: new Set(visited),
          frontier: [],
          parent: { ...parent },
          finalPath: newPath,
          pathQueue: [],
          description: `Reached goal ${goalNode} early. Path: ${newPath.join(
            " → "
          )} (g=${tentativeG}, h=${newH}).`,
        });
        return steps;
      }
    }

    steps.push({
      stepType: "add_to_frontier",
      currentNode,
      visited: new Set(visited),
      frontier: sortFrontierByF(frontier).map((f) => f.node),
      parent: { ...parent },
      pathQueue: getPathQueue(),
      addedNodes: newPathsThisIteration.map((f) => f.node),
      description:
        newPathsThisIteration.length === 0
          ? `No new paths to add to the frontier.`
          : `Added to frontier:\n${newPathsThisIteration
              .map(
                (f) =>
                  `${f.path.join(" → ")} (g=${f.g}, h=${f.h}, f=${f.g + f.h})`
              )
              .join("\n")}`,
    });

    const { repaired, removed } = repairFrontier(frontier);
    frontier = repaired;

    if (removed.length > 0) {
      const shortMessages = removed.map(
        (item) =>
          `Frontier repair: we prune dominated paths so that for each node we only keep the cheapest path (lowest g). Deleted ${item.path.join(
            " → "
          )} from frontier.`
      );

      steps.push({
        stepType: "frontier_repair",
        currentNode,
        visited: new Set(visited),
        frontier: sortFrontierByF(frontier).map((f) => f.node),
        parent: { ...parent },
        pathQueue: getPathQueue(),
        removedPaths: removed.map((f) => ({
          node: f.node,
          path: f.path,
          g: f.g,
          h: f.h,
          fScore: f.g + f.h,
        })),
        description: shortMessages.join(" "),
      });
    }
  }

  if (stepCounter >= MAX_STEPS) {
    steps.push({
      stepType: "error",
      currentNode: "",
      visited: new Set(visited),
      frontier: [],
      parent: {},
      pathQueue: [],
      description: `Search aborted after ${MAX_STEPS} steps to avoid an infinite loop.`,
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
      description: `No path to the goal was found.`,
    });
  }

  return steps;
}

export const AStar: Algorithm = {
  id: "astar",
  name: "A* Search",
  description:
    "Search using f(n) = g(n) + h(n) with a mandatory CLOSED set and frontier repair (dominated path pruning).",
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
