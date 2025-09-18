"use client";

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import type { JSX } from "react/jsx-runtime";
import { M_PLUS_1 } from "next/font/google";

/**
 * Matches the interaction model of your DPLL visualization:
 * - The FULL tree is always rendered.
 * - In windowed mode: the camera auto-zooms onto the CURRENT BRANCH (others stay visible but dimmed).
 * - In fullscreen overlay: auto-fit the WHOLE tree.
 * - A floating toolbar (top-right) is ALWAYS available (even fullscreen): Zoom +/-, Fit, Focus, Reset,
 *   Fullscreen toggle, and Step Back/Forward.
 * - No per-step explanation text, only a step counter.
 */

interface TreeNode {
  id: string;
  value?: number;
  children?: TreeNode[];
  level: number;
  isMax?: boolean;
  x: number;
  y: number;
  alpha?: number;
  beta?: number;
  finalValue?: number;
  visited?: boolean;
  pruned?: boolean;
  currentlyEvaluating?: boolean;
  lastOp?: "≥" | "≤" | "=";
  lastUpdated?: boolean;
}

interface AlgorithmStep {
  nodeId: string;
  action: "visit" | "evaluate" | "prune" | "backtrack" | "cut"; // + "cut"
  alpha: number;
  beta: number;
  value?: number;
  explanation: string;
  childId?: string;
}

interface TreeExample {
  name: string;
  tree: TreeNode;
}

