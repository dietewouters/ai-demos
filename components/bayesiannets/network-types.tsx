export type StepType =
  | "select"
  | "parents"
  | "children"
  | "coparents"
  | "complete";

export interface NetworkNode {
  id: string;
  name?: string;
  label?: string;
  parents: string[];
  children: string[];
  x: number;
  y: number;
  fixed?: boolean;
}

export interface NetworkEdge {
  from: string;
  to: string;
}

export interface BayesianNetwork {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  name?: string;
  description?: string;
  probabilities?: Record<string, any>;
  evidence?: Record<string, any>;
}

export interface MarkovBlanketStep {
  type: StepType;
  nodes: string[];
  description: string;
}

export interface NetworkState {
  evidenceNodes: Set<string>;
  targetNode: string | null;
  dSeparatedNodes: Set<string>;
}
