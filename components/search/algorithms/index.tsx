import { BFS } from "./bfs";
import { DFS } from "./dfs";
import type { Algorithm } from "./bfs";

export const algorithms: Algorithm[] = [BFS, DFS];

export const getAlgorithmById = (id: string): Algorithm | undefined => {
  return algorithms.find((algo) => algo.id === id);
};

export * from "./bfs";
