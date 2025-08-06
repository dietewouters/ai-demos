export interface SearchStep {
  stepType:
    | "start"
    | "highlight_edges"
    | "add_to_frontier"
    | "take_from_frontier"
    | "goal_found"
    | "error";
  currentNode: string;
  visited: Set<string>;
  frontier: string[];
  parent: { [key: string]: string };
  pathQueue: string[][]; // Queue of all paths in frontier
  highlightedEdges?: { from: string; to: string }[];
  addedNodes?: string[];
  takenNode?: string;
  exploredEdge?: { from: string; to: string };
  finalPath?: string[];
  description: string;
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

export interface GraphNode {
  id: string;
  x: number;
  y: number;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface Graph {
  name: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
