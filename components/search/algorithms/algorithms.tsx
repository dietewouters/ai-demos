import { BFS } from "../algorithms/bfs";
import { DFS } from "../algorithms/dfs";
import type { Algorithm } from "./types";

export const algorithms: Algorithm[] = [DFS, BFS];

export const getAlgorithmById = (id: string): Algorithm | undefined => {
  return algorithms.find((algo) => algo.id === id);
};
