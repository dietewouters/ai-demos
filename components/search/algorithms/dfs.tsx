"use client";
import type { SearchStep } from "../app/search";
import type { Algorithm } from "../algorithms/types";

const parseCoords = (id: string): [number, number] => {
  const [xStr, yStr] = id.split("_");
  return [parseInt(xStr, 10), parseInt(yStr, 10)];
};

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

  steps.push({
    stepType: "start",
    currentNode: startNode,
    visited: new Set(),
    frontier: [startNode],
    parent: {},
    pathQueue: [[startNode]],
    description: ``,
  });

  while (frontier.length > 0 && stepCounter < MAX_STEPS) {
    stepCounter++;
    const currentNode = frontier.pop()!;
    if (loopBreaking && visited.has(currentNode)) continue;

    if (!paths[currentNode]) paths[currentNode] = [currentNode];
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

    // --- NEW: sort neighbors by up, right, left, down ---
    const [cx, cy] = parseCoords(currentNode);
    const directionOrder = (a: string, b: string) => {
      const [ax, ay] = parseCoords(a);
      const [bx, by] = parseCoords(b);

      const dirScore = (x: number, y: number) => {
        if (y < cy && x === cx) return 0; // up
        if (x > cx && y === cy) return 1; // right
        if (x < cx && y === cy) return 2; // left
        if (y > cy && x === cx) return 3; // down
        return 4; // others (diagonal etc.)
      };

      return dirScore(ax, ay) - dirScore(bx, by);
    };

    const neighbors = (adjList[currentNode] || []).sort(directionOrder);
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
        if (!paths[currentNode]) paths[currentNode] = [currentNode];
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
  description: "",
  execute: executeDFS,
};
