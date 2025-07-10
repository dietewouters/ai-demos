export const exerciseNetworks = {
  //LISP network
  LISP: {
    nodes: [
      {
        id: "H",
        name: "H",
        parents: [],
        x: 350,
        y: 150,
        fixed: true,
      },
      {
        id: "C",
        name: "C",
        parents: [],
        x: 150,
        y: 150,
        fixed: true,
      },
      { id: "I", name: "I", parents: ["H", "C"], x: 250, y: 300, fixed: true },
      { id: "E", name: "E", parents: ["H"], x: 450, y: 300, fixed: true },
    ],
    probabilities: {
      C: { true: 0.4, false: 0.6 },
      H: { true: 0.99, false: 0.01 },
      E: {
        "H=true": { true: 0.95, false: 0.05 },
        "H=false": { true: 0.1, false: 0.9 },
      },
      I: {
        "H=true,C=true": { true: 0.6, false: 0.4 },
        "H=false,C=true": { true: 0.01, false: 0.99 },
        "H=true,C=false": { true: 0.9, false: 0.1 },
        "H=false,C=false": { true: 0.05, false: 0.95 },
      },
    },
    evidence: {},
  },
  //Nuclear power plant network
  NUCLEAR: {
    nodes: [
      {
        id: "T",
        name: "T",
        parents: [],
        x: 150,
        y: 100,
        fixed: true,
      },
      {
        id: "FG",
        name: "FG",
        parents: ["T"],
        x: 350,
        y: 100,
        fixed: true,
      },
      {
        id: "G",
        name: "G",
        parents: ["T", "FG"],
        x: 250,
        y: 250,
        fixed: true,
      },
      {
        id: "FA",
        name: "FA",
        parents: [],
        x: 450,
        y: 250,
        fixed: true,
      },
      {
        id: "A",
        name: "A",
        parents: ["G", "FA"],
        x: 350,
        y: 400,
        fixed: true,
      },
    ],
    probabilities: {
      // Prior probabilities - start with default values that students can adjust
      T: { true: 0.5, false: 0.5 }, // P(T=high) - actual temperature is high
      FG: { true: 0.1, false: 0.9 }, // P(FG=true) - gauge is faulty
      FA: { true: 0.05, false: 0.95 }, // P(FA=true) - alarm is faulty

      // Conditional probability table for G (gauge reading)
      // G depends on T (actual temperature) and FG (gauge faulty)
      G: {
        "T=true,FG=true": { true: 0.4, false: 0.6 }, // When temp high & gauge faulty - students fill this
        "T=true,FG=false": { true: 0.9, false: 0.1 }, // When temp high & gauge working - should be high reading
        "T=false,FG=true": { true: 0.6, false: 0.4 }, // When temp normal & gauge faulty - students fill this
        "T=false,FG=false": { true: 0.1, false: 0.9 }, // When temp normal & gauge working - should be normal reading
      },

      // Conditional probability table for A (alarm sounds)
      // A depends on G (gauge reading) and FA (alarm faulty)
      A: {
        "G=true,FA=true": { true: 0.0, false: 1.0 }, // Alarm never sounds when faulty
        "G=true,FA=false": { true: 0.0, false: 1.0 }, // Alarm works correctly when gauge shows high
        "G=false,FA=true": { true: 0.0, false: 1.0 }, // Alarm never sounds when faulty
        "G=false,FA=false": { true: 1.0, false: 0.0 }, // Alarm rarely sounds when gauge shows normal
      },
    },
    evidence: {},
  },
};
