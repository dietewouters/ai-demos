import type {
  Formula,
  Clause,
  Literal,
  Assignment,
  DPLLStep,
  DPLLTree,
  DPLLOptions,
} from "./dpll-types";

export class DPLLSolver {
  private options: DPLLOptions;
  private stepCounter = 0;
  private eventCounter = 0;

  constructor(options: DPLLOptions) {
    this.options = options;
  }

  // -------- progressive reveal helpers --------
  private nextEvent(): number {
    return ++this.eventCounter;
  }
  private markResolved(step: DPLLStep, result: "SAT" | "UNSAT") {
    step.result = result;
    if (step.resolvedAt === undefined) step.resolvedAt = this.nextEvent();
  }

  // -------- PUBLIC API --------
  solve(formula: Formula): DPLLTree {
    this.stepCounter = 0;
    this.eventCounter = 0;
    const steps = new Map<string, DPLLStep>();

    const rootId = this.generateStepId();
    const rootCreated = this.nextEvent();
    const rootStep: DPLLStep = {
      id: rootId,
      type: "split",
      formula,
      assignment: {},
      explanation: "Starting DPLL algorithm with initial formula",
      children: [],
      result: "UNKNOWN",
      createdAt: rootCreated,
    };
    steps.set(rootId, rootStep);

    this.dpllRecursive(formula, {}, rootId, steps);

    // (geen modelcount hier; kan apart worden aangeroepen)
    return { steps, rootId, currentStepId: rootId };
  }

  solveSAT(formula: Formula): DPLLTree {
    this.stepCounter = 0;
    this.eventCounter = 0;
    const steps = new Map<string, DPLLStep>();

    const rootId = this.generateStepId();
    const rootCreated = this.nextEvent();
    const rootStep: DPLLStep = {
      id: rootId,
      type: "split",
      formula,
      assignment: {},
      explanation: "Starting #SAT algorithm for model counting",
      children: [],
      result: "UNKNOWN",
      createdAt: rootCreated,
    };
    steps.set(rootId, rootStep);

    const original = this.options;
    this.options = { ...this.options, earlyStopping: false };

    this.dpllRecursive(formula, {}, rootId, steps);
    // #SAT always counts models
    this.calculateModelCounts(steps, formula.variables);

    this.options = original;
    return { steps, rootId, currentStepId: rootId };
  }

  /** ✅ Public: call this AFTER a full DPLL run (earlyStopping = false). */
  public computeModelCountsInPlace(tree: DPLLTree) {
    const root = tree.steps.get(tree.rootId);
    if (!root) return;
    const allVars = root.formula.variables;
    this.calculateModelCounts(tree.steps, allVars);
  }

  // -------- Model counting (post-order) --------
  private calculateModelCounts(
    steps: Map<string, DPLLStep>,
    allVariables: Set<string>
  ) {
    const visited = new Set<string>();

    const calc = (id: string): number => {
      if (visited.has(id)) return steps.get(id)?.modelCount ?? 0;
      visited.add(id);

      const step = steps.get(id);
      if (!step) return 0;

      if (step.children.length === 0) {
        if (step.result === "SAT") {
          const n = this.countUnassignedVariables(
            step.assignment,
            allVariables
          );
          step.modelCount = Math.pow(2, n);
          step.explanation += ` (${n} unassigned vars → 2^${n} = ${step.modelCount} models)`;
        } else {
          step.modelCount = 0;
        }
        return step.modelCount;
      }

      let total = 0;
      for (const cid of step.children) total += calc(cid);
      step.modelCount = total;

      return total;
    };

    const root = Array.from(steps.values()).find((s) => !s.parentId);
    if (root) calc(root.id);
  }

  private countUnassignedVariables(
    assignment: Assignment,
    allVariables: Set<string>
  ): number {
    let cnt = 0;
    for (const v of allVariables) if (assignment[v] === undefined) cnt++;
    return cnt;
  }

