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

  function depthLimitedSearch(
    currentPath: string[],
    depth: number,
    visited: Set<string>,
    currentDepthLimit: number,
    activePaths: string[][]
  ): "found" | "cutoff" | "failure" {
    stepCounter++;
    if (stepCounter >= MAX_STEPS) return "failure";

    const currentNode = currentPath[currentPath.length - 1];
    const updatedActivePaths = activePaths.filter(
      (p) => p.join() !== currentPath.join()
    );

    steps.push({
      stepType: "take_from_frontier",
      currentNode,
      visited: new Set(visited),
      frontier: [currentNode],
      parent: {},
      pathQueue: [...updatedActivePaths],
      takenNode: currentNode,
      exploredEdge:
        currentPath.length > 1
          ? { from: currentPath[currentPath.length - 2], to: currentNode }
          : undefined,
      description: `Exploring path: ${currentPath.join(" → ")} (depth ${
        currentPath.length - 1
      }/${currentDepthLimit})`,
    });

    if (currentNode === goalNode) {
      steps.push({
        stepType: "goal_found",
        currentNode,
        visited: new Set(visited),
        frontier: [],
        parent: {},
        pathQueue: [...updatedActivePaths],
        finalPath: currentPath,
        description: `Goal ${goalNode} found at depth ${
          currentPath.length - 1
        }! Final path: ${currentPath.join(" → ")}`,
      });
      return "found";
    }

    if (depth <= 0) {
      steps.push({
        stepType: "add_to_frontier",
        currentNode,
        visited: new Set(visited),
        frontier: [],
        parent: {},
        pathQueue: [...updatedActivePaths],
        addedNodes: [],
        description: `Depth limit ${currentDepthLimit} reached at node ${currentNode}`,
      });
      return "cutoff";
    }

    const newVisited = loopBreaking
      ? new Set([...visited, currentNode])
      : visited;

    const neighbors = (adjList[currentNode] || []).sort();

    steps.push({
      stepType: "highlight_edges",
      currentNode,
      visited: new Set(newVisited),
      frontier: neighbors,
      parent: {},
      pathQueue: [...updatedActivePaths],
      highlightedEdges: neighbors.map((neighbor) => ({
        from: currentNode,
        to: neighbor,
      })),
      description: `Exploring neighbors of ${currentNode}: ${neighbors.join(
        ", "
      )} at depth ${currentPath.length - 1}`,
    });

    let cutoffOccurred = false;

    const validNeighbors = loopBreaking
      ? neighbors.filter((n) => !newVisited.has(n))
      : neighbors; // ← dus hier géén filtering meer op `currentPath.includes`!

    if (validNeighbors.length > 0) {
      const newPaths = validNeighbors.map((n) => [...currentPath, n]);

      // FIX: gebruik stackgedrag — voeg nieuwe paden BOVENAAN toe
      const nextActivePaths = [...newPaths, ...updatedActivePaths];

      steps.push({
        stepType: "add_to_frontier",
        currentNode,
        visited: new Set(newVisited),
        frontier: validNeighbors,
        parent: {},
        pathQueue: nextActivePaths,
        addedNodes: validNeighbors,
        description: `Adding to frontier:\n${newPaths
          .map((p) => p.join(" → "))
          .join(", \n")}`,
      });

      if (earlyStop && validNeighbors.includes(goalNode)) {
        const goalPath = [...currentPath, goalNode];
        steps.push({
          stepType: "goal_found",
          currentNode: goalNode,
          visited: new Set(newVisited),
          frontier: [],
          parent: {},
          pathQueue: nextActivePaths,
          finalPath: goalPath,
          description: `Goal ${goalNode} found in neighbors! Path: ${goalPath.join(
            " → "
          )}`,
        });
        return "found";
      }

      for (const neighbor of validNeighbors) {
        const result = depthLimitedSearch(
          [...currentPath, neighbor],
          depth - 1,
          newVisited,
          currentDepthLimit,
          nextActivePaths
        );
        if (result === "found") return "found";
        if (result === "cutoff") cutoffOccurred = true;
      }
    } else {
      steps.push({
        stepType: "add_to_frontier",
        currentNode,
        visited: new Set(newVisited),
        frontier: [],
        parent: {},
        pathQueue: [...updatedActivePaths],
        addedNodes: [],
        description: `No valid neighbors to explore from ${currentNode} ${
          loopBreaking ? "(all visited)" : "(cycle allowed, but none found)"
        }`,
      });
    }

    return cutoffOccurred ? "cutoff" : "failure";
  }

  for (
    let depthLimit = 0;
    depthLimit <= MAX_DEPTH && stepCounter < MAX_STEPS;
    depthLimit++
  ) {
    steps.push({
      stepType: "start",
      currentNode: startNode,
      visited: new Set(),
      frontier: [startNode],
      parent: {},
      pathQueue: [[startNode]],
      description: `Starting depth-limited search with limit ${depthLimit}`,
    });

    const result = depthLimitedSearch(
      [startNode],
      depthLimit,
      new Set(),
      depthLimit,
      [[startNode]]
    );

    if (result === "found") break;

    steps.push({
      stepType: "add_to_frontier",
      currentNode: "",
      visited: new Set(),
      frontier: [],
      parent: {},
      pathQueue: [],
      addedNodes: [],
      description:
        result === "cutoff"
          ? `Increase depth limit to ${depthLimit + 1}`
          : `No solution exists at depth ${depthLimit} - trying deeper...`,
    });
  }

  if (stepCounter >= MAX_STEPS) {
    steps.push({
      stepType: "add_to_frontier",
      currentNode: "",
      visited: new Set(),
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
