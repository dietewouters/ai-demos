import type { Formula, Clause, Literal, Assignment } from "./dpll-types";

/** Split op top-level (dus niet binnen haakjes) */
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
  return out.filter((x) => x.length > 0);
}

/** Strip één of meer paren buitenste haakjes als ze echt de hele string omsluiten */
function stripOuterParens(s: string): string {
  let t = s;
  for (;;) {
    if (!(t.startsWith("(") && t.endsWith(")"))) break;
    // check of de buitenste ) pas op het eind sluit
    let depth = 0;
    let ok = true;
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

export function parseFormula(formulaString: string): Formula {
  // normaliseer symbolen en verwijder whitespace
  const normalized = formulaString
    .replace(/\s+/g, "")
    .replace(/[∧^]/g, "&")
    .replace(/[∨+]/g, "|")
    .replace(/[¬~]/g, "!") // ¬ of ~ → !
    .replace(/−/g, "-"); // Unicode minus → ASCII

  const clauses: Clause[] = [];
  const variables = new Set<string>();

  // split op top-level AND
  const clauseStrings = splitTopLevel(normalized, "&");

  for (let clauseStr of clauseStrings) {
    clauseStr = stripOuterParens(clauseStr);

    // split op top-level OR
    const literalStrings = splitTopLevel(clauseStr, "|");
    const literals: Literal[] = [];

    for (let raw of literalStrings) {
      if (!raw) continue;

      // ondersteun meerdere negaties (!, -)
      let negated = false;
      let lit = raw;
      while (lit.startsWith("!") || lit.startsWith("-")) {
        negated = !negated;
        lit = lit.slice(1);
      }

      // variabelen: A, A1, var_2, ...
      const m = /^([A-Za-z][A-Za-z0-9_]*)$/.exec(lit);
      if (!m) continue;

      const variable = m[1]; // of .toUpperCase() als je alles uppercase wilt
      literals.push({ variable, negated });
      variables.add(variable);
    }

    // lege clause = direct UNSAT pad; toch opnemen (lege literals)
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
        : literalStrs[0] ?? "□"; // lege clause tonen als '□'
    })
    .join(" ∧ ");
}

export function formatAssignment(assignment: Assignment): string {
  const assigned = Object.entries(assignment)
    .filter(([_, value]) => value !== undefined)
    .map(([variable, value]) => `${variable}=${value ? "T" : "F"}`);
  return assigned.length > 0 ? `{${assigned.join(", ")}}` : "{}";
}
