export type Constraint = {
  scope: string[]; // binary
  type: "neq" | "eq" | "custom";
  // Optioneel: toonbaar label voor de operator, bv. "≠", "=", ">", "<", "≥", "≤".
  // Voor type "neq" en "eq" wordt automatisch "≠" of "=" gebruikt als label ontbreekt.
  label?: string;
  predicate?: (values: Record<string, string>) => boolean;
};

export type CSP = {
  id: string;
  name: string;
  variables: string[];
  domains: Record<string, string[]>;
  constraints: Constraint[];
  positions?: Record<string, { x: number; y: number }>;
};

export type SolveOptions = {
  algorithm: "BT" | "BT_FC" | "BT_AC3";
  variableOrdering: "alpha" | "mrv";
  valueOrdering: "alpha" | "lcv";
  stepThroughFC: boolean;
  stepThroughAC3: boolean;
};

export type Snapshot = {
  assignment: Record<string, string | null>;
  domains: Record<string, string[]>;
  focus?: {
    variable?: string;
  };
  prunedThisStep?: Array<{ variable: string; value: string }>;
  queue?: Array<[string, string]>; // for AC3
};

export type CSPStep =
  | { kind: "select-variable"; variable: string }
  | { kind: "select-variable-explain"; variable: string }
  | {
      kind: "order-values";
      variable: string;
      order: string[];
      heuristic: "alpha" | "lcv";
    }
  | {
      kind: "order-values-explain";
      variable: string;
      heuristic: "alpha" | "lcv";
      scores?: Array<{
        value: string;
        totalEliminated: number;
        byNeighbor: Array<{ neighbor: string; removed: string[] }>;
      }>;
    }
  | { kind: "try-value"; variable: string; value: string }
  | {
      kind: "check-constraint";
      variable: string;
      neighbor: string;
      edge: [string, string];
      consistent: boolean;
    }
  | { kind: "assign"; variable: string; value: string }
  | { kind: "forward-check-start"; variable: string }
  | {
      kind: "forward-check-eliminate";
      from: string;
      to: string;
      valueEliminated: string;
      reason: string;
    }
  | { kind: "forward-check-end"; eliminatedCount: number }
  | { kind: "ac3-start" }
  | { kind: "ac3-enqueue"; arc: [string, string] }
  | { kind: "ac3-dequeue"; arc: [string, string] }
  | { kind: "ac3-revise"; arc: [string, string]; removed: string[] }
  | { kind: "ac3-end"; result: "consistent" | "inconsistent" }
  | { kind: "backtrack"; variable?: string }
  | { kind: "unassign"; variable: string }
  | { kind: "success"; assignment: Record<string, string> }
  | { kind: "failure" };

export type CSPStepWithSnapshot = {
  step: CSPStep;
  snapshot: Snapshot;
  description: string;
  highlight?: {
    variable?: string;
    edge?: [string, string];
    neighbor?: string;
    tryingValue?: string | null;
    constraintStatus?: "checking" | "ok" | "fail";
  };
  kind?: "success" | "normal" | "failure";
};
