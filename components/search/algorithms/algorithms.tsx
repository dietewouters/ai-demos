import { BFS } from "../algorithms/bfs";
import { DFS } from "../algorithms/dfs";
import { IDD } from "../algorithms/id";
import type { Algorithm } from "./types";

export const algorithms: Algorithm[] = [DFS, BFS, IDD];

export const getAlgorithmById = (id: string): Algorithm | undefined => {
  return algorithms.find((algo) => algo.id === id);
};
