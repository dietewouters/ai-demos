"use client";

import { useState, useRef } from "react";
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

// ============================
// Types
// ============================

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

// ============================
// Lexer & Parser utilities
// ============================

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

// Map common ASCII to logic symbols
function normalizeAscii(input: string): string {
  let s = input;

  s = s.replace(/\s*<->\s*|\s*<=>\s*|↔/g, " ↔ ");
  s = s.replace(/\s*->\s*|→/g, " → ");

  s = s.replace(/&&|\/\\|∧/g, " ∧ ");
  s = s.replace(/\|\||\\\/|∨/g, " ∨ ");

  s = s.replace(/\bnot\b|!|~|¬/gi, " ¬ ");

  s = s.replace(/\bforall\b|∀/gi, "∀");
  s = s.replace(/\bexists\b|∃/gi, "∃");

  s = s.replace(/\s+/g, " ").trim();
  return s;
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

function elimIffImp(n: FormulaNode): FormulaNode {
  switch (n.kind) {
    case "Iff": {
      return {
        kind: "And",
        left: elimIffImp({ kind: "Implies", left: n.left, right: n.right }),
        right: elimIffImp({ kind: "Implies", left: n.right, right: n.left }),
      };
    }
    case "Implies": {
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
          return pushNeg(s.sub);
        case "And":
          return {
            kind: "Or",
            left: pushNeg({ kind: "Not", sub: s.left }),
            right: pushNeg({ kind: "Not", sub: s.right }),
          };
        case "Or":
          return {
            kind: "And",
            left: pushNeg({ kind: "Not", sub: s.left }),
            right: pushNeg({ kind: "Not", sub: s.right }),
          };
        case "Forall":
          return pushNeg({
            kind: "Exists",
            v: s.v,
            body: { kind: "Not", sub: s.body },
          });
        case "Exists":
          return pushNeg({
            kind: "Forall",
            v: s.v,
            body: { kind: "Not", sub: s.body },
          });
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

// ============================
// Standardize apart
// ============================

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

// ============================
// Prenex + Skolemization
// ============================

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
      return { quants: [], matrix: n };
    default:
      return { quants: [], matrix: n };
  }
}

// Skolem helpers (Uppercase names)
let skolemCounter = 0;
function freshSkolemConst() {
  return `C${skolemCounter++}`;
}
function freshSkolemFunc() {
  return `F${skolemCounter++}`;
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
      // existential removed
    }
  }
  return { matrix: current, universals };
}

// ============================
// CNF helpers
// ============================

