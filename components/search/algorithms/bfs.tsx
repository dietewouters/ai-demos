export interface SearchStep {
  currentNode: string;
  visited: Set<string>;
  frontier: string[];
  parent: { [key: string]: string };
  exploredEdge?: { from: string; to: string };
  finalPath?: string[];
}

export interface Algorithm {
  id: string;
  name: string;
  description: string;
  execute: (
    adjList: { [key: string]: string[] },
    startNode: string,
    goalNode: string,
    earlyStop?: boolean,
    loopBreaking?: boolean
  ) => SearchStep[];
}

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

  while (frontier.length > 0) {
    const currentNode = frontier.shift()!; // Queue (FIFO)

    // Loop breaking: skip if already visited
    if (loopBreaking && visited.has(currentNode)) continue;

    visited.add(currentNode);

    // Add step showing current node being processed
    steps.push({
      currentNode,
      visited: new Set(visited),
      frontier: [...frontier],
      parent: { ...parent },
      exploredEdge: parent[currentNode]
        ? { from: parent[currentNode], to: currentNode }
        : undefined,
    });

    // Check if goal is reached (late stopping)
    if (currentNode === goalNode) {
      // Reconstruct path from goal to start
      const path: string[] = [];
      let current = currentNode;
      while (current) {
        path.unshift(current);
        current = parent[current];
      }

      // Add final step with the complete path
      steps.push({
        currentNode,
        visited: new Set(visited),
        frontier: [...frontier],
        parent: { ...parent },
        exploredEdge: parent[currentNode]
          ? { from: parent[currentNode], to: currentNode }
          : undefined,
        finalPath: path,
      });
      break;
    }

    // Add neighbors to frontier in alphabetical order (for BFS)
    const neighbors = (adjList[currentNode] || []).sort();
    for (const neighbor of neighbors) {
      // With loop breaking: only add if not visited and not already in frontier
      // Without loop breaking: always add (can lead to duplicates in frontier)
      const shouldAdd = loopBreaking
        ? !visited.has(neighbor) && !frontier.includes(neighbor)
        : !visited.has(neighbor);

      if (shouldAdd) {
        frontier.push(neighbor);
        // Only set parent if it hasn't been set before (first time we discover this node)
        if (!parent[neighbor]) {
          parent[neighbor] = currentNode;
        }

        // Early stopping: check if we just added the goal to frontier
        if (earlyStop && neighbor === goalNode) {
          // Reconstruct path from goal to start
          const path: string[] = [];
          let current = neighbor;
          while (current) {
            path.unshift(current);
            current = parent[current];
          }

          // Add final step with the complete path
          steps.push({
            currentNode,
            visited: new Set(visited),
            frontier: [...frontier],
            parent: { ...parent },
            exploredEdge: parent[currentNode]
              ? { from: parent[currentNode], to: currentNode }
              : undefined,
            finalPath: path,
          });
          return steps;
        }
      }
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