  // -------- Core DPLL --------
  private dpllRecursive(
    formula: Formula,
    assignment: Assignment,
    parentId: string,
    steps: Map<string, DPLLStep>
  ): "SAT" | "UNSAT" {
    const simplified = this.applyAssignment(formula, assignment);

    // SAT leaf
    if (simplified.clauses.length === 0) {
      const createdAt = this.nextEvent();
      const id = this.generateStepId();
      const node: DPLLStep = {
        id,
        type: "result",
        inputFormula: simplified, // invoer vóór detectie
        formula: simplified, // gelijk
        assignment,
        explanation: "All clauses satisfied - formula is SAT",
        parentId,
        children: [],
        result: "SAT",
        createdAt,
        resolvedAt: createdAt,
      };
      steps.set(id, node);
      steps.get(parentId)!.children.push(id);
      this.updateResultsUpwards(steps, id, createdAt);
      return "SAT";
    }

    // UNSAT leaf (empty clause)
    if (simplified.clauses.some((c) => c.literals.length === 0)) {
      const createdAt = this.nextEvent();
      const id = this.generateStepId();
      const node: DPLLStep = {
        id,
        type: "result",
        inputFormula: simplified,
        formula: simplified,
        assignment,
        explanation: "Empty clause found - formula is UNSAT",
        parentId,
        children: [],
        result: "UNSAT",
        createdAt,
        resolvedAt: createdAt,
      };
      steps.set(id, node);
      steps.get(parentId)!.children.push(id);
      this.updateResultsUpwards(steps, id, createdAt);
      return "UNSAT";
    }

    // Unit propagation – maak één stap per unit (ketting van stappen)
    if (this.options.unitPropagation) {
      const unitsAll = simplified.clauses.filter(
        (c) => c.literals.length === 1
      );

      if (unitsAll.length > 0) {
        // 1a) detecteer directe conflicts: (X) en (¬X) tegelijk
        const seen = new Map<string, boolean>();
        for (const uc of unitsAll) {
          const lit = uc.literals[0];
          const val = !lit.negated;
          if (seen.has(lit.variable) && seen.get(lit.variable) !== val) {
            const createdAt = this.nextEvent();
            const id = this.generateStepId();
            const step: DPLLStep = {
              id,
              type: "result",
              inputFormula: simplified,
              formula: simplified,
              assignment,
              explanation: `Conflicting unit clauses (${lit.variable} en ¬${lit.variable}) ⇒ UNSAT`,
              parentId,
              children: [],
              result: "UNSAT",
              createdAt,
              resolvedAt: createdAt,
              edgeLabel: `${lit.variable} conflict`,
            };
            steps.set(id, step);
            steps.get(parentId)!.children.push(id);
            this.updateResultsUpwards(steps, id, createdAt);
            return "UNSAT";
          }
          seen.set(lit.variable, val);
        }

        // 1b) kies exact één unit die nog niet is toegewezen → maak één stap
        const candidate = unitsAll.find(
          (uc) => assignment[uc.literals[0].variable] === undefined
        );

        if (candidate) {
          const lit = candidate.literals[0];
          const v = lit.variable;
          const value = !lit.negated;

          const newAssignment = { ...assignment, [v]: value };
          const createdAt = this.nextEvent();
          const id = this.generateStepId();

          const after = this.applyAssignment(formula, newAssignment);

          const step: DPLLStep = {
            id,
            type: "unit-propagation",
            variable: v,
            value,
            inputFormula: simplified, // ← formule vóór propagatie
            formula: after, // ← na propagatie
            assignment: newAssignment,
            explanation: `Unit propagation: ${v} = ${value ? "1" : "0"}`,
            parentId,
            children: [],
            unitClauses: [candidate],
            result: "UNKNOWN",
            edgeLabel: `${v} = ${value ? "1" : "0"}`,
            createdAt,
            deltaApplied: [{ variable: v, value }], // ← beslissingen in deze stap
          };

          steps.set(id, step);
          steps.get(parentId)!.children.push(id);

          // Als deze propagatie meteen beslist, kleur meteen
          if (after.clauses.length === 0) {
            step.result = "SAT";
            step.resolvedAt = createdAt;
            this.updateResultsUpwards(steps, id, createdAt);
            return "SAT";
          }
          if (after.clauses.find((c) => c.literals.length === 0)) {
            step.result = "UNSAT";
            step.resolvedAt = createdAt;
            this.updateResultsUpwards(steps, id, createdAt);
            return "UNSAT";
          }

          // Ga recursief verder — één unit-stap per keer
          return this.dpllRecursive(formula, newAssignment, id, steps);
        }
      }
    }

    // Choose variable
    const varToSplit = this.chooseVariable(simplified, assignment);
    if (!varToSplit) {
      const createdAt = this.nextEvent();
      const id = this.generateStepId();
      const node: DPLLStep = {
        id,
        type: "result",
        inputFormula: simplified,
        formula: simplified,
        assignment,
        explanation: "No unassigned variables found",
        parentId,
        children: [],
        result: "SAT",
        createdAt,
        resolvedAt: createdAt,
      };
      steps.set(id, node);
      steps.get(parentId)!.children.push(id);
      this.updateResultsUpwards(steps, id, createdAt);
      return "SAT";
    }

    // TRUE branch
    const trueId = this.generateStepId();
    const trueCreated = this.nextEvent();
    const trueAssign = { ...assignment, [varToSplit]: true };
    const trueFormula = this.applyAssignment(formula, trueAssign);
    const trueNode: DPLLStep = {
      id: trueId,
      type: "split",
      variable: varToSplit,
      value: true,
      inputFormula: simplified, // ← formule vóór de split
      formula: trueFormula, // ← na keuze
      assignment: trueAssign,
      explanation: `Split: trying ${varToSplit} = 1`,
      parentId,
      children: [],
      result: "UNKNOWN",
      edgeLabel: `${varToSplit} = 1`,
      createdAt: trueCreated,
      deltaApplied: [{ variable: varToSplit, value: true }], // ←
    };

    steps.set(trueId, trueNode);
    steps.get(parentId)!.children.push(trueId);

    let trueResult: "SAT" | "UNSAT";
    if (trueFormula.clauses.length === 0) {
      const stamp = this.nextEvent();
      trueNode.result = "SAT";
      trueNode.resolvedAt = stamp;
      this.updateResultsUpwards(steps, trueId, stamp);
      trueResult = "SAT";
    } else if (trueFormula.clauses.some((c) => c.literals.length === 0)) {
      const stamp = this.nextEvent();
      trueNode.result = "UNSAT";
      trueNode.resolvedAt = stamp;
      this.updateResultsUpwards(steps, trueId, stamp);
      trueResult = "UNSAT";
    } else {
      trueResult = this.dpllRecursive(formula, trueAssign, trueId, steps);
      trueNode.result = trueResult;
    }

    if (trueResult === "SAT" && this.options.earlyStopping) {
      const parent = steps.get(parentId);
      if (parent) this.markResolved(parent, "SAT");
      this.updateResultsUpwards(steps, trueId, trueNode.resolvedAt);
      return "SAT";
    }

    // FALSE branch
    const falseId = this.generateStepId();
    const falseCreated = this.nextEvent();
    const falseAssign = { ...assignment, [varToSplit]: false };
    const falseFormula = this.applyAssignment(formula, falseAssign);
    const falseNode: DPLLStep = {
      id: falseId,
      type: "split",
      variable: varToSplit,
      value: false,
      inputFormula: simplified,
      formula: falseFormula,
      assignment: falseAssign,
      explanation: `Split: trying ${varToSplit} = 0`,
      parentId,
      children: [],
      result: "UNKNOWN",
      edgeLabel: `${varToSplit} = 0`,
      createdAt: falseCreated,
      deltaApplied: [{ variable: varToSplit, value: false }],
    };
    steps.set(falseId, falseNode);
    steps.get(parentId)!.children.push(falseId);

    let falseResult: "SAT" | "UNSAT";
    if (falseFormula.clauses.length === 0) {
      const stamp = this.nextEvent();
      falseNode.result = "SAT";
      falseNode.resolvedAt = stamp;
      this.updateResultsUpwards(steps, falseId, stamp);
      falseResult = "SAT";
    } else if (falseFormula.clauses.some((c) => c.literals.length === 0)) {
      const stamp = this.nextEvent();
      falseNode.result = "UNSAT";
      falseNode.resolvedAt = stamp;
      this.updateResultsUpwards(steps, falseId, stamp);
      falseResult = "UNSAT";
    } else {
      falseResult = this.dpllRecursive(formula, falseAssign, falseId, steps);
      falseNode.result = falseResult;
    }

    const aggregated: "SAT" | "UNSAT" =
      trueResult === "SAT" || falseResult === "SAT" ? "SAT" : "UNSAT";
    const parent = steps.get(parentId);
    if (parent) this.markResolved(parent, aggregated);

    const lastStamp = steps.get(falseId)?.resolvedAt ?? this.eventCounter;
    this.updateResultsUpwards(steps, falseId, lastStamp);

    return aggregated;
  }

