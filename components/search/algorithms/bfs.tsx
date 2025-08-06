import type { SearchStep, Algorithm } from "../app/search";

function executeBFS(
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

  // Build initial path queue
  const getPathQueue = () => frontier.map((node) => paths[node] || [node]);

  // Initial step
  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(),
    frontier: [startNode],
    parent: {},
    pathQueue: [[startNode]],
    description: ``,
  });

  while (frontier.length > 0) {
    const currentNode = frontier.shift()!; // Queue (FIFO)

    // Skip if already visited (prevents infinite loops) - only when loop breaking is on
    if (loopBreaking && visited.has(currentNode)) continue;

    // Step: Take node from frontier
    visited.add(currentNode);
    steps.push({
      stepType: "take_from_frontier",
      currentNode,
      visited: new Set(visited),
      frontier: [...frontier],
      parent: { ...parent },
      pathQueue: getPathQueue(),
      takenNode: currentNode,
      exploredEdge: parent[currentNode]
        ? { from: parent[currentNode], to: currentNode }
        : undefined,
      description: `Taking path from frontier: ${paths[currentNode].join(
        " → "
      )}`,
    });

    // Check if goal is reached (late stopping)
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

    // Step: Highlight all edges from current node
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

    // Step: Add valid neighbors to frontier
    const validNeighbors = loopBreaking
      ? neighbors.filter(
          (neighbor) => !visited.has(neighbor) && !frontier.includes(neighbor)
        )
      : neighbors; // voeg alles toe als loopBreaking uit staat

    if (validNeighbors.length > 0) {
      for (const neighbor of validNeighbors) {
        frontier.push(neighbor);
        // altijd parent en path bijwerken als loopBreaking uit staat
        if (!loopBreaking || !parent[neighbor]) {
          parent[neighbor] = currentNode;
          paths[neighbor] = [...paths[currentNode], neighbor];
        }

        // Early stopping: check if we just added the goal to frontier
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
          loopBreaking ? "visited or in frontier" : "visited"
        })`,
      });
    }
  }

  return steps;
}

export const BFS: Algorithm = {
  id: "bfs",
  name: "Breadth-First Search",
  description: "Explores layer by layer using a queue (FIFO)",
  execute: executeBFS,
};
