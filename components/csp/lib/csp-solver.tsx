import {
  type CSP,
  type CSPStepWithSnapshot,
  type CSPStep,
  type SolveOptions,
  type Snapshot,
  type Constraint,
} from "./csp-types";

/* -------------------- utils -------------------- */

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

function lockAssignedDomains(
  domains: Record<string, string[]>,
  assignment: Record<string, string | null>
) {
  for (const v in assignment) {
    const val = assignment[v];
    if (val != null) {
      domains[v] = [val];
    }
  }
}

function opText(csp: CSP, from: string, to: string): string {
  const cons = findConstraint(csp, from, to);
  if (!cons) return `${from} ? ${to}`;
  return formatConstraintOriented(cons, from, to);
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

  try {
    const rObj = (c.predicate as any)(vals);
    if (typeof rObj === "boolean") return rObj;
  } catch {
    //
  }

  try {
    if ((c.predicate as any).length >= c.scope.length) {
      const rPos = (c.predicate as any)(...args);
      if (typeof rPos === "boolean") return rPos;
    }
  } catch {}

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

/* ------------ oriented label (for pretty explanations) ------------ */

function invertOp(op: string): string {
  if (op === ">") return "<";
  if (op === "<") return ">";
  if (op === "≥" || op === ">=") return "≤";
  if (op === "≤" || op === "<=") return "≥";
  return op;
}

function formatConstraintOriented(
  c: Constraint,
  left: string,
  right: string
): string {
  const raw = (
    c.label ?? (c.type === "neq" ? "≠" : c.type === "eq" ? "=" : "⋆")
  ).trim();

  // Unary
  if (c.scope.length === 1) return `${left} ${raw}`;

  const forward = c.scope[0] === left && c.scope[1] === right;

  // |X - Y| ◊ k
  const mAbs = raw.match(
    /^\|\s*[A-Za-z]+\s*-\s*[A-Za-z]+\s*\|\s*(≥|<=|>=|≤|<|>)\s*([+-]?\d+)$/
  );
  if (mAbs) {
    const op = mAbs[1] === ">=" ? "≥" : mAbs[1] === "<=" ? "≤" : mAbs[1];
    const k = parseInt(mAbs[2], 10);
    return `|${left} - ${right}| ${op} ${k}`;
  }

  // "= k"  → left = right ± k  (flip sign if reversed)
  const mEqDiff = raw.match(/^=\s*([+-]?\d+)$/);
  if (mEqDiff) {
    let k = parseInt(mEqDiff[1], 10);
    if (!forward) k = -k;
    const sign = k >= 0 ? "+ " : "- ";
    return `${left} = ${right} ${sign}${Math.abs(k)}`;
  }

  // "◊ k"  → left ◊ right ± k (invert op + flip sign if reversed)
  const mCmp = raw.match(/^([<>]=?|≥|≤)\s*([+-]?\d+)$/);
  if (mCmp) {
    let op = mCmp[1];
    let k = parseInt(mCmp[2], 10);
    if (!forward) {
      op = invertOp(op);
      k = -k;
    }
    const sign = k >= 0 ? "+ " : "- ";
    return `${left} ${op} ${right} ${sign}${Math.abs(k)}`;
  }

  // plain op
  return `${left} ${forward ? raw : invertOp(raw)} ${right}`;
}

/* --------- consistency helpers (used by BT-only path) ---------- */

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

/* ----------------- selection / ordering ----------------- */

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

  // MRV + degree (tiebreak) + alpha (final tiebreak)
  const neigh = neighborsMap(csp);
  return unassigned.reduce((best, v) => {
    const sizeV = (domains[v] ?? []).length;
    const sizeB = (domains[best] ?? []).length;

    if (sizeV !== sizeB) return sizeV < sizeB ? v : best;

    const degV = (neigh[v] ?? []).filter((n) => assignment[n] == null).length;
    const degB = (neigh[best] ?? []).filter(
      (n) => assignment[n] == null
    ).length;

    if (degV !== degB) return degV > degB ? v : best;

    return v < best ? v : best; // alphabetical last tiebreak
  }, unassigned[0]);
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

/* --------------- snapshots & push steps ---------------- */

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

/* ---------------- LCV scoring (met per-constraint) --------------- */

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

/* ----------------- MRV explanation helper -------------------- */

function mrvScoresExplain(
  csp: CSP,
  domains: Record<string, string[]>,
  assignment: Record<string, string | null>
) {
  const neigh = neighborsMap(csp);
  const unassigned = csp.variables.filter((v) => assignment[v] == null);

  return unassigned.map((v) => {
    const dom = domains[v] ?? [];
    const deg = (neigh[v] ?? []).filter((n) => assignment[n] == null).length;
    return {
      variable: v,
      domainSize: dom.length,
      domain: [...dom],
      degreeUnassigned: deg,
    };
  });
}

/* ----------------- Forward Checking / AC-3 ----------------- */

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

  const removedByVar: Record<string, string[]> = {};

  for (const nb of csp.variables) {
    if (nb === variable) continue;
    if (assignment[nb] != null) continue;

    const nbDom = domains[nb];
    const removedVals: string[] = [];

    const firstFail = (
      nbVal: string
    ): { constraint: Constraint; args: string[]; other: string } | null => {
      for (const c of csp.constraints) {
        if (!c.scope.includes(nb)) continue;

        const values: Record<string, string> = { [nb]: nbVal };
        let ready = true;
        for (const v of c.scope) {
          if (v === nb) continue;
          const vv = v === variable ? value : (augmented[v] as string | null);
          if (vv == null) {
            ready = false;
            break;
          }
          values[v] = vv;
        }
        if (!ready) continue;

        const args = c.scope.map((v) => values[v]);
        if (!constraintSatisfied(c, ...args)) {
          const other = c.scope.find((s) => s !== nb) ?? nb;
          return { constraint: c, args, other };
        }
      }
      return null;
    };

    domains[nb] = nbDom.filter((v) => {
      const fail = firstFail(v);
      if (!fail) return true;

      removedVals.push(v);
      eliminatedCount++;
      pruned.push({ variable: nb, value: v });

      if (stepThrough) {
        const niceLabel = formatConstraintOriented(
          fail.constraint,
          fail.other,
          nb
        );
        const scopeVals = formatScopeValues(fail.constraint, fail.args);

        push({
          step: {
            kind: "forward-check-eliminate",
            from: variable,
            to: nb,
            valueEliminated: v,
            reason: niceLabel,
          },
          snapshot: snapshotOf(
            csp,
            assignment,
            domains,
            nb,
            [{ variable: nb, value: v }],
            undefined
          ),
          description: `FC: remove ${v} from domain(${nb}) because ${niceLabel} for (${scopeVals})`,
          highlight: {
            edge:
              fail.constraint.scope.length === 1 ? [nb, nb] : [fail.other, nb],
            variable: nb,
            constraintStatus: "fail",
          },
        });
      }

      return false;
    });

    if (!stepThrough && removedVals.length) {
      removedByVar[nb] = removedVals.slice();
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
          description: `Forward Checking: domains updated (removed ${eliminatedCount} values) — empty domain at ${nb}`,
          highlight: { variable },
        });
      }
      return { ok: false, removed: pruned };
    }
  }

  if (stepThrough) {
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
      description: `FC completed: removed ${eliminatedCount} value${
        eliminatedCount === 1 ? "" : "s"
      }`,
      highlight: { variable },
    });
  } else {
    const parts: string[] = [];
    for (const v in removedByVar) {
      parts.push(`${v}: −{${removedByVar[v].join(", ")}}`);
    }
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
      description:
        `Forward Checking: domains updated (removed ${eliminatedCount} value` +
        `${eliminatedCount === 1 ? "" : "s"})` +
        (parts.length ? `\n  ${parts.join("  •  ")}` : ""),
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
  _stepsAcc: CSPStepWithSnapshot[],
  assignment: Record<string, string | null>
): { ok: boolean; pruned: Array<{ variable: string; value: string }> } {
  const key = (i: string, j: string) => `${i}|${j}`;
  const formatQueue = (q: Array<[string, string]>) =>
    q.length ? q.map(([i, j]) => `${i}→${j}`).join(", ") : "∅";

  const queue: Array<[string, string]> = [];
  const inQueue = new Set<string>();
  const neighs = neighborsMap(csp);
  const prunedAll: Array<{ variable: string; value: string }> = [];

  // enqueue met optie 'silent' om logging over te slaan
  const enqueueArc = (
    i: string,
    j: string,
    reason?: string,
    opts?: { silent?: boolean }
  ) => {
    const silent = opts?.silent ?? false;
    const k = key(i, j);
    const already = inQueue.has(k);

    if (!already) {
      inQueue.add(k);
      queue.push([i, j]);
    }

    if (stepThrough && !silent) {
      push({
        step: { kind: "ac3-enqueue", arc: [i, j] },
        snapshot: snapshotOf(csp, assignment, domains, undefined, [], queue),
        description:
          (already
            ? `Enqueue ${opText(csp, i, j)} (already in queue)`
            : `Enqueue ${opText(csp, i, j)}`) +
          (reason ? ` — because ${reason}` : "") +
          `\nQueue: ${formatQueue(queue)}`,
        highlight: { edge: [i, j], constraintStatus: "enqueue" },
      });
    }
  };

  // init alle binaire bogen
  for (const c of csp.constraints) {
    if (c.scope.length === 2) {
      const [a, b] = c.scope;
      enqueueArc(a, b, undefined, { silent: true });
      enqueueArc(b, a, undefined, { silent: true });
    }
  }
  if (stepThrough) {
    push({
      step: { kind: "ac3-start" } as any,
      snapshot: snapshotOf(csp, assignment, domains, undefined, [], queue),
      description: `AC-3 started — initial queue:\n${formatQueue(queue)}`,
    });
  }
  while (queue.length) {
    // Dequeue
    const [xi, xj] = queue.shift()!;
    inQueue.delete(key(xi, xj));
    if (stepThrough) {
      push({
        step: { kind: "ac3-dequeue", arc: [xi, xj] },
        snapshot: snapshotOf(csp, assignment, domains, xi, [], queue),
        description: `Dequeue ${opText(csp, xi, xj)}\nQueue: ${formatQueue(
          queue
        )}`,
        highlight: {
          edge: [xi, xj],
          variable: xi,
          constraintStatus: "dequeue",
        },
      });
    }

    // binaire constraint tussen xi en xj?
    const cons = findConstraint(csp, xi, xj);
    if (!cons) continue;

    const removed: string[] = [];
    const di = domains[xi];

    // Revise(xi, xj)
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
          step: { kind: "ac3-revise", arc: [xi, xj], removed },
          snapshot: snapshotOf(
            csp,
            assignment,
            domains,
            xi,
            removed.map((v) => ({ variable: xi, value: v })),
            queue
          ),
          description:
            `Revise ${opText(csp, xi, xj)} — removed: ${removed.join(", ")}\n` +
            `Queue: ${formatQueue(queue)}`,
          highlight: {
            edge: [xi, xj],
            variable: xi,
            constraintStatus: "checking",
          },
        });
      }

      if (domains[xi].length === 0) {
        push({
          step: { kind: "ac3-end", result: "inconsistent" },
          snapshot: snapshotOf(csp, assignment, domains, xi, [], queue),
          description: `AC-3: empty domain at ${xi}`,
          highlight: { variable: xi, constraintStatus: "fail" },
        });
        return { ok: false, pruned: prunedAll };
      }

      // domein xi is gewijzigd ⇒ (xk, xi) (behalve xj) terug in de queue
      for (const xk of neighs[xi]) {
        if (xk === xj) continue;
        enqueueArc(xk, xi, `${xi} domain changed`);
      }
    } else if (stepThrough) {
      push({
        step: { kind: "ac3-revise", arc: [xi, xj], removed: [] },
        snapshot: snapshotOf(csp, assignment, domains, xi, [], queue),
        description:
          `Revise ${opText(csp, xi, xj)} — no removals\n` +
          `Queue: ${formatQueue(queue)}`,
        highlight: { edge: [xi, xj], variable: xi, constraintStatus: "ok" },
      });
    }
  }

  push({
    step: { kind: "ac3-end", result: "consistent" },
    snapshot: snapshotOf(csp, assignment, domains, undefined, prunedAll, []),
    description: "AC-3 finished (consistent)",
  });
  return { ok: true, pruned: prunedAll };
}

