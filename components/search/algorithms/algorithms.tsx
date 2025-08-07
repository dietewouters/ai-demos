import { BFS } from "../algorithms/bfs";
import { DFS } from "../algorithms/dfs";
import { IDD } from "../algorithms/id";
import { Greedy } from "../algorithms/greedy";
import { Beam } from "../algorithms/beam";
import type { Algorithm } from "./types";

export const algorithms: Algorithm[] = [DFS, BFS, IDD, Greedy, Beam];

export const getAlgorithmById = (id: string): Algorithm | undefined => {
  return algorithms.find((algo) => algo.id === id);
};
