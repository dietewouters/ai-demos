// Uniform Cost Search met ondersteuning voor costs[] zoals gedefinieerd in jouw graph
import type { SearchStep, Algorithm } from "../app/search";
import { graphs } from "../app/graphs";

function executeUCS(
  adjList: { [key: string]: string[] },
  startNode: string,
  goalNode: string,
  _earlyStop: boolean, // genegeerd
  _loopBreaking: boolean, // genegeerd
  graphId: string = "tree"
): SearchStep[] {
  const steps: SearchStep[] = [];
  const visited = new Set<string>();
  const parent: Record<string, string> = {};
  const paths: Record<string, string[]> = { [startNode]: [startNode] };
  const costSoFar: Record<string, number> = { [startNode]: 0 };

  // frontier: priority queue gesorteerd op totale kost tot dusver
  const frontier: { node: string; path: string[]; cost: number }[] = [
    { node: startNode, path: [startNode], cost: 0 },
  ];

  const costMap = new Map<string, number>();
  for (const { from, to, cost } of graphs[graphId].costs ?? []) {
    costMap.set(`${from}->${to}`, cost);
    costMap.set(`${to}->${from}`, cost); // ongerichte grafen
  }

  function getCost(from: string, to: string): number {
    return costMap.get(`${from}->${to}`) ?? 1;
  }

  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(),
    frontier: [startNode],
    parent: { ...parent },
    pathQueue: [[startNode]],
    description: `Start UCS from ${startNode}`,
  });

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost); // prioriteit: laagste kost
    const { node: currentNode, path: currentPath, cost } = frontier.shift()!;

    steps.push({
      stepType: "take_from_frontier",
      currentNode,
      visited: new Set(visited),
      frontier: frontier.map((f) => f.node),
      parent: { ...parent },
      pathQueue: frontier.map((f) => f.path),
      takenNode: currentNode,
      exploredEdge:
        currentPath.length > 1
          ? {
              from: currentPath[currentPath.length - 2],
              to: currentNode,
            }
          : undefined,
      description: `Exploring ${currentNode} with path cost ${cost}`,
    });

    if (currentNode === goalNode) {
      steps.push({
        stepType: "goal_found",
        currentNode,
        visited: new Set(visited),
        frontier: [],
        parent: { ...parent },
        pathQueue: [],
        finalPath: currentPath,
        description: `Goal ${goalNode} found with cost ${cost}! Path: ${currentPath.join(
          " → "
        )}`,
      });
      return steps;
    }

    if (visited.has(currentNode)) continue;
    visited.add(currentNode);

    for (const neighbor of adjList[currentNode] || []) {
      const newCost = cost + getCost(currentNode, neighbor);
      if (!costSoFar[neighbor] || newCost < costSoFar[neighbor]) {
        costSoFar[neighbor] = newCost;
        parent[neighbor] = currentNode;
        const newPath = [...currentPath, neighbor];
        frontier.push({ node: neighbor, path: newPath, cost: newCost });
      }
    }

    steps.push({
      stepType: "add_to_frontier",
      currentNode,
      visited: new Set(visited),
      frontier: frontier.map((f) => f.node),
      parent: { ...parent },
      pathQueue: frontier.map((f) => f.path),
      addedNodes: (adjList[currentNode] || []).filter((n) => !visited.has(n)),
      description: `Added neighbors of ${currentNode} to frontier`,
    });
  }

  steps.push({
    stepType: "add_to_frontier",
    currentNode: "",
    visited: new Set(visited),
    frontier: [],
    parent: { ...parent },
    pathQueue: [],
    addedNodes: [],
    description: `No path to goal found`,
  });

  return steps;
}

export const UCS: Algorithm = {
  id: "ucs",
  name: "Uniform Cost Search",
  description: "Expands lowest-cost node first (Dijkstra)",
  execute: (adj, start, goal, _e, _l, graphId) =>
    executeUCS(adj, start, goal, false, false, graphId),
};
