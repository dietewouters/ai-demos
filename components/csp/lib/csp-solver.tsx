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
  let sym = symbolFor(cons);

  const forward = cons.scope[0] === from && cons.scope[1] === to;
  if (!forward) {
    const mEq = sym.match(/^=\s*([+-]?\d+(?:\.\d+)?)$/);
    const mCmp = sym.match(/^([<>]=?)\s*([+-]?\d+(?:\.\d+)?)$/);
    const mAbs = sym.match(
      /^\|([A-Za-z])\s*-\s*([A-Za-z])\|\s*([<>]=?)\s*([+-]?\d+(?:\.\d+)?)$/
    );

    if (mEq) {
      let k = parseFloat(mEq[1]);
      return `${to} = ${from} ${k >= 0 ? "-" : "+"} ${Math.abs(k)}`;
    }
    if (mCmp) {
      let op = mCmp[1];
      let k = parseFloat(mCmp[2]);
      op = invertSymbol(op);
      return `${to} ${op} ${from} ${k >= 0 ? "-" : "+"} ${Math.abs(k)}`;
    }
    if (mAbs) {
      const op = mAbs[3];
      const k = mAbs[4];
      return `|${to} - ${from}| ${op} ${k}`;
    }

    sym = invertSymbol(sym);
    return `${to} ${sym} ${from}`;
  }

  return `${from} ${sym} ${to}`;
}

function callPredicate(c: Constraint, args: string[]): boolean {
  if (!c.predicate) return true;

  const valsOrig: Record<string, string> = {};
  const valsLower: Record<string, string> = {};
  for (let i = 0; i < c.scope.length; i++) {
    const key = c.scope[i];
    valsOrig[key] = args[i];
    valsLower[key.toLowerCase()] = args[i];
  }
  const vals = { ...valsOrig, ...valsLower };

  const results: boolean[] = [];
  try {
    if ((c.predicate as any).length >= c.scope.length) {
      const r = (c.predicate as any)(...args);
      if (typeof r === "boolean") results.push(r);
    }
  } catch {}
  try {
    const r2 = (c.predicate as any)(vals);
    if (typeof r2 === "boolean") results.push(r2);
  } catch {}

  if (results.includes(false)) return false;
  if (results.includes(true)) return true;
  return true;
}

function constraintSatisfied(c: Constraint, ...args: string[]): boolean {
  if (c.type === "eq" && c.scope.length === 2) return args[0] === args[1];
  if (c.type === "neq" && c.scope.length === 2) return args[0] !== args[1];
  if (c.predicate) return callPredicate(c, args);
  return true;
}

function formatConstraint(c: Constraint): string {
  const raw = (c.label ?? symbolFor(c)).trim();

  // unary
  if (c.scope.length === 1) return `${c.scope[0]} ${raw}`;

  // non-binary
  if (c.scope.length !== 2) return `${raw}(${c.scope.join(", ")})`;

  const [L, R] = c.scope;

  // |X - Y| op k  → |L - R| op k
  const mAbs = raw.match(
    /^\|\s*[A-Za-z]+\s*-\s*[A-Za-z]+\s*\|\s*(≥|<=|>=|≤|<|>)\s*([+-]?\d+)$/
  );
  if (mAbs) {
    const op = mAbs[1] === ">=" ? "≥" : mAbs[1] === "<=" ? "≤" : mAbs[1];
    const k = parseInt(mAbs[2], 10);
    return `|${L} - ${R}| ${op} ${k}`;
  }

  // "= k" betekent: L = R + k
  const mEqDiff = raw.match(/^=\s*([+-]?\d+)$/);
  if (mEqDiff) {
    const k = parseInt(mEqDiff[1], 10);
    const sign = k >= 0 ? "+ " : "- ";
    return `${L} = ${R} ${sign}${Math.abs(k)}`;
  }

  // comparator met constante: "op k"  → L op R ± k
  const mCmp = raw.match(/^([<>]=?|≥|≤)\s*([+-]?\d+)$/);
  if (mCmp) {
    const op = mCmp[1];
    const k = parseInt(mCmp[2], 10);
    const sign = k >= 0 ? "+ " : "- ";
    return `${L} ${op} ${R} ${sign}${Math.abs(k)}`;
  }

  // enkel operator (≠, =, >, <, ≥, ≤)
  return `${L} ${raw} ${R}`;
}

function formatScopeValues(c: Constraint, args: string[]): string {
  return c.scope.map((v, i) => `${v}=${args[i]}`).join(", ");
}

/**
 * Check of (variable=value) consistent is met ALLE constraints die deze variabele bevatten
 * en waarvan de overige variabelen al geassigneerd zijn. Geeft detail terug bij conflict.
 */
