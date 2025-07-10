export interface NetworkNode {
  id: string;
  name: string;
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
