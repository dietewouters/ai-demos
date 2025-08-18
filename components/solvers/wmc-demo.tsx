"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { parseFormula } from "@/components/solvers/lib/formula-parser";
import type { Formula } from "@/components/solvers/lib/dpll-types";

const EXAMPLE_FORMULAS = [
  { name: "Example of DPLL", formula: "(x ∨ w) ∧ (y ∨ z)" },
  {
    name: "Exercise 1.1",
    formula: "(¬A∨C ∨¬D)∧(A∨B ∨C ∨¬D)∧(¬A∨¬E)∧¬C ∧(A∨D)∧(A∨C ∨E)∧(D ∨E)",
  },
  {
    name: "Exercise 1.2",
    formula:
      "(E ∨ A) ∧ (B ∨ ¬A ∨ C) ∧ (E ∨ ¬D) ∧ (B ∨ ¬C) ∧ (¬B ∨ D) ∧ (¬E ∨ ¬A ∨ ¬D ∨ ¬B)",
  },
  {
    name: "Exercise 2",
    formula:
      "(¬A ∨ ¬B ∨ ¬C) ∧ (¬A ∨ ¬B ∨ C ∨ D) ∧ (¬A ∨ B ∨ C ∨ D) ∧ (¬A ∨ ¬B ∨ C ∨ ¬D)",
  },
];
/// Tabel hardcap om 2^n rijen te beperken
const MAX_TABLE_VARS = 12;

type ProbMap = Record<string, number>;
type Assign = Record<string, boolean>;

function evaluateCNF(formula: Formula, a: Assign): boolean {
  return formula.clauses.every((cl) =>
    cl.literals.some((lit) => (a[lit.variable] ?? false) === !lit.negated)
  );
}

function enumerateAssignments(vars: string[]): Assign[] {
  const n = vars.length;
  const N = 1 << n;
  const rows: Assign[] = [];
  for (let m = 0; m < N; m++) {
    const row: Assign = {};
    for (let i = 0; i < n; i++) {
      row[vars[i]] = ((m >> (n - 1 - i)) & 1) === 1;
    }
    rows.push(row);
  }
  return rows;
}

function numStr(x: number) {
  // compacte weergave zonder ruis
  if (x === 0) return "0";
  if (x === 1) return "1";
  const s = x.toFixed(4);
  return s.replace(/\.?0+$/, "");
}

function weightOfAssignment(a: Assign, probs: ProbMap) {
  let val = 1;
  const factors: number[] = [];
  const sym: string[] = [];
  for (const [v, t] of Object.entries(a)) {
    const p = probs[v] ?? 0.5;
    const f = t ? p : 1 - p;
    factors.push(f);
    sym.push(t ? `P(${v})` : `P(¬${v})`);
    val *= f;
  }
  const symExpr = sym.join("·");
  const numExpr = factors.map(numStr).join("·");
  return { value: val, symExpr, numExpr };
}

