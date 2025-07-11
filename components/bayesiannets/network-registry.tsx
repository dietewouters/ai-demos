import type { BayesianNetwork, NetworkNode } from "./network-types";

// Helper functie om edges te genereren uit parent-child relaties
function generateEdges(nodes: any[]): { from: string; to: string }[] {
  const edges: { from: string; to: string }[] = [];

  nodes.forEach((node) => {
    node.parents.forEach((parent: string) => {
      edges.push({ from: parent, to: node.id });
    });
  });

  return edges;
}

// Helper functie om children toe te voegen aan nodes
function addChildrenToNodes(nodes: any[]): NetworkNode[] {
  return nodes.map((node) => {
    const children = nodes
      .filter((otherNode) => otherNode.parents.includes(node.id))
      .map((child) => child.id);

    return {
      ...node,
      children, // Voeg children array toe
    } as NetworkNode;
  });
}

// LISP network - definieer eerst de basis nodes
const lispBaseNodes = [
  {
    id: "H",
    name: "H",
    label: "High Math",
    parents: [],
    x: 350,
    y: 150,
    fixed: true,
  },
  {
    id: "C",
    name: "C",
    label: "Creativity",
    parents: [],
    x: 150,
    y: 150,
    fixed: true,
  },
  {
    id: "I",
    name: "I",
    label: "Intelligence",
    parents: ["H", "C"],
    x: 250,
    y: 300,
    fixed: true,
  },
  {
    id: "E",
    name: "E",
    label: "Experience",
    parents: ["H"],
    x: 450,
    y: 300,
    fixed: true,
  },
];

export const lispNetwork: BayesianNetwork = {
  name: "Fred's LISP dilemma",
  description:
    "Een netwerk dat factoren modelleert die LISP programmeervaardigheden beïnvloeden",
  nodes: addChildrenToNodes(lispBaseNodes),
  edges: generateEdges(lispBaseNodes),
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
};

// Nuclear power plant network
const nuclearBaseNodes = [
  {
    id: "T",
    name: "T",
    label: "Temperature",
    parents: [],
    x: 150,
    y: 100,
    fixed: true,
  },
  {
    id: "FG",
    name: "FG",
    label: "Faulty Gauge",
    parents: ["T"],
    x: 350,
    y: 100,
    fixed: true,
  },
  {
    id: "G",
    name: "G",
    label: "Gauge Reading",
    parents: ["T", "FG"],
    x: 250,
    y: 250,
    fixed: true,
  },
  {
    id: "FA",
    name: "FA",
    label: "Faulty Alarm",
    parents: [],
    x: 450,
    y: 250,
    fixed: true,
  },
  {
    id: "A",
    name: "A",
    label: "Alarm Sounds",
    parents: ["G", "FA"],
    x: 350,
    y: 400,
    fixed: true,
  },
];

export const nuclearNetwork: BayesianNetwork = {
  name: "Nuclear Power Plant",
  description: "Een netwerk dat de veiligheid van een kerncentrale modelleert",
  nodes: addChildrenToNodes(nuclearBaseNodes),
  edges: generateEdges(nuclearBaseNodes),
  probabilities: {
    T: { true: 0.5, false: 0.5 },
    FG: {
      "T=true": { true: 0.1, false: 0.9 },
      "T=false": { true: 0.05, false: 0.95 },
    },
    FA: { true: 0.05, false: 0.95 },
    G: {
      "T=true,FG=true": { true: 0.4, false: 0.6 },
      "T=true,FG=false": { true: 0.9, false: 0.1 },
      "T=false,FG=true": { true: 0.6, false: 0.4 },
      "T=false,FG=false": { true: 0.1, false: 0.9 },
    },
    A: {
      "G=true,FA=true": { true: 0.0, false: 1.0 },
      "G=true,FA=false": { true: 1.0, false: 0.0 },
      "G=false,FA=true": { true: 0.0, false: 1.0 },
      "G=false,FA=false": { true: 0.1, false: 0.9 },
    },
  },
  evidence: {},
};

