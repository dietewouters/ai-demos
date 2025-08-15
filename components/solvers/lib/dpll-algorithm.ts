import type {
  Formula,
  Clause,
  Literal,
  Assignment,
  DPLLStep,
  DPLLTree,
  DPLLOptions,
} from "@/components/solvers/lib/dpll-types";

export class DPLLSolver {
  private options: DPLLOptions;
  private stepCounter = 0;
  private eventCounter = 0; // voor progressive reveal

  constructor(options: DPLLOptions) {
    this.options = options;
  }

  // ---- Progressive reveal helpers ----
  private nextEvent(): number {
    return ++this.eventCounter;
  }

  // markeer node resolved en timestamp het moment (alleen eerste keer)
  private markResolved(step: DPLLStep, result: "SAT" | "UNSAT") {
    step.result = result;
    if (step.resolvedAt === undefined) {
      step.resolvedAt = this.nextEvent();
    }
  }

  // ---- Public API ----
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

    // Start de recursie
    this.dpllRecursive(formula, {}, rootId, steps);

    if (!this.options.earlyStopping) {
      this.calculateModelCounts(steps, formula.variables);
    }

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

    // #SAT telt altijd alles (geen early stop)
    const originalOptions = this.options;
    this.options = { ...this.options, earlyStopping: false };

    this.dpllRecursive(formula, {}, rootId, steps);
    this.calculateModelCounts(steps, formula.variables);

    this.options = originalOptions;

