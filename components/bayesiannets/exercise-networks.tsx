import { Children } from "react";

export const exerciseNetworks = {
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
};
