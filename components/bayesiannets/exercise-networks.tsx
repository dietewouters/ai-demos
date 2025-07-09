export const exerciseNetworks = {
  // Fred's LISP Dilemma
  LISP: {
    nodes: [
      { id: "I", name: "I", parents: ["H", "C"], x: 200, y: 100 },
      {
        id: "H",
        name: "H",
        parents: [],
        x: 300,
        y: 500,
      },
      {
        id: "C",
        name: "C",
        parents: [],
        x: 100,
        y: 500,
      },
      { id: "E", name: "E", parents: ["H"], x: 400, y: 100 },
    ],
    probabilities: {
      C: { true: 0.4, false: 0.6 },
      H: { true: 0.99, false: 0.01 },
      E: {
        "H = good": { true: 0.95, false: 0.05 },
        "H = bad": { true: 0.1, false: 0.9 },
      },
      I: {
        "C = bug, H = good": { true: 0.6, false: 0.4 },
        "C = bug, H = bad": { true: 0.01, false: 0.99 },
        "C = no_bug, H = good": { true: 0.9, false: 0.1 },
        "C = no_bug, H = bad": { true: 0.05, false: 0.95 },
      },
    },
    evidence: {},
  },
};
