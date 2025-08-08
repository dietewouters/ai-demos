import {
  type CSP,
  type CSPStepWithSnapshot,
  type CSPStep,
  type SolveOptions,
  type Snapshot,
  type Constraint,
} from "./csp-types";

function deepCloneDomains(
  domains: Record<string, string[]>
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const k in domains) out[k] = [...domains[k]];
  return out;
}

function neighborsMap(csp: CSP): Record<string, string[]> {
  const map: Record<string, Set<string>> = {};
  csp.variables.forEach((v) => (map[v] = new Set()));
  csp.constraints.forEach((c) => {
    for (const v of c.scope) {
      for (const u of c.scope) {
        if (v !== u) map[v].add(u);
      }
    }
  });
  const res: Record<string, string[]> = {};
  for (const v in map) res[v] = Array.from(map[v]);
  return res;
}

function symbolFor(c: Constraint): string {
  if (c.label) return c.label;
  if (c.type === "neq") return "≠";
  if (c.type === "eq") return "=";
  return "⋆";
}
function invertSymbol(sym: string): string {
  if (sym === ">") return "<";
  if (sym === "<") return ">";
  if (sym === "≥") return "≤";
  if (sym === "≤") return "≥";
  return sym;
}

function findConstraint(
  csp: CSP,
  a: string,
  b: string
): Constraint | undefined {
  return csp.constraints.find(
    (c) =>
      c.scope.length === 2 &&
      ((c.scope[0] === a && c.scope[1] === b) ||
        (c.scope[0] === b && c.scope[1] === a))
  );
}

function opText(csp: CSP, from: string, to: string): string {
  const cons = findConstraint(csp, from, to);
  if (!cons) return `${from} ? ${to}`;
  const sym = symbolFor(cons);
  const oriented =
    cons.scope[0] === from && cons.scope[1] === to ? sym : invertSymbol(sym);
  return `${from} ${oriented} ${to}`;
}

function constraintSatisfied(c: Constraint, ...args: string[]): boolean {
  if (c.type === "eq" && c.scope.length === 2) return args[0] === args[1];
  if (c.type === "neq" && c.scope.length === 2) return args[0] !== args[1];
  if (c.predicate) {
    const vals: Record<string, string> = {};
    for (let i = 0; i < c.scope.length; i++) {
      vals[c.scope[i]] = args[i];
    }
    return c.predicate(vals);
  }
  return true;
}

function isConsistent(
  variable: string,
  value: string,
  assignment: Record<string, string | null>,
  csp: CSP
): boolean {
  for (const c of csp.constraints) {
    if (!c.scope.includes(variable)) continue;
    const values: Record<string, string> = { [variable]: value };
    let ready = true;
    for (const v of c.scope) {
      if (v === variable) continue;
      const val = assignment[v];
      if (val == null) {
        ready = false;
        break;
      }
      values[v] = val;
    }
    if (ready) {
      const args = c.scope.map((v) => values[v]);
      if (!constraintSatisfied(c, ...args)) {
        return false;
      }
    }
  }
  return true;
}

function selectVariable(
  csp: CSP,
  domains: Record<string, string[]>,
  assignment: Record<string, string | null>,
  options: SolveOptions
): string {
  const unassigned = csp.variables.filter((v) => assignment[v] == null);
  if (options.variableOrdering === "alpha") {
    return [...unassigned].sort()[0];
  }
  // MRV + degree tiebreak
  const neigh = neighborsMap(csp);
  let best = unassigned[0];
  let bestDom = domains[best]?.length ?? Infinity;
  let bestDeg = neigh[best]?.filter((n) => assignment[n] == null).length ?? 0;
  for (const v of unassigned) {
    const size = domains[v]?.length ?? Infinity;
    const deg = neigh[v]?.filter((n) => assignment[n] == null).length ?? 0;
    if (
      size < bestDom ||
      (size === bestDom && deg > bestDeg) ||
      (size === bestDom && deg === bestDeg && v < best)
    ) {
      best = v;
      bestDom = size;
      bestDeg = deg;
    }
  }
  return best;
}

