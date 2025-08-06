import type { SearchStep, Algorithm } from "../app/search";

function executeDFS(
  adjList: { [key: string]: string[] },
  startNode: string,
  goalNode: string,
  earlyStop = false,
  loopBreaking = true
): SearchStep[] {
  const steps: SearchStep[] = [];
  const visited = new Set<string>();
  const frontier = [startNode];
  const parent: { [key: string]: string } = {};
  const paths: { [key: string]: string[] } = { [startNode]: [startNode] };

  const getPathQueue = () => frontier.map((node) => paths[node] ?? [node]);

  let stepCounter = 0;
  const MAX_STEPS = 5000;

  // Initial step
  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(),
    frontier: [startNode],
    parent: {},
    pathQueue: [[startNode]],
    description: `Starting ${
      earlyStop ? "early" : "late"
    } stopping DFS from node ${startNode}`,
  });

  while (frontier.length > 0 && stepCounter < MAX_STEPS) {
    stepCounter++;

    const currentNode = frontier.pop()!;

    // Alleen overslaan als loop breaking aan staat
    if (loopBreaking && visited.has(currentNode)) continue;

    // Beveiliging: zorg dat path bestaat
    if (!paths[currentNode]) {
      paths[currentNode] = [currentNode];
    }

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

    // Late stopping
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

    const neighbors = (adjList[currentNode] || []).sort();
    const highlightedEdges = neighbors.map((neighbor) => ({
      from: currentNode,
      to: neighbor,
    }));

    steps.push({
      stepType: "highlight_edges",
      currentNode,
      visited: new Set(visited),
      frontier: [...frontier],
      parent: { ...parent },
      pathQueue: getPathQueue(),
      highlightedEdges,
      description: `Exploring neighbors of ${currentNode}: ${neighbors.join(
        ", "
      )}`,
    });

    const validNeighbors = loopBreaking
      ? neighbors.filter(
          (neighbor) => !visited.has(neighbor) && !frontier.includes(neighbor)
        )
      : neighbors;

    if (validNeighbors.length > 0) {
      const reversedNeighbors = [...validNeighbors].reverse();
      for (const neighbor of reversedNeighbors) {
        frontier.push(neighbor);

        // Beveiliging: zorg dat path naar current bestaat
        if (!paths[currentNode]) {
          paths[currentNode] = [currentNode];
        }

        // Altijd parent en path bijwerken (ook bij revisits)
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
        description: `No new nodes to add to frontier (all neighbors already ${
          loopBreaking ? "visited or in frontier" : "processed"
        })`,
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
  description: "Goes deep first using a stack (LIFO)",
  execute: executeDFS,
};