/* ----------------- Unary filtering (pre-pass) ----------------- */

function pruneUnaryConstraintsFirst(
  csp: CSP,
  assignment: Record<string, string | null>,
  domains: Record<string, string[]>,
  push: (s: CSPStepWithSnapshot) => void
): { ok: boolean; pruned: Array<{ variable: string; value: string }> } {
  const pruned: Array<{ variable: string; value: string }> = [];

  push({
    step: { kind: "unary-filter-start" } as any,
    snapshot: snapshotOf(csp, assignment, domains, undefined, [], undefined),
    description: "Check all unary constraints",
  });

  const unaries = csp.constraints.filter((c) => c.scope.length === 1);
  for (const c of unaries) {
    const v = c.scope[0];
    const dom = domains[v] ?? [];

    if (assignment[v] != null) {
      const val = assignment[v] as string;

      push({
        step: {
          kind: "check-constraint",
          variable: v,
          neighbor: v,
          edge: [v, v],
          consistent: true,
        } as any,
        snapshot: snapshotOf(csp, assignment, domains, v, [], undefined),
        description: `Check unary ${symbolFor(c)} on ${v} with ${v}=${val}`,
        highlight: { variable: v, edge: [v, v], constraintStatus: "checking" },
      });

      const ok = constraintSatisfied(c, val);
      if (!ok) {
        push({
          step: { kind: "failure" } as any,
          snapshot: snapshotOf(csp, assignment, domains, v, [], undefined),
          description: `Unary conflict: ${v}=${val} violates ${symbolFor(c)}`,
          highlight: { variable: v, edge: [v, v], constraintStatus: "fail" },
        });
        return { ok: false, pruned };
      }

      push({
        step: {
          kind: "check-constraint",
          variable: v,
          neighbor: v,
          edge: [v, v],
          consistent: true,
        } as any,
        snapshot: snapshotOf(csp, assignment, domains, v, [], undefined),
        description: `OK: ${v}=${val} satisfies ${symbolFor(c)}`,
        highlight: { variable: v, edge: [v, v], constraintStatus: "ok" },
      });

      continue;
    }

    let i = 0;
    while (i < dom.length) {
      const val = dom[i];

      push({
        step: {
          kind: "check-constraint",
          variable: v,
          neighbor: v,
          edge: [v, v],
          consistent: true,
        } as any,
        snapshot: snapshotOf(csp, assignment, domains, v, [], undefined),
        description: `Check unary ${symbolFor(c)} on ${v} with ${v}=${val}`,
        highlight: { variable: v, edge: [v, v], constraintStatus: "checking" },
      });

      const ok = constraintSatisfied(c, val);
      if (!ok) {
        dom.splice(i, 1);
        pruned.push({ variable: v, value: val });

        push({
          step: {
            kind: "unary-filter-eliminate",
            variable: v,
            valueEliminated: val,
          } as any,
          snapshot: snapshotOf(
            csp,
            assignment,
            domains,
            v,
            [{ variable: v, value: val }],
            undefined
          ),
          description: `Remove ${val} from domain(${v}) due to ${symbolFor(c)}`,
          highlight: { variable: v, edge: [v, v], constraintStatus: "fail" },
        });
      } else {
        push({
          step: {
            kind: "check-constraint",
            variable: v,
            neighbor: v,
            edge: [v, v],
            consistent: true,
          } as any,
          snapshot: snapshotOf(csp, assignment, domains, v, [], undefined),
          description: `OK: ${v}=${val} satisfies ${symbolFor(c)}`,
          highlight: { variable: v, edge: [v, v], constraintStatus: "ok" },
        });
        i++;
      }
    }

    if ((domains[v] ?? []).length === 0) {
      push({
        step: { kind: "failure" } as any,
        snapshot: snapshotOf(csp, assignment, domains, v, [], undefined),
        description: `Unary filtering produced empty domain for ${v}`,
        highlight: { variable: v, edge: [v, v], constraintStatus: "fail" },
      });
      return { ok: false, pruned };
    }
  }

  push({
    step: { kind: "unary-filter-end" } as any,
    snapshot: snapshotOf(
      csp,
      assignment,
      domains,
      undefined,
      pruned,
      undefined
    ),
    description: pruned.length
      ? `Unary filtering done — removed: ${pruned
          .map((p) => `${p.value} from ${p.variable}`)
          .join(", ")}`
      : "Unary filtering done — no removals",
  });

  return { ok: true, pruned };
}