export function WMCDemo() {
  // invoer
  const [selectedExample, setSelectedExample] = useState("");
  const [customFormula, setCustomFormula] = useState("");
  const [formulaText, setFormulaText] = useState("");

  // parsed
  const [formula, setFormula] = useState<Formula | null>(null);
  const [variables, setVariables] = useState<string[]>([]);
  const [probs, setProbs] = useState<ProbMap>({});

  // resultaten
  const [rows, setRows] = useState<any[]>([]); // voor tabelweergave
  const [wmc, setWmc] = useState<number | null>(null);
  const [satCount, setSatCount] = useState<number | null>(null);
  const [tableTruncated, setTableTruncated] = useState(false);
  const [weightSum, setWeightSum] = useState<number | null>(null);

  // keep formula text in sync
  useEffect(() => {
    if (selectedExample) {
      const ex = EXAMPLE_FORMULAS.find((e) => e.name === selectedExample);
      setFormulaText(ex?.formula ?? "");
      if (ex) setCustomFormula("");
    } else {
      setFormulaText(customFormula);
    }
  }, [selectedExample, customFormula]);

  const isReady = formulaText.trim().length > 0;

  const allHalf = useMemo(
    () =>
      variables.length > 0 &&
      variables.every((v) => Math.abs((probs[v] ?? 0.5) - 0.5) < 1e-12),
    [variables, probs]
  );

  const build = () => {
    if (!isReady) return;
    try {
      const parsed = parseFormula(formulaText);
      setFormula(parsed);
      const vs = Array.from(parsed.variables).sort();
      setVariables(vs);
      const pmap: ProbMap = {};
      for (const v of vs) pmap[v] = probs[v] ?? 0.5;
      setProbs(pmap);

      const n = vs.length;
      const showTable = n <= MAX_TABLE_VARS;

      let totalWMC = 0;
      let totalSAT = 0;
      let totalWeight = 0;
      const out: any[] = [];

      if (showTable) {
        const assigns = enumerateAssignments(vs);
        for (const a of assigns) {
          const isModel = evaluateCNF(parsed, a);
          const w = weightOfAssignment(a, pmap);
          const contrib = isModel ? w.value : 0;
          totalWMC += contrib;
          totalWeight += w.value; // ⬅️ nieuw
          if (isModel) totalSAT += 1;

          out.push({
            a,
            isModel,
            symExpr: w.symExpr,
            numExpr: w.numExpr,
            weight: w.value,
            contrib,
          });
        }
      } else {
        // geen tabel (n > MAX_TABLE_VARS): totals blijven correct
        const nHardCap = Math.min(vs.length, 20);
        const assigns = enumerateAssignments(vs.slice(0, nHardCap));
        for (const a of assigns) {
          const full: Record<string, boolean> = {};
          vs.forEach((v) => (full[v] = a[v] ?? false));
          const isModel = evaluateCNF(parsed, full);
          const w = weightOfAssignment(full, pmap);
          totalWMC += isModel ? w.value : 0;
          // totalWeight over alle 2^n assignments tonen we alleen in de tabel-variant
        }
      }

      setRows(out);
      setWmc(totalWMC);
      setSatCount(totalSAT);
      setWeightSum(showTable ? totalWeight : null); // ⬅️ nieuw
      setTableTruncated(!showTable);
    } catch (e) {
      console.error(e);
    }
  };

  // herbereken bij aanpassen kansen
  useEffect(() => {
    if (!formula || variables.length === 0) return;

    const vs = variables;
    const showTable = vs.length <= MAX_TABLE_VARS;

    let totalWMC = 0;
    let totalSAT = 0;
    let totalWeight = 0; // ⬅️ nieuw
    const out: any[] = [];

    if (showTable) {
      const assigns = enumerateAssignments(vs);
      for (const a of assigns) {
        const isModel = evaluateCNF(formula, a);
        const w = weightOfAssignment(a, probs);
        const contrib = isModel ? w.value : 0;
        totalWMC += contrib;
        totalWeight += w.value; // ⬅️ nieuw
        if (isModel) totalSAT += 1;
        out.push({
          a,
          isModel,
          symExpr: w.symExpr,
          numExpr: w.numExpr,
          weight: w.value,
          contrib,
        });
      }
    } else {
      const nHardCap = Math.min(vs.length, 20);
      const assigns = enumerateAssignments(vs.slice(0, nHardCap));
      for (const a of assigns) {
        const full: Record<string, boolean> = {};
        vs.forEach((v) => (full[v] = a[v] ?? false));
        const isModel = evaluateCNF(formula, full);
        const w = weightOfAssignment(full, probs);
        totalWMC += isModel ? w.value : 0;
        // totalWeight niet zinvol zonder volledige tabel
      }
    }

    setRows(out);
    setWmc(totalWMC);
    setSatCount(totalSAT);
    setWeightSum(showTable ? totalWeight : null);
    setTableTruncated(!showTable);
  }, [probs, formula, variables]);

  const n = variables.length;
  const normalised = useMemo(() => {
    if (!allHalf || satCount == null) return null;
    return satCount / Math.pow(2, n);
  }, [satCount, n, allHalf]);

  return (
    <div className="flex h-screen bg-background">
      {/* Controls */}
      <div className="w-80 shrink-0 border-r bg-card p-6 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Weighted Model Counting</h2>

        {/* Formula selection */}
        <div className="space-y-2 mb-3">
          <Label className="text-sm font-medium">Choose Formula</Label>
          <Select
            value={selectedExample}
            onValueChange={(v) => {
              setSelectedExample(v);
            }}
          >
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Select example..." />
            </SelectTrigger>
            <SelectContent>
              {EXAMPLE_FORMULAS.map((ex) => (
                <SelectItem key={ex.name} value={ex.name} className="text-xs">
                  {ex.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="text-center text-xs text-muted-foreground">or</div>

          <Textarea
            placeholder="Enter custom formula..."
            value={customFormula}
            onChange={(e) => {
              setCustomFormula(e.target.value);
              setSelectedExample("");
            }}
            className="min-h-16 text-xs font-mono"
          />
        </div>

        <div className="p-2 bg-muted rounded text-xs font-mono break-all mb-4">
          {formulaText || "No formula"}
        </div>

        <Button className="w-full mb-4" onClick={build} disabled={!isReady}>
          Build Table
        </Button>

        {variables.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="flex items-center justify-between mb-1">
              <Label className="text-sm font-medium">P(X = true)</Label>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const p: ProbMap = {};
                  variables.forEach((v) => (p[v] = 0.5));
                  setProbs(p);
                }}
              >
                Reset 0.5
              </Button>
            </div>

            <div className="space-y-3">
              {variables.map((v) => (
                <div key={v} className="space-y-1">
                  {/* alleen de variabele-naam links (geen “kans boven de kans”) */}
                  <div className="text-xs font-mono">{v}</div>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[probs[v] ?? 0.5]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={(val) =>
                        setProbs((pm) => ({ ...pm, [v]: val[0] }))
                      }
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      className="w-20 h-8"
                      min={0}
                      max={1}
                      step="0.01"
                      value={probs[v] ?? 0.5}
                      onChange={(e) => {
                        const num = Math.max(
                          0,
                          Math.min(1, Number(e.target.value))
                        );
                        setProbs((pm) => ({
                          ...pm,
                          [v]: isFinite(num) ? num : 0,
                        }));
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right: results + table */}
      <div className="flex-1 p-6 overflow-y-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Variables:</span>{" "}
              <span className="font-mono">{variables.join(", ") || "—"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="text-xs">WMC</Badge>
              <div className="text-xl font-semibold">
                {wmc != null ? wmc.toPrecision(8) : "—"}
              </div>
            </div>
            {satCount != null && (
              <div className="text-sm">
                <span className="font-medium">#SAT:</span>{" "}
                <span className="font-mono">{satCount}</span>
              </div>
            )}
            {allHalf && normalised != null && (
              <div className="text-sm">
                All P=0.5 ⇒{" "}
                <span className="font-mono">#SAT / 2^{variables.length}</span> ={" "}
                <span className="font-mono">{normalised.toPrecision(8)}</span>{" "}
                (should equal WMC)
              </div>
            )}
            {tableTruncated && (
              <div className="text-xs text-muted-foreground">
                Table hidden (n = {variables.length} &gt; {MAX_TABLE_VARS}).
                Totals are still correct.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Full table */}
        {rows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                All assignments (2^{variables.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {variables.map((v) => (
                      <TableHead key={v} className="text-center">
                        {v}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Model?</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead className="text-right">
                      Count = model × weight
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow key={idx}>
                      {variables.map((v) => (
                        <TableCell key={v} className="text-center">
                          {r.a[v] ? 1 : 0}
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        {r.isModel ? 1 : 0}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.symExpr} = {r.numExpr} = {numStr(r.weight)}
                      </TableCell>
                      <TableCell className="text-right">
                        {numStr(r.contrib)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* ⬇️ Totals row */}
                  <TableRow>
                    {variables.map((v) => (
                      <TableCell key={v} className="border-t" />
                    ))}
                    <TableCell className="text-center font-semibold border-t">
                      {satCount ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs border-t"></TableCell>
                    <TableCell className="text-right font-semibold border-t">
                      {wmc != null ? `Σ count = ${numStr(wmc)}` : "—"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
