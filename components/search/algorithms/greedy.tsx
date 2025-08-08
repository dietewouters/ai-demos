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

  const heuristics = graphs[graphId]?.heuristics ?? {};
  const heuristic = (node: string) => heuristics[node] ?? Infinity;

  const frontier: { node: string; path: string[] }[] = [
    { node: startNode, path: [startNode] },
  ];

  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(),
    frontier: [startNode],
    parent: {},
    pathQueue: [[startNode]],
    description: `Start Greedy Search at ${startNode}`,
  });

  while (frontier.length > 0) {
    frontier.sort((a, b) => heuristic(a.node) - heuristic(b.node));

    const { node: currentNode, path: currentPath } = frontier.shift()!;

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
          ? {
              from: currentPath[currentPath.length - 2],
              to: currentNode,
            }
          : undefined,
      description: `Taking node with lowest heuristic: ${currentPath.join(
        " → "
      )} (h: ${heuristic(currentNode)})`,
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

    const addedNeighbors: string[] = [];

    for (const neighbor of neighbors) {
      if (!frontier.find((f) => f.node === neighbor)) {
        parent[neighbor] = currentNode;
        const newPath = [...currentPath, neighbor];
        frontier.push({ node: neighbor, path: newPath });
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
        .sort((a, b) => heuristic(a.node) - heuristic(b.node))
        .map((f) => f.node),
      parent: { ...parent },
      pathQueue: frontier
        .slice()
        .sort((a, b) => heuristic(a.node) - heuristic(b.node))
        .map((f) => f.path),
      addedNodes: addedNeighbors,
      description:
        addedNeighbors.length === 0
          ? `No new nodes added to frontier.`
          : `Adding to frontier:\n${frontier
              .filter((f) => addedNeighbors.includes(f.node))
              .map((f) => `${f.path.join(" → ")} (h: ${heuristic(f.node)})`)
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

export const Greedy: Algorithm = {
  id: "greedy",
  name: "Greedy Search",
  description: "Greedy Best-First Search using h(n)",
  execute: (adjList, start, goal, earlyStop, loopBreaking, graphId = "tree") =>
    executeGreedySearch(adjList, start, goal, earlyStop, loopBreaking, graphId),
};
