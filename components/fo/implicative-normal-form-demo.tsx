"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Term =
  | { kind: "Var"; name: string }
  | { kind: "Const"; name: string }
  | { kind: "Func"; name: string; args: Term[] };

type FormulaNode =
  | { kind: "Pred"; name: string; args: Term[] }
  | { kind: "Not"; sub: FormulaNode }
  | { kind: "And"; left: FormulaNode; right: FormulaNode }
  | { kind: "Or"; left: FormulaNode; right: FormulaNode }
  | { kind: "Implies"; left: FormulaNode; right: FormulaNode }
  | { kind: "Iff"; left: FormulaNode; right: FormulaNode }
  | { kind: "Forall"; v: string; body: FormulaNode }
  | { kind: "Exists"; v: string; body: FormulaNode };

class Lexer {
  s: string;
  i = 0;
  constructor(s: string) {
    this.s = s;
  }
  peek(): string {
    return this.s[this.i] ?? "";
  }
  next(): string {
    return this.s[this.i++] ?? "";
  }
  eof(): boolean {
    return this.i >= this.s.length;
  }
}

function isSpace(ch: string) {
  return /\s/.test(ch);
}

function isLetter(ch: string) {
  return /[A-Za-z]/.test(ch);
}

function isIdentStart(ch: string) {
  return isLetter(ch);
}

function isIdentPart(ch: string) {
  return /[A-Za-z0-9_]/.test(ch);
}

function consumeSpaces(lex: Lexer) {
  while (!lex.eof() && isSpace(lex.peek())) lex.next();
}

function parseIdentifier(lex: Lexer): string {
  consumeSpaces(lex);
  let id = "";
  if (!isIdentStart(lex.peek())) return id;
  id += lex.next();
  while (!lex.eof() && isIdentPart(lex.peek())) id += lex.next();
  return id;
}

function parseTerm(lex: Lexer): Term {
  consumeSpaces(lex);
  const name = parseIdentifier(lex);
  if (!name) throw new Error("Expected term identifier");
  consumeSpaces(lex);
  if (lex.peek() === "(") {
    lex.next(); // (
    const args: Term[] = [];
    consumeSpaces(lex);
    if (lex.peek() !== ")") {
      while (true) {
        const t = parseTerm(lex);
        args.push(t);
        consumeSpaces(lex);
        if (lex.peek() === ",") {
          lex.next();
          consumeSpaces(lex);
          continue;
        }
        if (lex.peek() === ")") break;
        throw new Error("Expected ',' or ')' in term arguments");
      }
    }
    lex.next(); // )
    return { kind: "Func", name, args };
  }
  // Heuristic: lowercase start → variable, uppercase start → constant
  if (/^[a-z]/.test(name)) return { kind: "Var", name };
  return { kind: "Const", name };
}

function parseAtom(lex: Lexer): FormulaNode {
  consumeSpaces(lex);
  if (lex.peek() === "(") {
    lex.next();
    const e = parseIff(lex);
    consumeSpaces(lex);
    if (lex.peek() !== ")") throw new Error("Missing closing ')' ");
    lex.next();
    return e;
  }
  const name = parseIdentifier(lex);
  if (!name) throw new Error("Expected predicate or '(' ");
  consumeSpaces(lex);
  let args: Term[] = [];
  if (lex.peek() === "(") {
    lex.next();
    consumeSpaces(lex);
    if (lex.peek() !== ")") {
      while (true) {
        const t = parseTerm(lex);
        args.push(t);
        consumeSpaces(lex);
        if (lex.peek() === ",") {
          lex.next();
          consumeSpaces(lex);
          continue;
        }
        if (lex.peek() === ")") break;
        throw new Error("Expected ',' or ')' in predicate args");
      }
    }
    lex.next();
  }
  return { kind: "Pred", name, args };
}

function parseUnary(lex: Lexer): FormulaNode {
  consumeSpaces(lex);
  const ch = lex.peek();
  if (ch === "¬") {
    lex.next();
    return { kind: "Not", sub: parseUnary(lex) };
  }
  if (ch === "∀" || ch === "∃") {
    lex.next();
    consumeSpaces(lex);
    const v = parseIdentifier(lex);
    if (!v) throw new Error("Expected variable after quantifier");

    const bodyStart = lex.i;
    const bodyUnary = parseUnary(lex);
    consumeSpaces(lex);
    const next = lex.s.slice(lex.i, lex.i + 1);
    if (next === "→" || next === "↔") {
      lex.i = bodyStart;
      const body = parseImplies(lex);
      return ch === "∀"
        ? { kind: "Forall", v, body }
        : { kind: "Exists", v, body };
    }

    return ch === "∀"
      ? { kind: "Forall", v, body: bodyUnary }
      : { kind: "Exists", v, body: bodyUnary };
  }
  return parseAtom(lex);
}

