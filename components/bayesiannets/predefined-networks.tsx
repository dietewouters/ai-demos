export const predefinedNetworks = {
  // Weer model (regen, sprinkler, nat gras)
  weather: {
    nodes: [
      { id: "regen", name: "Regen", parents: [], x: 300, y: 100, fixed: true },
      {
        id: "sprinkler",
        name: "Sprinkler",
        parents: ["regen"],
        x: 150,
        y: 300,
        fixed: true,
      },
      {
        id: "grass_wet",
        name: "Nat Gras",
        parents: ["regen", "sprinkler"],
        x: 450,
        y: 300,
        fixed: true,
      },
    ],
    probabilities: {
      regen: { true: 0.2, false: 0.8 },
      sprinkler: {
        "regen=true": { true: 0.01, false: 0.99 },
        "regen=false": { true: 0.4, false: 0.6 },
      },
      grass_wet: {
        "regen=true,sprinkler=true": { true: 0.99, false: 0.01 },
        "regen=true,sprinkler=false": { true: 0.8, false: 0.2 },
        "regen=false,sprinkler=true": { true: 0.9, false: 0.1 },
        "regen=false,sprinkler=false": { true: 0.0, false: 1.0 },
      },
    },
    evidence: {},
  },

  // Medisch diagnose model
  medical: {
    nodes: [
      { id: "smoking", name: "Roken", parents: [], x: 150, y: 50, fixed: true },
      {
        id: "pollution",
        name: "Luchtvervuiling",
        parents: [],
        x: 450,
        y: 50,
        fixed: true,
      },
      {
        id: "cancer",
        name: "Longkanker",
        parents: ["smoking", "pollution"],
        x: 300,
        y: 200,
        fixed: true,
      },
      {
        id: "xray",
        name: "Röntgenfoto",
        parents: ["cancer"],
        x: 150,
        y: 350,
        fixed: true,
      },
      {
        id: "dyspnea",
        name: "Kortademigheid",
        parents: ["cancer"],
        x: 450,
        y: 350,
        fixed: true,
      },
    ],
    probabilities: {
      smoking: { true: 0.3, false: 0.7 },
      pollution: { true: 0.4, false: 0.6 },
      cancer: {
        "smoking=true,pollution=true": { true: 0.05, false: 0.95 },
        "smoking=true,pollution=false": { true: 0.03, false: 0.97 },
        "smoking=false,pollution=true": { true: 0.02, false: 0.98 },
        "smoking=false,pollution=false": { true: 0.001, false: 0.999 },
      },
      xray: {
        "cancer=true": { true: 0.9, false: 0.1 },
        "cancer=false": { true: 0.2, false: 0.8 },
      },
      dyspnea: {
        "cancer=true": { true: 0.65, false: 0.35 },
        "cancer=false": { true: 0.3, false: 0.7 },
      },
    },
    evidence: {},
  },

  // Student prestatie model
  student: {
    nodes: [
      {
        id: "difficulty",
        name: "Moeilijkheid",
        parents: [],
        x: 100,
        y: 200,
        fixed: true,
      },
      {
        id: "intelligence",
        name: "Intelligentie",
        parents: [],
        x: 500,
        y: 200,
        fixed: true,
      },
      {
        id: "study",
        name: "Studie-uren",
        parents: ["difficulty", "intelligence"],
        x: 300,
        y: 100,
        fixed: true,
      },
      {
        id: "grade",
        name: "Cijfer",
        parents: ["difficulty", "intelligence", "study"],
        x: 300,
        y: 300,
        fixed: true,
      },
      {
        id: "recommendation",
        name: "Aanbeveling",
        parents: ["grade"],
        x: 500,
        y: 400,
        fixed: true,
      },
    ],
    probabilities: {
      difficulty: { true: 0.4, false: 0.6 },
      intelligence: { true: 0.3, false: 0.7 },
      study: {
        "difficulty=true,intelligence=true": { true: 0.9, false: 0.1 },
        "difficulty=true,intelligence=false": { true: 0.5, false: 0.5 },
        "difficulty=false,intelligence=true": { true: 0.7, false: 0.3 },
        "difficulty=false,intelligence=false": { true: 0.3, false: 0.7 },
      },
      grade: {
        "difficulty=true,intelligence=true,study=true": {
          true: 0.9,
          false: 0.1,
        },
        "difficulty=true,intelligence=true,study=false": {
          true: 0.5,
          false: 0.5,
        },
        "difficulty=true,intelligence=false,study=true": {
          true: 0.7,
          false: 0.3,
        },
        "difficulty=true,intelligence=false,study=false": {
          true: 0.1,
          false: 0.9,
        },
        "difficulty=false,intelligence=true,study=true": {
          true: 0.95,
          false: 0.05,
        },
        "difficulty=false,intelligence=true,study=false": {
          true: 0.8,
          false: 0.2,
        },
        "difficulty=false,intelligence=false,study=true": {
          true: 0.8,
          false: 0.2,
        },
        "difficulty=false,intelligence=false,study=false": {
          true: 0.3,
          false: 0.7,
        },
      },
      recommendation: {
        "grade=true": { true: 0.9, false: 0.1 },
        "grade=false": { true: 0.1, false: 0.9 },
      },
    },
    evidence: {},
  },
  //LISP network
  LISP: {
    nodes: [
      {
        id: "H",
        name: "H",
        parents: [],
        children: ["I", "E"],
        x: 350,
        y: 150,
        fixed: true,
      },
      {
        id: "C",
        name: "C",
        parents: [],
        children: ["I"],
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
        children: ["G", "FG"],
        x: 150,
        y: 100,
        fixed: true,
      },
      {
        id: "FG",
        name: "FG",
        parents: ["T"],
        children: ["G"],
        x: 350,
        y: 100,
        fixed: true,
      },
      {
        id: "G",
        name: "G",
        parents: ["T", "FG"],
        children: ["A"],
        x: 250,
        y: 250,
        fixed: true,
      },
      {
        id: "FA",
        name: "FA",
        parents: [],
        children: ["A"],
        x: 450,
        y: 250,
        fixed: true,
      },
      {
        id: "A",
        name: "A",
        parents: ["G", "FA"],
        children: [],
        x: 350,
        y: 400,
        fixed: true,
      },
    ],
    probabilities: {
      // Prior probabilities - start with default values that students can adjust
      T: { true: 0.5, false: 0.5 }, // P(T=high) - actual temperature is high
      FG: {
        "T=true": { true: 0.1, false: 0.9 }, // P(FG=true | T=high) - gauge faulty when temp high
        "T=false": { true: 0.05, false: 0.95 }, // P(FG=true | T=normal) - gauge faulty when temp normal
      },
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
  // Negligent driver
  DRIVER: {
    nodes: [
      {
        id: "NegligentDriver",
        name: "NegligentDriver",
        parents: [],
        children: ["TankEmpty", "LightsOnOverNight"],
        x: 200,
        y: 50,
        fixed: true,
      },
      {
        id: "Winter",
        name: "Winter",
        parents: [],
        children: ["Cold"],
        x: 700,
        y: 50,
        fixed: true,
      },
      {
        id: "TankEmpty",
        name: "TankEmpty",
        parents: ["NegligentDriver"],
        children: ["EngineNotStarting"],
        x: 100,
        y: 175,
        fixed: true,
      },
      {
        id: "LightsOnOverNight",
        name: "LightsOnOverNight",
        parents: ["NegligentDriver"],
        children: ["BatteryProblem"],
        x: 350,
        y: 175,
        fixed: true,
      },
      {
        id: "Cold",
        name: "Cold",
        parents: ["Winter"],
        children: ["BatteryProblem"],
        x: 700,
        y: 175,
        fixed: true,
      },
      {
        id: "BatteryProblem",
        name: "BatteryProblem",
        parents: ["LightsOnOverNight", "Cold"],
        children: ["EngineNotStarting", "RadioSilent"],
        x: 500,
        y: 300,
        fixed: true,
      },
      {
        id: "EngineNotStarting",
        name: "EngineNotStarting",
        parents: ["TankEmpty", "BatteryProblem"],
        children: [],
        x: 225,
        y: 425,
        fixed: true,
      },
      {
        id: "RadioSilent",
        name: "RadioSilent",
        parents: ["BatteryProblem"],
        children: [],
        x: 600,
        y: 425,
        fixed: true,
      },
    ],
    probabilities: {
      NegligentDriver: { true: 0.1, false: 0.9 },
      Winter: { true: 0.2, false: 0.8 },
      TankEmpty: {
        "NegligentDriver=true": { true: 0.1, false: 0.9 },
        "NegligentDriver=false": { true: 0.01, false: 0.99 },
      },
      LightsOnOverNight: {
        "NegligentDriver=true": { true: 0.3, false: 0.7 },
        "NegligentDriver=false": { true: 0.02, false: 0.98 },
      },
      Cold: {
        "Winter=true": { true: 0.8, false: 0.2 },
        "Winter=false": { true: 0.1, false: 0.9 },
      },
      BatteryProblem: {
        "LightsOnOverNight=true,Cold=true": { true: 0.9, false: 0.1 },
        "LightsOnOverNight=true,Cold=false": { true: 0.8, false: 0.2 },
        "LightsOnOverNight=false,Cold=true": { true: 0.2, false: 0.8 },
        "LightsOnOverNight=false,Cold=false": { true: 0.01, false: 0.99 },
      },
      EngineNotStarting: {
        "TankEmpty=true,BatteryProblem=true": { true: 0.9, false: 0.1 },
        "TankEmpty=true,BatteryProblem=false": { true: 0.8, false: 0.2 },
        "TankEmpty=false,BatteryProblem=true": { true: 0.7, false: 0.3 },
        "TankEmpty=false,BatteryProblem=false": { true: 0.05, false: 0.95 },
      },
      RadioSilent: {
        "BatteryProblem=true": { true: 0.95, false: 0.05 },
        "BatteryProblem=false": { true: 0.1, false: 0.9 },
      },
    },
    evidence: {},
  },
  // Hidden Markov Model (HMM)
  HMM: {
    nodes: [
      {
        id: "X0",
        name: "X0",
        parents: [],
        children: ["Y0", "X1"],
        x: 100,
        y: 100,
        fixed: true,
      },
      {
        id: "X1",
        name: "X1",
        parents: ["X0"],
        children: ["Y1", "X2"],
        x: 250,
        y: 100,
        fixed: true,
      },
      {
        id: "X2",
        name: "X2",
        parents: ["X1"],
        children: ["Y2", "X3"],
        x: 400,
        y: 100,
        fixed: true,
      },
      {
        id: "X3",
        name: "X3",
        parents: ["X2"],
        children: ["Y3"],
        x: 550,
        y: 100,
        fixed: true,
      },
      {
        id: "Y0",
        name: "Y0",
        parents: ["X0"],
        children: [],
        x: 100,
        y: 300,
        fixed: true,
      },
      {
        id: "Y1",
        name: "Y1",
        parents: ["X1"],
        children: [],
        x: 250,
        y: 300,
        fixed: true,
      },
      {
        id: "Y2",
        name: "Y2",
        parents: ["X2"],
        children: [],
        x: 400,
        y: 300,
        fixed: true,
      },
      {
        id: "Y3",
        name: "Y3",
        parents: ["X3"],
        children: [],
        x: 550,
        y: 300,
        fixed: true,
      },
    ],
    probabilities: {
      X0: { true: 0.7, false: 0.3 },
      X1: {
        "X0=true": { true: 0.99, false: 0.01 },
        "X0=false": { true: 0.1, false: 0.9 },
      },
      X2: {
        "X1=true": { true: 0.99, false: 0.01 },
        "X1=false": { true: 0.1, false: 0.9 },
      },
      X3: {
        "X2=true": { true: 0.99, false: 0.01 },
        "X2=false": { true: 0.1, false: 0.9 },
      },
      Y0: {
        "X0=true": { true: 0.7, false: 0.3 },
        "X0=false": { true: 0.0, false: 1.0 },
      },
      Y1: {
        "X1=true": { true: 0.7, false: 0.3 },
        "X1=false": { true: 0.0, false: 1.0 },
      },
      Y2: {
        "X2=true": { true: 0.7, false: 0.3 },
        "X2=false": { true: 0.0, false: 1.0 },
      },
      Y3: {
        "X3=true": { true: 0.7, false: 0.3 },
        "X3=false": { true: 0.0, false: 1.0 },
      },
    },
    evidence: {},
  },
  dsepNetwork: {
    nodes: [
      {
        id: "A",
        name: "A",
        label: "A",
        parents: [],
        x: 100,
        y: 50,
        fixed: true,
      },
      {
        id: "B",
        name: "B",
        label: "B",
        parents: [],
        x: 500,
        y: 50,
        fixed: true,
      },
      {
        id: "C",
        name: "C",
        label: "C",
        parents: ["A"],
        x: 100,
        y: 150,
        fixed: true,
      },
      {
        id: "E",
        name: "E",
        label: "E",
        parents: ["B"],
        x: 350,
        y: 150,
        fixed: true,
      },
      {
        id: "F",
        name: "F",
        label: "F",
        parents: ["B"],
        x: 650,
        y: 150,
        fixed: true,
      },
      {
        id: "J",
        name: "J",
        label: "J",
        parents: [],
        x: 850,
        y: 150,
        fixed: true,
      },
      {
        id: "D",
        name: "D",
        label: "D",
        parents: ["C", "E"],
        x: 225,
        y: 250,
        fixed: true,
      },
      {
        id: "H",
        name: "H",
        label: "H",
        parents: ["F", "J"],
        x: 725,
        y: 250,
        fixed: true,
      },
      {
        id: "G",
        name: "G",
        label: "G",
        parents: ["D"],
        x: 100,
        y: 325,
        fixed: true,
      },
      {
        id: "I",
        name: "I",
        label: "I",
        parents: ["D"],
        x: 350,
        y: 325,
        fixed: true,
      },
      {
        id: "K",
        name: "K",
        label: "K",
        parents: ["I", "H"],
        x: 600,
        y: 350,
        fixed: true,
      },
      {
        id: "L",
        name: "L",
        label: "L",
        parents: ["K"],
        x: 600,
        y: 450,
        fixed: true,
      },
    ],
    probabilities: {
      A: { true: 0.1, false: 0.9 },
      B: { true: 0.2, false: 0.8 },
      J: { true: 0.3, false: 0.7 },
      C: {
        "A=true": { true: 0.1, false: 0.9 },
        "A=false": { true: 0.01, false: 0.99 },
      },
      E: {
        "B=true": { true: 0.3, false: 0.7 },
        "B=false": { true: 0.02, false: 0.98 },
      },
      F: {
        "B=true": { true: 0.8, false: 0.2 },
        "B=false": { true: 0.1, false: 0.9 },
      },
      D: {
        "C=true,E=true": { true: 0.9, false: 0.1 },
        "C=true,E=false": { true: 0.8, false: 0.2 },
        "C=false,E=true": { true: 0.2, false: 0.8 },
        "C=false,E=false": { true: 0.01, false: 0.99 },
      },
      H: {
        "F=true,J=true": { true: 0.9, false: 0.1 },
        "F=true,J=false": { true: 0.8, false: 0.2 },
        "F=false,J=true": { true: 0.7, false: 0.3 },
        "F=false,J=false": { true: 0.05, false: 0.95 },
      },
      G: {
        "D=true": { true: 0.95, false: 0.05 },
        "D=false": { true: 0.1, false: 0.9 },
      },
      I: {
        "D=true": { true: 0.95, false: 0.05 },
        "D=false": { true: 0.1, false: 0.9 },
      },
      K: {
        "D=true,H=true": { true: 0.9, false: 0.1 },
        "D=true,H=false": { true: 0.8, false: 0.2 },
        "D=false,H=true": { true: 0.2, false: 0.8 },
        "D=false,H=false": { true: 0.01, false: 0.99 },
      },
      L: {
        "K=true": { true: 0.95, false: 0.05 },
        "K=false": { true: 0.1, false: 0.9 },
      },
    },
    evidence: {},
  },
};
