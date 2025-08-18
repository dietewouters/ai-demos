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

    // ⛔️ No model counting here anymore for DPLL.
    // We expose a public calculate method you can call later from the UI.

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
    // variables-set lives on the root formula you started with
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

  // -------- Core DPLL (unchanged logic, still progressive) --------
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
        formula: simplified,
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

    // Unit propagation (with immediate decide if afterUnit decides)
    if (this.options.unitPropagation) {
      const unitsAll = simplified.clauses.filter(
        (c) => c.literals.length === 1
      );
      if (unitsAll.length > 0) {
        const units = new Map<string, boolean>();
        const conflicts = new Set<string>();

        for (const uc of unitsAll) {
          const lit = uc.literals[0];
          const val = !lit.negated;
          if (units.has(lit.variable) && units.get(lit.variable) !== val)
            conflicts.add(lit.variable);
          else units.set(lit.variable, val);
        }

        if (conflicts.size > 0) {
          const pretty = Array.from(conflicts)
            .map((v) => `${v} en ¬${v}`)
            .join(", ");
          const createdAt = this.nextEvent();
          const id = this.generateStepId();
          const node: DPLLStep = {
            id,
            type: "result",
            formula: simplified,
            assignment,
            explanation: `Conflicting unit clauses (${pretty}) ⇒ UNSAT`,
            parentId,
            children: [],
            result: "UNSAT",
            createdAt,
            resolvedAt: createdAt,
            edgeLabel: Array.from(conflicts)
              .map((v) => `${v} conflict`)
              .join(", "),
          };
          steps.set(id, node);
          steps.get(parentId)!.children.push(id);
          this.updateResultsUpwards(steps, id, createdAt);
          return "UNSAT";
        }

        const nextAssign = { ...assignment };
        let changed = false;
        for (const [v, val] of units) {
          if (nextAssign[v] === undefined) {
            nextAssign[v] = val;
            changed = true;
          } else if (nextAssign[v] !== val) {
            const createdAt = this.nextEvent();
            const id = this.generateStepId();
            const node: DPLLStep = {
              id,
              type: "result",
              formula: simplified,
              assignment,
              explanation: `Conflict with existing assignment for ${v} (wanted ${
                val ? "T" : "F"
              }) ⇒ UNSAT`,
              parentId,
              children: [],
              result: "UNSAT",
              createdAt,
              resolvedAt: createdAt,
              edgeLabel: `${v} conflict`,
            };
            steps.set(id, node);
            steps.get(parentId)!.children.push(id);
            this.updateResultsUpwards(steps, id, createdAt);
            return "UNSAT";
          }
        }

        if (changed) {
          const createdAt = this.nextEvent();
          const id = this.generateStepId();
          const afterUnit = this.applyAssignment(formula, nextAssign);
          const unitList = Array.from(units.entries())
            .map(([v, val]) => `${v}=${val ? "T" : "F"}`)
            .join(", ");
          const node: DPLLStep = {
            id,
            type: "unit-propagation",
            formula: afterUnit,
            assignment: nextAssign,
            explanation: `Unit propagation: ${unitList}`,
            parentId,
            children: [],
            unitClauses: Array.from(units.entries()).map(
              ([variable, value]) => ({
                literals: [{ variable, negated: !value }],
              })
            ) as Clause[],
            result: "UNKNOWN",
            edgeLabel: unitList,
            createdAt,
          };
          steps.set(id, node);
          steps.get(parentId)!.children.push(id);

          if (afterUnit.clauses.length === 0) {
            node.result = "SAT";
            node.resolvedAt = createdAt;
            this.updateResultsUpwards(steps, id, createdAt);
            return "SAT";
          }
          if (afterUnit.clauses.some((c) => c.literals.length === 0)) {
            node.result = "UNSAT";
            node.resolvedAt = createdAt;
            this.updateResultsUpwards(steps, id, createdAt);
            return "UNSAT";
          }

          return this.dpllRecursive(formula, nextAssign, id, steps);
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
      formula: trueFormula,
      assignment: trueAssign,
      explanation: `Split: trying ${varToSplit} = T`,
      parentId,
      children: [],
      result: "UNKNOWN",
      edgeLabel: `${varToSplit} = T`,
      createdAt: trueCreated,
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
      formula: falseFormula,
      assignment: falseAssign,
      explanation: `Split: trying ${varToSplit} = F`,
      parentId,
      children: [],
      result: "UNKNOWN",
      edgeLabel: `${varToSplit} = F`,
      createdAt: falseCreated,
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