function parseAnd(lex: Lexer): FormulaNode {
  let left = parseUnary(lex);
  while (true) {
    consumeSpaces(lex);
    if (lex.s.slice(lex.i).startsWith("∧")) {
      lex.i += 1;
      const right = parseUnary(lex);
      left = { kind: "And", left, right };
    } else break;
  }
  return left;
}

function parseOr(lex: Lexer): FormulaNode {
  let left = parseAnd(lex);
  while (true) {
    consumeSpaces(lex);
    if (lex.s.slice(lex.i).startsWith("∨")) {
      lex.i += 1;
      const right = parseAnd(lex);
      left = { kind: "Or", left, right };
    } else break;
  }
  return left;
}

function parseImplies(lex: Lexer): FormulaNode {
  let left = parseOr(lex);
  while (true) {
    consumeSpaces(lex);
    if (lex.s.slice(lex.i).startsWith("→")) {
      lex.i += 1;
      const right = parseOr(lex);
      left = { kind: "Implies", left, right };
    } else break;
  }
  return left;
}

function parseIff(lex: Lexer): FormulaNode {
  let left = parseImplies(lex);
  while (true) {
    consumeSpaces(lex);
    if (lex.s.slice(lex.i).startsWith("↔")) {
      lex.i += 1;
      const right = parseImplies(lex);
      left = { kind: "Iff", left, right };
    } else break;
  }
  return left;
}

function parseFormula(input: string): FormulaNode {
  const lex = new Lexer(input);
  const node = parseIff(lex);
  consumeSpaces(lex);
  if (!lex.eof()) throw new Error("Unexpected input after end of formula");
  return node;
}

function termToString(t: Term): string {
  switch (t.kind) {
    case "Var":
      return t.name;
    case "Const":
      return t.name;
    case "Func":
      return `${t.name}(${t.args.map(termToString).join(",")})`;
  }
}

function needsParens(n: FormulaNode): boolean {
  return (
    n.kind === "And" ||
    n.kind === "Or" ||
    n.kind === "Implies" ||
    n.kind === "Iff"
  );
}

function toStringF(n: FormulaNode): string {
  switch (n.kind) {
    case "Pred":
      return `${n.name}${
        n.args.length ? `(${n.args.map(termToString).join(",")})` : ""
      }`;
    case "Not": {
      const s = n.sub;
      return `¬${
        s.kind === "Pred" || s.kind === "Not"
          ? toStringF(s)
          : `(${toStringF(s)})`
      }`;
    }

    case "And":
      return `(${toStringF(n.left)} ∧ ${toStringF(n.right)})`;
    case "Or":
      return `(${toStringF(n.left)} ∨ ${toStringF(n.right)})`;
    case "Implies":
      return `(${toStringF(n.left)} → ${toStringF(n.right)})`;
    case "Iff":
      return `(${toStringF(n.left)} ↔ ${toStringF(n.right)})`;
    case "Forall":
      return `∀${n.v} ${toStringF(n.body)}`;
    case "Exists":
      return `∃${n.v} ${toStringF(n.body)}`;
  }
}

function clone(n: FormulaNode): FormulaNode {
  return JSON.parse(JSON.stringify(n));
}

function elimIffImp(n: FormulaNode): FormulaNode {
  switch (n.kind) {
    case "Iff": {
      // (A ↔ B) ≡ (A → B) ∧ (B → A)
      return {
        kind: "And",
        left: elimIffImp({ kind: "Implies", left: n.left, right: n.right }),
        right: elimIffImp({ kind: "Implies", left: n.right, right: n.left }),
      };
    }
    case "Implies": {
      // (A → B) ≡ (¬A ∨ B)
      return {
        kind: "Or",
        left: { kind: "Not", sub: elimIffImp(n.left) },
        right: elimIffImp(n.right),
      };
    }
    case "Not":
      return { kind: "Not", sub: elimIffImp(n.sub) };
    case "And":
      return {
        kind: "And",
        left: elimIffImp(n.left),
        right: elimIffImp(n.right),
      };
    case "Or":
      return {
        kind: "Or",
        left: elimIffImp(n.left),
        right: elimIffImp(n.right),
      };
    case "Forall":
      return { kind: "Forall", v: n.v, body: elimIffImp(n.body) };
    case "Exists":
      return { kind: "Exists", v: n.v, body: elimIffImp(n.body) };
    default:
      return n;
  }
}

