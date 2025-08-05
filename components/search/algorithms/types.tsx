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
    goalNode: string
  ) => SearchStep[];
}
