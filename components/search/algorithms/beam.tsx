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
  const parent: { [key: string]: string } = {};
  const paths: { [key: string]: string[] } = { [startNode]: [startNode] };

  let frontier: { node: string; path: string[] }[] = [
    { node: startNode, path: [startNode] },
  ];

  const heuristics = graphs[graphId]?.heuristics ?? {};
  const heuristic = (node: string) => heuristics[node] ?? Infinity;

  const sortByH = (arr: { node: string; path: string[] }[]) =>
    arr.sort((a, b) => heuristic(a.node) - heuristic(b.node));

  const snapshotFrontierNodes = (arr: { node: string; path: string[] }[]) =>
    arr.map((f) => f.node);

  const snapshotFrontierPaths = (arr: { node: string; path: string[] }[]) =>
    arr.map((f) => f.path);

  // Sorteer de initiële frontier voor consistentie
  sortByH(frontier);

  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(), // niet meer gebruikt
    frontier: snapshotFrontierNodes(frontier),
    parent: { ...parent },
    pathQueue: snapshotFrontierPaths(frontier),
    description: `Start Beam Search (k=${beamWidth}) at ${startNode} — no loop breaking`,
  });

  while (frontier.length > 0) {
    sortByH(frontier);

    const newFrontier: { node: string; path: string[] }[] = [];

    for (const { node: currentNode, path: currentPath } of frontier) {
      steps.push({
        stepType: "take_from_frontier",
        currentNode,
        visited: new Set(), // placeholder
        frontier: snapshotFrontierNodes(frontier),
        parent: { ...parent },
        pathQueue: snapshotFrontierPaths(frontier),
        takenNode: currentNode,
        exploredEdge:
          currentPath.length > 1
            ? { from: currentPath[currentPath.length - 2], to: currentNode }
            : undefined,
        description: `Processing ${currentNode}`,
      });

      if (currentNode === goalNode) {
        steps.push({
          stepType: "goal_found",
          currentNode,
          visited: new Set(),
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

      const neighbors = adjList[currentNode] || [];

      steps.push({
        stepType: "highlight_edges",
        currentNode,
        visited: new Set(),
        frontier: snapshotFrontierNodes(frontier),
        parent: { ...parent },
        pathQueue: snapshotFrontierPaths(frontier),
        highlightedEdges: neighbors.map((n) => ({ from: currentNode, to: n })),
        description: `Exploring neighbors of ${currentNode}: ${neighbors.join(
          ", "
        )}`,
      });

      for (const neighbor of neighbors) {
        // Geen loopbreaking → ook als deze al eerder in een pad zat
        parent[neighbor] = currentNode;
        const newPath = [...currentPath, neighbor];
        paths[neighbor] = newPath;
        newFrontier.push({ node: neighbor, path: newPath });
      }
    }

    sortByH(newFrontier);
    frontier = newFrontier.slice(0, beamWidth);

    steps.push({
      stepType: "add_to_frontier",
      currentNode: "",
      visited: new Set(),
      frontier: snapshotFrontierNodes(frontier),
      parent: { ...parent },
      pathQueue: snapshotFrontierPaths(frontier),
      addedNodes: snapshotFrontierNodes(frontier),
      description: `Beamwidth = ${beamWidth} → keeping top ${
        frontier.length
      } nodes: ${snapshotFrontierNodes(frontier).join(", ")}`,
    });
  }

  steps.push({
    stepType: "add_to_frontier",
    currentNode: "",
    visited: new Set(),
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
  description: "Beam Search zonder loopbreaking (alle paden toegestaan)",
  execute: (
    adjList,
    start,
    goal,
    _earlyStop,
    _usePathLoopBreaking,
    _useClosedSet,
    graphId = "tree",
    extra = {}
  ) => executeBeamSearch(adjList, start, goal, extra.beamWidth || 2, graphId),
};