function pushNeg(n: FormulaNode): FormulaNode {
  switch (n.kind) {
    case "Not": {
      const s = n.sub;
      switch (s.kind) {
        case "Not":
          return pushNeg(s.sub); // ¬¬A → A
        case "And":
          return {
            kind: "Or",
            left: pushNeg({ kind: "Not", sub: s.left }),
            right: pushNeg({ kind: "Not", sub: s.right }),
          }; // ¬(A∧B) → ¬A∨¬B
        case "Or":
          return {
            kind: "And",
            left: pushNeg({ kind: "Not", sub: s.left }),
            right: pushNeg({ kind: "Not", sub: s.right }),
          }; // ¬(A∨B) → ¬A∧¬B
        case "Forall":
          return pushNeg({
            kind: "Exists",
            v: s.v,
            body: { kind: "Not", sub: s.body },
          }); // ¬∀x φ → ∃x ¬φ
        case "Exists":
          return pushNeg({
            kind: "Forall",
            v: s.v,
            body: { kind: "Not", sub: s.body },
          }); // ¬∃x φ → ∀x ¬φ
        default:
          return { kind: "Not", sub: pushNeg(s) };
      }
    }
    case "And":
      return { kind: "And", left: pushNeg(n.left), right: pushNeg(n.right) };
    case "Or":
      return { kind: "Or", left: pushNeg(n.left), right: pushNeg(n.right) };
    case "Forall":
      return { kind: "Forall", v: n.v, body: pushNeg(n.body) };
    case "Exists":
      return { kind: "Exists", v: n.v, body: pushNeg(n.body) };
    default:
      return n;
  }
}

// Standardize apart (rename bound variables uniquely and consistently)
let freshVarCounter = 0;
function freshVar(prefix = "v"): string {
  return `${prefix}${freshVarCounter++}`;
}

function renameVarInTerm(t: Term, from: string, to: string): Term {
  switch (t.kind) {
    case "Var":
      return t.name === from ? { kind: "Var", name: to } : t;
    case "Const":
      return t;
    case "Func":
      return {
        kind: "Func",
        name: t.name,
        args: t.args.map((a) => renameVarInTerm(a, from, to)),
      };
  }
}

function renameVarInFormula(
  n: FormulaNode,
  from: string,
  to: string
): FormulaNode {
  switch (n.kind) {
    case "Pred":
      return {
        kind: "Pred",
        name: n.name,
        args: n.args.map((a) => renameVarInTerm(a, from, to)),
      };
    case "Not":
      return { kind: "Not", sub: renameVarInFormula(n.sub, from, to) };
    case "And":
      return {
        kind: "And",
        left: renameVarInFormula(n.left, from, to),
        right: renameVarInFormula(n.right, from, to),
      };
    case "Or":
      return {
        kind: "Or",
        left: renameVarInFormula(n.left, from, to),
        right: renameVarInFormula(n.right, from, to),
      };
    case "Forall": {
      const newV = n.v === from ? to : n.v;
      const body = renameVarInFormula(n.body, from, to);
      return { kind: "Forall", v: newV, body };
    }
    case "Exists": {
      const newV = n.v === from ? to : n.v;
      const body = renameVarInFormula(n.body, from, to);
      return { kind: "Exists", v: newV, body };
    }
    default:
      return n;
  }
}

function standardizeApart(
  n: FormulaNode,
  used = new Set<string>()
): FormulaNode {
  switch (n.kind) {
    case "Forall": {
      let v = n.v;
      let bodyRenamed: FormulaNode = n.body;
      if (used.has(v)) {
        const v2 = freshVar(v);
        bodyRenamed = renameVarInFormula(n.body, v, v2);
        v = v2;
      }
      const used2 = new Set(used);
      used2.add(v);
      const body = standardizeApart(bodyRenamed, used2);
      return { kind: "Forall", v, body };
    }
    case "Exists": {
      let v = n.v;
      let bodyRenamed: FormulaNode = n.body;
      if (used.has(v)) {
        const v2 = freshVar(v);
        bodyRenamed = renameVarInFormula(n.body, v, v2);
        v = v2;
      }
      const used2 = new Set(used);
      used2.add(v);
      const body = standardizeApart(bodyRenamed, used2);
      return { kind: "Exists", v, body };
    }
    case "And":
      return {
        kind: "And",
        left: standardizeApart(n.left, new Set(used)),
        right: standardizeApart(n.right, new Set(used)),
      };
    case "Or":
      return {
        kind: "Or",
        left: standardizeApart(n.left, new Set(used)),
        right: standardizeApart(n.right, new Set(used)),
      };
    case "Not":
      return { kind: "Not", sub: standardizeApart(n.sub, new Set(used)) };
    default:
      return n;
  }
}