const EXAMPLE_TREES : { provided: TreeExample, difforder: TreeExample, extra1: TreeExample, extra2: TreeExample} = {
  provided: {
    name: "Exercise from exercise session",
    tree: {
      id: "root",
      level: 0,
      isMax: true,
      x: 0,
      y: 0,
      children: [
        {
          id: "a",
          level: 1,
          isMax: false,
          x: 0,
          y: 0,
          children: [
            {
              id: "a1",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "a1a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "a1a1", value: 4, level: 4, x: 0, y: 0 },
                    { id: "a1a2", value: 3, level: 4, x: 0, y: 0 },
                    { id: "a1a3", value: 5, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "a1b",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "a1b1", value: 2, level: 4, x: 0, y: 0 },
                    { id: "a1b2", value: 1, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
            {
              id: "a2",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "a2a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "a2a1", value: 4, level: 4, x: 0, y: 0 },
                    { id: "a2a2", value: 2, level: 4, x: 0, y: 0 },
                    { id: "a2a3", value: 3, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
            {
              id: "a3",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "a3a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "a3a1", value: 5, level: 4, x: 0, y: 0 },
                    { id: "a3a2", value: 4, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "a3b",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [{ id: "a3b1", value: 7, level: 4, x: 0, y: 0 }],
                },
                {
                  id: "a3c",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "a3c1", value: 3, level: 4, x: 0, y: 0 },
                    { id: "a3c2", value: 2, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: "b",
          level: 1,
          isMax: false,
          x: 0,
          y: 0,
          children: [
            {
              id: "b1",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "b1a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "b1a1", value: 1, level: 4, x: 0, y: 0 },
                    { id: "b1a2", value: 4, level: 4, x: 0, y: 0 },
                    { id: "b1a3", value: 0, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
            {
              id: "b2",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "b2a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "b2a1", value: 5, level: 4, x: 0, y: 0 },
                    { id: "b2a2", value: 3, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "b2b",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [{ id: "b2b1", value: 0, level: 4, x: 0, y: 0 }],
                },
              ],
            },
            {
              id: "b3",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "b3a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "b3a1", value: 2, level: 4, x: 0, y: 0 },
                    { id: "b3a2", value: 7, level: 4, x: 0, y: 0 },
                    { id: "b3a3", value: 4, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "b3b",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "b3b1", value: 3, level: 4, x: 0, y: 0 },
                    { id: "b3b2", value: 6, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "b3c",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "b3c1", value: 5, level: 4, x: 0, y: 0 },
                    { id: "b3c2", value: 3, level: 4, x: 0, y: 0 },
                    { id: "b3c3", value: 1, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  difforder: {
    name: "Best case",
    tree: {
      id: "root",
      level: 0,
      isMax: true,
      x: 0,
      y: 0,
      children: [
        {
          id: "a",
          level: 1,
          isMax: false,
          x: 0,
          y: 0,
          children: [
            {
              id: "a1",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "a11",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "a111", value: 2, level: 4, x: 0, y: 0 },
                    { id: "a112", value: 3, level: 4, x: 0, y: 0 },
                    { id: "a113", value: 4, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
            {
              id: "a2",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "a21",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "a211", value: 3, level: 4, x: 0, y: 0 },
                    { id: "a212", value: 4, level: 4, x: 0, y: 0 },
                    { id: "a213", value: 5, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "a22",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "a221", value: 1, level: 4, x: 0, y: 0 },
                    { id: "a222", value: 2, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
            {
              id: "a3",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "a31",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [{ id: "a311", value: 7, level: 4, x: 0, y: 0 }],
                },
                {
                  id: "a32",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "a321", value: 4, level: 4, x: 0, y: 0 },
                    { id: "a322", value: 5, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "a33",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "a331", value: 2, level: 4, x: 0, y: 0 },
                    { id: "a332", value: 3, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: "b",
          level: 1,
          isMax: false,
          x: 0,
          y: 0,
          children: [
            {
              id: "b1",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "b11",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "b111", value: 0, level: 4, x: 0, y: 0 },
                    { id: "b112", value: 1, level: 4, x: 0, y: 0 },
                    { id: "b113", value: 4, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
            {
              id: "b2",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "b21",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "b211", value: 3, level: 4, x: 0, y: 0 },
                    { id: "b212", value: 5, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "b22",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [{ id: "b221", value: 0, level: 4, x: 0, y: 0 }],
                },
              ],
            },
            {
              id: "b3",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "b31",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "b311", value: 3, level: 4, x: 0, y: 0 },
                    { id: "b312", value: 6, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "b32",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "b321", value: 2, level: 4, x: 0, y: 0 },
                    { id: "b322", value: 4, level: 4, x: 0, y: 0 },
                    { id: "b323", value: 7, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "b33",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "b331", value: 1, level: 4, x: 0, y: 0 },
                    { id: "b332", value: 3, level: 4, x: 0, y: 0 },
                    { id: "b333", value: 5, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },

  extra1: {
    name: "Extra exercise 1",
    tree: {
      id: "root",
      level: 0,
      isMax: true,
      x: 0,
      y: 0,
      children: [
        {
          id: "c",
          level: 1,
          isMax: false,
          x: 0,
          y: 0,
          children: [
            {
              id: "c1",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "c1a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "c1a1", value: 3, level: 4, x: 0, y: 0 },
                    { id: "c1a2", value: 6, level: 4, x: 0, y: 0 },
                    { id: "c1a3", value: 5, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "c1b",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "c1b1", value: 1, level: 4, x: 0, y: 0 },
                    { id: "c1b2", value: 4, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
            {
              id: "c2",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "c2a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "c2a1", value: 7, level: 4, x: 0, y: 0 },
                    { id: "c2a2", value: 2, level: 4, x: 0, y: 0 },
                    { id: "c2a3", value: 5, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "c2b",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "c2b1", value: 3, level: 4, x: 0, y: 0 },
                    { id: "c2b2", value: 0, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
            {
              id: "c3",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "c3a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [{ id: "c3a1", value: 8, level: 4, x: 0, y: 0 }],
                },
                {
                  id: "c3b",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "c3b1", value: 2, level: 4, x: 0, y: 0 },
                    { id: "c3b2", value: 6, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "c3c",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "c3c1", value: 1, level: 4, x: 0, y: 0 },
                    { id: "c3c2", value: 4, level: 4, x: 0, y: 0 },
                    { id: "c3c3", value: 3, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: "d",
          level: 1,
          isMax: false,
          x: 0,
          y: 0,
          children: [
            {
              id: "d1",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "d1a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "d1a1", value: 5, level: 4, x: 0, y: 0 },
                    { id: "d1a2", value: 2, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "d1b",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "d1b1", value: 6, level: 4, x: 0, y: 0 },
                    { id: "d1b2", value: 1, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
            {
              id: "d2",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "d2a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "d2a1", value: 7, level: 4, x: 0, y: 0 },
                    { id: "d2a2", value: 3, level: 4, x: 0, y: 0 },
                    { id: "d2a3", value: 4, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "d2b",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [{ id: "d2b1", value: 0, level: 4, x: 0, y: 0 }],
                },
              ],
            },
            {
              id: "d3",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "d3a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "d3a1", value: 3, level: 4, x: 0, y: 0 },
                    { id: "d3a2", value: 9, level: 4, x: 0, y: 0 },
                    { id: "d3a3", value: 4, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "d3b",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "d3b1", value: 5, level: 4, x: 0, y: 0 },
                    { id: "d3b2", value: 2, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "d3c",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "d3c1", value: 6, level: 4, x: 0, y: 0 },
                    { id: "d3c2", value: 1, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  extra2: {
    name: "Extra exercise 2",
    tree: {
      id: "root",
      level: 0,
      isMax: true,
      x: 0,
      y: 0,
      children: [
        {
          id: "x",
          level: 1,
          isMax: false,
          x: 0,
          y: 0,
          children: [
            {
              id: "x1",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "x1a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "x1a1", value: 4, level: 4, x: 0, y: 0 },
                    { id: "x1a2", value: 7, level: 4, x: 0, y: 0 },
                    { id: "x1a3", value: 2, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "x1b",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "x1b1", value: 5, level: 4, x: 0, y: 0 },
                    { id: "x1b2", value: 1, level: 4, x: 0, y: 0 },
                    { id: "x1b3", value: 6, level: 4, x: 0, y: 0 },
                    { id: "x1b4", value: 3, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "x1c",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "x1c1", value: 8, level: 4, x: 0, y: 0 },
                    { id: "x1c2", value: 2, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
            {
              id: "x2",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "x2a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "x2a1", value: 6, level: 4, x: 0, y: 0 },
                    { id: "x2a2", value: 4, level: 4, x: 0, y: 0 },
                    { id: "x2a3", value: 5, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "x2b",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "x2b1", value: 3, level: 4, x: 0, y: 0 },
                    { id: "x2b2", value: 1, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "x2c",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "x2c1", value: 7, level: 4, x: 0, y: 0 },
                    { id: "x2c2", value: 0, level: 4, x: 0, y: 0 },
                    { id: "x2c3", value: 2, level: 4, x: 0, y: 0 },
                    { id: "x2c4", value: 5, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
            {
              id: "x3",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "x3a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "x3a1", value: 9, level: 4, x: 0, y: 0 },
                    { id: "x3a2", value: 3, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "x3b",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [{ id: "x3b1", value: 4, level: 4, x: 0, y: 0 }],
                },
                {
                  id: "x3c",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "x3c1", value: 6, level: 4, x: 0, y: 0 },
                    { id: "x3c2", value: 2, level: 4, x: 0, y: 0 },
                    { id: "x3c3", value: 8, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: "y",
          level: 1,
          isMax: false,
          x: 0,
          y: 0,
          children: [
            {
              id: "y1",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "y1a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "y1a1", value: 2, level: 4, x: 0, y: 0 },
                    { id: "y1a2", value: 5, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "y1b",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "y1b1", value: 7, level: 4, x: 0, y: 0 },
                    { id: "y1b2", value: 1, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
            {
              id: "y2",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "y2a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "y2a1", value: 4, level: 4, x: 0, y: 0 },
                    { id: "y2a2", value: 6, level: 4, x: 0, y: 0 },
                    { id: "y2a3", value: 3, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "y2b",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "y2b1", value: 2, level: 4, x: 0, y: 0 },
                    { id: "y2b2", value: 5, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
            {
              id: "y3",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "y3a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "y3a1", value: 8, level: 4, x: 0, y: 0 },
                    { id: "y3a2", value: 0, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: "z",
          level: 1,
          isMax: false,
          x: 0,
          y: 0,
          children: [
            {
              id: "z1",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "z1a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "z1a1", value: 3, level: 4, x: 0, y: 0 },
                    { id: "z1a2", value: 9, level: 4, x: 0, y: 0 },
                    { id: "z1a3", value: 1, level: 4, x: 0, y: 0 },
                  ],
                },
                {
                  id: "z1b",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "z1b1", value: 6, level: 4, x: 0, y: 0 },
                    { id: "z1b2", value: 2, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
            {
              id: "z2",
              level: 2,
              isMax: true,
              x: 0,
              y: 0,
              children: [
                {
                  id: "z2a",
                  level: 3,
                  isMax: false,
                  x: 0,
                  y: 0,
                  children: [
                    { id: "z2a1", value: 5, level: 4, x: 0, y: 0 },
                    { id: "z2a2", value: 7, level: 4, x: 0, y: 0 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
};

type CameraPref = "auto" | "focus" | "full";

export default function MinimaxDemo() {
  const [selectedTree, setSelectedTree] =
    useState<keyof typeof EXAMPLE_TREES>("provided");
  const [alphaBetaPruning, setAlphaBetaPruning] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);

  // UI prefs
  const [cameraPref, setCameraPref] = useState<CameraPref>("auto");
  const [showLabels, setShowLabels] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [followSteps, setFollowSteps] = useState(true);

  // container
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ w: 900, h: 560 });
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      setViewport({ w: cr.width, h: cr.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ========== Layout in WORLD coordinates ==========
  const NODE_SIZE = 80;
  const LABEL_GAP = 18;
  const LEVEL_H = 130;
  const MIN_SPACING = 110;

  const layoutTree = useCallback((node: TreeNode): TreeNode => {
    const subtreeW = (n: TreeNode): number => {
      if (!n.children || n.children.length === 0) return MIN_SPACING;
      return Math.max(
        MIN_SPACING,
        n.children.reduce((s, c) => s + subtreeW(c), 0)
      );
    };

    const assign = (n: TreeNode, x: number, y: number): TreeNode => {
      const mapped: TreeNode = { ...n, x, y };
      if (n.children && n.children.length > 0) {
        const totalW = n.children.reduce((s, c) => s + subtreeW(c), 0);
        let cx = x - totalW / 2;
        mapped.children = n.children.map((c) => {
          const w = subtreeW(c);
          const childX = cx + w / 2;
          const childY = y + LEVEL_H;
          cx += w;
          return assign(c, childX, childY);
        });
      }
      return mapped;
    };

    return assign(node, 0, 0);
  }, []);

  const boundsOf = useCallback(
    (node: TreeNode, filter?: (n: TreeNode) => boolean) => {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      const trav = (n: TreeNode) => {
        if (!filter || filter(n)) {
          minX = Math.min(minX, n.x);
          minY = Math.min(minY, n.y);
          maxX = Math.max(maxX, n.x);
          maxY = Math.max(maxY, n.y);
        }
        n.children?.forEach(trav);
      };
      trav(node);
      return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
      };
    },
    []
  );

  const normalize = useCallback(
    (node: TreeNode, minX: number, minY: number): TreeNode => ({
      ...node,
      x: node.x - minX,
      y: node.y - minY,
      children: node.children?.map((c) => normalize(c, minX, minY)),
    }),
    []
  );

  const worldLayout = useMemo(
    () => layoutTree(EXAMPLE_TREES[selectedTree].tree),
    [layoutTree, selectedTree]
  );
  const rawBounds = useMemo(
    () => boundsOf(worldLayout),
    [boundsOf, worldLayout]
  );
  const world = useMemo(
    () => normalize(worldLayout, rawBounds.minX, rawBounds.minY),
    [worldLayout, rawBounds, normalize]
  );
  const worldBounds = useMemo(
    () => ({ width: rawBounds.width, height: rawBounds.height }),
    [rawBounds]
  );
  // id -> node (van de huidige visualTree)
  const nodeIndex = useCallback((root: TreeNode) => {
    const m = new Map<string, TreeNode>();
    const dfs = (n: TreeNode) => {
      m.set(n.id, n);
      n.children?.forEach(dfs);
    };
    dfs(root);
    return m;
  }, []);

  const parentMap = useMemo(() => {
    const p = new Map<string, string>(); // childId -> parentId
    const walk = (n: TreeNode) => {
      n.children?.forEach((c) => {
        p.set(c.id, n.id);
        walk(c);
      });
    };
    walk(world);
    return p;
  }, [world]);
  const cutStepsActive = useMemo(() => {
    const s = steps[currentStep];
    return s && s.action === "cut" ? [s] : [];
  }, [steps, currentStep]);

  // ===== Algorithm steps (no explanation strings) =====
  const generateSteps = useCallback(
    (rootNode: TreeNode, useAlphaBeta: boolean): AlgorithmStep[] => {
      const steps: AlgorithmStep[] = [];
      const minimax = (
        node: TreeNode,
        _d: number,
        isMax: boolean,
        aIn: number,
        bIn: number
      ): number => {
        let a = aIn,
          b = bIn;
        steps.push({
          nodeId: node.id,
          action: "visit",
          alpha: a,
          beta: b,
          explanation: "",
        });
        if (node.value !== undefined) {
          steps.push({
            nodeId: node.id,
            action: "evaluate",
            alpha: a,
            beta: b,
            value: node.value,
            explanation: "",
          });
          return node.value;
        }
        let best = isMax ? -Infinity : Infinity;
        for (let i = 0; i < (node.children?.length ?? 0); i++) {
          const child = node.children![i];
          const v = minimax(child, _d + 1, !isMax, a, b);

          if (isMax) {
            best = Math.max(best, v);
            if (useAlphaBeta) a = Math.max(a, best);
          } else {
            best = Math.min(best, v);
            if (useAlphaBeta) b = Math.min(b, best);
          }

          // Laat een backtrack-stap achter met a/b + lokale best
          steps.push({
            nodeId: node.id,
            action: "backtrack",
            alpha: useAlphaBeta ? a : -Infinity,
            beta: useAlphaBeta ? b : Infinity,
            value: best,
            explanation: "",
          });

          // === CUTOFF? ===
          if (useAlphaBeta && b <= a) {
            steps.push({
              nodeId: node.id,
              action: "cut",
              alpha: a,
              beta: b,
              childId: child.id,
              explanation: "",
            });

            for (let j = i + 1; j < (node.children?.length ?? 0); j++) {
              steps.push({
                nodeId: node.children![j].id,
                action: "prune",
                alpha: a,
                beta: b,
                explanation: "",
              });
            }
            break;
          }
        }

        return best;
      };
      minimax(rootNode, 0, true, -Infinity, Infinity);
      return steps;
    },
    []
  );

  // formatteer grenzen
  const fmtBound = (v?: number) =>
    v === undefined
      ? "?"
      : v === Infinity
      ? "∞"
      : v === -Infinity
      ? "-∞"
      : String(v);

  // alle nakomelingen als 'pruned' markeren
  const markPrunedSubtree = (n: TreeNode): TreeNode => ({
    ...n,
    pruned: true,
    children: n.children?.map(markPrunedSubtree),
  });

  const updateTreeVisualization = useCallback(
    (node: TreeNode, step: AlgorithmStep): TreeNode => {
      const apply = (n: TreeNode): TreeNode => {
        // 1) Prune ⇒ hele subtree rood markeren
        if (step.action === "prune" && n.id === step.nodeId) {
          const mark = (t: TreeNode): TreeNode => ({
            ...t,
            pruned: true,
            children: t.children?.map(mark),
          });
          return mark({ ...n, visited: true, currentlyEvaluating: false });
        }

        // 2) Visit ⇒ alleen highlighten; GEEN α/β invullen (zodat er "?" staat)
        if (step.action === "visit" && n.id === step.nodeId) {
          return {
            ...n,
            visited: true,
            currentlyEvaluating: true,
            lastUpdated: false,
            children: n.children?.map(apply),
          };
        }

        if (
          (step.action === "evaluate" || step.action === "backtrack") &&
          n.id === step.nodeId
        ) {
          const isMax = n.isMax === true;
          const singleChild = (n.children?.length ?? 0) === 1;

          if (isMax) {
            const prev = n.beta; // vorige best voor MAX
            const isFirst = prev === undefined;
            const next = step.value ?? prev ?? -Infinity;

            const op = singleChild
              ? "="
              : isFirst
              ? "≥"
              : next > (prev as number)
              ? "≥"
              : "=";

            return {
              ...n,
              beta: next,
              alpha: undefined,
              lastOp: op,
              lastUpdated: true,
              finalValue: step.value ?? n.finalValue,
              visited: true,
              currentlyEvaluating: false,
              children: n.children?.map(apply),
            };
          } else {
            const prev = n.alpha; // vorige best voor MIN
            const isFirst = prev === undefined;
            const next = step.value ?? prev ?? Infinity;

            const op = singleChild
              ? "="
              : isFirst
              ? "≤"
              : next < (prev as number)
              ? "≤"
              : "=";

            return {
              ...n,
              alpha: next,
              beta: undefined,
              lastOp: op,
              lastUpdated: true,
              finalValue: step.value ?? n.finalValue,
              visited: true,
              currentlyEvaluating: false,
              children: n.children?.map(apply),
            };
          }
        }

        // 4) Cut ⇒ alleen state laten doorlopen; pijl tekenen doen we apart
        if (step.action === "cut") {
          return { ...n, children: n.children?.map(apply) };
        }

        // default
        return { ...n, children: n.children?.map(apply) };
      };
      return apply(node);
    },
    []
  );
  // ---- NA updateTreeVisualization PLAKKEN ----
  const buildCumulativeTreeState = useCallback(
    (base: TreeNode, upTo: number): TreeNode => {
      // Pas alle stappen t/m 'upTo' toe op een kopie van de basisboom
      let cur = base;
      for (let i = 0; i <= upTo && i < steps.length; i++) {
        cur = updateTreeVisualization(cur, steps[i]);
      }
      return cur;
    },
    [steps, updateTreeVisualization]
  );

  const resetTree = useCallback(() => {
    const resetNode = (n: TreeNode): TreeNode => ({
      ...n,
      alpha: undefined,
      beta: undefined,
      finalValue: undefined,
      visited: false,
      pruned: false,
      currentlyEvaluating: false,
      children: n.children?.map(resetNode),
    });
    const laid = layoutTree(EXAMPLE_TREES[selectedTree].tree);
    setCurrentStep(0);
    setFollowSteps(true);
    setSteps(generateSteps(EXAMPLE_TREES[selectedTree].tree, alphaBetaPruning));
  }, [layoutTree, selectedTree, alphaBetaPruning, generateSteps]);

  useEffect(() => {
    resetTree();
  }, [selectedTree, alphaBetaPruning, resetTree]);

  const stepForward = useCallback(
    () => setCurrentStep((s) => Math.min(steps.length - 1, s + 1)),
    [steps.length]
  );
  const stepBack = useCallback(
    () => setCurrentStep((s) => Math.max(0, s - 1)),
    []
  );

  // ===== Path & dimming =====
  const currentNodeId = steps[currentStep]?.nodeId ?? "root";
  const pathIds = useMemo(() => {
    const ids: string[] = [];
    const dfs = (n: TreeNode): boolean => {
      if (n.id === currentNodeId) {
        ids.push(n.id);
        return true;
      }
      for (const c of n.children ?? []) {
        if (dfs(c)) {
          ids.push(n.id);
          return true;
        }
      }
      return false;
    };
    dfs(world);
    return new Set(ids.reverse());
  }, [world, currentNodeId]);

  const dimNonPath = useMemo(() => {
    if (cameraPref === "full") return false;
    if (cameraPref === "focus") return true;
    return !fullscreen; // auto: focus in windowed, full in fullscreen
  }, [cameraPref, fullscreen]);

  // ===== Camera (pan/zoom) =====
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [panning, setPanning] = useState(false);
  const panStart = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
  } | null>(null);

  const startPan = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    panStart.current = { x: e.clientX, y: e.clientY, tx, ty };
    setPanning(true);
    setFollowSteps(false);
  };
  const onMove = (e: React.MouseEvent) => {
    if (!panning || !panStart.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setTx(panStart.current.tx + dx);
    setTy(panStart.current.ty + dy);
  };
  const endPan = () => {
    setPanning(false);
    panStart.current = null;
  };

  const zoomBy = (k: number) => {
    setScale((s) => Math.min(2, Math.max(0.2, s * k)));
    setFollowSteps(false);
  };

  const setCameraToBounds = (bounds: {
    width: number;
    height: number;
    minX?: number;
    minY?: number;
    maxX?: number;
    maxY?: number;
  }) => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth - 24;
    const ch = el.clientHeight - 24;
    const sx = cw / Math.max(bounds.width, 1);
    const sy = ch / Math.max(bounds.height, 1);
    const s = Math.min(1, Math.max(0.2, Math.min(sx, sy)));
    setScale(s);
    setTx((cw - bounds.width * s) / 2 - (bounds.minX ?? 0) * s);
    setTy((ch - bounds.height * s) / 2 - (bounds.minY ?? 0) * s);
  };
  // Zoek de dichtste voorouder die MAX (wantIsMax=true) of MIN (wantIsMax=false) is
  function findNearestAncestorOfType(
    nodeId: string,
    wantIsMax: boolean,
    idx: Map<string, TreeNode>,
    parentMap: Map<string, string>
  ): TreeNode | undefined {
    let cur = nodeId;
    while (true) {
      const pid = parentMap.get(cur);
      if (!pid) return undefined;
      const p = idx.get(pid);
      if (!p) return undefined;
      if (!!p.isMax === wantIsMax) return p;
      cur = pid;
    }
  }

  const focusBounds = useMemo(() => {
    const b = boundsOf(world, (n) => pathIds.has(n.id));
    const pad = 60;
    return {
      width: Math.max(1, b.width + 2 * pad),
      height: Math.max(1, b.height + 2 * pad),
      minX: Math.max(0, b.minX - pad),
      minY: Math.max(0, b.minY - pad),
    };
  }, [boundsOf, world, pathIds]);

  // Auto-camera
  useLayoutEffect(() => {
    if (!followSteps) return;

    if (fullscreen) {
      setCameraToBounds({
        width: worldBounds.width,
        height: worldBounds.height,
        minX: 0,
        minY: 0,
      });
      return;
    }

    if (cameraPref === "full")
      setCameraToBounds({
        width: worldBounds.width,
        height: worldBounds.height,
        minX: 0,
        minY: 0,
      });
    else setCameraToBounds(focusBounds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fullscreen,
    currentStep,
    worldBounds.width,
    worldBounds.height,
    focusBounds.width,
    focusBounds.height,
    cameraPref,
    followSteps,
  ]);

  // ===== Helpers =====
  const fmt = (v?: number) =>
    v === undefined
      ? "?"
      : v === Infinity
      ? "∞"
      : v === -Infinity
      ? "-∞"
      : String(v);

  // ===== Rendering helpers =====
  const renderConnections = (node: TreeNode): JSX.Element[] => {
    const edges: JSX.Element[] = [];
    node.children?.forEach((child) => {
      const faded =
        dimNonPath && !(pathIds.has(node.id) && pathIds.has(child.id));
      edges.push(
        <line
          key={`${node.id}-${child.id}`}
          x1={node.x}
          y1={node.y}
          x2={child.x}
          y2={child.y}
          stroke="#9CA3AF"
          strokeWidth={1.8}
          opacity={faded ? 0.28 : 1}
        />
      );
      edges.push(...renderConnections(child));
    });
    return edges;
  };
  // Is de chip voor dit type ingevuld? (geen ?, geen ±∞)
  function hasFilledChipForType(n: TreeNode, isMaxType: boolean): boolean {
    const v = isMaxType ? n.beta : n.alpha;
    return typeof v === "number" && Number.isFinite(v);
  }

  // Zoek de DICHTSTBIJZIJNDE voorouder van een bepaald type
  // die OOK een ingevulde chip heeft.
  function findNearestFilledAncestorOfType(
    nodeId: string,
    wantIsMax: boolean,
    idx: Map<string, TreeNode>,
    parentMap: Map<string, string>
  ): TreeNode | undefined {
    let cur = nodeId;
    while (true) {
      const pid = parentMap.get(cur);
      if (!pid) return undefined;
      const p = idx.get(pid);
      if (!p) return undefined;
      if (!!p.isMax === wantIsMax && hasFilledChipForType(p, wantIsMax)) {
        return p;
      }
      cur = pid;
    }
  }

  // Ankerpunt waar de α/β-chip staat (zelfde offsets als in renderNode)
  function chipAnchor(n: TreeNode): { x: number; y: number } {
    // als het een blad is, geen chip → anker = centrum
    const isLeaf = (n.children?.length ?? 0) === 0 || n.value !== undefined;
    if (isLeaf || typeof n.isMax !== "boolean") return { x: n.x, y: n.y };

    const chipX = n.isMax
      ? n.x + NODE_SIZE / 2 + 6 + 18 /*chip breedte/2*/
      : n.x - NODE_SIZE / 2 - 42 + 18;
    const chipY = n.y - 10 + 8; /*ongeveer midden van het chip-rect*/
    return { x: chipX, y: chipY };
  }

  const renderNode = (node: TreeNode): JSX.Element => {
    const faded = dimNonPath && !pathIds.has(node.id);

    const isLeaf =
      (node.children?.length ?? 0) === 0 || node.value !== undefined;

    let textInside: string;
    if (!alphaBetaPruning) {
      // ZONDER α-β: toon de (tussen)minimax-waarde zodra die er is
      if (isLeaf) {
        textInside =
          node.value !== undefined
            ? String(node.value)
            : node.finalValue !== undefined
            ? String(node.finalValue)
            : "?";
      } else {
        textInside =
          node.finalValue !== undefined ? String(node.finalValue) : "?";
      }
    } else {
      // MET α-β: toon de α/β-chip-inhoud in de knoop
      if (isLeaf) {
        textInside = node.value !== undefined ? String(node.value) : "?";
      } else {
        textInside = node.isMax
          ? `β:${fmt(node.beta)}`
          : `α:${fmt(node.alpha)}`;
      }
    }

    // Doosje zoals in je slide (naast de knoop)
    const showChip =
      !isLeaf &&
      alphaBetaPruning &&
      (node.isMax ? node.beta !== undefined : node.alpha !== undefined) &&
      node.visited;

    const chipText = node.isMax
      ? `${node.lastOp ?? ""}${fmtBound(node.beta)}`
      : `${node.lastOp ?? ""}${fmtBound(node.alpha)}`;

    const chipClass =
      (node.isMax
        ? "bg-red-50 border-red-500 text-red-700"
        : "bg-green-50 border-green-600 text-green-700") +
      " px-1.5 py-0.5 rounded-sm border text-[17px] font-semibold shadow-sm";
    const isActive = node.id === currentNodeId;
    const nodeClass = `
      absolute rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-all duration-300
      ${
        node.visited ? "border-gray-400 bg-white" : "border-gray-300 bg-gray-50"
      }
      ${isActive ? "ring-4 ring-orange-300 bg-orange-50" : ""}
      ${node.pruned ? "border-red-400 bg-red-50 opacity-60" : ""}
      ${faded ? "opacity-30" : ""}
    `;

    return (
      <div key={node.id}>
        {/* knoop */}
        <div
          className={nodeClass}
          style={{
            left: node.x - NODE_SIZE / 2,
            top: node.y - NODE_SIZE / 2,
            width: NODE_SIZE,
            height: NODE_SIZE,
          }}
        >
          <div className="text-center">
            <div className="text-xl font-bold text-gray-800">{textInside}</div>
          </div>
        </div>

        {/* rood 'X' over geprunde knopen */}
        {node.pruned && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: node.x - NODE_SIZE / 2,
              top: node.y - NODE_SIZE / 2,
              width: NODE_SIZE,
              height: NODE_SIZE,
            }}
          >
            <svg width={NODE_SIZE} height={NODE_SIZE}>
              <line
                x1="8"
                y1="8"
                x2={NODE_SIZE - 8}
                y2={NODE_SIZE - 8}
                stroke="#ef4444"
                strokeWidth="3"
              />
              <line
                x1={NODE_SIZE - 8}
                y1="8"
                x2="8"
                y2={NODE_SIZE - 8}
                stroke="#ef4444"
                strokeWidth="3"
              />
            </svg>
          </div>
        )}

        {/* label MAX/MIN boven de knoop */}
        {showLabels && !isLeaf && typeof node.isMax === "boolean" && (
          <div
            className={`absolute text-xs font-medium ${
              faded ? "text-gray-400" : "text-gray-600"
            }`}
            style={{
              left: node.x - 20,
              top: node.y - (NODE_SIZE / 2 + LABEL_GAP),
            }}
          >
            {node.isMax ? "MAX" : "MIN"}
          </div>
        )}

        {/* α/β update-chip met ≥/≤/= naast de knoop (zoals op je slide) */}
        {showChip && (
          <div
            className={`absolute ${chipClass} ${
              node.lastUpdated ? "ring-2 ring-offset-1 ring-current/30" : ""
            }`}
            style={{
              left: node.isMax
                ? node.x + NODE_SIZE / 2 + 6 // rechts van MAX
                : node.x - NODE_SIZE / 2 - 42, // links van MIN
              top: node.y - 10,
              opacity: faded ? 0.35 : 1,
            }}
          >
            {chipText}
          </div>
        )}

        {/* kinderen */}
        {node.children?.map((c) => renderNode(c))}
      </div>
    );
  };

  const visualTree = useMemo(
    () =>
      steps.length > 0 ? buildCumulativeTreeState(world, currentStep) : world,
    [world, steps.length, buildCumulativeTreeState, currentStep]
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Control Panel */}

          {!fullscreen && (
            <Card className="lg:col-span-1 bg-white border-gray-200 h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Controls
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Tree select */}
                <div className="space-y-1">
                  <Label
                    htmlFor="tree-select"
                    className="text-sm font-medium text-gray-700"
                  >
                    Choose Exercise{" "}
                  </Label>
                  <Select
                    value={selectedTree}
                    onValueChange={(v: keyof typeof EXAMPLE_TREES) =>
                      setSelectedTree(v)
                    }
                  >
                    <SelectTrigger id="tree-select" className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXAMPLE_TREES).map(([key, t]) => (
                        <SelectItem key={key} value={key}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Alpha-Beta switch */}
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700">
                    Alpha-Beta Pruning
                  </Label>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="alpha-beta"
                        checked={alphaBetaPruning}
                        onCheckedChange={setAlphaBetaPruning}
                      />
                      <Label
                        htmlFor="alpha-beta"
                        className="text-sm text-gray-600 select-none"
                      >
                        {alphaBetaPruning ? "On" : "Off"}
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Step & reset buttons */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={stepBack}
                      variant="outline"
                      size="sm"
                      disabled={currentStep === 0}
                      className="w-full"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Step Back
                    </Button>

                    <Button
                      onClick={stepForward}
                      variant="default"
                      size="sm"
                      disabled={currentStep >= steps.length - 1}
                      className="w-full"
                    >
                      Next Step
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>

                  <Button
                    onClick={resetTree}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Visualization Stage */}
          <div className={fullscreen ? "lg:col-span-4" : "lg:col-span-3"}>
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-gray-900">
                  Tree Exploration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  ref={containerRef}
                  className={
                    fullscreen
                      ? "fixed inset-0 z-50 bg-background"
                      : "relative w-full h-[560px] overflow-hidden rounded-md border"
                  }
                >
                  {/* Floating toolbar (always visible) */}
                  <div className="absolute top-2 right-2 z-20 flex flex-wrap gap-1">
                    <button
                      onClick={() => zoomBy(1.1)}
                      className="px-2 py-1 rounded border bg-white text-xs"
                    >
                      ＋
                    </button>
                    <button
                      onClick={() => zoomBy(1 / 1.1)}
                      className="px-2 py-1 rounded border bg-white text-xs"
                    >
                      －
                    </button>
                    <button
                      onClick={() => {
                        setFollowSteps(true);
                        setCameraToBounds({
                          width: worldBounds.width,
                          height: worldBounds.height,
                          minX: 0,
                          minY: 0,
                        });
                      }}
                      className="px-2 py-1 rounded border bg-white text-xs"
                    >
                      Fit
                    </button>
                    <button
                      onClick={() => {
                        setFollowSteps(true);
                        setCameraToBounds(focusBounds);
                      }}
                      className="px-2 py-1 rounded border bg-white text-xs"
                    >
                      Focus
                    </button>

                    {!fullscreen ? (
                      <button
                        onClick={() => setFullscreen(true)}
                        className="px-2 py-1 rounded border bg-white text-xs"
                      >
                        Fullscreen
                      </button>
                    ) : (
                      <button
                        onClick={() => setFullscreen(false)}
                        className="px-2 py-1 rounded border bg-white text-xs"
                      >
                        Back to controls
                      </button>
                    )}
                    {/* Step controls */}
                    <button
                      onClick={stepBack}
                      disabled={currentStep === 0}
                      className="px-2 py-1 rounded border bg-white text-xs disabled:opacity-40"
                    >
                      ◀︎ Step
                    </button>
                    <button
                      onClick={stepForward}
                      disabled={currentStep >= steps.length - 1}
                      className="px-2 py-1 rounded border bg-white text-xs disabled:opacity-40"
                    >
                      Step ▶︎
                    </button>
                  </div>

                  {/* World layer */}
                  <div
                    className="absolute inset-0 cursor-grab active:cursor-grabbing"
                    onMouseDown={startPan}
                    onMouseMove={onMove}
                    onMouseUp={endPan}
                    onMouseLeave={endPan}
                    style={{
                      transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                      transformOrigin: "0 0",
                    }}
                  >
                    <svg
                      width={worldBounds.width}
                      height={worldBounds.height}
                      className="absolute top-0 left-0"
                    >
                      {renderConnections(visualTree)}
                    </svg>
                    {/* pijlen voor cutoff: tussen ingevulde β-voorouder ↔ α op cut-knoop (of α-voorouder ↔ β) */}
                    <svg
                      width={worldBounds.width}
                      height={worldBounds.height}
                      className="absolute top-0 left-0 pointer-events-none"
                    >
                      <defs>
                        <marker
                          id="arrow-red"
                          markerWidth="10"
                          markerHeight="10"
                          refX="8"
                          refY="5"
                          orient="auto"
                        >
                          <path d="M0,0 L10,5 L0,10 z" fill="#ef4444" />
                        </marker>
                      </defs>

                      {(() => {
                        const idx = nodeIndex(visualTree);
                        return cutStepsActive.map((s, i) => {
                          const cutNode = idx.get(s.nodeId); // knoop waar b ≤ a werd gedetecteerd
                          if (!cutNode) return null;

                          const ancestor = cutNode.isMax
                            ? findNearestFilledAncestorOfType(
                                cutNode.id,
                                false,
                                idx,
                                parentMap
                              ) // MIN-voorouder met ingevulde α
                            : findNearestFilledAncestorOfType(
                                cutNode.id,
                                true,
                                idx,
                                parentMap
                              ); // MAX-voorouder met ingevulde β

                          if (!ancestor) return null; // geen ingevulde voorouder → geen pijl

                          const A = chipAnchor(ancestor); // startpunt op chip van voorouder
                          const B = chipAnchor(cutNode); // eindpunt op chip van cut-knoop

                          // kort, middenstuk van de lijn (zoals op je slide)
                          const dx = B.x - A.x,
                            dy = B.y - A.y;
                          const x1 = A.x + dx * 0.25,
                            y1 = A.y + dy * 0.25;
                          const x2 = A.x + dx * 0.75,
                            y2 = A.y + dy * 0.75;

                          const label = ancestor.isMax ? "β≥α" : "α≤β";
                          const mx = (x1 + x2) / 2,
                            my = (y1 + y2) / 2;
                          const fs = 16; // lettergrootte
                          const boxW = fs * 2.6; // breedte labelbox (≈ voor "β≥α")
                          const boxH = fs * 1.4;
                          return (
                            <g key={i} opacity={0.95}>
                              <line
                                x1={x1}
                                y1={y1}
                                x2={x2}
                                y2={y2}
                                stroke="#ef4444"
                                strokeWidth={2.5}
                                strokeDasharray="6 4"
                                markerEnd="url(#arrow-red)"
                              />

                              <rect
                                x={mx - boxW / 2}
                                y={my - boxH / 2}
                                rx={4}
                                ry={4}
                                width={boxW}
                                height={boxH}
                                fill="white"
                                stroke="#ef4444"
                              />

                              <text
                                x={mx}
                                y={my + fs * 0.35} // optische centrering
                                textAnchor="middle"
                                fontSize={fs}
                                fill="#b91c1c"
                                fontWeight={700}
                              >
                                {label}
                              </text>
                            </g>
                          );
                        });
                      })()}
                    </svg>

                    {renderNode(visualTree)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
