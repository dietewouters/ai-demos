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
  loopBreaking = true,
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

  // Start step
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
    // Skip already-visited nodes only in CLOSED-set mode.
    if (useClosedSet && visited.has(currentNode)) continue;

    if (!paths[currentNode]) paths[currentNode] = [currentNode];
    visited.add(currentNode);

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
      description: `Taking path from frontier: ${paths[currentNode].join(
        " → "
      )}`,
    });

    if (currentNode === goalNode) {
      steps.push({
        stepType: "goal_found",
        currentNode,
        visited: new Set(visited),
        frontier: [...frontier],
        parent: { ...parent },
        pathQueue: getPathQueue(),
        finalPath: paths[currentNode],
        description: `Goal ${goalNode} found! Final path: ${paths[
          currentNode
        ].join(" → ")}`,
      });
      break;
    }

    // Order neighbors deterministically
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

    // Determine valid neighbors according to the selected mode.
    // - CLOSED-set: filter ONLY by visited (allow duplicates in frontier).
    // - Path-based: filter by presence in the CURRENT PATH (allow duplicates in frontier).
    // - No loop breaking: take all neighbors.
    const currentPath = paths[currentNode] ?? [currentNode];

    const validNeighbors = useClosedSet
      ? neighbors.filter((n) => !visited.has(n)) // <-- no frontier check here
      : loopBreaking
      ? neighbors.filter((n) => !currentPath.includes(n)) // path-based
      : neighbors;

    if (validNeighbors.length > 0) {
      // Push in reverse to ensure Up/Right/Left/Down are popped in that order
      const pushOrder = [...validNeighbors].reverse();

      for (const neighbor of pushOrder) {
        frontier.push(neighbor);
        if (!paths[currentNode]) paths[currentNode] = [currentNode];
        parent[neighbor] = currentNode;
        paths[neighbor] = [...paths[currentNode], neighbor];

        if (earlyStop && neighbor === goalNode) {
          steps.push({
            stepType: "add_to_frontier",
            currentNode,
            visited: new Set(visited),
            frontier: [...frontier],
            parent: { ...parent },
            pathQueue: getPathQueue(),
            addedNodes: validNeighbors,
            description: `Adding to frontier: ${paths[neighbor].join(" → ")}`,
          });

          steps.push({
            stepType: "goal_found",
            currentNode: neighbor,
            visited: new Set(visited),
            frontier: [...frontier],
            parent: { ...parent },
            pathQueue: getPathQueue(),
            finalPath: paths[neighbor],
            description: `Goal ${goalNode} found early in frontier! Path: ${paths[
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
        addedNodes: validNeighbors,
        description: `Adding to frontier:\n${validNeighbors
          .map((n) => paths[n].join(" → "))
          .join(", \n")}`,
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
            ? "all neighbors already visited"
            : loopBreaking
            ? "all neighbors already in current path"
            : "processed"
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
