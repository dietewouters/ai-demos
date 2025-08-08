"use client";
import type { SearchStep } from "../app/search";
import type { Algorithm } from "../algorithms/types";
import { graphs } from "../app/graphs";

function executeAStar(
  adjList: { [key: string]: string[] },
  startNode: string,
  goalNode: string,
  earlyStop = false,
  loopBreaking = true,
  graphId: string = "tree"
): SearchStep[] {
  const steps: SearchStep[] = [];
  const visited = new Set<string>();
  const parent: Record<string, string> = {};
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
    cost: number; // g(n)
    heuristic: number; // h(n)
  };

  const frontier: FrontierItem[] = [
    {
      node: startNode,
      path: [startNode],
      cost: 0,
      heuristic: heuristic(startNode),
    },
  ];

  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(),
    frontier: [startNode],
    parent: {},
    pathQueue: [[startNode]],
    description: `Start A* Search from ${startNode}`,
  });

  while (frontier.length > 0) {
    // Sorteer op f(n) = g(n) + h(n)
    frontier.sort((a, b) => a.cost + a.heuristic - (b.cost + b.heuristic));

    const {
      node: currentNode,
      path: currentPath,
      cost: gCost,
    } = frontier.shift()!;
    const currentVisited = new Set(visited);

    steps.push({
      stepType: "take_from_frontier",
      currentNode,
      visited: new Set(currentVisited),
      frontier: frontier.map((f) => f.node),
      parent: { ...parent },
      pathQueue: frontier.map((f) => f.path),
      takenNode: currentNode,
      exploredEdge:
        currentPath.length > 1
          ? {
              from: currentPath[currentPath.length - 2],
              to: currentNode,
            }
          : undefined,
      description: `Taking node with lowest f(n) = g + h: ${currentPath.join(
        " → "
      )} (cost: ${gCost}, h: ${heuristic(currentNode)} )`,
    });

    if (currentNode === goalNode) {
      steps.push({
        stepType: "goal_found",
        currentNode,
        visited: new Set(currentVisited),
        frontier: [],
        parent: { ...parent },
        finalPath: currentPath,
        pathQueue: [],
        description: `Goal ${goalNode} found! Path: ${currentPath.join(
          " → "
        )} (Total cost: ${gCost})`,
      });
      return steps;
    }

    visited.add(currentNode);

    const neighbors = (adjList[currentNode] || []).filter((n) => {
      if (!loopBreaking) return true;
      return !visited.has(n) && !currentPath.includes(n);
    });

    steps.push({
      stepType: "highlight_edges",
      currentNode,
      visited: new Set(visited),
      frontier: frontier.map((f) => f.node),
      parent: { ...parent },
      pathQueue: frontier.map((f) => f.path),
      highlightedEdges: neighbors.map((n) => ({ from: currentNode, to: n })),
      description: `Exploring neighbors of ${currentNode}: ${neighbors.join(
        ", "
      )}`,
    });

    for (const neighbor of neighbors) {
      const newCost = gCost + getCost(currentNode, neighbor);

      if (
        !frontier.find((f) => f.node === neighbor) ||
        newCost < (frontier.find((f) => f.node === neighbor)?.cost ?? Infinity)
      ) {
        parent[neighbor] = currentNode;
        const newPath = [...currentPath, neighbor];
        frontier.push({
          node: neighbor,
          path: newPath,
          cost: newCost,
          heuristic: heuristic(neighbor),
        });

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
    }

    const addedNodes = neighbors;
    steps.push({
      stepType: "add_to_frontier",
      currentNode,
      visited: new Set(visited),
      frontier: [...frontier]
        .sort((a, b) => a.cost + a.heuristic - (b.cost + b.heuristic))
        .map((f) => f.node),
      parent: { ...parent },
      pathQueue: frontier
        .slice()
        .sort((a, b) => a.cost + a.heuristic - (b.cost + b.heuristic))
        .map((f) => f.path),
      addedNodes,
      description: `Adding to frontier:\n${frontier
        .filter((f) => addedNodes.includes(f.node))
        .map(
          (f) =>
            `${f.path.join(" → ")} (g: ${f.cost}, h: ${f.heuristic} --> f: ${
              f.cost + f.heuristic
            })`
        )
        .join(",\n")}`,
    });
  }

  steps.push({
    stepType: "add_to_frontier",
    currentNode: "",
    visited: new Set(visited),
    frontier: [],
    parent: { ...parent },
    pathQueue: [],
    addedNodes: [],
    description: `No path to goal found`,
  });

  return steps;
}

export const AStar: Algorithm = {
  id: "astar",
  name: "A* Search",
  description: "Search that uses f(n) = g(n) + h(n)",
  execute: (adjList, start, goal, earlyStop, loopBreaking, graphId = "tree") =>
    executeAStar(adjList, start, goal, earlyStop, loopBreaking, graphId),
};
