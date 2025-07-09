export const predefinedNetworks = {
  // Weer model (regen, sprinkler, nat gras)
  weather: {
    nodes: [
      { id: "regen", name: "Regen", parents: [], x: 300, y: 100 },
      {
        id: "sprinkler",
        name: "Sprinkler",
        parents: ["regen"],
        x: 150,
        y: 250,
      },
      {
        id: "grass_wet",
        name: "Nat Gras",
        parents: ["regen", "sprinkler"],
        x: 500,
        y: 300,
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
      { id: "smoking", name: "Roken", parents: [], x: 200, y: 100 },
      { id: "pollution", name: "Luchtvervuiling", parents: [], x: 400, y: 100 },
      {
        id: "cancer",
        name: "Longkanker",
        parents: ["smoking", "pollution"],
        x: 300,
        y: 250,
      },
      { id: "xray", name: "Röntgenfoto", parents: ["cancer"], x: 200, y: 400 },
      {
        id: "dyspnea",
        name: "Kortademigheid",
        parents: ["cancer"],
        x: 400,
        y: 400,
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
      { id: "difficulty", name: "Moeilijkheid", parents: [], x: 300, y: 100 },
      {
        id: "intelligence",
        name: "Intelligentie",
        parents: [],
        x: 500,
        y: 100,
      },
      {
        id: "study",
        name: "Studie-uren",
        parents: ["difficulty", "intelligence"],
        x: 400,
        y: 250,
      },
      {
        id: "grade",
        name: "Cijfer",
        parents: ["difficulty", "intelligence", "study"],
        x: 300,
        y: 400,
      },
      {
        id: "recommendation",
        name: "Aanbeveling",
        parents: ["grade"],
        x: 500,
        y: 400,
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
};
