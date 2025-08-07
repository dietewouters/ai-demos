import type { SearchStep, Algorithm } from "../app/search";

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

      // Take the last path (stack behavior)
      const currentPath = activePaths.pop()!;
      const currentNode = currentPath[currentPath.length - 1];
      const currentDepth = currentPath.length - 1;

      // Build visited set from current path (for loop breaking)
      const visited = loopBreaking
        ? new Set<string>(currentPath)
        : new Set<string>();

      // Get all frontier nodes (last node of each remaining path)
      const frontierNodes = activePaths.map((path) => path[path.length - 1]);

      // Take path from stack - removed path is no longer in queue
      steps.push({
        stepType: "take_from_frontier",
        currentNode,
        visited,
        frontier: frontierNodes, // Only remaining frontier nodes
        parent: {},
        pathQueue: [...activePaths], // Only remaining paths
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

      // Depth limit reached
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

      // Explore neighbors
      const neighbors = (adjList[currentNode] || []).sort();

      steps.push({
        stepType: "highlight_edges",
        currentNode,
        visited,
        frontier: frontierNodes,
        parent: {},
        pathQueue: [...activePaths],
        highlightedEdges: neighbors.map((neighbor) => ({
          from: currentNode,
          to: neighbor,
        })),
        description: `Exploring neighbors of ${currentNode}: ${neighbors.join(
          ", "
        )} at depth ${currentDepth}`,
      });

      // Filter valid neighbors
      let validNeighbors = neighbors;
      if (loopBreaking) {
        validNeighbors = neighbors.filter(
          (neighbor) => !currentPath.includes(neighbor)
        );
        // } else {
        //   // Even without loop breaking, avoid immediate cycles in current path
        //   validNeighbors = neighbors.filter(
        //     (neighbor) =>
        //       currentPath.length === 1 ||
        //       neighbor !== currentPath[currentPath.length - 2]
        //   );
      }

      if (validNeighbors.length > 0) {
        // Early stopping check
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

        // Add new paths to explore (in reverse order for DFS-like behavior)
        const newPaths = validNeighbors
          .reverse()
          .map((neighbor) => [...currentPath, neighbor]);
        activePaths.push(...newPaths);

        // Update frontier nodes after adding new paths
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
  description: "Combines DFS completeness with BFS optimality",
  execute: executeIterativeDeepening,
};
