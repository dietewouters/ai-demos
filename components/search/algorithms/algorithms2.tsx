"use client";
import { BFS } from "./bfs";
import { DFS } from "./dfs";
import { IDD } from "./id";
import { Greedy } from "./greedy";
import { Beam } from "./beam";
import { UCS } from "./ucs";
import { AStar } from "./Aster";
import { IDAStar } from "./idastar";
import type { Algorithm } from "./types";

export const algorithms2: Algorithm[] = [
  DFS,
  BFS,
  IDD,
  Greedy,
  Beam,
  UCS,
  AStar,
  IDAStar,
];

export const getAlgorithmById = (id: string): Algorithm | undefined => {
  return algorithms2.find((algo) => algo.id === id);
};