function distributeOrOverAnd(n: FormulaNode): FormulaNode {
  function dist(a: FormulaNode, b: FormulaNode): FormulaNode {
    if (b.kind === "And") {
      return { kind: "And", left: dist(a, b.left), right: dist(a, b.right) };
    }
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

function collectClauses(n: FormulaNode): FormulaNode[] {
  if (n.kind === "And")
    return [...collectClauses(n.left), ...collectClauses(n.right)];
  return [n];
}

function clauseToImplicationString(c: FormulaNode): string {
  function collectOr(n: FormulaNode, out: FormulaNode[]) {
    if (n.kind === "Or") {
      collectOr(n.left, out);
      collectOr(n.right, out);
    } else out.push(n);
  }
  const lits: FormulaNode[] = [];
  collectOr(c, lits);

  const antecedents: string[] = [];
  const consequents: string[] = [];

  for (const lit of lits) {
    if (lit.kind === "Not" && lit.sub.kind === "Pred") {
      antecedents.push(toStringF(lit.sub));
    } else if (lit.kind === "Pred") {
      consequents.push(toStringF(lit));
    } else {
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

// ID for the new custom option inside the Exercise select
const CUSTOM_EX_ID = "__custom__";

export default function ImplicativeNormalFormDemo() {
  const [inputFormula, setInputFormula] = useState("");
  const [customFormula, setCustomFormula] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [selectedFormula, setSelectedFormula] = useState<string>("");
  const [steps, setSteps] = useState<INFStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const customRef = useRef<HTMLInputElement>(null);

  const handleExerciseSelection = (val: string) => {
    setSelectedExercise(val);
    setSelectedFormula("");
    setInputFormula("");
    setCustomFormula("");
    reset();
  };

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
      const normalized = normalizeAscii(customFormula.trim());
      setInputFormula(normalized);
      // Keep the exercise selection on custom; formula select stays empty
      setSelectedExercise(CUSTOM_EX_ID);
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
        "Eliminate ↔ and →",
        "Replace A ↔ B with (A → B) ∧ (B → A), then A → B with ¬A ∨ B",
        ast
      ),
    });

    // 2. Bring negations inside
    ast = pushNeg(ast);
    newSteps.push({
      step: stepCount++,
      ...step(
        "Bring the negations inside",
        "Use De Morgan and quantifier rules: ¬∀x φ ≡ ∃x ¬φ, ¬∃x φ ≡ ∀x ¬φ; ¬(A ∧ B) ≡ ¬A ∨ ¬B; ¬(A ∨ B) ≡ ¬A ∧ ¬B.",
        ast
      ),
    });

    // 3. Standardize variable names
    const beforeStd = toStringF(ast);
    ast = standardizeApart(ast);
    newSteps.push({
      step: stepCount++,
      ...step(
        "Standardize variable names",
        toStringF(ast) === beforeStd
          ? "No renaming needed; variables were already standardized."
          : "Rename bound variables so each quantifier uses a unique name.",
        ast
      ),
    });

    // Internally compute prenex to enable Skolemization
    const pren = toPrenex(ast);

    // 4. Eliminate ∃ (Introduce Skolems)
    const sk = skolemize(pren.quants, pren.matrix);
    const afterSkMatrix = sk.matrix;
    const skPrefix = sk.universals.map((v) => `∀${v}`).join(" ");
    const skStr = `${skPrefix} ${toStringF(afterSkMatrix)}`.trim();
    newSteps.push({
      step: stepCount++,
      formula: skStr,
      rule: "Eliminate ∃ (Introduce Skolems)",
      description:
        "Replace existential variables with Skolem constants/functions of the preceding universal variables.",
    });

    // 5. Bring quantors to the front (Prenex NF)
    const prenexStr = skStr; // After Skolemization only universals remain; bringing them to front yields the same prefix.
    newSteps.push({
      step: stepCount++,
      formula: prenexStr,
      rule: "Bring quantors to the front (Prenex Normal Form)",
      description: "Move all remaining (universal) quantifiers to the front.",
    });

    // 6. Disjunctions to inside (towards CNF) — work on the matrix only
    let cnfMatrix = distributeOrOverAnd(afterSkMatrix);
    cnfMatrix = flatten(cnfMatrix);
    const cnfWithPrefix = `${skPrefix} ${toStringF(cnfMatrix)}`.trim();
    newSteps.push({
      step: stepCount++,
      formula: cnfWithPrefix,
      rule: "Disjunctions to inside",
      description:
        "Apply distributive laws to push disjunctions inward: (A ∨ (B ∧ C)) ≡ (A ∨ B) ∧ (A ∨ C).",
    });

    // 7. Remove ∧ (split conjunction into separate clauses), still with ∀ prefix
    const clauses = collectClauses(cnfMatrix);
    const clauseStringsWithForall = clauses
      .map((c) => `${skPrefix} ${toStringF(c)}`.trim())
      .join("\n");
    newSteps.push({
      step: stepCount++,
      formula: clauseStringsWithForall,
      rule: "Remove ∧",
      description:
        "Split the top-level conjunction into separate disjunctive clauses (still under universal quantifiers).",
    });

    // 8. Remove ∀ (universals are implicit in clausal form)
    const clauseStrings = clauses.map(toStringF);
    newSteps.push({
      step: stepCount++,
      formula: clauseStrings.join("\n"),
      rule: "Remove ∀",
      description:
        "Drop universal quantifiers — variables are implicitly universally quantified in clause form.",
    });

    // 9. “atoms to other side” → implicative form
    const ruleStrings = clauses.map(clauseToImplicationString);
    newSteps.push({
      step: stepCount++,
      formula: ruleStrings.join("\n"),
      rule: "Negative atoms to other side (Implicative form)",
      description:
        "Move negative literals to the antecedent (as positive atoms) and keep positive literals in the consequent: (B1 ∨ ... ∨ Bm) ⟵ (A1 ∧ ... ∧ Ak).",
    });

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

  function insertAtCursor(text: string) {
    const el = customRef.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;

    const next = el.value.slice(0, start) + text + el.value.slice(end);
    setCustomFormula(next);

    // place caret after inserted symbol
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  }

  const SYMBOLS = ["∀", "∃", "¬", "∧", "∨", "→", "↔", "(", ")", ","];

  const showFormulaSelect =
    selectedExercise && selectedExercise !== CUSTOM_EX_ID;
  const showCustomInput = selectedExercise === CUSTOM_EX_ID;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Choose Exercise & Formula</h3>
        {/* Exercise Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="exercise-select">Exercise</Label>
            <Select
              value={selectedExercise}
              onValueChange={handleExerciseSelection}
            >
              <SelectTrigger id="exercise-select">
                <SelectValue placeholder="Select an exercise..." />
              </SelectTrigger>
              <SelectContent>
                {exercises.map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </SelectItem>
                ))}
                <Separator className="my-1" />
                <SelectItem value={CUSTOM_EX_ID}>
                  Custom formula (enter your own)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showFormulaSelect && (
            <div>
              <Label htmlFor="formula-select">Formula</Label>
              <Select
                value={selectedFormula}
                onValueChange={handleFormulaSelection}
                disabled={!selectedExercise}
              >
                <SelectTrigger id="formula-select">
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
            </div>
          )}
        </div>

        {/* Custom Formula Input (only when Custom is selected) */}
        {showCustomInput && (
          <div className="space-y-2">
            <Label htmlFor="custom-formula">Enter Custom Formula</Label>

            {/* Quick symbol bar */}
            <div className="flex flex-wrap gap-2 mb-1">
              {SYMBOLS.map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => insertAtCursor(s)}
                  title={`Insert ${s}`}
                >
                  {s}
                </Button>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                id="custom-formula"
                ref={customRef}
                value={customFormula}
                onChange={(e) => setCustomFormula(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    loadCustomFormula();
                  }
                }}
                placeholder="e.g., forall x (P(x) -> exists y Q(f(x), y))"
                className="font-mono"
              />
              <Button
                onClick={loadCustomFormula}
                disabled={!customFormula.trim()}
              >
                Use Formula
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              ASCII is accepted; it will be normalized to logical symbols.
            </p>
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
            <span className="px-3 py-1 bg-gray-100 rounded text-sm">
              {completed
                ? "Complete"
                : `Step ${currentStep + 1} of ${steps.length}`}
            </span>
          </div>

          {currentStepData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Step {currentStepData.step}
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

      {/* Algorithm (collapsible) */}
      <Card className="mt-8">
        <details>
          <summary className="cursor-pointer select-none p-4 font-medium">
            Algorithm
          </summary>
          <CardContent className="pt-0 pb-4 px-4">
            <ol className="list-decimal pl-6 space-y-2 text-sm">
              <li>
                <strong>Eliminate ↔ and →</strong> — replace A ↔ B by (A → B) ∧
                (B → A); replace A → B by ¬A ∨ B.
              </li>
              <li>
                <strong>Push negations inside</strong> — De Morgan + quantifier
                rules: ¬∀x φ ≡ ∃x ¬φ, ¬∃x φ ≡ ∀x ¬φ, etc.
              </li>
              <li>
                <strong>Standardize variables</strong> — rename bound variables
                so each quantifier uses a unique name.
              </li>
              <li>
                <strong>Skolemize (eliminate ∃)</strong> — replace existentials
                by Skolem constants/functions of preceding universals.
              </li>
              <li>
                <strong>Prenex Normal Form</strong> — move remaining ∀
                quantifiers to the front.
              </li>
              <li>
                <strong>Distribute ∨ over ∧</strong> — transform the matrix
                toward CNF.
              </li>
              <li>
                <strong>Remove ∧</strong> — break top-level conjunction into
                separate disjunctive clauses.
              </li>
              <li>
                <strong>Remove ∀</strong> — universals are implicit in clausal
                form.
              </li>
              <li>
                <strong>Implicative form</strong> — move negative literals to
                the left: (B₁ ∨ … ∨ B_m) ⟵ (A₁ ∧ … ∧ A_k).
              </li>
            </ol>
          </CardContent>
        </details>
      </Card>
    </div>
  );
}