    return { steps, rootId, currentStepId: rootId };
  }

  // ---- Model count (post-order) ----
  private calculateModelCounts(
    steps: Map<string, DPLLStep>,
    allVariables: Set<string>
  ) {
    const visited = new Set<string>();

    const calculateForNode = (stepId: string): number => {
      if (visited.has(stepId)) return steps.get(stepId)?.modelCount ?? 0;
      visited.add(stepId);

      const step = steps.get(stepId);
      if (!step) return 0;

      if (step.children.length === 0) {
        if (step.result === "SAT") {
          const unassignedCount = this.countUnassignedVariables(
            step.assignment,
            allVariables
          );
          step.modelCount = Math.pow(2, unassignedCount);
          step.explanation += ` (${unassignedCount} unassigned vars → 2^${unassignedCount} = ${step.modelCount} models)`;
        } else {
          step.modelCount = 0;
        }
        return step.modelCount;
      }

      let total = 0;
      for (const cid of step.children) total += calculateForNode(cid);
      step.modelCount = total;

      if (step.type === "split") {
        step.explanation += ` (Total models: ${total})`;
      } else if (step.type === "unit-propagation") {
        step.explanation += ` (Propagated models: ${total})`;
      }
      return total;
    };

    const root = Array.from(steps.values()).find((s) => !s.parentId);
    if (root) calculateForNode(root.id);
  }

  private countUnassignedVariables(
    assignment: Assignment,
    allVariables: Set<string>
  ): number {
    let cnt = 0;
    for (const v of allVariables) if (assignment[v] === undefined) cnt++;
    return cnt;
  }

  // ---- DPLL core ----
  private dpllRecursive(
    formula: Formula,
    assignment: Assignment,
    parentId: string,
    steps: Map<string, DPLLStep>
  ): "SAT" | "UNSAT" {
    const simplifiedFormula = this.applyAssignment(formula, assignment);

    // SAT-leaf (alle clauses weg)
    if (simplifiedFormula.clauses.length === 0) {
      const createdAt = this.nextEvent();
      const stepId = this.generateStepId();
      const step: DPLLStep = {
        id: stepId,
        type: "result",
        formula: simplifiedFormula,
        assignment,
        explanation: "All clauses satisfied - formula is SAT",
        parentId,
        children: [],
        result: "SAT",
        createdAt,
        resolvedAt: createdAt,
      };
      steps.set(stepId, step);
      steps.get(parentId)!.children.push(stepId);
      this.updateResultsUpwards(steps, stepId, createdAt);
      return "SAT";
    }

    // UNSAT-leaf (lege clausule)
    const emptyClause = simplifiedFormula.clauses.find(
      (c) => c.literals.length === 0
    );
    if (emptyClause) {
      const createdAt = this.nextEvent();
      const stepId = this.generateStepId();
      const step: DPLLStep = {
        id: stepId,
        type: "result",
        formula: simplifiedFormula,
        assignment,
        explanation: "Empty clause found - formula is UNSAT",
        parentId,
        children: [],
        result: "UNSAT",
        createdAt,
        resolvedAt: createdAt,
      };
      steps.set(stepId, step);
      steps.get(parentId)!.children.push(stepId);
      this.updateResultsUpwards(steps, stepId, createdAt);
      return "UNSAT";
    }

    // Unit propagation (dedup + conflicts + edgeLabel)
    if (this.options.unitPropagation) {
      const unitClausesAll = simplifiedFormula.clauses.filter(
        (c) => c.literals.length === 1
      );

      if (unitClausesAll.length > 0) {
        const units = new Map<string, boolean>(); // var -> value
        const conflicts = new Set<string>();

        for (const uc of unitClausesAll) {
          const lit = uc.literals[0];
          const value = !lit.negated;
          if (units.has(lit.variable) && units.get(lit.variable) !== value) {
            conflicts.add(lit.variable);
          } else {
            units.set(lit.variable, value);
          }
        }

        // Conflict in dezelfde ronde → UNSAT
        if (conflicts.size > 0) {
          const pretty = Array.from(conflicts)
            .map((v) => `${v} en ¬${v}`)
            .join(", ");
          const createdAt = this.nextEvent();
          const stepId = this.generateStepId();
          const step: DPLLStep = {
            id: stepId,
            type: "result",
            formula: simplifiedFormula,
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
          steps.set(stepId, step);
          steps.get(parentId)!.children.push(stepId);
          this.updateResultsUpwards(steps, stepId, createdAt);
          return "UNSAT";
        }

        // Pas unieke units toe; check conflict met bestaand pad
        const newAssignment = { ...assignment };
        let hasChanges = false;
        for (const [variable, value] of units) {
          if (newAssignment[variable] === undefined) {
            newAssignment[variable] = value;
            hasChanges = true;
          } else if (newAssignment[variable] !== value) {
            const createdAt = this.nextEvent();
            const stepId = this.generateStepId();
            const step: DPLLStep = {
              id: stepId,
              type: "result",
              formula: simplifiedFormula,
              assignment,
              explanation: `Conflict with existing assignment for ${variable} (wanted ${
                value ? "T" : "F"
              }) ⇒ UNSAT`,
              parentId,
              children: [],
              result: "UNSAT",
              createdAt,
              resolvedAt: createdAt,
              edgeLabel: `${variable} conflict`,
            };
            steps.set(stepId, step);
            steps.get(parentId)!.children.push(stepId);
            this.updateResultsUpwards(steps, stepId, createdAt);
            return "UNSAT";
          }
        }

        // We hebben nieuwe toekenningen door unit-prop
        if (hasChanges) {
          const createdAt = this.nextEvent();
          const stepId = this.generateStepId();
          const afterUnit = this.applyAssignment(formula, newAssignment);

          const unitList = Array.from(units.entries())
            .map(([v, val]) => `${v}=${val ? "T" : "F"}`)
            .join(", ");

          // Maak de unit-prop node
          const step: DPLLStep = {
            id: stepId,
            type: "unit-propagation",
            formula: afterUnit,
            assignment: newAssignment,
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
          steps.set(stepId, step);
          steps.get(parentId)!.children.push(stepId);

          // ⬇️ BESLIST DEZE NODE ZELF?
          if (afterUnit.clauses.length === 0) {
            // alle clauses weg → SAT
            step.result = "SAT";
            step.resolvedAt = createdAt;
            this.updateResultsUpwards(steps, stepId, createdAt);
            return "SAT";
          }
          if (afterUnit.clauses.some((c) => c.literals.length === 0)) {
            // lege clausule aanwezig → UNSAT
            step.result = "UNSAT";
            step.resolvedAt = createdAt;
            this.updateResultsUpwards(steps, stepId, createdAt);
            return "UNSAT";
          }

          // Anders: verder naar beneden
          return this.dpllRecursive(formula, newAssignment, stepId, steps);
        }
      }
    }

    // Kies variabele voor split
    const unassignedVar = this.chooseVariable(simplifiedFormula, assignment);
    if (!unassignedVar) {
      // geen variabelen meer → SAT (zou zelden gebeuren door de checks hierboven)
      const createdAt = this.nextEvent();
      const stepId = this.generateStepId();
      const step: DPLLStep = {
        id: stepId,
        type: "result",
        formula: simplifiedFormula,
        assignment,
        explanation: "No unassigned variables found",
        parentId,
        children: [],
        result: "SAT",
        createdAt,
        resolvedAt: createdAt,
      };
      steps.set(stepId, step);
      steps.get(parentId)!.children.push(stepId);
      this.updateResultsUpwards(steps, stepId, createdAt);
      return "SAT";
    }

    // Split: var = true
    const trueStepId = this.generateStepId();
    const trueCreated = this.nextEvent();
    const trueAssignment = { ...assignment, [unassignedVar]: true };
    const trueFormula = this.applyAssignment(formula, trueAssignment);
    const trueStep: DPLLStep = {
      id: trueStepId,
      type: "split",
      variable: unassignedVar,
      value: true,
      formula: trueFormula,
      assignment: trueAssignment,
      explanation: `Split: trying ${unassignedVar} = T`,
      parentId,
      children: [],
      result: "UNKNOWN",
      edgeLabel: `${unassignedVar} = T`,
      createdAt: trueCreated,
    };
    steps.set(trueStepId, trueStep);
    steps.get(parentId)!.children.push(trueStepId);

    // ⬇️ Als deze keuze meteen beslist, markeer de split-node zelf en geen child
    let trueResult: "SAT" | "UNSAT";
    if (trueFormula.clauses.length === 0) {
      const stamp = this.nextEvent();
      trueStep.result = "SAT";
      trueStep.resolvedAt = stamp;
      this.updateResultsUpwards(steps, trueStepId, stamp);
      trueResult = "SAT";
    } else if (trueFormula.clauses.some((c) => c.literals.length === 0)) {
      const stamp = this.nextEvent();
      trueStep.result = "UNSAT";
      trueStep.resolvedAt = stamp;
      this.updateResultsUpwards(steps, trueStepId, stamp);
      trueResult = "UNSAT";
    } else {
      trueResult = this.dpllRecursive(
        formula,
        trueAssignment,
        trueStepId,
        steps
      );
      trueStep.result = trueResult;
    }

    if (trueResult === "SAT" && this.options.earlyStopping) {
      const parent = steps.get(parentId);
      if (parent) this.markResolved(parent, "SAT");
      this.updateResultsUpwards(steps, trueStepId, trueStep.resolvedAt);
      return "SAT";
    }

    // Split: var = false
    const falseStepId = this.generateStepId();
    const falseCreated = this.nextEvent();
    const falseAssignment = { ...assignment, [unassignedVar]: false };
    const falseFormula = this.applyAssignment(formula, falseAssignment);
    const falseStep: DPLLStep = {
      id: falseStepId,
      type: "split",
      variable: unassignedVar,
      value: false,
      formula: falseFormula,
      assignment: falseAssignment,
      explanation: `Split: trying ${unassignedVar} = F`,
      parentId,
      children: [],
      result: "UNKNOWN",
      edgeLabel: `${unassignedVar} = F`,
      createdAt: falseCreated,
    };
    steps.set(falseStepId, falseStep);
    steps.get(parentId)!.children.push(falseStepId);

    let falseResult: "SAT" | "UNSAT";
    if (falseFormula.clauses.length === 0) {
      const stamp = this.nextEvent();
      falseStep.result = "SAT";
      falseStep.resolvedAt = stamp;
      this.updateResultsUpwards(steps, falseStepId, stamp);
      falseResult = "SAT";
    } else if (falseFormula.clauses.some((c) => c.literals.length === 0)) {
      const stamp = this.nextEvent();
      falseStep.result = "UNSAT";
      falseStep.resolvedAt = stamp;
      this.updateResultsUpwards(steps, falseStepId, stamp);
      falseResult = "UNSAT";
    } else {
      falseResult = this.dpllRecursive(
        formula,
        falseAssignment,
        falseStepId,
        steps
      );
      falseStep.result = falseResult;
    }

    // Aggregatie & bubbelen
    const aggregated: "SAT" | "UNSAT" =
      trueResult === "SAT" || falseResult === "SAT" ? "SAT" : "UNSAT";
    const parent = steps.get(parentId);
    if (parent) this.markResolved(parent, aggregated);
    this.updateResultsUpwards(steps, falseStepId);

    return aggregated;
  }

  // ---- Helpers ----
  private applyAssignment(formula: Formula, assignment: Assignment): Formula {
    const newClauses: Clause[] = [];

    for (const clause of formula.clauses) {
      let clauseSatisfied = false;
      const newLiterals: Literal[] = [];

      for (const literal of clause.literals) {
        const varValue = assignment[literal.variable];
        if (varValue !== undefined) {
          const literalValue = literal.negated ? !varValue : varValue;
          if (literalValue) {
            clauseSatisfied = true;
            break;
          }
          // anders literal is false → niet toevoegen
        } else {
          newLiterals.push(literal);
        }
      }

      if (!clauseSatisfied) {
        newClauses.push({ literals: newLiterals });
      }
    }

    return { clauses: newClauses, variables: formula.variables };
  }

  private chooseVariable(
    formula: Formula,
    assignment: Assignment
  ): string | null {
    // simpele heuristiek: eerste on-Assigned variabele die voorkomt
    for (const clause of formula.clauses) {
      for (const literal of clause.literals) {
        if (assignment[literal.variable] === undefined) return literal.variable;
      }
    }
    return null;
  }

  private generateStepId(): string {
    return `step_${++this.stepCounter}`;
  }

  // bubbel parent-resultaten omhoog + timestamp wanneer ze voor het eerst resolved worden
  private updateResultsUpwards(
    steps: Map<string, DPLLStep>,
    fromNodeId: string,
    eventStamp?: number // ← NIEUW
  ) {
    // gebruik dezelfde timestamp als de triggerende leaf/conflict
    const stamp = eventStamp ?? this.nextEvent();

    let parentId = steps.get(fromNodeId)?.parentId;
    while (parentId) {
      const parent = steps.get(parentId);
      if (!parent) break;

      const childResults = parent.children.map((cid) => steps.get(cid)?.result);
      const prev = parent.result;

      if (childResults.some((r) => r === "SAT")) {
        parent.result = "SAT";
      } else if (childResults.every((r) => r === "UNSAT")) {
        parent.result = "UNSAT";
      } else {
        parent.result = "UNKNOWN";
      }

      // timestamp ouder op het moment van dit event (niet een nieuw event)
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