/* -------------------------- SOLVER -------------------------- */

export function solveCSP(
  csp: CSP,
  options: SolveOptions
): { steps: CSPStepWithSnapshot[] } {
  const steps: CSPStepWithSnapshot[] = [];
  const initialAssignment: Record<string, string | null> = {};
  for (const v of csp.variables) initialAssignment[v] = null;
  const initialDomains = deepCloneDomains(csp.domains);

  const push = (s: CSPStepWithSnapshot) => steps.push(s);

  if (options.algorithm === "BT_FC" || options.algorithm === "BT_AC3") {
    const uf = pruneUnaryConstraintsFirst(
      csp,
      initialAssignment,
      initialDomains,
      push
    );
    if (!uf.ok) {
      // inconsistent door unary
      return { steps };
    }
  }

  const doRedundantChecks = options.algorithm === "BT"; // alleen BT doet 'try' + constraint-by-constraint checks

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
        "Solution found!"
      );
      return true;
    }

    // --- MRV uitleg + selectie (of alpha) ---
    let variable: string;

    if (options.variableOrdering === "mrv") {
      const scores = mrvScoresExplain(csp, domains, assignment);
      const shown = [...scores].sort(
        (a, b) =>
          a.domainSize - b.domainSize ||
          b.degreeUnassigned - a.degreeUnassigned ||
          (a.variable < b.variable ? -1 : 1)
      );
      const minDom = Math.min(...scores.map((s) => s.domainSize));
      const mrvCandidates = scores.filter((s) => s.domainSize === minDom);

      let lines: string[] = [];
      lines.push("MRV calculation:");
      for (const s of shown) {
        lines.push(
          `  • ${s.variable}: |D| = ${s.domainSize} (${s.domain.join(
            ", "
          )}) AND unassigned neighbors = ${s.degreeUnassigned}`
        );
      }

      let pick: string;
      let degreeNote = "";
      let alphaNote = "";

      if (mrvCandidates.length === 1) {
        pick = mrvCandidates[0].variable;
      } else {
        const maxDeg = Math.max(
          ...mrvCandidates.map((s) => s.degreeUnassigned)
        );
        const degreeCandidates = mrvCandidates.filter(
          (s) => s.degreeUnassigned === maxDeg
        );
        if (degreeCandidates.length === 1) {
          pick = degreeCandidates[0].variable;
          degreeNote = `\n + Tie-breaker: most constraints on remaining unassigned variables (degree = ${maxDeg}).`;
        } else {
          degreeCandidates.sort((a, b) =>
            a.variable < b.variable ? -1 : a.variable > b.variable ? 1 : 0
          );
          pick = degreeCandidates[0].variable;
          degreeNote = `\n + Tie-breaker: most constraints on remaining unassigned variables (degree = ${maxDeg})`;
          alphaNote = `\n + Final tie-break: alphabetical order.`;
        }
      }

      lines.push(`\n→ Pick ${pick} (min |D|)${degreeNote}${alphaNote}`);

      pushStep(
        steps,
        csp,
        { kind: "select-variable-explain", variable: pick },
        assignment,
        domains,
        lines.join("\n"),
        { variable: pick }
      );

      variable = pick;
    } else {
      const u = csp.variables.filter((v) => assignment[v] == null);
      variable = [...u].sort()[0];
    }

    // “Select variable …”
    pushStep(
      steps,
      csp,
      { kind: "select-variable", variable },
      assignment,
      domains,
      `Select variable ${variable}`,
      { variable }
    );

    // --- Value ordering explanation ---
    if (options.valueOrdering === "lcv") {
      const scores = lcvScores(csp, variable, domains, assignment);
      for (const s of scores) {
        const lines: string[] = [];
        lines.push(`LCV calculation for ${variable} = ${s.value}`);
        for (const b of s.byNeighbor) {
          lines.push(` - From ${b.neighbor}:`);
          for (const pc of b.perConstraint) {
            lines.push(
              `    • ${pc.label}: eliminates {${pc.removed.join(", ")}}`
            );
          }
        }
        lines.push(
          `  => Total eliminated: ${s.totalEliminated} value${
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
          lines.join("\n"),
          { variable }
        );
      }
      const summary: string[] = [`LCV summary for ${variable}:`];
      for (const s of scores) {
        summary.push(
          `  ${variable}=${s.value} → ${s.totalEliminated} eliminated.`
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
      const orderedValuesLCV = orderValues(
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
          order: orderedValuesLCV,
          heuristic: "lcv",
        },
        assignment,
        domains,
        `Order for ${variable}: ${orderedValuesLCV.join(", ")}`,
        { variable }
      );
    } else {
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

    /* ----------------- Try/Assign path -----------------
       - BT: ‘try’ + constraint-by-constraint checks (zoals vroeger)
       - BT_FC / BT_AC3: GEEN extra checks/‘try’ => direct Assign + propagate
    ----------------------------------------------------- */

    for (const value of orderedValues) {
      if (doRedundantChecks) {
        // ====== BT pad (oude, gedetailleerde uitleg) ======
        pushStep(
          steps,
          csp,
          { kind: "try-value", variable, value },
          assignment,
          domains,
          `Try ${variable} = ${value}`,
          { variable, tryingValue: value }
        );

        let consistent = true;

        // 1) Unary constraints on variable
        for (const c of csp.constraints) {
          if (c.scope.length === 1 && c.scope[0] === variable) {
            const ok = constraintSatisfied(c, value);
            pushStep(
              steps,
              csp,
              {
                kind: "check-constraint",
                variable,
                neighbor: variable,
                edge: [variable, variable],
                consistent: ok,
              },
              assignment,
              domains,
              `Check unary constraint ${symbolFor(c)} on ${variable}: ${
                ok ? "OK" : "Conflict"
              }`,
              {
                variable,
                edge: [variable, variable],
                constraintStatus: ok ? "ok" : "fail",
                tryingValue: value,
              }
            );
            if (!ok) {
              consistent = false;
              break;
            }
          }
        }
        if (!consistent) continue;

        // 2) Binary/n-ary constraints that can be fully evaluated
        for (const c of csp.constraints) {
          if (!c.scope.includes(variable) || c.scope.length < 2) continue;

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

          const neighbor = c.scope.find((v) => v !== variable)!;

          if (!ready) continue;

          const text = formatConstraintOriented(c, variable, neighbor);
          pushStep(
            steps,
            csp,
            {
              kind: "check-constraint",
              variable,
              neighbor,
              edge: [variable, neighbor],
              consistent: true,
            },
            assignment,
            domains,
            `Checking ${text}...`,
            {
              edge: [variable, neighbor],
              variable,
              constraintStatus: "checking",
              tryingValue: value,
            }
          );

          const args = c.scope.map((v) => values[v]);
          const ok = constraintSatisfied(c, ...args);

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
            {
              edge: [variable, neighbor],
              variable,
              constraintStatus: ok ? "ok" : "fail",
              tryingValue: value,
            }
          );

          if (!ok) {
            consistent = false;
            break;
          }
        }
        if (!consistent) continue;

        // extra guard (met naam van constraint)
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

        // Assign (BT)
        assignment[variable] = value;
        pushStep(
          steps,
          csp,
          { kind: "assign", variable, value },
          assignment,
          domains,
          `Assign: ${variable} = ${value}`,
          { variable }
        );
      } else {
        // ====== BT_FC / BT_AC3 pad (géén extra checks; direct assign) ======
        assignment[variable] = value;
        pushStep(
          steps,
          csp,
          { kind: "assign", variable, value },
          assignment,
          domains,
          `Assign: ${variable} = ${value}`,
          { variable }
        );
      }

      // Gemeenschappelijk: domains snapshot bewaren
      const savedDomains = deepCloneDomains(domains);

      // Lock singletons voor alle toegewezen variabelen
      lockAssignedDomains(domains, assignment);

      // Propagation (alleen BT_FC of BT_AC3; bij BT alleen als user die modes kiest)
      let propagationOK = true;
      if (options.algorithm === "BT_FC") {
        const res = forwardCheck(
          csp,
          variable,
          value,
          domains,
          options.stepThroughFC,
          (s) => push(s),
          steps,
          assignment
        );
        if (!res.ok) propagationOK = false;
      } else if (options.algorithm === "BT_AC3") {
        const res = ac3(
          csp,
          domains,
          options.stepThroughAC3,
          (s) => push(s),
          steps,
          assignment
        );
        if (!res.ok) propagationOK = false;
      }

      if (propagationOK) {
        const ok = backtrack(assignment, domains);
        if (ok) return true;
      }

      // Backtrack: unassign & restore
      pushStep(
        steps,
        csp,
        { kind: "backtrack", variable },
        assignment,
        domains,
        `Backtrack from ${variable}`,
        { variable }
      );
      assignment[variable] = null;
      pushStep(
        steps,
        csp,
        { kind: "unassign", variable },
        assignment,
        domains,
        `Undo: ${variable}`,
        { variable }
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
