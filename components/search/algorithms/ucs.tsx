"use client";
import type { SearchStep } from "../app/search";
import type { Algorithm } from "../algorithms/types";
import { graphs } from "../app/graphs";

function executeUCS(
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

  const costs = new Map<string, number>();
  for (const { from, to, cost } of graphs[graphId]?.costs ?? []) {
    costs.set(`${from}->${to}`, cost);
    costs.set(`${to}->${from}`, cost);
  }
  const getCost = (from: string, to: string) =>
    costs.get(`${from}->${to}`) ?? 1;

  const gScore: Record<string, number> = { [startNode]: 0 };

  type FrontierItem = {
    node: string;
    path: string[];
    cost: number;
  };

  const frontier: FrontierItem[] = [
    { node: startNode, path: [startNode], cost: 0 },
  ];

  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(),
    frontier: [startNode],
    parent: {},
    pathQueue: [[startNode]],
    description: `Start UCS from ${startNode}`,
  });

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);

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
      description: `Taking node with lowest cost: ${currentPath.join(
        " → "
      )} (cost: ${gCost})`,
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
      return !visited.has(n);
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

    const addedNeighbors: string[] = [];

    for (const neighbor of neighbors) {
      const tentativeG = gCost + getCost(currentNode, neighbor);
      const existing = frontier.find((f) => f.node === neighbor);

      if (!existing || tentativeG < existing.cost) {
        if (existing) {
          const index = frontier.indexOf(existing);
          frontier.splice(index, 1);
        }

        gScore[neighbor] = tentativeG;
        parent[neighbor] = currentNode;

        const newPath = [...currentPath, neighbor];
        frontier.push({
          node: neighbor,
          path: newPath,
          cost: tentativeG,
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
            )}`,
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
        .sort((a, b) => a.cost - b.cost)
        .map((f) => f.node),
      parent: { ...parent },
      pathQueue: frontier
        .slice()
        .sort((a, b) => a.cost - b.cost)
        .map((f) => f.path),
      addedNodes: addedNeighbors,
      description:
        addedNeighbors.length === 0
          ? `No new nodes added to frontier.`
          : `Adding to frontier:
${frontier
  .filter((f) => addedNeighbors.includes(f.node))
  .map((f) => `${f.path.join(" → ")} (cost: ${f.cost})`)
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

export const UCS: Algorithm = {
  id: "ucs",
  name: "Uniform Cost Search",
  description: "Expands the node with the lowest cumulative path cost.",
  execute: (adjList, start, goal, earlyStop, loopBreaking, graphId = "tree") =>
    executeUCS(adjList, start, goal, earlyStop, loopBreaking, graphId),
};