function orderValues(
  csp: CSP,
  variable: string,
  domains: Record<string, string[]>,
  assignment: Record<string, string | null>,
  options: SolveOptions
): string[] {
  const vals = [...(domains[variable] ?? [])];
  if (options.valueOrdering === "alpha") return vals.sort();
  // LCV
  const neigh = neighborsMap(csp)[variable] ?? [];
  const score = (val: string) => {
    let eliminated = 0;
    for (const nb of neigh) {
      if (assignment[nb] != null) continue;
      const nbDom = domains[nb] ?? [];
      const cons = findConstraint(csp, variable, nb);
      if (!cons) continue;
      for (const nbVal of nbDom) {
        const ok = constraintSatisfied(
          cons,
          variable === cons.scope[0] ? val : nbVal,
          variable === cons.scope[0] ? nbVal : val
        );
        if (!ok) eliminated++;
      }
    }
    return eliminated;
  };
  return vals
    .map((v) => ({ v, s: score(v) }))
    .sort((a, b) => a.s - b.s || (a.v < b.v ? -1 : 1))
    .map((x) => x.v);
}

function snapshotOf(
  csp: CSP,
  assignment: Record<string, string | null>,
  domains: Record<string, string[]>,
  focusVar?: string,
  prunedThisStep?: Array<{ variable: string; value: string }>,
  queue?: Array<[string, string]>
): Snapshot {
  const asn: Record<string, string | null> = {};
  for (const v of csp.variables) asn[v] = assignment[v] ?? null;
  const doms: Record<string, string[]> = {};
  for (const v of csp.variables) doms[v] = [...(domains[v] ?? [])];
  return {
    assignment: asn,
    domains: doms,
    focus: focusVar ? { variable: focusVar } : undefined,
    prunedThisStep: prunedThisStep ? [...prunedThisStep] : [],
    queue: queue ? [...queue] : undefined,
  };
}

function pushStep(
  acc: CSPStepWithSnapshot[],
  csp: CSP,
  step: CSPStep,
  assignment: Record<string, string | null>,
  domains: Record<string, string[]>,
  desc: string,
  highlight?: CSPStepWithSnapshot["highlight"],
  prunedThisStep?: Array<{ variable: string; value: string }>,
  queue?: Array<[string, string]>
) {
  acc.push({
    step,
    snapshot: snapshotOf(
      csp,
      assignment,
      domains,
      highlight?.variable,
      prunedThisStep,
      queue
    ),
    description: desc,
    highlight,
  });
}

