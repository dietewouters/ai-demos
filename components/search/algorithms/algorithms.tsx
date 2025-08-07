import { BFS } from "../algorithms/bfs";
import { DFS } from "../algorithms/dfs";
import { IDD } from "../algorithms/id";
import { Greedy } from "../algorithms/greedy";
import { Beam } from "../algorithms/beam";
import { UCS } from "../algorithms/ucs";
import type { Algorithm } from "./types";

export const algorithms: Algorithm[] = [DFS, BFS, IDD, Greedy, Beam, UCS];

export const getAlgorithmById = (id: string): Algorithm | undefined => {
  return algorithms.find((algo) => algo.id === id);
};
