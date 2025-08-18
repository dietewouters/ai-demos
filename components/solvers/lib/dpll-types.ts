export type SATResult = "SAT" | "UNSAT" | "UNKNOWN";

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

export type Assignment = Record<string, boolean | undefined>;

export interface DPLLStep {
  id: string;
  type: "split" | "unit-propagation" | "result";
  formula: Formula;
  assignment: Assignment;
  explanation: string;
  parentId?: string;
  children: string[];

  result?: SATResult;
  modelCount?: number;

  // split-only
  variable?: string;
  value?: boolean;

  // unit-prop-only
  unitClauses?: Clause[];

  // edge label (parent → this)
  edgeLabel?: string;

  // progressive reveal
  createdAt: number;
  resolvedAt?: number;
}

export interface DPLLTree {
  steps: Map<string, DPLLStep>;
  rootId: string;
  currentStepId?: string;
}

export interface DPLLOptions {
  unitPropagation: boolean;
  earlyStopping: boolean;
}