function forwardCheck(
  csp: CSP,
  variable: string,
  value: string,
  domains: Record<string, string[]>,
  stepThrough: boolean,
  push: (s: CSPStepWithSnapshot) => void,
  stepsAcc: CSPStepWithSnapshot[],
  assignment: Record<string, string | null>
): { ok: boolean; removed: Array<{ variable: string; value: string }> } {
  const pruned: Array<{ variable: string; value: string }> = [];
  let eliminatedCount = 0;
  if (stepThrough) {
    push({
      step: { kind: "forward-check-start", variable },
      snapshot: snapshotOf(csp, assignment, domains, variable, [], undefined),
      description: `Forward Checking gestart voor ${variable} = ${value}`,
      highlight: { variable },
    });
  }
  for (const c of csp.constraints) {
    const [a, b] = c.scope;
    const nb = a === variable ? b : b === variable ? a : null;
    if (!nb) continue;
    if (assignment[nb] != null) continue;
    const nbDom = domains[nb];
    const before = nbDom.length;
    let removedVals: string[] = [];
    domains[nb] = nbDom.filter((v) => {
      const ok = constraintSatisfied(
        c,
        variable === a ? value : v,
        variable === a ? v : value
      );
      if (!ok) removedVals.push(v);
      return ok;
    });
    eliminatedCount += before - domains[nb].length;
    for (const rv of removedVals) {
      pruned.push({ variable: nb, value: rv });
      if (stepThrough) {
        push({
          step: {
            kind: "forward-check-eliminate",
            from: variable,
            to: nb,
            valueEliminated: rv,
            reason: "Constraint",
          },
          snapshot: snapshotOf(
            csp,
            assignment,
            domains,
            nb,
            [{ variable: nb, value: rv }],
            undefined
          ),
          description: `FC: verwijder ${rv} uit domein(${nb}) door ${opText(
            csp,
            variable,
            nb
          )}`,
          highlight: { variable: nb },
        });
      }
    }
    if (domains[nb].length === 0) {
      if (!stepThrough) {
        push({
          step: { kind: "forward-check-end", eliminatedCount },
          snapshot: snapshotOf(
            csp,
            assignment,
            domains,
            variable,
            pruned,
            undefined
          ),
          description: `FC beëindigd: ${eliminatedCount} waarden verwijderd (leeg domein gevonden)`,
          highlight: { variable },
        });
      }
      return { ok: false, removed: pruned };
    }
  }
  if (!stepThrough) {
    push({
      step: { kind: "forward-check-end", eliminatedCount },
      snapshot: snapshotOf(
        csp,
        assignment,
        domains,
        variable,
        pruned,
        undefined
      ),
      description: `FC beëindigd: ${eliminatedCount} waarden verwijderd`,
      highlight: { variable },
    });
  } else {
    push({
      step: { kind: "forward-check-end", eliminatedCount },
      snapshot: snapshotOf(
        csp,
        assignment,
        domains,
        variable,
        pruned,
        undefined
      ),
      description: `FC afgerond`,
      highlight: { variable },
    });
  }
  return { ok: true, removed: pruned };
}

