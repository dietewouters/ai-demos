import type {
  BayesianNetwork,
  NetworkNode,
  NetworkEdge,
} from "./network-types";

// Helper functie om edges te genereren uit parent-child relaties
function generateEdges(nodes: any[]): NetworkEdge[] {
  const edges: NetworkEdge[] = [];
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
  description: "",
  nodes: addChildrenToNodes(lispBaseNodes),
  edges: generateEdges(lispBaseNodes),
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
  description: "",
  nodes: addChildrenToNodes(nuclearBaseNodes),
  edges: generateEdges(nuclearBaseNodes),
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
  description: "",
  nodes: addChildrenToNodes(driverBaseNodes),
  edges: generateEdges(driverBaseNodes),
};

// D-separate network
const dSeparatedBaseNodes = [
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

export const dsepNetwork: BayesianNetwork = {
  name: "Network exercise 7",
  description: "",
  nodes: addChildrenToNodes(dSeparatedBaseNodes),
  edges: generateEdges(dSeparatedBaseNodes),
};

// Weather network
const weatherNodes = [
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
];

export const weatherNetwork: BayesianNetwork = {
  name: "Weather model",
  description: "",
  nodes: addChildrenToNodes(weatherNodes),
  edges: generateEdges(weatherNodes),
};

// Medical model
const medicalNodes = [
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
];

export const medicalNetwork: BayesianNetwork = {
  name: "Medical model",
  description: "",
  nodes: addChildrenToNodes(medicalNodes),
  edges: generateEdges(medicalNodes),
};

// Student network
const studentNodes = [
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
];

export const studentNetwork: BayesianNetwork = {
  name: "Student model",
  description: "",
  nodes: addChildrenToNodes(studentNodes),
  edges: generateEdges(studentNodes),
};

// HMM
const markovNodes = [
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
];

export const markovNetwork: BayesianNetwork = {
  name: "Hidden Markov Model",
  description: "",
  nodes: addChildrenToNodes(markovNodes),
  edges: generateEdges(markovNodes),
};

// Registry van alle beschikbare networks
export const predefinedNetworks: BayesianNetwork[] = [
  lispNetwork,
  nuclearNetwork,
  driverNetwork,
  markovNetwork,
  dsepNetwork,
  weatherNetwork,
  medicalNetwork,
  studentNetwork,
];

// Helper functie om een network op te halen op naam
export function getNetworkByName(
  networkName: string
): BayesianNetwork | undefined {
  return predefinedNetworks.find((net) => net.name === networkName);
}

// Helper functie om alle beschikbare network namen op te halen
export function getAvailableNetworkNames(): (string | undefined)[] {
  return predefinedNetworks.map((net) => net.name);
}