// Prenex: pull quantifiers to the front; assumes standardized apart and no →,↔ and negations pushed
type Quant = { q: "∀" | "∃"; v: string };
function toPrenex(n: FormulaNode): { quants: Quant[]; matrix: FormulaNode } {
  switch (n.kind) {
    case "Forall": {
      const r = toPrenex(n.body);
      return { quants: [{ q: "∀", v: n.v }, ...r.quants], matrix: r.matrix };
    }
    case "Exists": {
      const r = toPrenex(n.body);
      return { quants: [{ q: "∃", v: n.v }, ...r.quants], matrix: r.matrix };
    }
    case "And": {
      const L = toPrenex(n.left);
      const R = toPrenex(n.right);
      return {
        quants: [...L.quants, ...R.quants],
        matrix: { kind: "And", left: L.matrix, right: R.matrix },
      };
    }
    case "Or": {
      const L = toPrenex(n.left);
      const R = toPrenex(n.right);
      return {
        quants: [...L.quants, ...R.quants],
        matrix: { kind: "Or", left: L.matrix, right: R.matrix },
      };
    }
    case "Not":
      return { quants: [], matrix: n }; // Not should be only on atoms now
    default:
      return { quants: [], matrix: n };
  }
}

// Skolemization: replace ∃ vars with Skolem functions of preceding ∀ vars
let skolemCounter = 0;
function freshSkolemConst() {
  return `c${skolemCounter++}`;
}
function freshSkolemFunc() {
  return `f${skolemCounter++}`;
}

function replaceVarInTerm(t: Term, mapping: Record<string, Term>): Term {
  switch (t.kind) {
    case "Var":
      return mapping[t.name] ? mapping[t.name] : t;
    case "Const":
      return t;
    case "Func":
      return {
        kind: "Func",
        name: t.name,
        args: t.args.map((a) => replaceVarInTerm(a, mapping)),
      };
  }
}

function replaceVarInFormula(
  n: FormulaNode,
  mapping: Record<string, Term>
): FormulaNode {
  switch (n.kind) {
    case "Pred":
      return {
        kind: "Pred",
        name: n.name,
        args: n.args.map((a) => replaceVarInTerm(a, mapping)),
      };
    case "Not":
      return { kind: "Not", sub: replaceVarInFormula(n.sub, mapping) };
    case "And":
      return {
        kind: "And",
        left: replaceVarInFormula(n.left, mapping),
        right: replaceVarInFormula(n.right, mapping),
      };
    case "Or":
      return {
        kind: "Or",
        left: replaceVarInFormula(n.left, mapping),
        right: replaceVarInFormula(n.right, mapping),
      };
    default:
      return n;
  }
}

function skolemize(
  quants: Quant[],
  matrix: FormulaNode
): { matrix: FormulaNode; universals: string[] } {
  const universals: string[] = [];
  let current = matrix;
  for (const q of quants) {
    if (q.q === "∀") {
      universals.push(q.v);
    } else {
      // ∃ variable → replace with Skolem term of current universals
      const skTerm: Term =
        universals.length === 0
          ? { kind: "Const", name: freshSkolemConst() }
          : {
              kind: "Func",
              name: freshSkolemFunc(),
              args: universals.map((v) => ({ kind: "Var", name: v } as Term)),
            };
      const mapping: Record<string, Term> = { [q.v]: skTerm };
      current = replaceVarInFormula(current, mapping);
      // existential is removed
    }
  }
  return { matrix: current, universals };
}

// Distribute OR over AND to reach CNF
function distributeOrOverAnd(n: FormulaNode): FormulaNode {
  function dist(a: FormulaNode, b: FormulaNode): FormulaNode {
    // (a ∨ (b ∧ c)) ≡ (a ∨ b) ∧ (a ∨ c)
    if (b.kind === "And") {
      return { kind: "And", left: dist(a, b.left), right: dist(a, b.right) };
    }
    // ((a ∧ b) ∨ c) ≡ (a ∨ c) ∧ (b ∨ c)
    if (a.kind === "And") {
      return { kind: "And", left: dist(a.left, b), right: dist(a.right, b) };
    }
    return { kind: "Or", left: a, right: b };
  }

  switch (n.kind) {
    case "Or":
      return dist(distributeOrOverAnd(n.left), distributeOrOverAnd(n.right));
    case "And":
      return {
        kind: "And",
        left: distributeOrOverAnd(n.left),
        right: distributeOrOverAnd(n.right),
      };
    case "Not":
    case "Pred":
      return n;
    default:
      return n;
  }
}