  // -------- helpers --------
  private applyAssignment(formula: Formula, assignment: Assignment): Formula {
    const newClauses: Clause[] = [];
    for (const clause of formula.clauses) {
      let satisfied = false;
      const newLits: Literal[] = [];
      for (const lit of clause.literals) {
        const varValue = assignment[lit.variable];
        if (varValue !== undefined) {
          const litVal = lit.negated ? !varValue : varValue;
          if (litVal) {
            satisfied = true;
            break;
          }
        } else newLits.push(lit);
      }
      if (!satisfied) newClauses.push({ literals: newLits });
    }
    return { clauses: newClauses, variables: formula.variables };
  }

  private chooseVariable(
    formula: Formula,
    assignment: Assignment
  ): string | null {
    for (const clause of formula.clauses) {
      for (const lit of clause.literals) {
        if (assignment[lit.variable] === undefined) return lit.variable;
      }
    }
    return null;
  }

  private generateStepId(): string {
    return `step_${++this.stepCounter}`;
  }

  private updateResultsUpwards(
    steps: Map<string, DPLLStep>,
    fromNodeId: string,
    eventStamp?: number
  ) {
    const stamp = eventStamp ?? this.nextEvent();
    let parentId = steps.get(fromNodeId)?.parentId;
    while (parentId) {
      const parent = steps.get(parentId);
      if (!parent) break;
      const childResults = parent.children.map((cid) => steps.get(cid)?.result);
      const prev = parent.result;

      if (childResults.some((r) => r === "SAT")) parent.result = "SAT";
      else if (childResults.every((r) => r === "UNSAT"))
        parent.result = "UNSAT";
      else parent.result = "UNKNOWN";

      if (
        parent.result !== "UNKNOWN" &&
        (prev === undefined || prev === "UNKNOWN") &&
        parent.resolvedAt === undefined
      ) {
        parent.resolvedAt = stamp;
      }

      parentId = parent.parentId;
    }
  }
}
