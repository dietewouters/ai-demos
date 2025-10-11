"use client";

import type { SearchStep } from "../app/search";
import type { Algorithm } from "../algorithms/types";

/**
 * Helpers to support directional ordering on grid ids: "x_y"
 */
const parseCoords = (id: string): [number, number] | null => {
  const parts = id.split("_");
  if (parts.length !== 2) return null;
  const x = parseInt(parts[0], 10);
  const y = parseInt(parts[1], 10);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return [x, y];
};

const sortByDirection = (current: string, neighbors: string[]) => {
  const cur = parseCoords(current);
  if (!cur) return [...neighbors].sort(); // fallback for non-grid ids

  const [cx, cy] = cur;

  // Up, Right, Left, Down priority on same row/col; everything else after
  const dirScore = (id: string) => {
    const c = parseCoords(id);
    if (!c) return 99; // non-grid → last (but stable)
    const [x, y] = c;
    if (y < cy && x === cx) return 0; // up
    if (x > cx && y === cy) return 1; // right
    if (x < cx && y === cy) return 2; // left
    if (y > cy && x === cx) return 3; // down
    return 4; // diagonals / others
  };

  return [...neighbors].sort((a, b) => dirScore(a) - dirScore(b));
};

function executeIterativeDeepening(
  adjList: { [key: string]: string[] },
  startNode: string,
  goalNode: string,
  earlyStop = false,
  usePathLoopBreaking = true,
  useClosedSet = false
): SearchStep[] {
  const steps: SearchStep[] = [];
  let stepCounter = 0;
  const MAX_STEPS = 5000;
  const MAX_DEPTH = 100;

  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set<string>(),
    frontier: [startNode],
    parent: {},
    pathQueue: [[startNode]],
    description: `Start Iterative Deepening from ${startNode}. Goal: ${goalNode}.`,
  });

  function depthLimitedSearch(
    currentDepthLimit: number
  ): "found" | "cutoff" | "failure" {
    let cutoffOccurred = false;
    const visited = new Set<string>();
    let activePaths: string[][] = [[startNode]];

    while (activePaths.length > 0 && stepCounter < MAX_STEPS) {
      stepCounter++;

      const currentPath = activePaths.pop()!;
      const currentNode = currentPath[currentPath.length - 1];
      const currentDepth = currentPath.length - 1;

      if (useClosedSet && visited.has(currentNode)) {
        steps.push({
          stepType: "skip_closed",
          currentNode,
          visited: new Set(visited),
          frontier: activePaths.map((p) => p[p.length - 1]),
          parent: {},
          pathQueue: [...activePaths],
          description: `Skipping path ${currentPath.join(
            " → "
          )} because its last node (${currentNode}) is already in CLOSED set.`,
        });
        continue;
      }

      visited.add(currentNode);

      const exploredEdge =
        currentPath.length > 1
          ? { from: currentPath[currentPath.length - 2], to: currentNode }
          : undefined;

      steps.push({
        stepType: "take_from_frontier",
        currentNode,
        visited: new Set(visited),
        frontier: activePaths.map((p) => p[p.length - 1]),
        parent: {},
        pathQueue: [...activePaths],
        takenNode: currentNode,
        exploredEdge,
        description: `Taking path from stack: ${currentPath.join(
          " → "
        )} (depth ${currentDepth}/${currentDepthLimit})`,
      });

      // Goal check
      if (currentNode === goalNode) {
        steps.push({
          stepType: "goal_found",
          currentNode,
          visited: new Set(visited),
          frontier: [],
          parent: {},
          pathQueue: [currentPath],
          finalPath: currentPath,
          description: `Goal ${goalNode} found at depth ${currentDepth}! Path: ${currentPath.join(
            " → "
          )}`,
        });
        return "found";
      }

      // Depth limit check
      if (currentDepth >= currentDepthLimit) {
        steps.push({
          stepType: "add_to_frontier",
          currentNode,
          visited: new Set(visited),
          frontier: activePaths.map((p) => p[p.length - 1]),
          parent: {},
          pathQueue: [...activePaths],
          addedNodes: [],
          description: `Depth limit ${currentDepthLimit} reached at ${currentNode}.`,
        });
        cutoffOccurred = true;
        continue;
      }

      // Neighbors in vaste volgorde
      const neighborsOrdered = sortByDirection(
        currentNode,
        adjList[currentNode] || []
      );

      steps.push({
        stepType: "highlight_edges",
        currentNode,
        visited: new Set(visited),
        frontier: activePaths.map((p) => p[p.length - 1]),
        parent: {},
        pathQueue: [...activePaths],
        highlightedEdges: neighborsOrdered.map((neighbor) => ({
          from: currentNode,
          to: neighbor,
        })),
        description: `Exploring neighbors of ${currentNode}: ${neighborsOrdered.join(
          ", "
        )} (depth ${currentDepth}).`,
      });

      const validNeighbors = neighborsOrdered.filter((n) => {
        if (usePathLoopBreaking && currentPath.includes(n)) return false;
        if (useClosedSet && visited.has(n)) return false;
        return true;
      });

      if (validNeighbors.length > 0) {
        if (earlyStop && validNeighbors.includes(goalNode)) {
          const goalPath = [...currentPath, goalNode];

          steps.push({
            stepType: "add_to_frontier",
            currentNode,
            visited: new Set(visited),
            frontier: [...activePaths.map((p) => p[p.length - 1]), goalNode],
            parent: {},
            pathQueue: [...activePaths, goalPath],
            addedNodes: [goalNode],
            description: `Adding goal path: ${goalPath.join(" → ")}`,
          });

          steps.push({
            stepType: "goal_found",
            currentNode: goalNode,
            visited: new Set(visited),
            frontier: [],
            parent: {},
            pathQueue: [goalPath],
            finalPath: goalPath,
            description: `Goal ${goalNode} found among neighbors. Path: ${goalPath.join(
              " → "
            )}`,
          });

          return "found";
        }

        const newPaths = [...validNeighbors]
          .reverse()
          .map((n) => [...currentPath, n]);
        activePaths.push(...newPaths);

        steps.push({
          stepType: "add_to_frontier",
          currentNode,
          visited: new Set(visited),
          frontier: activePaths.map((p) => p[p.length - 1]),
          parent: {},
          pathQueue: [...activePaths],
          addedNodes: validNeighbors,
          description: `Added ${newPaths.length} new path(s):\n${newPaths
            .map((p) => p.join(" → "))
            .join(", ")}`,
        });
      } else {
        steps.push({
          stepType: "add_to_frontier",
          currentNode,
          visited: new Set(visited),
          frontier: activePaths.map((p) => p[p.length - 1]),
          parent: {},
          pathQueue: [...activePaths],
          addedNodes: [],
          description: `No valid neighbors from ${currentNode} ${
            useClosedSet
              ? "(all neighbors already in CLOSED)"
              : usePathLoopBreaking
              ? "(all neighbors already in current path)"
              : "(none left)"
          }.`,
        });
      }
    }

    return cutoffOccurred ? "cutoff" : "failure";
  }

  let found = false;
  for (
    let depthLimit = 0;
    depthLimit <= MAX_DEPTH && stepCounter < MAX_STEPS && !found;
    depthLimit++
  ) {
    steps.push({
      stepType: "start",
      currentNode: startNode,
      visited: new Set<string>(),
      frontier: [startNode],
      parent: {},
      pathQueue: [[startNode]],
      description: `Starting depth-limited search with limit ${depthLimit}.`,
    });

    const result = depthLimitedSearch(depthLimit);

    if (result === "found") {
      found = true;
    } else if (result === "failure") {
      steps.push({
        stepType: "add_to_frontier",
        currentNode: "",
        visited: new Set<string>(),
        frontier: [],
        parent: {},
        pathQueue: [],
        addedNodes: [],
        description: `No solution within depth ${depthLimit}.`,
      });
    } else if (result === "cutoff") {
      steps.push({
        stepType: "add_to_frontier",
        currentNode: "",
        visited: new Set<string>(),
        frontier: [],
        parent: {},
        pathQueue: [],
        addedNodes: [],
        description: `Depth limit ${depthLimit} caused cutoff — increasing to ${
          depthLimit + 1
        }.`,
      });
    }
  }

  if (!found) {
    steps.push({
      stepType: "add_to_frontier",
      currentNode: "",
      visited: new Set<string>(),
      frontier: [],
      parent: {},
      pathQueue: [],
      addedNodes: [],
      description: `No path to goal found up to depth ${MAX_DEPTH}.`,
    });
  }

  if (stepCounter >= MAX_STEPS) {
    steps.push({
      stepType: "error",
      currentNode: "",
      visited: new Set<string>(),
      frontier: [],
      parent: {},
      pathQueue: [],
      description: `Search stopped after ${MAX_STEPS} steps to prevent infinite loop.`,
    });
  }

  return steps;
}

export const IDD: Algorithm = {
  id: "id",
  name: "Iterative Deepening",
  description: "Depth-limited DFS with increasing limit (IDDFS).",
  execute: executeIterativeDeepening,
};
