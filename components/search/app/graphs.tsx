"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw, Settings, ChevronRight } from "lucide-react";
import {
  algorithms,
  getAlgorithmById,
} from "@/components/search/algorithms/algorithms";
import type { SearchStep } from "./search";
import type { Graph } from "./search";

// Graph data structures
export const graphs: Record<string, Graph> = {
  tree: {
    name: "Problem 1: Breadth-First?",
    nodes: [
      { id: "S", x: 50, y: 150 },
      { id: "A", x: 50, y: 50 },
      { id: "B", x: 125, y: 50 },
      { id: "C", x: 200, y: 50 },
      { id: "D", x: 275, y: 50 },
      { id: "E", x: 165, y: 150 },
      { id: "F", x: 275, y: 150 },
      { id: "H", x: 275, y: 250 },
      { id: "I", x: 350, y: 250 },
      { id: "J", x: 425, y: 250 },
      { id: "K", x: 500, y: 250 },
      { id: "L", x: 390, y: 150 },
      { id: "G", x: 500, y: 150 },
    ],
    edges: [
      { from: "S", to: "A" },
      { from: "A", to: "B" },
      { from: "B", to: "C" },
      { from: "C", to: "D" },
      { from: "S", to: "E" },
      { from: "E", to: "F" },
      { from: "D", to: "F" },
      { from: "F", to: "H" },
      { from: "H", to: "I" },
      { from: "I", to: "J" },
      { from: "J", to: "K" },
      { from: "K", to: "G" },
      { from: "F", to: "L" },
      { from: "L", to: "G" },
    ],
    heuristics: {
      S: 18,
      A: 15,
      B: 12,
      C: 9,
      D: 5,
      E: 5,
      F: 3,
      G: 0,
      H: 4,
      I: 3,
      J: 2,
      K: 1,
      L: 1,
    },
    costs: [
      { from: "S", to: "A", cost: 9 },
      { from: "A", to: "B", cost: 3 },
      { from: "B", to: "C", cost: 4 },
      { from: "C", to: "D", cost: 6 },
      { from: "S", to: "E", cost: 5 },
      { from: "E", to: "F", cost: 2 },
      { from: "D", to: "F", cost: 1 },
      { from: "F", to: "H", cost: 3 },
      { from: "H", to: "I", cost: 3 },
      { from: "I", to: "J", cost: 1 },
      { from: "J", to: "K", cost: 3 },
      { from: "K", to: "G", cost: 2 },
      { from: "F", to: "L", cost: 1 },
      { from: "L", to: "G", cost: 1 },
    ],
  },
  network: {
    name: "Session 2: ex. 1.1",
    nodes: [
      { id: "S", x: 25, y: 150 },
      { id: "A", x: 150, y: 50 },
      { id: "B", x: 150, y: 150 },
      { id: "C", x: 150, y: 250 },
      { id: "E", x: 250, y: 100 },
      { id: "D", x: 250, y: 200 },
      { id: "F", x: 350, y: 150 },
      { id: "G", x: 450, y: 150 },
    ],
    edges: [
      { from: "S", to: "A" },
      { from: "S", to: "B" },
      { from: "S", to: "C" },
      { from: "A", to: "E" },
      { from: "B", to: "E" },
      { from: "B", to: "D" },
      { from: "C", to: "D" },
      { from: "E", to: "F" },
      { from: "D", to: "F" },
      { from: "F", to: "G" },
    ],
    heuristics: { S: 17, A: 10, B: 13, C: 4, D: 2, E: 4, F: 1, G: 0 },
    costs: [
      { from: "S", to: "A", cost: 6 },
      { from: "S", to: "B", cost: 5 },
      { from: "S", to: "C", cost: 10 },
      { from: "A", to: "E", cost: 6 },
      { from: "B", to: "E", cost: 6 },
      { from: "B", to: "D", cost: 7 },
      { from: "C", to: "D", cost: 6 },
      { from: "E", to: "F", cost: 4 },
      { from: "D", to: "F", cost: 6 },
      { from: "F", to: "G", cost: 3 },
    ],
  },
  ex2: {
    name: "Session 2: ex. 1.2",
    nodes: [
      { id: "S", x: 200, y: 50 },
      { id: "C", x: 50, y: 50 },
      { id: "A", x: 350, y: 50 },
      { id: "D", x: 350, y: 200 },
      { id: "B", x: 200, y: 200 },
      { id: "G", x: 50, y: 200 },
    ],
    edges: [
      { from: "S", to: "A" },
      { from: "S", to: "B" },
      { from: "S", to: "C" },
      { from: "A", to: "D" },
      { from: "D", to: "B" },
      { from: "B", to: "G" },
      { from: "C", to: "G" },
    ],
    heuristics: { S: 0, A: 0, B: 4, C: 3, D: 0, G: 0 },
    costs: [
      { from: "S", to: "A", cost: 10 },
      { from: "S", to: "B", cost: 8 },
      { from: "S", to: "C", cost: 9 },
      { from: "A", to: "D", cost: 1 },
      { from: "D", to: "B", cost: 4 },
      { from: "B", to: "G", cost: 5 },
      { from: "C", to: "G", cost: 5 },
    ],
  },
};

// Default start/goal nodes for each graph
export const defaultNodes: Record<string, { start: string; goal: string }> = {
  tree: { start: "S", goal: "G" },
  network: { start: "S", goal: "G" },
  ex2: { start: "S", goal: "G" },
};
