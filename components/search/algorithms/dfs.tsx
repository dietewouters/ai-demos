import type { SearchStep, Algorithm } from "./bfs";

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

  while (frontier.length > 0) {
    const currentNode = frontier.pop()!; // Stack (LIFO)

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

    // Add neighbors to frontier in reverse alphabetical order (for DFS)
    // So when popped from stack, they come out in alphabetical order
    const neighbors = (adjList[currentNode] || []).sort().reverse();
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

export const DFS: Algorithm = {
  id: "dfs",
  name: "Depth-First Search",
  description: "Goes deep first using a stack (LIFO)",
  execute: executeDFS,
};