// Flatten associative And/Or
function flatten(n: FormulaNode): FormulaNode {
  function flatAnd(n: FormulaNode): FormulaNode[] {
    if (n.kind === "And") return [...flatAnd(n.left), ...flatAnd(n.right)];
    return [n];
  }
  function flatOr(n: FormulaNode): FormulaNode[] {
    if (n.kind === "Or") return [...flatOr(n.left), ...flatOr(n.right)];
    return [n];
  }
  if (n.kind === "And") {
    const parts = flatAnd(n).map(flatten);
    return parts.reduce(
      (acc, cur) => (acc ? { kind: "And", left: acc, right: cur } : cur),
      null as any
    );
  }
  if (n.kind === "Or") {
    const parts = flatOr(n).map(flatten);
    return parts.reduce(
      (acc, cur) => (acc ? { kind: "Or", left: acc, right: cur } : cur),
      null as any
    );
  }
  if (n.kind === "Not") return { kind: "Not", sub: flatten(n.sub) };
  return n;
}

// Extract clauses (top-level ∧ of disjunctions of literals)
function collectClauses(n: FormulaNode): FormulaNode[] {
  if (n.kind === "And")
    return [...collectClauses(n.left), ...collectClauses(n.right)];
  return [n];
}
function clauseToFactoredString(c: FormulaNode): string {
  function collectOr(n: FormulaNode, out: FormulaNode[]) {
    if (n.kind === "Or") {
      collectOr(n.left, out);
      collectOr(n.right, out);
    } else out.push(n);
  }
  const lits: FormulaNode[] = [];
  collectOr(c, lits);

  const neg: string[] = [];
  const pos: string[] = [];
  for (const lit of lits) {
    if (lit.kind === "Not" && lit.sub.kind === "Pred")
      neg.push(toStringF(lit.sub));
    else if (lit.kind === "Pred") pos.push(toStringF(lit));
    else pos.push(toStringF(lit));
  }
  const conj = neg.length <= 1 ? neg[0] ?? "" : `(${neg.join(" ∧ ")})`;
  const disj = pos.length <= 1 ? pos[0] ?? "" : `(${pos.join(" ∨ ")})`;
  if (neg.length === 0) return disj || "⊤";
  if (pos.length === 0) return `¬(${conj})`;
  return `¬(${conj}) ∨ ${disj}`;
}

// Turn a disjunctive clause into an implicative form: (A1 ∧ ... ∧ Ak) → (B1 ∨ ... ∨ Bm)
// We will print it as: (B1 ∨ ... ∨ Bm) ⟵ (A1 ∧ ... ∧ Ak)
function clauseToImplicationString(c: FormulaNode): string {
  // Collect literals from a clause (which is an Or-tree)
  function collectOr(n: FormulaNode, out: FormulaNode[]) {
    if (n.kind === "Or") {
      collectOr(n.left, out);
      collectOr(n.right, out);
    } else out.push(n);
  }
  const lits: FormulaNode[] = [];
  collectOr(c, lits);

  const antecedents: string[] = []; // from negative literals (¬P → antecedent P)
  const consequents: string[] = []; // from positive literals (P → consequent P)

  for (const lit of lits) {
    if (lit.kind === "Not" && lit.sub.kind === "Pred") {
      antecedents.push(toStringF(lit.sub));
    } else if (lit.kind === "Pred") {
      consequents.push(toStringF(lit));
    } else {
      // If something unexpected remains (e.g., nested structure), fallback to raw
      consequents.push(toStringF(lit));
    }
  }

  const left =
    consequents.length === 0
      ? "False"
      : consequents.length === 1
      ? consequents[0]
      : `(${consequents.join(" ∨ ")})`;
  const right =
    antecedents.length === 0
      ? "True"
      : antecedents.length === 1
      ? antecedents[0]
      : `(${antecedents.join(" ∧ ")})`;
  return `${left} ⟵ ${right}`;
}

// ============================
// Demo data
// ============================

interface INFStep {
  step: number;
  formula: string;
  rule: string;
  description: string;
}

interface Formula {
  name: string;
  formula: string;
  description: string;
}

interface Exercise {
  id: string;
  name: string;
  description: string;
  formulas: Formula[];
}

