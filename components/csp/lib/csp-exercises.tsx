import { type CSP } from "./csp-types";

export const EXERCISES: CSP[] = [
  {
    id: "4houses",
    name: "4 houses problem",
    variables: ["A", "B", "C", "D"],
    domains: {
      A: ["1", "2", "3", "4"],
      B: ["1", "2", "3", "4"],
      C: ["1", "2", "3", "4"],
      D: ["1", "2", "3", "4"],
    },
    constraints: [
      { scope: ["A", "B"], type: "neq" },
      { scope: ["A", "C"], type: "neq" },
      { scope: ["A", "D"], type: "neq" },
      { scope: ["B", "C"], type: "neq" },
      { scope: ["B", "D"], type: "neq" },
      { scope: ["C", "D"], type: "neq" },
      {
        scope: ["B"],
        type: "custom",
        label: "≠ 1",
        predicate: (b) => Number(b) !== 1,
      },
      {
        scope: ["C"],
        type: "custom",
        label: "≠ 3",
        predicate: (c) => Number(c) !== 3,
      },
      {
        scope: ["C", "D"],
        type: "custom",
        label: ">",
        predicate: ({ d, c }: Record<string, string>) => Number(c) > Number(d),
      },
      {
        scope: ["A", "D"],
        type: "custom",
        label: "= -1",
        predicate: ({ d, a }: Record<string, string>) =>
          Number(d) === Number(a) - 1,
      },
      {
        scope: ["B", "D"],
        type: "custom",
        label: ">= 2",
        predicate: ({ d, b }: Record<string, string>) =>
          Math.abs(Number(b) - Number(d)) >= 2,
      },
    ],
    positions: {
      A: { x: 250, y: 120 },
      B: { x: 650, y: 120 },
      D: { x: 650, y: 300 },
      C: { x: 250, y: 300 },
    },
  },
  {
    id: "triangle",
    name: "Driehoek (3-kleuren)",
    variables: ["A", "B", "C"],
    domains: {
      A: ["R", "G", "B"],
      B: ["R", "G", "B"],
      C: ["R", "G", "B"],
    },
    constraints: [
      { scope: ["A", "B"], type: "neq" },
      { scope: ["B", "C"], type: "neq" },
      { scope: ["C", "A"], type: "neq" },
    ],
    positions: {
      A: { x: 200, y: 120 },
      B: { x: 450, y: 300 },
      C: { x: 700, y: 120 },
    },
  },
  {
    id: "square",
    name: "Vierkant (cyclus C4)",
    variables: ["A", "B", "C", "D"],
    domains: {
      A: ["R", "G", "B"],
      B: ["R", "G", "B"],
      C: ["R", "G", "B"],
      D: ["R", "G", "B"],
    },
    constraints: [
      { scope: ["A", "B"], type: "neq" },
      { scope: ["B", "C"], type: "neq" },
      { scope: ["C", "D"], type: "neq" },
      { scope: ["D", "A"], type: "neq" },
    ],
    positions: {
      A: { x: 250, y: 120 },
      B: { x: 650, y: 120 },
      C: { x: 650, y: 300 },
      D: { x: 250, y: 300 },
    },
  },
  {
    id: "australia",
    name: "Australië kaartkleuring (7 regio's)",
    variables: ["WA", "NT", "SA", "Q", "NSW", "V", "T"],
    domains: {
      WA: ["R", "G", "B"],
      NT: ["R", "G", "B"],
      SA: ["R", "G", "B"],
      Q: ["R", "G", "B"],
      NSW: ["R", "G", "B"],
      V: ["R", "G", "B"],
      T: ["R", "G", "B"],
    },
    constraints: [
      { scope: ["WA", "NT"], type: "neq" },
      { scope: ["WA", "SA"], type: "neq" },
      { scope: ["NT", "SA"], type: "neq" },
      { scope: ["NT", "Q"], type: "neq" },
      { scope: ["SA", "Q"], type: "neq" },
      { scope: ["SA", "NSW"], type: "neq" },
      { scope: ["SA", "V"], type: "neq" },
      { scope: ["Q", "NSW"], type: "neq" },
      { scope: ["NSW", "V"], type: "neq" },
      // T is an island, no constraints
    ],
    positions: {
      WA: { x: 160, y: 240 },
      NT: { x: 360, y: 160 },
      SA: { x: 380, y: 260 },
      Q: { x: 560, y: 180 },
      NSW: { x: 560, y: 280 },
      V: { x: 520, y: 360 },
      T: { x: 520, y: 430 },
    },
  },
];