function ac3(
  csp: CSP,
  domains: Record<string, string[]>,
  stepThrough: boolean,
  push: (s: CSPStepWithSnapshot) => void,
  stepsAcc: CSPStepWithSnapshot[],
  assignment: Record<string, string | null>
): { ok: boolean; pruned: Array<{ variable: string; value: string }> } {
  const arcs: Array<[string, string]> = [];
  for (const c of csp.constraints) {
    const [a, b] = c.scope;
    arcs.push([a, b]);
    arcs.push([b, a]);
  }
  const queue: Array<[string, string]> = [...arcs];
  const prunedAll: Array<{ variable: string; value: string }> = [];

  if (stepThrough) {
    push({
      step: { kind: "ac3-start" },
      snapshot: snapshotOf(csp, assignment, domains, undefined, [], queue),
      description: "AC-3 gestart",
    });
    for (const arc of queue) {
      push({
        step: { kind: "ac3-enqueue", arc },
        snapshot: snapshotOf(csp, assignment, domains, undefined, [], queue),
        description: `AC-3: in wachtrij ${opText(csp, arc[0], arc[1])}`,
        highlight: { edge: arc },
      });
    }
  } else {
    push({
      step: { kind: "ac3-start" },
      snapshot: snapshotOf(csp, assignment, domains, undefined, [], queue),
      description: "AC-3 gestart",
    });
  }

  const neighs = neighborsMap(csp);
  const findConstraintLocal = (xi: string, xj: string) =>
    csp.constraints.find(
      (c) =>
        (c.scope[0] === xi && c.scope[1] === xj) ||
        (c.scope[1] === xi && c.scope[0] === xj)
    );

  while (queue.length > 0) {
    const arc = queue.shift()!;
    const [xi, xj] = arc;
    if (stepThrough) {
      push({
        step: { kind: "ac3-dequeue", arc },
        snapshot: snapshotOf(csp, assignment, domains, xi, [], queue),
        description: `AC-3: verwerk ${opText(csp, xi, xj)}`,
        highlight: { edge: arc, variable: xi },
      });
    }
    const cons = findConstraintLocal(xi, xj);
    if (!cons) continue;
    const removed: string[] = [];
    const di = domains[xi];
    for (let k = di.length - 1; k >= 0; k--) {
      const vi = di[k];
      let supported = false;
      for (const vj of domains[xj]) {
        if (
          constraintSatisfied(
            cons,
            cons.scope[0] === xi ? vi : vj,
            cons.scope[0] === xi ? vj : vi
          )
        ) {
          supported = true;
          break;
        }
      }
      if (!supported) {
        di.splice(k, 1);
        removed.push(vi);
        prunedAll.push({ variable: xi, value: vi });
      }
    }
    if (removed.length > 0) {
      if (stepThrough) {
        push({
          step: { kind: "ac3-revise", arc, removed },
          snapshot: snapshotOf(
            csp,
            assignment,
            domains,
            xi,
            removed.map((v) => ({ variable: xi, value: v })),
            queue
          ),
          description: `AC-3: revise ${opText(
            csp,
            xi,
            xj
          )} — verwijderd: ${removed.join(", ")}`,
          highlight: { edge: arc, variable: xi },
        });
      }
      if (domains[xi].length === 0) {
        push({
          step: { kind: "ac3-end", result: "inconsistent" },
          snapshot: snapshotOf(
            csp,
            assignment,
            domains,
            xi,
            removed.map((v) => ({ variable: xi, value: v })),
            queue
          ),
          description: "AC-3 beëindigd: inconsistent (leeg domein)",
          highlight: { variable: xi },
        });
        return { ok: false, pruned: prunedAll };
      }
      for (const xk of neighs[xi]) {
        if (xk === xj) continue;
        queue.push([xk, xi]);
        if (stepThrough) {
          push({
            step: { kind: "ac3-enqueue", arc: [xk, xi] },
            snapshot: snapshotOf(csp, assignment, domains, xi, [], queue),
            description: `AC-3: in wachtrij ${opText(csp, xk, xi)}`,
            highlight: { edge: [xk, xi], variable: xi },
          });
        }
      }
    } else if (stepThrough) {
      push({
        step: { kind: "ac3-revise", arc, removed },
        snapshot: snapshotOf(csp, assignment, domains, xi, [], queue),
        description: `AC-3: revise ${opText(
          csp,
          xi,
          xj
        )} — geen verwijderingen`,
        highlight: { edge: arc, variable: xi },
      });
    }
  }

  push({
    step: { kind: "ac3-end", result: "consistent" },
    snapshot: snapshotOf(csp, assignment, domains, undefined, prunedAll, []),
    description: "AC-3 afgerond (consistent)",
  });
  return { ok: true, pruned: prunedAll };
}

