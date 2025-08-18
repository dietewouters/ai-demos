import type { Formula, Clause, Literal, Assignment } from "./dpll-types";

/** Split op top-level (respecteert haakjes) */
function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0,
    last = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === sep && depth === 0) {
      out.push(s.slice(last, i));
      last = i + 1;
    }
  }
  out.push(s.slice(last));
  return out.filter(Boolean);
}

/** Strip buitenste haakjes als ze de hele string omsluiten */
function stripOuterParens(s: string): string {
  let t = s;
  for (;;) {
    if (!(t.startsWith("(") && t.endsWith(")"))) break;
    let depth = 0,
      ok = true;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (c === "(") depth++;
      else if (c === ")") {
        depth--;
        if (depth < 0) {
          ok = false;
          break;
        }
        if (depth === 0 && i !== t.length - 1) {
          ok = false;
          break;
        }
      }
    }
    if (!ok || depth !== 0) break;
    t = t.slice(1, -1);
  }
  return t;
}
/** Normaliseer invoer naar &, |, !; accepteer ook V/v en ^ als operators. */
function normalizeInput(s: string): string {
  // Uniformeer minteken
  s = s.replace(/−/g, "-");

  // Unicode symbolen → ascii
  s = s.replace(/[∧]/g, "&");
  s = s.replace(/[∨]/g, "|");
  s = s.replace(/[¬]/g, "!");

  // '^' is AND – dit kan veilig globaal (caret komt niet in variabelen voor)
  s = s.replace(/\^/g, "&");

  // '+' als OR wanneer tussen atomen/haakjes staat
  s = s.replace(/([A-Za-z0-9_)])\s*\+\s*([A-Za-z0-9_(])/g, "$1|$2");

  // 'V'/'v' als OR – alleen wanneer het duidelijk als operator staat
  // (dus met spatie(s) en/of haakjes als scheiding), zodat 'ALIVE' e.d. niet stuk gaan.
  s = s
    .replace(/\)\s*[vV]\s*\(/g, ")|(") // ) V (
    .replace(/([A-Za-z0-9_])\s+[vV]\s+([A-Za-z0-9_])/g, "$1|$2") // A V B
    .replace(/([A-Za-z0-9_])\s+[vV]\s*\(/g, "$1|(") // A V (
    .replace(/\)\s*[vV]\s+([A-Za-z0-9_])/g, ")|$1"); // ) V B

  // Spaties weg pas nadat we operatoren herkend hebben
  s = s.replace(/\s+/g, "");

  return s;
}

export function parseFormula(formulaString: string): Formula {
  const normalized = formulaString
    .replace(/−/g, "-")
    .replace(/[¬~]/g, "!")
    .replace(/[∧^]/g, "&") // ^ én ∧ => AND
    .replace(/\b[Vv]\b/g, "|") // V of v tussen spaties => OR
    .replace(/[∨+]/g, "|") // ∨ of + => OR
    .replace(/\s+/g, ""); // spaties pas als laatste weg

  const clauses: Clause[] = [];
  const variables = new Set<string>();

  // Queue: split op top-level &, maar blijf door-splitten nadat haakjes zijn gestript
  const queue: string[] = splitTopLevel(normalized, "&").filter(Boolean);

  while (queue.length) {
    let clauseStr = stripOuterParens(queue.shift()!);

    // Als er nu nog een top-level & in zit (bijv. "A&B"), verder opsplitsen
    const parts = splitTopLevel(clauseStr, "&").filter(Boolean);
    if (parts.length > 1) {
      queue.unshift(...parts.map(stripOuterParens));
      continue;
    }

    // Deze clause is een disjunctie van literalen
    const literalStrings = splitTopLevel(clauseStr, "|");
    const literals: Literal[] = [];

    for (let raw of literalStrings) {
      if (!raw) continue;
      let negated = false;
      let lit = raw;
      while (lit.startsWith("!") || lit.startsWith("-")) {
        negated = !negated;
        lit = lit.slice(1);
      }
      const m = /^([A-Za-z][A-Za-z0-9_]*)$/.exec(lit);
      if (!m) continue;
      const variable = m[1];
      literals.push({ variable, negated });
      variables.add(variable);
    }

    // ook lege clause (□) bewaren
    clauses.push({ literals });
  }

  return { clauses, variables };
}

export function formatFormula(formula: Formula): string {
  return formula.clauses
    .map((clause) => {
      const literalStrs = clause.literals.map(
        (lit) => (lit.negated ? "¬" : "") + lit.variable
      );
      return clause.literals.length > 1
        ? `(${literalStrs.join("∨")})`
        : literalStrs[0] ?? "□";
    })
    .join(" ∧ ");
}

export function formatAssignment(assignment: Assignment): string {
  const assigned = Object.entries(assignment)
    .filter(([, value]) => value !== undefined)
    .map(([variable, value]) => `${variable}=${value ? "T" : "F"}`);
  return assigned.length > 0 ? `{${assigned.join(", ")}}` : "{}";
}
