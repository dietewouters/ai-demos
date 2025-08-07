import { BFS } from "./bfs";
import { DFS } from "./dfs";
import { IDD } from "./id";
import { Greedy } from "./greedy";
import type { Algorithm } from "../app/search";

export const algorithms: Algorithm[] = [BFS, DFS, IDD, Greedy];

export const getAlgorithmById = (id: string): Algorithm | undefined => {
  return algorithms.find((algo) => algo.id === id);
};

export * from "./bfs";