// Negligent driver network
const driverBaseNodes = [
  {
    id: "NegligentDriver",
    name: "NegligentDriver",
    label: "Negligent Driver",
    parents: [],
    x: 200,
    y: 50,
    fixed: true,
  },
  {
    id: "Winter",
    name: "Winter",
    label: "Winter Season",
    parents: [],
    x: 700,
    y: 50,
    fixed: true,
  },
  {
    id: "TankEmpty",
    name: "TankEmpty",
    label: "Tank Empty",
    parents: ["NegligentDriver"],
    x: 100,
    y: 175,
    fixed: true,
  },
  {
    id: "LightsOnOverNight",
    name: "LightsOnOverNight",
    label: "Lights On Overnight",
    parents: ["NegligentDriver"],
    x: 350,
    y: 175,
    fixed: true,
  },
  {
    id: "Cold",
    name: "Cold",
    label: "Cold Weather",
    parents: ["Winter"],
    x: 700,
    y: 175,
    fixed: true,
  },
  {
    id: "BatteryProblem",
    name: "BatteryProblem",
    label: "Battery Problem",
    parents: ["LightsOnOverNight", "Cold"],
    x: 500,
    y: 300,
    fixed: true,
  },
  {
    id: "EngineNotStarting",
    name: "EngineNotStarting",
    label: "Engine Not Starting",
    parents: ["TankEmpty", "BatteryProblem"],
    x: 225,
    y: 400,
    fixed: true,
  },
  {
    id: "RadioSilent",
    name: "RadioSilent",
    label: "Radio Silent",
    parents: ["BatteryProblem"],
    x: 600,
    y: 400,
    fixed: true,
  },
];

export const driverNetwork: BayesianNetwork = {
  name: "Negligent Driver",
  description:
    "Een netwerk dat problemen met auto's en nalatige bestuurders modelleert",
  nodes: addChildrenToNodes(driverBaseNodes),
  edges: generateEdges(driverBaseNodes),
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
};

// Registry van alle beschikbare networks
export const NETWORK_REGISTRY: Record<string, BayesianNetwork> = {
  LISP: lispNetwork,
  NUCLEAR: nuclearNetwork,
  DRIVER: driverNetwork,
};

// Helper functie om een network op te halen
export function getNetwork(networkName: string): BayesianNetwork | null {
  return NETWORK_REGISTRY[networkName.toUpperCase()] || null;
}

// Helper functie om alle beschikbare network namen op te halen
export function getAvailableNetworks(): string[] {
  return Object.keys(NETWORK_REGISTRY);
}

// Helper functie om network info op te halen
export function getNetworkInfo(): Array<{
  name: string;
  displayName: string;
  description: string;
}> {
  return Object.entries(NETWORK_REGISTRY).map(([key, network]) => ({
    name: key,
    displayName: network.name || key,
    description: network.description || "Geen beschrijving beschikbaar",
  }));
}

// D-separate network
const dSeparatedNodes = [
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
    y: 175,
    fixed: true,
  },
  {
    id: "E",
    name: "E",
    label: "E",
    parents: ["B"],
    x: 350,
    y: 175,
    fixed: true,
  },
  {
    id: "F",
    name: "F",
    label: "F",
    parents: ["B"],
    x: 650,
    y: 175,
    fixed: true,
  },
  {
    id: "J",
    name: "J",
    label: "J",
    parents: [],
    x: 850,
    y: 175,
    fixed: true,
  },
  {
    id: "D",
    name: "D",
    label: "D",
    parents: ["C", "E"],
    x: 225,
    y: 300,
    fixed: true,
  },
  {
    id: "H",
    name: "H",
    label: "H",
    parents: ["F", "J"],
    x: 725,
    y: 300,
    fixed: true,
  },
  {
    id: "G",
    name: "G",
    label: "G",
    parents: ["D"],
    x: 100,
    y: 425,
    fixed: true,
  },
  {
    id: "I",
    name: "I",
    label: "I",
    parents: ["D"],
    x: 350,
    y: 425,
    fixed: true,
  },
  {
    id: "K",
    name: "K",
    label: "K",
    parents: ["I", "H"],
    x: 600,
    y: 550,
    fixed: true,
  },
  {
    id: "L",
    name: "L",
    label: "L",
    parents: ["K"],
    x: 600,
    y: 675,
    fixed: true,
  },
];

export const dsepnetwork: BayesianNetwork = {
  name: "D-separated Network",
  description: "",
  nodes: addChildrenToNodes(dSeparatedNodes),
  edges: generateEdges(dSeparatedNodes),
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
};
