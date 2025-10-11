"use client";

import type { SearchStep } from "../app/search";
import type { Algorithm } from "../algorithms/types";

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
 * Falls back to lexicographic sort for non-grid ids.
 */
const sortByDirection = (current: string, neighbors: string[]) => {
  const coords = parseCoords(current);
  if (!coords) return [...neighbors].sort();

  const [cx, cy] = coords;

  const dirScore = (id: string) => {
    const c = parseCoords(id);
    if (!c) return 99; // place non-grid last
    const [x, y] = c;
    if (y < cy && x === cx) return 0; // up
    if (x > cx && y === cy) return 1; // right
    if (x < cx && y === cy) return 2; // left
    if (y > cy && x === cx) return 3; // down
    return 4; // diagonals / others
  };

  return [...neighbors].sort((a, b) => dirScore(a) - dirScore(b));
};

function executeDFS(
  adjList: { [key: string]: string[] },
  startNode: string,
  goalNode: string,
  earlyStop = false,
  usePathLoopBreaking = true,
  useClosedSet = false
): SearchStep[] {
  const steps: SearchStep[] = [];
  const visited = new Set<string>();
  const frontier: string[] = [startNode];
  const parent: Record<string, string> = {};
  const paths: Record<string, string[]> = { [startNode]: [startNode] };

  const getPathQueue = () => frontier.map((node) => paths[node] ?? [node]);

  let stepCounter = 0;
  const MAX_STEPS = 5000;

  // Start
  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(),
    frontier: [startNode],
    parent: {},
    pathQueue: [[startNode]],
    description: `Start DFS from ${startNode}. Goal: ${goalNode}.`,
  });

  while (frontier.length > 0 && stepCounter < MAX_STEPS) {
    stepCounter++;

    const currentNode = frontier.pop()!;
    const currentPath = paths[currentNode] ?? [currentNode];

    if (useClosedSet) {
      if (visited.has(currentNode)) {
        steps.push({
          stepType: "skip_closed",
          currentNode,
          visited: new Set(visited),
          frontier: [...frontier],
          parent: { ...parent },
          pathQueue: getPathQueue(),
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
      parent[currentNode] !== undefined
        ? { from: parent[currentNode], to: currentNode }
        : undefined;

    steps.push({
      stepType: "take_from_frontier",
      currentNode,
      visited: new Set(visited),
      frontier: [...frontier],
      parent: { ...parent },
      pathQueue: getPathQueue(),
      takenNode: currentNode,
      exploredEdge,
      description: `Taking path from frontier: ${currentPath.join(" → ")}`,
    });

    if (currentNode === goalNode) {
      steps.push({
        stepType: "goal_found",
        currentNode,
        visited: new Set(visited),
        frontier: [...frontier],
        parent: { ...parent },
        pathQueue: getPathQueue(),
        finalPath: currentPath,
        description: `Goal ${goalNode} found! Final path: ${currentPath.join(
          " → "
        )}`,
      });
      break;
    }

    const neighbors = sortByDirection(currentNode, adjList[currentNode] || []);

    steps.push({
      stepType: "highlight_edges",
      currentNode,
      visited: new Set(visited),
      frontier: [...frontier],
      parent: { ...parent },
      pathQueue: getPathQueue(),
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

    if (validNeighbors.length > 0) {
      const pushOrder = [...validNeighbors].reverse();
      const addedNodes: string[] = [];

      for (const neighbor of pushOrder) {
        frontier.push(neighbor);
        parent[neighbor] = currentNode;
        paths[neighbor] = [...currentPath, neighbor];
        addedNodes.push(neighbor);

        if (earlyStop && neighbor === goalNode) {
          steps.push({
            stepType: "add_to_frontier",
            currentNode,
            visited: new Set(visited),
            frontier: [...frontier],
            parent: { ...parent },
            pathQueue: getPathQueue(),
            addedNodes,
            description: `Early stop! Added ${neighbor} to frontier.`,
          });

          steps.push({
            stepType: "goal_found",
            currentNode: neighbor,
            visited: new Set(visited),
            frontier: [...frontier],
            parent: { ...parent },
            pathQueue: getPathQueue(),
            finalPath: paths[neighbor],
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
        frontier: [...frontier],
        parent: { ...parent },
        pathQueue: getPathQueue(),
        addedNodes,
        description:
          addedNodes.length > 0
            ? `Added to frontier:\n${addedNodes
                .map((n) => paths[n].join(" → "))
                .join(", ")}`
            : "No new nodes added to frontier.",
      });
    } else {
      steps.push({
        stepType: "add_to_frontier",
        currentNode,
        visited: new Set(visited),
        frontier: [...frontier],
        parent: { ...parent },
        pathQueue: getPathQueue(),
        addedNodes: [],
        description: `No new nodes to add (${
          useClosedSet
            ? "all neighbors already in CLOSED"
            : usePathLoopBreaking
            ? "all neighbors already in current path"
            : "none left"
        }).`,
      });
    }
  }

  if (stepCounter >= MAX_STEPS) {
    steps.push({
      stepType: "error",
      currentNode: "",
      visited: new Set(visited),
      frontier: [...frontier],
      parent: { ...parent },
      pathQueue: [],
      description: `Search stopped after ${MAX_STEPS} steps to prevent infinite loop.`,
    });
  }

  return steps;
}

export const DFS: Algorithm = {
  id: "dfs",
  name: "Depth-First Search",
  description: "",
  execute: executeDFS,
};
