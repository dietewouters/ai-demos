"use client";
import type { SearchStep } from "../app/search";
import type { Algorithm } from "../algorithms/types";

const parseCoords = (id: string): [number, number] | null => {
  const parts = id.split("_");
  if (parts.length !== 2) return null;
  const x = parseInt(parts[0], 10);
  const y = parseInt(parts[1], 10);
  if (isNaN(x) || isNaN(y)) return null;
  return [x, y];
};

const sortByDirection = (current: string, neighbors: string[]) => {
  const coords = parseCoords(current);
  if (!coords) return neighbors.sort();

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

type FrontierItem = {
  node: string;
  path: string[];
};

function executeBFS(
  adjList: { [key: string]: string[] },
  startNode: string,
  goalNode: string,
  earlyStop = false,
  usePathLoopBreaking = false,
  useClosedSet = false
): SearchStep[] {
  const steps: SearchStep[] = [];
  const visited = new Set<string>();
  const frontier: FrontierItem[] = [{ node: startNode, path: [startNode] }];
  const parent: Record<string, string> = {};

  const MAX_STEPS = 5000;
  let stepCounter = 0;

  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(),
    frontier: [startNode],
    parent: {},
    pathQueue: [[startNode]],
    description: `Starting BFS from ${startNode}`,
  });

  while (frontier.length > 0 && stepCounter < MAX_STEPS) {
    stepCounter++;
    const { node: currentNode, path: currentPath } = frontier.shift()!;

    if (useClosedSet) {
      if (visited.has(currentNode)) {
        steps.push({
          stepType: "skip_closed",
          currentNode,
          visited: new Set(visited),
          frontier: frontier.map((f) => f.node),
          parent: { ...parent },
          pathQueue: frontier.map((f) => f.path),
          description: `Skipping path ${currentPath.join(
            " → "
          )} because its last node (${currentNode}) is already in CLOSED set.`,
        });
        continue;
      }
      visited.add(currentNode);
    } else {
      visited.add(currentNode);
    }

    const exploredEdge =
      currentPath.length > 1
        ? { from: currentPath[currentPath.length - 2], to: currentNode }
        : undefined;

    steps.push({
      stepType: "take_from_frontier",
      currentNode,
      visited: new Set(visited),
      frontier: frontier.map((f) => f.node),
      parent: { ...parent },
      pathQueue: frontier.map((f) => f.path),
      takenNode: currentNode,
      exploredEdge,
      description: `Taking path from frontier: ${currentPath.join(" → ")}`,
    });

    if (currentNode === goalNode) {
      steps.push({
        stepType: "goal_found",
        currentNode,
        visited: new Set(visited),
        frontier: frontier.map((f) => f.node),
        parent: { ...parent },
        pathQueue: [],
        finalPath: currentPath,
        description: `Goal ${goalNode} found! Final path: ${currentPath.join(
          " → "
        )}`,
      });
      break;
    }

    const neighbors = sortByDirection(currentNode, adjList[currentNode] || []);
    const highlightedEdges = neighbors.map((neighbor) => ({
      from: currentNode,
      to: neighbor,
    }));

    steps.push({
      stepType: "highlight_edges",
      currentNode,
      visited: new Set(visited),
      frontier: frontier.map((f) => f.node),
      parent: { ...parent },
      pathQueue: frontier.map((f) => f.path),
      highlightedEdges,
      description: `Exploring neighbors of ${currentNode}: ${neighbors.join(
        ", "
      )}`,
    });

    const addedPaths: string[][] = [];

    for (const neighbor of neighbors) {
      if (usePathLoopBreaking && currentPath.includes(neighbor)) continue;

      if (useClosedSet && visited.has(neighbor)) continue;

      const newPath = [...currentPath, neighbor];
      frontier.push({ node: neighbor, path: newPath });
      parent[neighbor] = currentNode;
      addedPaths.push(newPath);

      if (earlyStop && neighbor === goalNode) {
        steps.push({
          stepType: "add_to_frontier",
          currentNode,
          visited: new Set(visited),
          frontier: frontier.map((f) => f.node),
          parent: { ...parent },
          pathQueue: frontier.map((f) => f.path),
          addedNodes: [neighbor],
          description: `Early stop! Added ${neighbor} to frontier.`,
        });

        steps.push({
          stepType: "goal_found",
          currentNode: neighbor,
          visited: new Set(visited),
          frontier: frontier.map((f) => f.node),
          parent: { ...parent },
          pathQueue: [],
          finalPath: newPath,
          description: `Goal ${goalNode} found in frontier. Path: ${newPath.join(
            " → "
          )}`,
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
      addedNodes: addedPaths.map((p) => p[p.length - 1]),
      description:
        addedPaths.length > 0
          ? `Added to frontier:\n${addedPaths
              .map((p) => p.join(" → "))
              .join(", ")}`
          : "No new nodes added to frontier.",
    });
  }

  return steps;
}

export const BFS: Algorithm = {
  id: "bfs",
  name: "Breadth-First Search",
  description:
    "Explores all nodes at the current depth before moving to the next.",
  execute: (
    adjList,
    start,
    goal,
    earlyStop,
    usePathLoopBreaking,
    useClosedSet
  ) =>
    executeBFS(
      adjList,
      start,
      goal,
      earlyStop,
      usePathLoopBreaking,
      useClosedSet
    ),
};