export function solveCSP(
  csp: CSP,
  options: SolveOptions
): { steps: CSPStepWithSnapshot[] } {
  const steps: CSPStepWithSnapshot[] = [];
  const initialAssignment: Record<string, string | null> = {};
  for (const v of csp.variables) initialAssignment[v] = null;
  const initialDomains = deepCloneDomains(csp.domains);

  const push = (s: CSPStepWithSnapshot) => {
    steps.push(s);
  };

  function backtrack(
    assignment: Record<string, string | null>,
    domains: Record<string, string[]>
  ): boolean {
    const unassigned = csp.variables.filter((v) => assignment[v] == null);
    if (unassigned.length === 0) {
      pushStep(
        steps,
        csp,
        { kind: "success", assignment: assignment as Record<string, string> },
        assignment,
        domains,
        "Oplossing gevonden"
      );
      return true;
    }

    const variable = selectVariable(csp, domains, assignment, options);
    pushStep(
      steps,
      csp,
      { kind: "select-variable", variable },
      assignment,
      domains,
      `Selecteer variabele ${variable}`,
      { variable }
    );

    const orderedValues = orderValues(
      csp,
      variable,
      domains,
      assignment,
      options
    );
    pushStep(
      steps,
      csp,
      {
        kind: "order-values",
        variable,
        order: orderedValues,
        heuristic: options.valueOrdering,
      },
      assignment,
      domains,
      `Volgorde waarden voor ${variable}: ${orderedValues.join(", ")}`,
      { variable }
    );

    for (const value of orderedValues) {
      pushStep(
        steps,
        csp,
        { kind: "try-value", variable, value },
        assignment,
        domains,
        `Probeer ${variable} = ${value}`,
        {
          variable,
        }
      );

      // Check against already assigned neighbors
      let consistent = true;
      const neighs = neighborsMap(csp)[variable] ?? [];
      for (const nb of neighs) {
        if (assignment[nb] != null) {
          const cons = findConstraint(csp, variable, nb)!;
          const ok = constraintSatisfied(
            cons,
            cons.scope[0] === variable ? value : assignment[nb]!,
            cons.scope[0] === variable ? assignment[nb]! : value
          );
          pushStep(
            steps,
            csp,
            {
              kind: "check-constraint",
              variable,
              neighbor: nb,
              edge: [variable, nb],
              consistent: ok,
            },
            assignment,
            domains,
            `Check constraint ${opText(csp, variable, nb)}: ${
              ok ? "OK" : "Conflict"
            }`,
            { edge: [variable, nb], variable }
          );
          if (!ok) {
            consistent = false;
            break;
          }
        }
      }
      if (!consistent) {
        continue;
      }

      // Assign
      assignment[variable] = value;
      pushStep(
        steps,
        csp,
        { kind: "assign", variable, value },
        assignment,
        domains,
        `Wijs toe: ${variable} = ${value}`,
        {
          variable,
        }
      );

      // Save domains snapshot to restore on backtrack
      const savedDomains = deepCloneDomains(domains);

      // Constraint propagation
      let propagationOK = true;
      if (options.algorithm === "BT_FC") {
        const pusher = (s: CSPStepWithSnapshot) => push(s);
        const res = forwardCheck(
          csp,
          variable,
          value,
          domains,
          options.stepThroughFC,
          pusher,
          steps,
          assignment
        );
        if (!res.ok) propagationOK = false;
      } else if (options.algorithm === "BT_AC3") {
        const pusher = (s: CSPStepWithSnapshot) => push(s);
        const res = ac3(
          csp,
          domains,
          options.stepThroughAC3,
          pusher,
          steps,
          assignment
        );
        if (!res.ok) propagationOK = false;
      }

      if (propagationOK) {
        const ok = backtrack(assignment, domains);
        if (ok) return true;
      }

      // Backtrack: unassign and restore domains
      pushStep(
        steps,
        csp,
        { kind: "backtrack", variable },
        assignment,
        domains,
        `Backtrack vanaf ${variable}`,
        {
          variable,
        }
      );
      assignment[variable] = null;
      pushStep(
        steps,
        csp,
        { kind: "unassign", variable },
        assignment,
        domains,
        `Maak ongedaan: ${variable}`,
        {
          variable,
        }
      );
      for (const k in domains) domains[k] = [...savedDomains[k]];
    }

    return false;
  }

  // Initial snapshot
  steps.push({
    step: { kind: "forward-check-end", eliminatedCount: 0 },
    snapshot: snapshotOf(
      csp,
      initialAssignment,
      initialDomains,
      undefined,
      [],
      undefined
    ),
    description: "Initieel: geen toewijzingen, oorspronkelijke domeinen",
  });
  const solutionFound = backtrack(
    { ...initialAssignment },
    deepCloneDomains(initialDomains)
  );
  if (!solutionFound) {
    pushStep(
      steps,
      csp,
      { kind: "failure" },
      initialAssignment,
      initialDomains,
      "Geen oplossing gevonden"
    );
  }
  return { steps };
}
