"use client";
import type { SearchStep } from "../app/search";
import type { Algorithm } from "../algorithms/types";
import { graphs } from "../app/graphs";

function executeBeamSearch(
  adjList: { [key: string]: string[] },
  startNode: string,
  goalNode: string,
  beamWidth: number,
  graphId: string = "tree",
  extra?: any
): SearchStep[] {
  const steps: SearchStep[] = [];
  const visited = new Set<string>();
  const parent: { [key: string]: string } = {};
  const paths: { [key: string]: string[] } = { [startNode]: [startNode] };

  let frontier: { node: string; path: string[] }[] = [
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
    description: `Start Beam Search (k=${beamWidth}) at ${startNode}`,
  });

  while (frontier.length > 0) {
    const newFrontier: { node: string; path: string[] }[] = [];

    for (const { node: currentNode, path: currentPath } of frontier) {
      if (visited.has(currentNode)) continue;

      visited.add(currentNode);

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
        description: `Processing ${currentNode}`,
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
          description: `Goal ${goalNode} found! Path: ${currentPath.join(
            " → "
          )}`,
        });
        return steps;
      }

      const neighbors = (adjList[currentNode] || []).filter(
        (n) => !visited.has(n)
      );

      steps.push({
        stepType: "highlight_edges",
        currentNode,
        visited: new Set(visited),
        frontier: [],
        parent: { ...parent },
        pathQueue: [],
        highlightedEdges: neighbors.map((n) => ({
          from: currentNode,
          to: n,
        })),
        description: `Exploring neighbors of ${currentNode}: ${neighbors.join(
          ", "
        )}`,
      });

      for (const neighbor of neighbors) {
        if (!paths[neighbor]) {
          parent[neighbor] = currentNode;
          paths[neighbor] = [...currentPath, neighbor];
          newFrontier.push({
            node: neighbor,
            path: [...currentPath, neighbor],
          });
        }
      }
    }

    // Keep only best k based on heuristic
    newFrontier.sort((a, b) => heuristic(a.node) - heuristic(b.node));
    frontier = newFrontier.slice(0, beamWidth);

    steps.push({
      stepType: "add_to_frontier",
      currentNode: "",
      visited: new Set(visited),
      frontier: frontier.map((f) => f.node),
      parent: { ...parent },
      pathQueue: frontier.map((f) => f.path),
      addedNodes: frontier.map((f) => f.node),
      description: `Beamwidth = ${beamWidth} => keeping top ${
        frontier.length
      } nodes: ${frontier.map((f) => f.node).join(", ")}`,
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

export const Beam: Algorithm = {
  id: "beam",
  name: "Beam Search",
  description: "",
  execute: (
    adjList,
    start,
    goal,
    _earlyStop,
    _loopBreaking,
    graphId = "tree",
    extra = {}
  ) => executeBeamSearch(adjList, start, goal, extra.beamWidth || 2, graphId),
};