const exercises: Exercise[] = [
  {
    id: "factoring",
    name: "Exercise 3.2: Factoring",
    description: "",
    formulas: [
      {
        name: "∀x p(x) ∨ ¬r(f(x))",
        formula: "∀x p(x) ∨ ¬r(f(x))",
        description: "Disjunction with predicate and function symbol",
      },
      {
        name: "∀x ∀y r(f(x)) ∨ r(f(f(y)))",
        formula: "∀x ∀y r(f(x)) ∨ r(f(f(y)))",
        description: "Disjunction with nested function symbols",
      },
    ],
  },
  {
    id: "movable objects",
    name: "Exercise 3.3: Movable Objects",
    description: "Formulas with complex nested quantifier structures",
    formulas: [
      {
        name: "If all movable objects are blue, then all non-movable objects are green.",
        formula: "(∀x mov(x) → blue(x)) → (∀y ¬mov(y) → green(y))",
        description: "Complex nested universal quantifiers with implications",
      },
      {
        name: "If there exists a non-movable object, then all movable objects are blue.",
        formula: "(∃x ¬mov(x)) → (∀y mov(y) → blue(y))",
        description: "Existential quantifier leading to universal implication",
      },
      {
        name: "D is a non-movable object.",
        formula: "¬mov(D)",
        description: "Simple negated predicate with constant",
      },
    ],
  },

  {
    id: "Politicans",
    name: "Exercise 3.4: Politicans",
    description: "",
    formulas: [
      {
        name: "If a poor politician exists, then all politicians are male.",
        formula: "(∃x pol(x) ∧ poor(x)) → (∀y pol(y) → male(y))",
        description: "Nested implications with quantifiers",
      },
      {
        name: "If people are friends with a politician, then this politician is poor and female.",
        formula: "∀x (pol(x) ∧ (∃y fr(y,x))) → poor(x) ∧ fem(x)",
        description: "Complex rule with existential quantifier",
      },
      {
        name: "Lazy people have no friends.",
        formula: "∀x lazy(x) → (¬(∃y fr(y,x)))",
        description: "Formula with negated existential quantifier",
      },
      {
        name: "People are either male or female, but not both.",
        formula: "∀x (male(x) ∨ fem(x)) ∧ (¬(male(x) ∧ fem(x)))",
        description: "Conjunction with negated conjunction",
      },
      {
        name: "If Joel is not lazy, then he is a politician.",
        formula: "¬lazy(Joel) → pol(Joel)",
        description: "Basic implication elimination",
      },
    ],
  },
  {
    id: "train-lovers",
    name: "Exercise 3.5: Train-Lovers",
    description: "",
    formulas: [
      {
        name: "Ann and Tom are train lovers.",
        formula: "trainlv(Ann) ∧ trainlv(Tom)",
        description: "Basic conjunction of facts",
      },
      {
        name: "Train-lovers are specialized in steam-locomotives or in electric-locomotives (not necessarily exclusive).",
        formula: "∀x (trainlv(x) → steam(x) ∨ elec(x))",
        description: "Universal rule with disjunctive conclusion",
      },
      {
        name: "Specialists in steam-locomotives do not like high-tech.",
        formula: "∀x (steam(x) → ¬likes(x,Hightech))",
        description: "Universal rule with negated conclusion",
      },
      {
        name: "Specialists in electric-locomotives like speed",
        formula: "∀x (elec(x) → likes(x,Speed))",
        description: "Universal rule with positive conclusion",
      },
      {
        name: "Tom does not like the things that Ann likes",
        formula: "∀x (likes(Ann,x) → ¬likes(Tom,x))",
        description: "Universal rule expressing mutual exclusion",
      },
      {
        name: "Ann likes speed.",
        formula: "likes(Ann,Speed)",
        description: "Simple fact statement",
      },
      {
        name: "There exists a specialist in steam-locomotives, who is not a specialist in electric-locomotives.",
        formula: "∀x (¬steam(x) ∨ elec(x))",
        description: "Universal disjunction to be converted to rule form",
      },
    ],
  },
];

