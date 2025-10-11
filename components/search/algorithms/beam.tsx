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
  extra?: {
    usePathLoopBreaking?: boolean;
    useClosedSet?: boolean;
  }
): SearchStep[] {
  const steps: SearchStep[] = [];
  const parent: Record<string, string> = {};
  const visited = new Set<string>();

  const heuristics = graphs[graphId]?.heuristics ?? {};
  const heuristic = (node: string) => heuristics[node] ?? Infinity;

  const usePathLoopBreaking = extra?.usePathLoopBreaking ?? true;
  const useClosedSet = extra?.useClosedSet ?? false;

  let frontier: { node: string; path: string[] }[] = [
    { node: startNode, path: [startNode] },
  ];

  const sortByH = (arr: { node: string; path: string[] }[]) =>
    arr.sort((a, b) => heuristic(a.node) - heuristic(b.node));

  const snapshotFrontierNodes = (arr: { node: string; path: string[] }[]) =>
    arr.map((f) => f.node);

  const snapshotFrontierPaths = (arr: { node: string; path: string[] }[]) =>
    arr.map((f) => f.path);

  sortByH(frontier);

  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(),
    frontier: snapshotFrontierNodes(frontier),
    parent: { ...parent },
    pathQueue: snapshotFrontierPaths(frontier),
    description: `Start Beam Search (k=${beamWidth}) at ${startNode}`,
  });

  const MAX_STEPS = 5000;
  let stepCounter = 0;

  while (frontier.length > 0 && stepCounter < MAX_STEPS) {
    stepCounter++;
    sortByH(frontier);

    const newFrontier: { node: string; path: string[] }[] = [];

    for (const { node: currentNode, path: currentPath } of frontier) {
      const alreadyVisited = visited.has(currentNode);

      if (useClosedSet && alreadyVisited) {
        steps.push({
          stepType: "skip_closed",
          currentNode,
          visited: new Set(visited),
          frontier: snapshotFrontierNodes(frontier),
          parent: { ...parent },
          pathQueue: snapshotFrontierPaths(frontier),
          description: `Skipping path ${currentPath.join(
            " → "
          )} because its last node (${currentNode}) is already in CLOSED set.`,
        });
        continue;
      }

      visited.add(currentNode);

      const hVal = heuristic(currentNode);
      const hDisplay = Number.isFinite(hVal) ? Math.round(hVal) : "∞";

      steps.push({
        stepType: "take_from_frontier",
        currentNode,
        visited: new Set(visited),
        frontier: snapshotFrontierNodes(frontier),
        parent: { ...parent },
        pathQueue: snapshotFrontierPaths(frontier),
        takenNode: currentNode,
        exploredEdge:
          currentPath.length > 1
            ? { from: currentPath[currentPath.length - 2], to: currentNode }
            : undefined,
        description: `Expanding ${currentPath.join(" → ")} (h=${hDisplay}).`,
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
          )}`,
        });
        return steps;
      }

      const neighbors = adjList[currentNode] || [];

      steps.push({
        stepType: "highlight_edges",
        currentNode,
        visited: new Set(visited),
        frontier: snapshotFrontierNodes(frontier),
        parent: { ...parent },
        pathQueue: snapshotFrontierPaths(frontier),
        highlightedEdges: neighbors.map((n) => ({ from: currentNode, to: n })),
        description: `Exploring neighbors of ${currentNode}: ${neighbors.join(
          ", "
        )}`,
      });

      const validNeighbors = neighbors.filter((n) => {
        if (usePathLoopBreaking && currentPath.includes(n)) return false;
        if (useClosedSet && visited.has(n)) return false;
        return true;
      });

      for (const neighbor of validNeighbors) {
        const newPath = [...currentPath, neighbor];
        parent[neighbor] = currentNode;
        newFrontier.push({ node: neighbor, path: newPath });
      }
    }

    sortByH(newFrontier);
    frontier = newFrontier.slice(0, beamWidth);

    steps.push({
      stepType: "add_to_frontier",
      currentNode: "",
      visited: new Set(visited),
      frontier: snapshotFrontierNodes(frontier),
      parent: { ...parent },
      pathQueue: snapshotFrontierPaths(frontier),
      addedNodes: snapshotFrontierNodes(frontier),
      description: `Beam width = ${beamWidth} → keeping top ${
        frontier.length
      } nodes: ${snapshotFrontierNodes(frontier)
        .map((n) => {
          const val = heuristic(n);
          return `${n}(h=${Number.isFinite(val) ? Math.round(val) : "∞"})`;
        })
        .join(", ")}.`,
    });
  }

  if (stepCounter >= MAX_STEPS) {
    steps.push({
      stepType: "error",
      currentNode: "",
      visited: new Set(visited),
      frontier: [],
      parent: { ...parent },
      pathQueue: [],
      description: `Search stopped after ${MAX_STEPS} steps to prevent infinite loop.`,
    });
  } else {
    steps.push({
      stepType: "add_to_frontier",
      currentNode: "",
      visited: new Set(visited),
      frontier: [],
      parent: { ...parent },
      pathQueue: [],
      addedNodes: [],
      description: `No path to goal found.`,
    });
  }

  return steps;
}

export const Beam: Algorithm = {
  id: "beam",
  name: "Beam Search",
  description:
    "Beam Search with optional CLOSED set or path-based loop breaking.",
  execute: (
    adjList,
    start,
    goal,
    _earlyStop,
    usePathLoopBreaking = true,
    useClosedSet = false,
    graphId = "tree",
    extra = {}
  ) =>
    executeBeamSearch(adjList, start, goal, extra.beamWidth || 2, graphId, {
      usePathLoopBreaking,
      useClosedSet,
    }),
};
