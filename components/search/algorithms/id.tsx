"use client";
import type { SearchStep } from "../app/search";
import type { Algorithm } from "../algorithms/types";

// Helpers to support directional ordering on grid ids: "x_y"
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

  const dirScore = (id: string) => {
    const c = parseCoords(id);
    if (!c) return 99; // non-grid → last
    const [x, y] = c;
    // Up, Right, Left, Down (only 4-neighborhood on same row/col)
    if (y < cy && x === cx) return 0; // up
    if (x > cx && y === cy) return 1; // right
    if (x < cx && y === cy) return 2; // left
    if (y > cy && x === cx) return 3; // down
    return 4; // anything else (e.g. diagonals) after the four main dirs
  };

  return [...neighbors].sort((a, b) => dirScore(a) - dirScore(b));
};

function executeIterativeDeepening(
  adjList: { [key: string]: string[] },
  startNode: string,
  goalNode: string,
  earlyStop = false,
  loopBreaking = true
): SearchStep[] {
  const steps: SearchStep[] = [];
  let stepCounter = 0;
  const MAX_STEPS = 1000;
  const MAX_DEPTH = 50;

  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set<string>(),
    frontier: [startNode],
    parent: {},
    pathQueue: [[startNode]],
    description: ``,
  });

  function depthLimitedSearch(
    currentDepthLimit: number
  ): "found" | "cutoff" | "failure" {
    let cutoffOccurred = false;
    let activePaths: string[][] = [[startNode]];

    while (activePaths.length > 0 && stepCounter < MAX_STEPS) {
      stepCounter++;

      // Stack behavior (DFS within the depth limit)
      const currentPath = activePaths.pop()!;
      const currentNode = currentPath[currentPath.length - 1];
      const currentDepth = currentPath.length - 1;

      // Build visited set from current path (for loop breaking)
      const visited = loopBreaking
        ? new Set<string>(currentPath)
        : new Set<string>();

      // Remaining frontier nodes = last node of each remaining path
      const frontierNodes = activePaths.map((path) => path[path.length - 1]);

      steps.push({
        stepType: "take_from_frontier",
        currentNode,
        visited,
        frontier: frontierNodes,
        parent: {},
        pathQueue: [...activePaths],
        takenNode: currentNode,
        exploredEdge:
          currentPath.length > 1
            ? { from: currentPath[currentPath.length - 2], to: currentNode }
            : undefined,
        description: `Taking path from queue: ${currentPath.join(
          " → "
        )} (depth ${currentDepth}/${currentDepthLimit})`,
      });

      // Goal test
      if (currentNode === goalNode) {
        steps.push({
          stepType: "goal_found",
          currentNode,
          visited,
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

      // Depth cutoff
      if (currentDepth >= currentDepthLimit) {
        steps.push({
          stepType: "add_to_frontier",
          currentNode,
          visited,
          frontier: frontierNodes,
          parent: {},
          pathQueue: [...activePaths],
          addedNodes: [],
          description: `Depth limit ${currentDepthLimit} reached at ${currentNode}`,
        });
        cutoffOccurred = true;
        continue;
      }

      // --- Directional neighbor order (Up → Right → Left → Down) with fallback ---
      const neighborsOrdered = sortByDirection(
        currentNode,
        adjList[currentNode] || []
      );

      steps.push({
        stepType: "highlight_edges",
        currentNode,
        visited,
        frontier: frontierNodes,
        parent: {},
        pathQueue: [...activePaths],
        highlightedEdges: neighborsOrdered.map((neighbor) => ({
          from: currentNode,
          to: neighbor,
        })),
        description: `Exploring neighbors of ${currentNode}: ${neighborsOrdered.join(
          ", "
        )} at depth ${currentDepth}`,
      });

      // Filter valid neighbors
      const validNeighbors = loopBreaking
        ? neighborsOrdered.filter((neighbor) => !currentPath.includes(neighbor))
        : neighborsOrdered;

      if (validNeighbors.length > 0) {
        // Early stopping if goal is among next neighbors
        if (earlyStop && validNeighbors.includes(goalNode)) {
          const goalPath = [...currentPath, goalNode];

          steps.push({
            stepType: "add_to_frontier",
            currentNode,
            visited,
            frontier: [...frontierNodes, goalNode],
            parent: {},
            pathQueue: [...activePaths, goalPath],
            addedNodes: [goalNode],
            description: `Adding goal path: ${goalPath.join(" → ")}`,
          });

          steps.push({
            stepType: "goal_found",
            currentNode: goalNode,
            visited,
            frontier: [],
            parent: {},
            pathQueue: [goalPath],
            finalPath: goalPath,
            description: `Goal ${goalNode} found in neighbors! Path: ${goalPath.join(
              " → "
            )}`,
          });
          return "found";
        }

        // Push in reverse so pop() follows Up → Right → Left → Down
        const newPaths = [...validNeighbors]
          .reverse()
          .map((neighbor) => [...currentPath, neighbor]);
        activePaths.push(...newPaths);

        const updatedFrontierNodes = activePaths.map(
          (path) => path[path.length - 1]
        );

        steps.push({
          stepType: "add_to_frontier",
          currentNode,
          visited,
          frontier: updatedFrontierNodes,
          parent: {},
          pathQueue: [...activePaths],
          addedNodes: validNeighbors,
          description: `Adding ${
            newPaths.length
          } new paths to queue:\n${newPaths
            .map((path) => path.join(" → "))
            .join("\n")}`,
        });
      } else {
        steps.push({
          stepType: "add_to_frontier",
          currentNode,
          visited,
          frontier: frontierNodes,
          parent: {},
          pathQueue: [...activePaths],
          addedNodes: [],
          description: `No valid neighbors from ${currentNode} ${
            loopBreaking
              ? "(would create cycle)"
              : "(would backtrack immediately)"
          }`,
        });
      }
    }

    return cutoffOccurred ? "cutoff" : "failure";
  }

  // Main iterative deepening loop
  for (
    let depthLimit = 0;
    depthLimit <= MAX_DEPTH && stepCounter < MAX_STEPS;
    depthLimit++
  ) {
    steps.push({
      stepType: "start",
      currentNode: startNode,
      visited: new Set<string>(),
      frontier: [startNode],
      parent: {},
      pathQueue: [[startNode]],
      description: `Starting depth-limited search with limit ${depthLimit}`,
    });

    const result = depthLimitedSearch(depthLimit);

    if (result === "found") {
      break;
    } else if (result === "failure") {
      steps.push({
        stepType: "add_to_frontier",
        currentNode: "",
        visited: new Set<string>(),
        frontier: [],
        parent: {},
        pathQueue: [],
        addedNodes: [],
        description: `No solution exists at depth ${depthLimit} - need to increase limit`,
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
        description: `Depth limit ${depthLimit} reached - increasing to ${
          depthLimit + 1
        }`,
      });
    }
  }

  if (stepCounter >= MAX_STEPS) {
    steps.push({
      stepType: "add_to_frontier",
      currentNode: "",
      visited: new Set<string>(),
      frontier: [],
      parent: {},
      pathQueue: [],
      addedNodes: [],
      description: `Search stopped after ${MAX_STEPS} steps to prevent timeout`,
    });
  }

  return steps;
}

export const IDD: Algorithm = {
  id: "id",
  name: "Iterative Deepening",
  description: "",
  execute: executeIterativeDeepening,
};