export default function ImplicativeNormalFormDemo() {
  const [inputFormula, setInputFormula] = useState("");
  const [customFormula, setCustomFormula] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [selectedFormula, setSelectedFormula] = useState<string>("");
  const [steps, setSteps] = useState<INFStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const handleFormulaSelection = (formulaIndex: string) => {
    setSelectedFormula(formulaIndex);
    const selectedExerciseData = exercises.find(
      (ex) => ex.id === selectedExercise
    );
    if (selectedExerciseData) {
      const formula =
        selectedExerciseData.formulas[Number.parseInt(formulaIndex)];
      setInputFormula(formula.formula);
      setCustomFormula("");
      reset();
    }
  };

  const loadCustomFormula = () => {
    if (customFormula.trim()) {
      setInputFormula(customFormula.trim());
      setSelectedExercise("");
      setSelectedFormula("");
      reset();
    }
  };

  const reset = () => {
    setSteps([]);
    setCurrentStep(0);
    setCompleted(false);
    freshVarCounter = 0;
    skolemCounter = 0;
  };

  function step(rule: string, description: string, f: FormulaNode) {
    return { rule, description, formula: toStringF(f) };
  }

  const convertToINF = () => {
    const newSteps: INFStep[] = [];
    let stepCount = 0;

    // Step 0: Original
    newSteps.push({
      step: stepCount++,
      formula: inputFormula.trim(),
      rule: "Original Formula",
      description: "Starting with the given first-order logic formula",
    });

    let ast: FormulaNode;
    try {
      ast = parseFormula(inputFormula);
    } catch (e: any) {
      newSteps.push({
        step: stepCount++,
        formula: String(e?.message ?? e),
        rule: "Parse Error",
        description:
          "The input formula could not be parsed. Check parentheses and symbols.",
      });
      setSteps(newSteps);
      setCompleted(false);
      return;
    }

    // 1. Eliminate ↔ and →
    ast = elimIffImp(ast);
    newSteps.push({
      step: stepCount++,
      ...step(
        "Eliminate Biconditionals and Implications",
        "Replace A ↔ B with (A → B) ∧ (B → A), then A → B with ¬A ∨ B",
        ast
      ),
    });

    // 2. Move ¬ inwards
    ast = pushNeg(ast);
    newSteps.push({
      step: stepCount++,
      ...step(
        "Move ¬ Inwards",
        "Apply De Morgan's laws: ¬∀x φ → ∃x ¬φ, ¬∃x φ → ∀x ¬φ.",
        ast
      ),
    });

    // 3. Standardize variables (apart)
    const beforeStd = toStringF(ast);
    ast = standardizeApart(ast);
    if (toStringF(ast) !== beforeStd) {
      newSteps.push({
        step: stepCount++,
        ...step(
          "Standardize Variables",
          "Rename bound variables so each quantifier uses a unique name.",
          ast
        ),
      });
    }

    // 4. Prenex normal form (pull quantifiers to the front)
    const pren = toPrenex(ast);
    const prenexStr = `${pren.quants
      .map((q) => `${q.q}${q.v}`)
      .join(" ")} ${toStringF(pren.matrix)}`.trim();
    newSteps.push({
      step: stepCount++,
      formula: prenexStr,
      rule: "Prenex Normal Form",
      description: "Move all quantifiers to the front.",
    });

    // 5. Skolemize (remove ∃ with Skolem terms)
    const sk = skolemize(pren.quants, pren.matrix);
    const afterSk = sk.matrix;
    const skPrefix = sk.universals.map((v) => `∀${v}`).join(" ");
    const skStr = `${skPrefix} ${toStringF(afterSk)}`.trim();
    newSteps.push({
      step: stepCount++,
      formula: skStr,
      rule: "Skolemization",
      description:
        "Replace existential variables with Skolem constants/functions of the preceding universal variables.",
    });

    // 6. Distribute ∨ over ∧ to reach CNF
    let cnf = distributeOrOverAnd(afterSk);
    cnf = flatten(cnf);
    newSteps.push({
      step: stepCount++,
      ...step(
        "Distribute ∨ over ∧",
        "Apply distributive laws: (A ∨ (B ∧ C)) → (A ∨ B) ∧ (A ∨ C).",
        cnf
      ),
    });

    // 7. Eliminate universal quantifiers (they are implicit in clause form)
    const cnfNoForall = (function dropForall(n: FormulaNode): FormulaNode {
      if (n.kind === "Forall") return dropForall(n.body);
      if (n.kind === "And")
        return {
          kind: "And",
          left: dropForall(n.left),
          right: dropForall(n.right),
        };
      if (n.kind === "Or")
        return {
          kind: "Or",
          left: dropForall(n.left),
          right: dropForall(n.right),
        };
      if (n.kind === "Not") return { kind: "Not", sub: dropForall(n.sub) };
      return n;
    })(cnf);
    newSteps.push({
      step: stepCount++,
      ...step(
        "Eliminate Universal Quantification",
        "Remove ∀ (universals are implicit in clausal form).",
        cnfNoForall
      ),
    });

    // 8. Split conjunction into separate clauses
    const clauses = collectClauses(cnfNoForall);
    const clauseStrings = clauses.map(toStringF);
    newSteps.push({
      step: stepCount++,
      formula: clauseStrings.join("\n"),
      rule: "Eliminate Conjunction",
      description:
        "Transform the top-level conjunction into a set of disjunctions (clauses).",
    });

    // 9. (Optional) Normalize variables inside each clause (not strictly necessary since we standardized apart)
    newSteps.push({
      step: stepCount++,
      formula: clauseStrings.join("\n"),
      rule: "Normalize Variables",
      description:
        "Variables are already standardized; clauses listed one per line.",
    });
    const factoredStrings = clauses.map(clauseToFactoredString);
    newSteps.push({
      step: stepCount++,
      formula: factoredStrings.join("\n"),
      rule: "Factor Negative Literals (optional)",
      description:
        "Rewrite ¬A ∨ ¬B ∨ … ∨ C as ¬(A ∧ B ∧ …) ∨ C to highlight the grouped antecedent (presentation only).",
    });

    // 10. Convert each clause to an implicative rule form (conjunctive antecedent → disjunctive consequent)
    const ruleStrings = clauses.map(clauseToImplicationString);
    newSteps.push({
      step: stepCount++,
      formula: ruleStrings.join("\n"),
      rule: "Clauses → Implicative Rules",
      description:
        "Move negative literals to the antecedent (as positive atoms) and keep positive literals in the consequent. Printed as (Consequent) ⟵ (Antecedent).",
    });

    // Save
    setSteps(newSteps);
    setCompleted(true);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };
  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const currentStepData = steps[currentStep];
  const selectedExerciseData = exercises.find(
    (ex) => ex.id === selectedExercise
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select or Enter Formula</h3>
        {/* Exercise Selection (moved to top) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="exercise-select">Exercise</Label>

            <Select
              value={selectedExercise}
              onValueChange={setSelectedExercise}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an exercise..." />
              </SelectTrigger>
              <SelectContent>
                {exercises.map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedExerciseData && (
              <p className="text-xs text-gray-500 mt-1"></p>
            )}
          </div>

          <div>
            <Label htmlFor="formula-select">Formula</Label>

            <Select
              value={selectedFormula}
              onValueChange={handleFormulaSelection}
              disabled={!selectedExercise}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a formula..." />
              </SelectTrigger>
              <SelectContent>
                {selectedExerciseData?.formulas.map((formula, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {formula.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedExerciseData && selectedFormula !== "" && (
              <p className="text-xs text-gray-500 mt-1"></p>
            )}
          </div>
        </div>

        {/* Big OR divider */}
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-base md:text-lg font-semibold text-gray-600">
            OR
          </span>
          <Separator className="flex-1" />
        </div>

        {/* Custom Formula Input (moved below) */}
        <div className="space-y-2">
          <Label htmlFor="custom-formula">Enter Custom Formula</Label>
          <div className="flex gap-2">
            <Input
              id="custom-formula"
              value={customFormula}
              onChange={(e) => setCustomFormula(e.target.value)}
              placeholder="Enter a first-order logic formula..."
              className="font-mono"
            />
            <Button
              onClick={loadCustomFormula}
              disabled={!customFormula.trim()}
            >
              Load Formula
            </Button>
          </div>
        </div>

        {inputFormula && (
          <div>
            <Label>Current Formula</Label>
            <div className="mt-1 p-3 bg-gray-50 rounded border font-mono text-lg">
              {inputFormula}
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button onClick={convertToINF} disabled={!inputFormula}>
            Convert to INF
          </Button>
          <Button variant="outline" onClick={reset}>
            Reset
          </Button>
          {steps.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                Previous Step
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextStep}
                disabled={currentStep === steps.length - 1}
              >
                Next Step
              </Button>
            </>
          )}
        </div>
      </div>

      {steps.length > 0 && (
        <div className="space-y-4">
          <Separator />
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Step-by-Step Conversion</h3>
            <span className="px-3 py-1 bg-gray-100 rounded text-sm"></span>
          </div>

          {currentStepData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Step {currentStepData.step + 1}
                  <Badge variant="secondary">{currentStepData.rule}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">
                    Current Formula:
                  </Label>
                  <div className="mt-1 p-4 bg-blue-50 rounded border">
                    <code className="text-lg font-mono whitespace-pre-line">
                      {currentStepData.formula}
                    </code>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">
                    Transformation Rule:
                  </Label>
                  <p className="mt-1 text-sm text-gray-700">
                    {currentStepData.description}
                  </p>
                </div>

                {currentStep === steps.length - 1 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-800 font-medium">
                      <strong>Conversion Complete!</strong>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
