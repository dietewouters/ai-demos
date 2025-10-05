"use client";
import type { SearchStep } from "../app/search";
import type { Algorithm } from "../algorithms/types";
import { graphs } from "../app/graphs";

function executeIDAStar(
  adjList: { [key: string]: string[] },
  startNode: string,
  goalNode: string,
  earlyStop = false,
  loopBreaking = true,
  graphId: string = "tree"
): SearchStep[] {
  const steps: SearchStep[] = [];
  const heuristics = graphs[graphId]?.heuristics ?? {};
  const costs = new Map<string, number>();

  for (const { from, to, cost } of graphs[graphId]?.costs ?? []) {
    costs.set(`${from}->${to}`, cost);
    costs.set(`${to}->${from}`, cost);
  }

  const getCost = (from: string, to: string) =>
    costs.get(`${from}->${to}`) ?? 1;
  const heuristic = (node: string) => heuristics[node] ?? Infinity;

  let threshold = heuristic(startNode);
  let foundPath: string[] | null = null;
  let finalCost = 0;

  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(),
    frontier: [startNode],
    parent: {},
    pathQueue: [[startNode]],
    description: `Start IDA* from ${startNode} with initial threshold ${threshold}`,
    bound: threshold,
    fNew: Infinity,
  });

  const search = (
    node: string,
    path: string[],
    g: number,
    bound: number,
    minRef: { value: number }
  ): number => {
    const f = g + heuristic(node);
    steps.push({
      stepType: "take_from_frontier",
      currentNode: node,
      visited: new Set(path),
      frontier: [],
      parent: {},
      pathQueue: [path],
      takenNode: node,
      description: `Visiting ${node}, g: ${g}, h: ${heuristic(
        node
      )} --> f: ${f}. Bound = ${bound}`,
      bound,
      fNew: minRef.value,
    });

    if (f > bound) {
      if (f < minRef.value) {
        const oldFNew = minRef.value;
        minRef.value = f;
        steps.push({
          stepType: "add_to_frontier",
          currentNode: node,
          visited: new Set(path),
          frontier: [],
          parent: {},
          pathQueue: [path],
          addedNodes: [],
          description: `f(${node}) = ${f} > bound (${bound}) → f-new updated: was ${oldFNew}, now ${minRef.value}`,
          bound,
          fNew: minRef.value,
        });
      }
      return f;
    }

    if (node === goalNode) {
      foundPath = path;
      finalCost = g;
      return -1;
    }

    const neighbors = (adjList[node] || []).filter((n) => !path.includes(n));

    steps.push({
      stepType: "highlight_edges",
      currentNode: node,
      visited: new Set(path),
      frontier: [],
      parent: {},
      pathQueue: [path],
      highlightedEdges: neighbors.map((n) => ({ from: node, to: n })),
      description: `Exploring neighbors of ${node}: ${neighbors.join(", ")}`,
      bound,
      fNew: minRef.value,
    });

    for (const neighbor of neighbors) {
      const newG = g + getCost(node, neighbor);
      const t = search(neighbor, [...path, neighbor], newG, bound, minRef);
      if (t === -1) return -1;
    }

    return minRef.value;
  };

  while (!foundPath) {
    const minRef = { value: Infinity };
    const t = search(startNode, [startNode], 0, threshold, minRef);

    if (t === Infinity) {
      steps.push({
        stepType: "add_to_frontier",
        currentNode: "",
        visited: new Set(),
        frontier: [],
        parent: {},
        pathQueue: [],
        addedNodes: [],
        description: `No path to goal found`,
        bound: threshold,
        fNew: minRef.value,
      });
      break;
    }

    if (t === -1) {
      steps.push({
        stepType: "goal_found",
        currentNode: goalNode,
        visited: new Set(),
        frontier: [],
        parent: {},
        finalPath: foundPath!,
        pathQueue: [],
        description: `Goal ${goalNode} found! Path: ${foundPath!.join(
          " → "
        )} (Total cost: ${finalCost})`,
        bound: threshold,
        fNew: minRef.value,
      });
      break;
    }

    steps.push({
      stepType: "add_to_frontier",
      currentNode: "",
      visited: new Set(),
      frontier: [],
      parent: {},
      pathQueue: [],
      addedNodes: [],
      description: `f-bound increased from ${threshold} to ${minRef.value} (f-new)`,
      bound: threshold,
      fNew: minRef.value,
    });

    threshold = minRef.value;
  }

  return steps;
}

export const IDAStar: Algorithm = {
  id: "idastar",
  name: "IDA* Search",
  description: "Iterative Deepening A* Search",
  execute: (
    adjList,
    start,
    goal,
    earlyStop,
    usePathLoopBreaking,
    useClosedSet,
    graphId = "tree"
  ) =>
    executeIDAStar(
      adjList,
      start,
      goal,
      earlyStop,
      usePathLoopBreaking,
      graphId
    ),
};