function isConsistent(
  variable: string,
  value: string,
  assignment: Record<string, string | null>,
  csp: CSP
): { ok: true } | { ok: false; constraint: Constraint; args: string[] } {
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
        return { ok: false, constraint: c, args };
      }
    }
  }
  return { ok: true };
}

function canKeepValue(
  csp: CSP,
  variableY: string,
  y: string,
  assignmentPlus: Record<string, string | null>
): boolean {
  for (const c of csp.constraints) {
    if (!c.scope.includes(variableY)) continue;

    const values: Record<string, string> = { [variableY]: y };
    let ready = true;
    for (const v of c.scope) {
      if (v === variableY) continue;
      const val = assignmentPlus[v];
      if (val == null) {
        ready = false;
        break;
      }
      values[v] = val;
    }
    if (!ready) continue;

    const args = c.scope.map((v) => values[v]);
    if (!constraintSatisfied(c, ...args)) return false;
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

  const neigh = neighborsMap(csp)[variable] ?? [];

  const score = (val: string) => {
    let eliminated = 0;
    const augmented: Record<string, string | null> = {
      ...assignment,
      [variable]: val,
    };

    for (const nb of neigh) {
      if (assignment[nb] != null) continue;
      const nbDom = domains[nb] ?? [];
      for (const nbVal of nbDom) {
        if (!canKeepValue(csp, nb, nbVal, augmented)) eliminated++;
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
function lcvScores(
  csp: CSP,
  variable: string,
  domains: Record<string, string[]>,
  assignment: Record<string, string | null>
) {
  const neighs = neighborsMap(csp)[variable] ?? [];
  const values = [...(domains[variable] ?? [])];
  const labelOf = (c: Constraint) => formatConstraint(c);

  return values.map((val) => {
    const augmented: Record<string, string | null> = {
      ...assignment,
      [variable]: val,
    };

    const byNeighbor: Array<{
      neighbor: string;
      removed: string[];
      perConstraint: Array<{ label: string; removed: string[] }>;
    }> = [];

    for (const nb of neighs) {
      if (assignment[nb] != null) continue;

      const nbDom = domains[nb] ?? [];
      const consForNb = csp.constraints.filter((c) => c.scope.includes(nb));

      const removed: string[] = [];
      const perC: Map<string, string[]> = new Map();

      for (const nbVal of nbDom) {
        let culprit: string | null = null;

        for (const c of consForNb) {
          const valuesForC: Record<string, string> = { [nb]: nbVal };
          let ready = true;
          for (const v2 of c.scope) {
            if (v2 === nb) continue;
            const vv =
              v2 === variable
                ? (val as string)
                : (augmented[v2] as string | null);
            if (vv == null) {
              ready = false;
              break;
            }
            valuesForC[v2] = vv;
          }
          if (!ready) continue;

          const args = c.scope.map((v) => valuesForC[v]);
          if (!constraintSatisfied(c, ...args)) {
            culprit = labelOf(c);
            break;
          }
        }

        if (culprit) {
          removed.push(nbVal);
          if (!perC.has(culprit)) perC.set(culprit, []);
          perC.get(culprit)!.push(nbVal);
        }
      }

      if (removed.length) {
        byNeighbor.push({
          neighbor: nb,
          removed,
          perConstraint: Array.from(perC, ([label, values]) => ({
            label,
            removed: values,
          })),
        });
      }
    }

    const totalEliminated = byNeighbor.reduce(
      (s, nb) => s + nb.removed.length,
      0
    );

    return { value: val, totalEliminated, byNeighbor };
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
      description: `Forward Checking started for ${variable} = ${value}`,
      highlight: { variable },
    });
  }

  const augmented: Record<string, string | null> = {
    ...assignment,
    [variable]: value,
  };

  for (const nb of csp.variables) {
    if (nb === variable) continue;
    if (assignment[nb] != null) continue;

    const nbDom = domains[nb];
    const before = nbDom.length;
    const removedVals: string[] = [];

    domains[nb] = nbDom.filter((v) => {
      const ok = canKeepValue(csp, nb, v, augmented);
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
          description: `FC: delete ${rv} from domain of(${nb}) due to constraints of ${nb}`,
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
          description: `FC terminated: ${eliminatedCount} values deleted (empty domain)`,
          highlight: { variable },
        });
      }
      return { ok: false, removed: pruned };
    }
  }

  // afsluiten
  push({
    step: { kind: "forward-check-end", eliminatedCount },
    snapshot: snapshotOf(csp, assignment, domains, variable, pruned, undefined),
    description: stepThrough
      ? `FC completed`
      : `FC terminated: ${eliminatedCount} values deleted`,
    highlight: { variable },
  });

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
    if (c.scope.length !== 2) continue;
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
      description: "AC-3 started",
    });
    for (const arc of queue) {
      push({
        step: { kind: "ac3-enqueue", arc },
        snapshot: snapshotOf(csp, assignment, domains, undefined, [], queue),
        description: `AC-3: in queue ${opText(csp, arc[0], arc[1])}`,
        highlight: { edge: arc },
      });
    }
  } else {
    push({
      step: { kind: "ac3-start" },
      snapshot: snapshotOf(csp, assignment, domains, undefined, [], queue),
      description: "AC-3 started",
    });
  }

  const neighs = neighborsMap(csp);
  const findConstraintLocal = (xi: string, xj: string) =>
    csp.constraints.find(
      (c) =>
        c.scope.length === 2 &&
        ((c.scope[0] === xi && c.scope[1] === xj) ||
          (c.scope[1] === xi && c.scope[0] === xj))
    );

  while (queue.length > 0) {
    const arc = queue.shift()!;
    const [xi, xj] = arc;
    if (stepThrough) {
      push({
        step: { kind: "ac3-dequeue", arc },
        snapshot: snapshotOf(csp, assignment, domains, xi, [], queue),
        description: `AC-3: process ${opText(csp, xi, xj)}`,
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
          )} — deleted: ${removed.join(", ")}`,
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
          description: "AC-3 terminated: inconsistent (empty domain)",
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
            description: `AC-3: in queue ${opText(csp, xk, xi)}`,
            highlight: { edge: [xk, xi], variable: xi },
          });
        }
      }
    } else if (stepThrough) {
      push({
        step: { kind: "ac3-revise", arc, removed },
        snapshot: snapshotOf(csp, assignment, domains, xi, [], queue),
        description: `AC-3: revise ${opText(csp, xi, xj)} — no deletions`,
        highlight: { edge: arc, variable: xi },
      });
    }
  }

  push({
    step: { kind: "ac3-end", result: "consistent" },
    snapshot: snapshotOf(csp, assignment, domains, undefined, prunedAll, []),
    description: "AC-3 terminated (consistent)",
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

  // helper to render ONE constraint oriented left->right
  const formatConstraintOriented = (
    c: Constraint,
    left: string,
    right: string
  ) => {
    // unary
    if (c.scope.length === 1) return `${left} ${symbolFor(c)}`;

    // binary with special cases (= k, comparator±k)
    const raw = (c.label ?? symbolFor(c)).trim();
    const forward = c.scope[0] === left && c.scope[1] === right;

    // = k  => left = right + k   (flip sign if reversed)
    const mEq = raw.match(/^=\s*([+-]?\d+)$/);
    if (mEq) {
      let k = parseInt(mEq[1], 10);
      if (!forward) k = -k;
      const sign = k >= 0 ? "+ " : "- ";
      return `${left} = ${right} ${sign}${Math.abs(k)}`;
    }

    // comparator with constant: op k
    const invert = (op: string) =>
      op === ">"
        ? "<"
        : op === "<"
        ? ">"
        : op === "≥" || op === ">="
        ? "≤"
        : op === "≤" || op === "<="
        ? "≥"
        : op;

    const mCmp = raw.match(/^([<>]=?|≥|≤)\s*([+-]?\d+)$/);
    if (mCmp) {
      let op = mCmp[1];
      let k = parseInt(mCmp[2], 10);
      if (!forward) {
        op = invert(op);
        k = -k;
      }
      const sign = k >= 0 ? "+ " : "- ";
      return `${left} ${op} ${right} ${sign}${Math.abs(k)}`;
    }

    // absolute diff label like "|X - Y| ≥ 2" -> keep symmetric
    const mAbs = raw.match(/^\|.*\|\s*(≥|<=|>=|≤|<|>)\s*([+-]?\d+)$/);
    if (mAbs) {
      const op = mAbs[1] === ">=" ? "≥" : mAbs[1] === "<=" ? "≤" : mAbs[1];
      const k = parseInt(mAbs[2], 10);
      return `|${left} - ${right}| ${op} ${k}`;
    }

    // plain operator (≠, =, >, <, ≥, ≤)
    return `${left} ${forward ? raw : invert(raw)} ${right}`;
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
        "Solution found"
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
      `Select variable ${variable}`,
      { variable }
    );

    if (options.valueOrdering === "lcv") {
      const scores = lcvScores(csp, variable, domains, assignment);

      for (const s of scores) {
        const perValueLines: string[] = [];
        perValueLines.push(`LCV calculation for ${variable} = ${s.value}`);
        if (s.byNeighbor.length) {
          for (const b of s.byNeighbor) {
            const constraint = csp.constraints.find(
              (c) => c.scope.includes(variable) && c.scope.includes(b.neighbor)
            );
            const constraintLabel =
              constraint?.label ||
              `${variable} ${constraint?.type || ""} ${b.neighbor}`;

            for (const pc of b.perConstraint || [
              { label: constraintLabel, removed: b.removed },
            ]) {
              perValueLines.push(
                `    • ${pc.label}: eliminates {${pc.removed.join(", ")}}`
              );
              perValueLines.push(` - From ${b.neighbor}:`);
            }
          }
        }
        perValueLines.push(
          `  Total eliminated: ${s.totalEliminated} value${
            s.totalEliminated === 1 ? "" : "s"
          }`
        );
        pushStep(
          steps,
          csp,
          {
            kind: "order-values-explain",
            variable,
            heuristic: "lcv",
            scores: [s],
          },
          assignment,
          domains,
          perValueLines.join("\n"),
          { variable }
        );
      }

      const summary: string[] = [`LCV summary for ${variable}:`];
      for (const s of scores) {
        summary.push(
          ` • ${variable}=${s.value} → ${s.totalEliminated} values eliminated`
        );
      }
      pushStep(
        steps,
        csp,
        { kind: "order-values-explain", variable, heuristic: "lcv", scores },
        assignment,
        domains,
        summary.join("\n"),
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
          heuristic: "lcv",
        },
        assignment,
        domains,
        `Order for ${variable}: ${orderedValues.join(", ")}`,
        { variable }
      );
    } else {
      // Alphabetical explanation + order
      const ord = [...(domains[variable] ?? [])].sort();
      pushStep(
        steps,
        csp,
        { kind: "order-values-explain", variable, heuristic: "alpha" },
        assignment,
        domains,
        `Alphabetical order for ${variable}: ${ord.join(", ")}`,
        { variable }
      );
    }

    const orderedValues = orderValues(
      csp,
      variable,
      domains,
      assignment,
      options
    );

    for (const value of orderedValues) {
      pushStep(
        steps,
        csp,
        { kind: "try-value", variable, value },
        assignment,
        domains,
        `Try ${variable} = ${value}`,
        {
          variable,
        }
      );
      // --- Check all constraints touching `variable` (unary + binary) ---
      let consistent = true;

      // 1) Unary constraints on `variable`
      for (const c of csp.constraints) {
        if (c.scope.length === 1 && c.scope[0] === variable) {
          const ok = constraintSatisfied(c, value);
          pushStep(
            steps,
            csp,
            {
              kind: "check-constraint",
              variable,
              neighbor: variable, // UI: treat as unary (highlight node)
              edge: [variable, variable], // optional; GraphView can ignore self-edge
              consistent: ok,
            },
            assignment,
            domains,
            `Check unary constraint ${symbolFor(c)} on ${variable}: ${
              ok ? "OK" : "Conflict"
            }`,
            { variable }
          );
          if (!ok) {
            consistent = false;
            // no need to check further constraints if unary already fails
            break;
          }
        }
      }

      if (!consistent) {
        // skip assigning; next value will be tried
        continue;
      }

      // 2) Binary (and n-ary) constraints that include `variable`
      //    - If all other vars in the constraint are assigned, evaluate now
      //    - Else: show a “pending” info step so the user sees it’ll be enforced later
      for (const c of csp.constraints) {
        if (!c.scope.includes(variable) || c.scope.length < 2) continue;

        // collect values for all variables in this constraint
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
          // fully evaluable now
          const args = c.scope.map((v) => values[v]);
          const ok = constraintSatisfied(c, ...args);

          // choose a neighbor to highlight on the edge (first other var)
          const neighbor = c.scope.find((v) => v !== variable)!;
          const text = formatConstraintOriented(c, variable, neighbor);
          pushStep(
            steps,
            csp,
            {
              kind: "check-constraint",
              variable,
              neighbor,
              edge: [variable, neighbor],
              consistent: ok,
            },
            assignment,
            domains,
            `Check ${text}: ${ok ? "OK" : "Conflict"}`,
            { edge: [variable, neighbor], variable }
          );

          if (!ok) {
            consistent = false;
            break;
          }
        }
      }

      if (!consistent) {
        // go to next value
        continue;
      }

      // Consistentie-check die ook UNAIRE constraints evalueert en constraint-naam meegeeft
      const ic = isConsistent(variable, value, assignment, csp);
      if (ic.ok !== true) {
        const c = ic.constraint;
        const msg = `Not consistent with constraint ${formatConstraint(
          c
        )} for (${formatScopeValues(c, ic.args)})`;
        pushStep(
          steps,
          csp,
          { kind: "backtrack", variable },
          assignment,
          domains,
          msg,
          { variable }
        );
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
        `Assign: ${variable} = ${value}`,
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
        `Backtrack from ${variable}`,
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
        `Undo: ${variable}`,
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
    description: "Initially: no allocations, original domains",
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
      "No solution found"
    );
  }
  return { steps };
}
