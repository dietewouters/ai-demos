import { BFS } from "./bfs";
import { DFS } from "./dfs";
import { IDD } from "./id";
import type { Algorithm } from "../app/search";

export const algorithms: Algorithm[] = [BFS, DFS, IDD];

export const getAlgorithmById = (id: string): Algorithm | undefined => {
  return algorithms.find((algo) => algo.id === id);
};

export * from "./bfs";
