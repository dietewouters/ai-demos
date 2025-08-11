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
        predicate: ({ B }) => Number(B) !== 1,
      },
      {
        scope: ["C"],
        type: "custom",
        label: "≠ 3",
        predicate: ({ C }) => Number(C) !== 3,
      },
      {
        scope: ["C", "D"],
        type: "custom",
        label: ">",
        predicate: ({ d, c }: Record<string, string>) => Number(c) > Number(d),
      },
      {
        scope: ["D", "A"],
        type: "custom",
        label: "= -1",
        predicate: ({ d, a }: Record<string, string>) =>
          Number(d) - Number(a) === -1,
      },
      {
        scope: ["B", "D"],
        type: "custom",
        label: "|B - D| ≥ 2",
        predicate: ({ b, d }) => Math.abs(Number(b) - Number(d)) >= 2,
      },
    ],
    positions: {
      A: { x: 100, y: 50 },
      B: { x: 800, y: 50 },
      D: { x: 800, y: 400 },
      C: { x: 100, y: 400 },
    },
  },
];
