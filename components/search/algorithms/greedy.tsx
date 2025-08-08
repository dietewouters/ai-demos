"use client";
import type { SearchStep } from "../app/search";
import type { Algorithm } from "../algorithms/types";
import { graphs } from "../app/graphs";

function executeGreedySearch(
  adjList: { [key: string]: string[] },
  startNode: string,
  goalNode: string,
  earlyStop = false,
  loopBreaking = true,
  graphId: string = "tree"
): SearchStep[] {
  const steps: SearchStep[] = [];
  const visited = new Set<string>();
  const parent: { [key: string]: string } = {};
  const paths: { [key: string]: string[] } = { [startNode]: [startNode] };

  const frontier: { node: string; path: string[] }[] = [
    { node: startNode, path: [startNode] },
  ];

  const heuristics = graphs[graphId]?.heuristics ?? {};
  const heuristic = (node: string) => heuristics[node] ?? Infinity;

  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(),
    frontier: [startNode],
    parent: { ...parent },
    pathQueue: [[startNode]],
    description: `Start Greedy Search at ${startNode}`,
  });

  while (frontier.length > 0) {
    // Sorteer frontier op heuristiek h(n)
    frontier.sort((a, b) => heuristic(a.node) - heuristic(b.node));

    const { node: currentNode, path: currentPath } = frontier.shift()!;
    const currentVisited = new Set(visited);
    if (!paths[currentNode]) {
      paths[currentNode] = [currentNode];
    }

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
      description: `Taking path with lowest heuristic from frontier: ${currentPath.join(
        " → "
      )}`,
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
        description: `Goal ${goalNode} found! Path: ${currentPath.join(" → ")}`,
      });
      return steps;
    }

    visited.add(currentNode);

    const neighbors = (adjList[currentNode] || []).filter((n) => {
      if (!loopBreaking) return true;
      return !visited.has(n) && !frontier.find((f) => f.node === n);
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
      if (!parent[neighbor]) parent[neighbor] = currentNode;

      const newPath = [...currentPath, neighbor];
      frontier.push({ node: neighbor, path: newPath });

      if (earlyStop && neighbor === goalNode) {
        steps.push({
          stepType: "goal_found",
          currentNode: neighbor,
          visited: new Set(visited),
          frontier: [],
          parent: { ...parent },
          finalPath: newPath,
          pathQueue: [],
          description: `Goal ${goalNode} found in frontier! Path: ${paths[
            neighbor
          ].join(" → ")}`,
        });
        return steps;
      }
    }

    steps.push({
      stepType: "add_to_frontier",
      currentNode,
      visited: new Set(visited),
      frontier: frontier.map((f) => f.node),
      parent: { ...parent },
      pathQueue: frontier.map((f) => f.path),
      addedNodes: neighbors,
      description: `Adding to frontier:\n${neighbors
        .map((n) => {
          const entry = frontier.find((f) => f.node === n);
          return entry ? entry.path.join(" → ") : n;
        })
        .join(", \n")}`,
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

export const Greedy: Algorithm = {
  id: "greedy",
  name: "Greedy",
  description: "",
  // let execute accept 5th param for graphId
  execute: (adjList, start, goal, earlyStop, loopBreaking, graphId = "tree") =>
    executeGreedySearch(adjList, start, goal, earlyStop, loopBreaking, graphId),
};
