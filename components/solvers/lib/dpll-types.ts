export interface Literal {
  variable: string;
  negated: boolean;
}

export interface Clause {
  literals: Literal[];
}

export interface Formula {
  clauses: Clause[];
  variables: Set<string>;
}

export interface Assignment {
  [variable: string]: boolean | undefined;
}

export interface DPLLStep {
  id: string;
  type: "split" | "unit-propagation" | "result";
  variable?: string;
  value?: boolean;
  formula: Formula;
  assignment: Assignment;
  explanation: string;
  parentId?: string;
  children: string[];
  result?: "SAT" | "UNSAT" | "UNKNOWN";
  unitClauses?: Clause[];
  modelCount?: number;
  edgeLabel?: string;
  createdAt: number;
  resolvedAt?: number;
}

export interface DPLLTree {
  steps: Map<string, DPLLStep>;
  rootId: string;
  currentStepId: string;
}

export interface DPLLOptions {
  unitPropagation: boolean;
  earlyStopping: boolean;
}
