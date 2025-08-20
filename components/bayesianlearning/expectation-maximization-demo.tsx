"use client";

import { useState, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BayesianParams {
  theta_f: number;
  theta_t1_f1: number;
  theta_t1_f0: number;
  theta_t2_f1: number;
  theta_t2_f0: number;
}

interface DataPoint {
  f?: number;
  t1?: number;
  t2?: number;
}

interface ExpandedDataPoint {
  f: number;
  t1: number;
  t2: number;
  weight: number;
  source_row: number;
  missing_f?: boolean;
  missing_t1?: boolean;
  missing_t2?: boolean;
}

type ECase =
  | "complete"
  | "missingF"
  | "missingT1"
  | "missingT2"
  | "missingFT1"
  | "default";

function Q({ i, children }: { i: number; children: ReactNode }) {
  return (
    <>
      <span className="font-serif italic">q</span>
      <sup>{i}</sup>({children})
    </>
  );
}

function NetworkDiagram() {
  return (
    <div className="flex justify-center">
      <svg
        width="300"
        height="200"
        viewBox="0 0 300 200"
        className="border rounded-lg bg-white"
      >
        {/* Node F */}
        <circle
          cx="150"
          cy="50"
          r="25"
          fill="#e3f2fd"
          stroke="#1976d2"
          strokeWidth="2"
        />
        <text
          x="150"
          y="55"
          textAnchor="middle"
          className="font-semibold text-sm"
        >
          F
        </text>
        {/* Node T1 */}
        <circle
          cx="100"
          cy="130"
          r="25"
          fill="#f3e5f5"
          stroke="#7b1fa2"
          strokeWidth="2"
        />
        <text
          x="100"
          y="135"
          textAnchor="middle"
          className="font-semibold text-sm"
        >
          T₁
        </text>
        {/* Node T2 */}
        <circle
          cx="200"
          cy="130"
          r="25"
          fill="#e8f5e8"
          stroke="#388e3c"
          strokeWidth="2"
        />
        <text
          x="200"
          y="135"
          textAnchor="middle"
          className="font-semibold text-sm"
        >
          T₂
        </text>
        {/* Edges */}
        <line
          x1="135"
          y1="70"
          x2="115"
          y2="110"
          stroke="#666"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
        />
        <line
          x1="165"
          y1="70"
          x2="185"
          y2="110"
          stroke="#666"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
        />
        {/* Arrow marker */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

function DataTable({
  data,
  expectations,
  currentStep,
  onRowClick,
  selectedRow,
  selectedParameter,
}: {
  data: DataPoint[];
  expectations: number[][];
  currentStep: string;
  onRowClick: (index: number) => void;
  selectedRow: number | null;
  selectedParameter: string | null;
}) {
  const isInitial = currentStep === "ready";

  // Build expanded rows per data row using expectations (zoals je had)
  const expandedData: ExpandedDataPoint[] = [];
  data.forEach((point, rowIndex) => {
    const missingF = point.f === undefined;
    const missingT1 = point.t1 === undefined;
    const missingT2 = point.t2 === undefined;
    const exp = expectations[rowIndex];

    if (!missingF && !missingT1 && !missingT2) {
      expandedData.push({
        f: point.f!,
        t1: point.t1!,
        t2: point.t2!,
        weight: 1,
        source_row: rowIndex + 1,
        missing_f: false,
        missing_t1: false,
        missing_t2: false,
      });
    } else if (!isInitial) {
      // Alleen tijdens/na E-stap vertakken; in de beginweergave NIET expanden
      if (!missingF && !missingT1 && missingT2 && exp && exp.length >= 2) {
        expandedData.push({
          f: point.f!,
          t1: point.t1!,
          t2: 1,
          weight: exp[0],
          source_row: rowIndex + 1,
          missing_t2: true,
        });
        expandedData.push({
          f: point.f!,
          t1: point.t1!,
          t2: 0,
          weight: exp[1],
          source_row: rowIndex + 1,
          missing_t2: true,
        });
      } else if (
        !missingF &&
        missingT1 &&
        !missingT2 &&
        exp &&
        exp.length >= 2
      ) {
        expandedData.push({
          f: point.f!,
          t1: 1,
          t2: point.t2!,
          weight: exp[0],
          source_row: rowIndex + 1,
          missing_t1: true,
        });
        expandedData.push({
          f: point.f!,
          t1: 0,
          t2: point.t2!,
          weight: exp[1],
          source_row: rowIndex + 1,
          missing_t1: true,
        });
      } else if (
        missingF &&
        !missingT1 &&
        !missingT2 &&
        exp &&
        exp.length >= 2
      ) {
        expandedData.push({
          f: 1,
          t1: point.t1!,
          t2: point.t2!,
          weight: exp[0],
          source_row: rowIndex + 1,
          missing_f: true,
        });
        expandedData.push({
          f: 0,
          t1: point.t1!,
          t2: point.t2!,
          weight: exp[1],
          source_row: rowIndex + 1,
          missing_f: true,
        });
      } else if (
        missingF &&
        missingT1 &&
        !missingT2 &&
        exp &&
        exp.length >= 4
      ) {
        expandedData.push({
          f: 1,
          t1: 1,
          t2: point.t2!,
          weight: exp[0],
          source_row: rowIndex + 1,
          missing_f: true,
          missing_t1: true,
        });
        expandedData.push({
          f: 1,
          t1: 0,
          t2: point.t2!,
          weight: exp[1],
          source_row: rowIndex + 1,
          missing_f: true,
          missing_t1: true,
        });
        expandedData.push({
          f: 0,
          t1: 1,
          t2: point.t2!,
          weight: exp[2],
          source_row: rowIndex + 1,
          missing_f: true,
          missing_t1: true,
        });
        expandedData.push({
          f: 0,
          t1: 0,
          t2: point.t2!,
          weight: exp[3],
          source_row: rowIndex + 1,
          missing_f: true,
          missing_t1: true,
        });
      }
    }
  });

  // BEGIN: stijl/highlight ongewijzigd
  const styleMap: Record<string, { fill: string; outline: string }> = {
    theta_f: {
      fill: "bg-green-100",
      outline: "outline outline-2 outline-yellow-200",
    },
    theta_t1_f1: {
      fill: "bg-blue-100",
      outline: "outline outline-2 outline-purple-400",
    },
    theta_t1_f0: {
      fill: "bg-purple-100",
      outline: "outline outline-2 outline-blue-400",
    },
    theta_t2_f1: {
      fill: "bg-orange-100",
      outline: "outline outline-2 outline-red-300",
    },
    theta_t2_f0: {
      fill: "bg-red-100",
      outline: "outline outline-2 outline-purple-300",
    },
  };

  const getRowHighlight = (row: ExpandedDataPoint): string => {
    if (currentStep !== "m-completed" || !selectedParameter) return "";
    const s = styleMap[selectedParameter];
    const hasW = (row.weight ?? 0) > 0.001;
    let inNum = false,
      inDen = false;
    switch (selectedParameter) {
      case "theta_f":
        inNum = hasW && row.f === 1;
        inDen = hasW;
        break;
      case "theta_t1_f1":
        inNum = hasW && row.f === 1 && row.t1 === 1;
        inDen = hasW && row.f === 1;
        break;
      case "theta_t1_f0":
        inNum = hasW && row.f === 0 && row.t1 === 1;
        inDen = hasW && row.f === 0;
        break;
      case "theta_t2_f1":
        inNum = hasW && row.f === 1 && row.t2 === 1;
        inDen = hasW && row.f === 1;
        break;
      case "theta_t2_f0":
        inNum = hasW && row.f === 0 && row.t2 === 1;
        inDen = hasW && row.f === 0;
        break;
    }
    if (inNum && inDen) return `${s.fill} ${s.outline}`;
    if (inNum) return s.fill;
    if (inDen) return s.outline;
    return "";
  };

  const weightLabel = (row: ExpandedDataPoint) => {
    const i = row.source_row;
    if (row.missing_f && row.missing_t1 && !row.missing_t2) {
      return (
        <Q i={i}>
          f={row.f}, t₁={row.t1}
        </Q>
      );
    }
    if (row.missing_f && !row.missing_t1 && !row.missing_t2) {
      return (
        <Q i={i}>
          <i>f</i>={row.f}
        </Q>
      );
    }
    if (!row.missing_f && row.missing_t1 && !row.missing_t2) {
      return <Q i={i}>t₁={row.t1}</Q>;
    }
    if (!row.missing_f && !row.missing_t1 && row.missing_t2) {
      return <Q i={i}>t₂={row.t2}</Q>;
    }
    return <>1</>;
  };
  // END: stijl/highlight ongewijzigd

  // helper om ontbrekende waarden als '?' te tonen
  const show = (v?: number) => (v === undefined ? "?" : String(v));

  // In de 'ready' view tonen we de originele rijen 1-op-1 (geen expansion)
  const initialRows: ExpandedDataPoint[] = data.map((p, idx) => ({
    f: p.f ?? 0,
    t1: p.t1 ?? 0,
    t2: p.t2 ?? 0,
    weight: 0, // niet gebruikt in initiale render
    source_row: idx + 1,
    missing_f: p.f === undefined,
    missing_t1: p.t1 === undefined,
    missing_t2: p.t2 === undefined,
  }));

  const rowsToRender = isInitial ? initialRows : expandedData;

  return (
    <div className="overflow-x-auto">
      {isInitial && (
        <div className="mb-2 text-xs text-gray-600">
          <span className="inline-block mr-3">
            Legenda: <strong>positief = 1</strong>, negatief = 0,{" "}
            <strong>?</strong> = ontbrekend
          </span>
        </div>
      )}
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2">Source Row</th>
            <th className="border border-gray-300 px-3 py-2">f</th>
            <th className="border border-gray-300 px-3 py-2">t₁</th>
            <th className="border border-gray-300 px-3 py-2">t₂</th>
            <th className="border border-gray-300 px-3 py-2">weight</th>
          </tr>
        </thead>
        <tbody>
          {rowsToRender.map((row, idx) => {
            const originalRowIndex = row.source_row - 1;
            const hasMissing = !!(
              row.missing_f ||
              row.missing_t1 ||
              row.missing_t2
            );

            return (
              <tr
                key={idx}
                className={`cursor-pointer hover:bg-gray-50 ${
                  selectedRow === originalRowIndex
                    ? "bg-yellow-200 border-2 border-yellow-400"
                    : ""
                } ${getRowHighlight(row)}`}
                onClick={() => onRowClick(originalRowIndex)}
              >
                <td className="border border-gray-300 px-3 py-2 text-center font-semibold">
                  {row.source_row}
                </td>

                <td
                  className={`border border-gray-300 px-3 py-2 text-center font-mono ${
                    row.missing_f ? "font-bold" : ""
                  }`}
                >
                  {isInitial ? (row.missing_f ? "?" : row.f) : row.f}
                </td>

                <td
                  className={`border border-gray-300 px-3 py-2 text-center font-mono ${
                    row.missing_t1 ? "font-bold" : ""
                  }`}
                >
                  {isInitial ? (row.missing_t1 ? "?" : row.t1) : row.t1}
                </td>

                <td
                  className={`border border-gray-300 px-3 py-2 text-center font-mono ${
                    row.missing_t2 ? "font-bold" : ""
                  }`}
                >
                  {isInitial ? (row.missing_t2 ? "?" : row.t2) : row.t2}
                </td>

                <td className="border border-gray-300 px-3 py-2 text-center">
                  <div className="space-y-1">
                    <div className="font-mono text-xs">
                      {isInitial
                        ? hasMissing
                          ? "—"
                          : "1"
                        : row.weight.toFixed(3)}
                    </div>
                    {!isInitial && (
                      <div className="text-xs text-gray-700">
                        {weightLabel(row)}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="text-xs text-gray-600 mt-2">
        {isInitial
          ? "Click on ‘Run E-Step’ to calculate weights."
          : "💡 Click on a row to see the E-step details."}
      </p>
    </div>
  );
}

function RowCalculationDetails({
  selectedRow,
  data,
  params,
  expectations,
  currentStep,
}: {
  selectedRow: number | null;
  data: DataPoint[];
  params: BayesianParams;
  expectations: number[][];
  currentStep: string;
}) {
  if (selectedRow === null) return null;

  const point = data[selectedRow];
  const exp = expectations[selectedRow] || [];

  const missingF = point.f === undefined;
  const missingT1 = point.t1 === undefined;
  const missingT2 = point.t2 === undefined;

  // helpers
  const fmt = (x: number, d = 6) => x.toFixed(d);
  // JSX helpers for the t₂ terms and the common denominator
  const T2_given_f1 =
    point.t2 === 1 ? (
      <span>
        θ<sub>t21</sub>
      </span>
    ) : (
      <span>
        (1−θ<sub>t21</sub>)
      </span>
    );

  const T2_given_f0 =
    point.t2 === 1 ? (
      <span>
        θ<sub>t20</sub>
      </span>
    ) : (
      <span>
        (1−θ<sub>t20</sub>)
      </span>
    );

  const Den = (
    <span>
      θ<sub>f</sub>·{T2_given_f1} + (1−θ<sub>f</sub>)·{T2_given_f0}
    </span>
  );

  return (
    <Card className="mt-4 border-yellow-300">
      <CardHeader>
        <CardTitle className="text-lg text-yellow-700">
          Row {selectedRow + 1} — Detailed Calculations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Data Point:</h4>
            <div className="font-mono text-sm">
              f = {point.f ?? "?"}, t₁ = {point.t1 ?? "?"}, t₂ ={" "}
              {point.t2 ?? "?"}
            </div>
          </div>

          {/* Complete data point */}
          {!missingF && !missingT1 && !missingT2 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Complete Data Point:</h4>
              <div className="text-sm">
                Everything observed → no E-step needed. Weight = 1.
              </div>
            </div>
          )}

          {/* Only F missing */}
          {missingF &&
            !missingT1 &&
            !missingT2 &&
            currentStep === "e-completed" &&
            exp.length >= 2 && (
              <div className="space-y-3">
                <h4 className="font-semibold">E-Step: q(f=1|t₁,t₂)</h4>
                <div className="space-y-2 text-sm font-mono bg-white p-3 rounded border">
                  <div>
                    num₁ = θ_F · P(t₁={point.t1}|f=1) · P(t₂={point.t2}|f=1)
                  </div>
                  <div>
                    num₀ = (1-θ_F) · P(t₁={point.t1}|f=0) · P(t₂={point.t2}|f=0)
                  </div>
                  <div>Z = num₁ + num₀</div>
                  <div className="border-2 border-blue-400 p-2 rounded bg-blue-50">
                    <div>
                      <Q i={selectedRow + 1}>
                        <i>f</i>=1
                      </Q>{" "}
                      = {fmt(exp[0])}
                    </div>
                    <div>
                      <Q i={selectedRow + 1}>
                        <i>f</i>=0
                      </Q>{" "}
                      = {fmt(exp[1])}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Only T1 missing */}
          {!missingF &&
            missingT1 &&
            !missingT2 &&
            currentStep === "e-completed" &&
            exp.length >= 2 && (
              <div className="space-y-3">
                <h4 className="font-semibold">E-Step: q(t₁=1|f)</h4>
                <div className="space-y-2 text-sm font-mono bg-white p-3 rounded border">
                  <div>
                    <Q i={selectedRow + 1}>t₁=1</Q> = P(t₁=1|f={point.f}) = θ
                    <sub>t10</sub>
                  </div>
                  <div className="border-2 border-purple-400 p-2 rounded bg-purple-50">
                    <div>
                      <Q i={selectedRow + 1}>t₁=1</Q> = {fmt(exp[0])}
                    </div>
                    <div>
                      <Q i={selectedRow + 1}>t₁=0</Q> = {fmt(exp[1])}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Only T2 missing */}
          {!missingF &&
            !missingT1 &&
            missingT2 &&
            currentStep === "e-completed" &&
            exp.length >= 2 && (
              <div className="space-y-3">
                <h4 className="font-semibold">E-Step: q(t₂=1|f)</h4>
                <div className="space-y-2 text-sm font-mono bg-white p-3 rounded border">
                  <div>
                    <Q i={selectedRow + 1}>t₂=1</Q> = P(t₂=1|f={point.f}) = θ
                    <sub>t21</sub>
                  </div>
                  <div className="border-2 border-green-400 p-2 rounded bg-green-50">
                    <div>
                      <Q i={selectedRow + 1}>t₂=1</Q> = {fmt(exp[0])}
                    </div>
                    <div>
                      <Q i={selectedRow + 1}>t₂=0</Q> = {fmt(exp[1])}
                    </div>
                  </div>
                </div>
              </div>
            )}
          {/* F and T1 missing → JOINT (clear steps) */}
          {missingF &&
          missingT1 &&
          !missingT2 &&
          currentStep === "e-completed" &&
          exp.length >= 4 ? (
            <section className="space-y-4">
              <h4 className="font-semibold">E-Step: q(f,t₁ | t₂)</h4>

              {/* f=1, t1=1 */}
              <article className="border-2 border-orange-400 rounded bg-orange-50 p-2 space-y-1 font-mono text-sm">
                <header>
                  <Q i={selectedRow + 1}>
                    <em>f</em>=1, t₁=1
                  </Q>
                </header>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>q(f=1,t₁=1 | t₂={point.t2})</li>
                  <li>
                    = p(f=1,t₁=1,t₂={point.t2}) / ∑<sub>t₁,f</sub> p(f,t₁,t₂=
                    {point.t2})
                  </li>
                  <li>
                    = [ p(t₁=1|f=1) · p(t₂={point.t2}|f=1) · p(f=1) ] / [ ∑ f
                    p(t₂={point.t2}|f) p(f) ]
                  </li>
                  <li>
                    = ( θ<sub>t11</sub> · {T2_given_f1} · θ<sub>f</sub> ) /{" "}
                    {Den}
                  </li>
                  <li>= {fmt(exp[0])}</li>
                </ol>
              </article>

              {/* f=1, t1=0 */}
              <article className="border-2 border-orange-400 rounded bg-orange-50 p-2 space-y-1 font-mono text-sm">
                <header>
                  <Q i={selectedRow + 1}>
                    <em>f</em>=1, t₁=0
                  </Q>
                </header>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>q(f=1,t₁=0 | t₂={point.t2})</li>
                  <li>
                    = p(f=1,t₁=0,t₂={point.t2}) / ∑<sub>t₁,f</sub> p(f,t₁,t₂=
                    {point.t2})
                  </li>
                  <li>
                    = [ p(t₁=0|f=1) · p(t₂={point.t2}|f=1) · p(f=1) ] / [ ∑ f
                    p(t₂={point.t2}|f) p(f) ]
                  </li>
                  <li>
                    = ( (1−θ<sub>t11</sub>) · {T2_given_f1} · θ<sub>f</sub> ) /{" "}
                    {Den}
                  </li>
                  <li>= {fmt(exp[1])}</li>
                </ol>
              </article>

              {/* f=0, t1=1 */}
              <article className="border-2 border-orange-400 rounded bg-orange-50 p-2 space-y-1 font-mono text-sm">
                <header>
                  <Q i={selectedRow + 1}>
                    <em>f</em>=0, t₁=1
                  </Q>
                </header>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>q(f=0,t₁=1 | t₂={point.t2})</li>
                  <li>
                    = p(f=0,t₁=1,t₂={point.t2}) / ∑<sub>t₁,f</sub> p(f,t₁,t₂=
                    {point.t2})
                  </li>
                  <li>
                    = [ p(t₁=1|f=0) · p(t₂={point.t2}|f=0) · p(f=0) ] / [ ∑ f
                    p(t₂={point.t2}|f) p(f) ]
                  </li>
                  <li>
                    = ( θ<sub>t10</sub> · {T2_given_f0} · (1−θ<sub>f</sub>) ) /{" "}
                    {Den}
                  </li>
                  <li>= {fmt(exp[2])}</li>
                </ol>
              </article>

              {/* f=0, t1=0 */}
              <article className="border-2 border-orange-400 rounded bg-orange-50 p-2 space-y-1 font-mono text-sm">
                <header>
                  <Q i={selectedRow + 1}>
                    <em>f</em>=0, t₁=0
                  </Q>
                </header>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>q(f=0,t₁=0 | t₂={point.t2})</li>
                  <li>
                    = p(f=0,t₁=0,t₂={point.t2}) / ∑<sub>t₁,f</sub> p(f,t₁,t₂=
                    {point.t2})
                  </li>
                  <li>
                    = [ p(t₁=0|f=0) · p(t₂={point.t2}|f=0) · p(f=0) ] / [ ∑ f
                    p(t₂={point.t2}|f) p(f) ]
                  </li>
                  <li>
                    = ( (1−θ<sub>t10</sub>) · {T2_given_f0} · (1−θ<sub>f</sub>)
                    ) / {Den}
                  </li>
                  <li>= {fmt(exp[3])}</li>
                </ol>
              </article>
            </section>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MathFormulas({
  currentStep,
  params,
  data,
  expectations,
  selectedParameter,
  onParameterSelect,
}: {
  currentStep: string;
  params: BayesianParams;
  data: DataPoint[];
  expectations: number[][];
  selectedParameter: string | null;
  onParameterSelect: (param: string | null) => void;
}) {
  if (currentStep === "ready") return null;

  // Compute M-step sums robustly from (data, expectations) handling all missingness (incl. joint 4-vector)
  const calcMSums = () => {
    const N = data.length;
    let sum_qf1 = 0; // Σ q_i(f=1)
    let denom_f1 = 0,
      denom_f0 = 0;
    let num_t1_f1 = 0,
      num_t1_f0 = 0;
    let num_t2_f1 = 0,
      num_t2_f0 = 0;

    data.forEach((p, i) => {
      const e = expectations[i] || [];
      const missingF = p.f === undefined;
      const missingT1 = p.t1 === undefined;
      const missingT2 = p.t2 === undefined;

      // q(f=1) and q(f=0)
      let qf1 = 0,
        qf0 = 0;
      if (!missingF) {
        qf1 = p.f === 1 ? 1 : 0;
        qf0 = p.f === 0 ? 1 : 0;
      } else if (missingF && !missingT1) {
        // Only F missing: e = [q(f=1), q(f=0)]
        qf1 = e[0] ?? 0;
        qf0 = e[1] ?? 0;
      } else if (missingF && missingT1) {
        // F & T1 missing: e = [q11,q10,q01,q00]
        qf1 = (e[0] ?? 0) + (e[1] ?? 0);
        qf0 = (e[2] ?? 0) + (e[3] ?? 0);
      } else {
        // F observed cases covered; else fallback
      }

      sum_qf1 += qf1;
      denom_f1 += qf1;
      denom_f0 += qf0;

      // --- θ₁₁ numerator: Σ E[1(f=1,t1=1)]
      if (!missingF && !missingT1) {
        if (p.f === 1 && p.t1 === 1) num_t1_f1 += 1;
        if (p.f === 0 && p.t1 === 1) num_t1_f0 += 1;
      } else if (!missingF && missingT1) {
        // q(t1=1) = e[0]
        if (p.f === 1) num_t1_f1 += e[0] ?? 0;
        if (p.f === 0) num_t1_f0 += e[0] ?? 0;
      } else if (missingF && !missingT1) {
        // q(f=1) or q(f=0)
        if (p.t1 === 1) {
          num_t1_f1 += e[0] ?? 0;
          num_t1_f0 += e[1] ?? 0;
        }
      } else if (missingF && missingT1) {
        // direct joint contributions
        num_t1_f1 += e[0] ?? 0; // f=1,t1=1
        num_t1_f0 += e[2] ?? 0; // f=0,t1=1
      }

      // --- θ₂₁ numerator: Σ E[1(f=1,t2=1)] and θ₂₀ similarly
      if (!missingF && !missingT2) {
        if (p.f === 1 && p.t2 === 1) num_t2_f1 += 1;
        if (p.f === 0 && p.t2 === 1) num_t2_f0 += 1;
      } else if (!missingF && missingT2) {
        // q(t2=1)=e[0]
        if (p.f === 1) num_t2_f1 += e[0] ?? 0;
        if (p.f === 0) num_t2_f0 += e[0] ?? 0;
      } else if (missingF && !missingT2) {
        // q(f=1) or q(f=0) depending on t2
        if (p.t2 === 1) {
          num_t2_f1 += e[0] ?? 0; // q(f=1)
          num_t2_f0 += e[1] ?? 0; // q(f=0)
        }
      } else if (missingF && missingT1 && !missingT2) {
        // use q(f|t2) from joint e: f=1 sum over t1, f=0 sum over t1
        if (p.t2 === 1) {
          num_t2_f1 += (e[0] ?? 0) + (e[1] ?? 0);
          num_t2_f0 += (e[2] ?? 0) + (e[3] ?? 0);
        }
      }
    });

    const theta_f = sum_qf1 / data.length;
    const theta_t1_f1 =
      denom_f1 > 0 ? num_t1_f1 / denom_f1 : params.theta_t1_f1;
    const theta_t1_f0 =
      denom_f0 > 0 ? num_t1_f0 / denom_f0 : params.theta_t1_f0;
    const theta_t2_f1 =
      denom_f1 > 0 ? num_t2_f1 / denom_f1 : params.theta_t2_f1;
    const theta_t2_f0 =
      denom_f0 > 0 ? num_t2_f0 / denom_f0 : params.theta_t2_f0;

    return {
      N,
      sum_qf1,
      denom_f1,
      denom_f0,
      num_t1_f1,
      num_t1_f0,
      num_t2_f1,
      num_t2_f0,
      theta_f,
      theta_t1_f1,
      theta_t1_f0,
      theta_t2_f1,
      theta_t2_f0,
    };
  };

  const m = currentStep === "m-completed" ? calcMSums() : null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">
          {currentStep === "e-completed"
            ? "E-Step completed"
            : "M-Step Calculations"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentStep === "e-completed" && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg"></div>
          </div>
        )}

        {currentStep === "m-completed" && m && (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-3">
                Click on any parameter below to see which data points contribute
                to its calculation: <strong>Numerator = full color</strong>,{" "}
                <strong>Denominator = outline</strong>
              </p>

              {/* θ_F */}
              <div
                className={`border-2 p-4 rounded bg-white cursor-pointer transition-all ${
                  selectedParameter === "theta_f"
                    ? "border-green-400 bg-green-50 shadow-md"
                    : "border-green-200 hover:border-green-300"
                }`}
                onClick={() =>
                  onParameterSelect(
                    selectedParameter === "theta_f" ? null : "theta_f"
                  )
                }
              >
                <div className="font-mono font-bold text-green-700 text-lg mb-2">
                  &theta;<sub>F</sub> = (Σ<sup>i</sup>{" "}
                  <span className="font-serif italic">q</span>
                  <sup>i</sup>(f=1)) / N
                </div>
                <div className="text-sm">
                  Σ<sup>i</sup>
                  <span className="font-serif italic">q</span>
                  <sup>i</sup>(f=1) = {m.sum_qf1.toFixed(3)}{" "}
                  &nbsp;&nbsp;|&nbsp;&nbsp; N = {m.N}
                </div>
                <div className="mt-1 text-lg font-bold text-green-700">
                  &theta;<sub>F</sub> = {m.theta_f.toFixed(3)}
                </div>
              </div>

              {/* θ₁₁ */}
              <div
                className={`border-2 p-4 rounded bg-white cursor-pointer transition-all ${
                  selectedParameter === "theta_t1_f1"
                    ? "border-blue-400 bg-blue-50 shadow-md"
                    : "border-blue-200 hover:border-blue-300"
                }`}
                onClick={() =>
                  onParameterSelect(
                    selectedParameter === "theta_t1_f1" ? null : "theta_t1_f1"
                  )
                }
              >
                <div className="font-mono font-bold text-blue-700 text-lg mb-2">
                  θ<sub>t11</sub> = (Σ<sup>i</sup>{" "}
                  <span className="font-serif italic">q</span>
                  <sup>i</sup>(f=1,t₁=1)) / (Σ<sup>i</sup>{" "}
                  <span className="font-serif italic">q</span>
                  <sup>i</sup>(f=1))
                </div>
                <div className="text-sm">
                  Numerator = {m.num_t1_f1.toFixed(3)} &nbsp;&nbsp; Denominator
                  = {m.denom_f1.toFixed(3)}
                </div>
                <div className="mt-1 text-lg font-bold text-blue-700">
                  θ<sub>t11</sub> = {m.theta_t1_f1.toFixed(3)}
                </div>
              </div>

              {/* θ₁₀ */}
              <div
                className={`border-2 p-4 rounded bg-white cursor-pointer transition-all ${
                  selectedParameter === "theta_t1_f0"
                    ? "border-purple-400 bg-purple-50 shadow-md"
                    : "border-purple-200 hover:border-purple-300"
                }`}
                onClick={() =>
                  onParameterSelect(
                    selectedParameter === "theta_t1_f0" ? null : "theta_t1_f0"
                  )
                }
              >
                <div className="font-mono font-bold text-purple-700 text-lg mb-2">
                  θ<sub>t10</sub> = (Σ<sup>i</sup>{" "}
                  <span className="font-serif italic">q</span>
                  <sup>i</sup>(f=0,t₁=1)) / (Σ<sup>i</sup>{" "}
                  <span className="font-serif italic">q</span>
                  <sup>i</sup>(f=0))
                </div>
                <div className="text-sm">
                  Numerator = {m.num_t1_f0.toFixed(3)} &nbsp;&nbsp; Denominator
                  = {m.denom_f0.toFixed(3)}
                </div>
                <div className="mt-1 text-lg font-bold text-purple-700">
                  θ<sub>t10</sub> = {m.theta_t1_f0.toFixed(3)}
                </div>
              </div>

              {/* θ₂₁ */}
              <div
                className={`border-2 p-4 rounded bg-white cursor-pointer transition-all ${
                  selectedParameter === "theta_t2_f1"
                    ? "border-orange-400 bg-orange-50 shadow-md"
                    : "border-orange-200 hover:border-orange-300"
                }`}
                onClick={() =>
                  onParameterSelect(
                    selectedParameter === "theta_t2_f1" ? null : "theta_t2_f1"
                  )
                }
              >
                <div className="font-mono font-bold text-orange-700 text-lg mb-2">
                  θ<sub>t21</sub> = (Σ<sup>i</sup>{" "}
                  <span className="font-serif italic">q</span>
                  <sup>i</sup>(f=1,t₂=1)) / (Σ<sup>i</sup>{" "}
                  <span className="font-serif italic">q</span>
                  <sup>i</sup>(f=1))
                </div>
                <div className="text-sm">
                  Numerator = {m.num_t2_f1.toFixed(3)} &nbsp;&nbsp; Denominator
                  = {m.denom_f1.toFixed(3)}
                </div>
                <div className="mt-1 text-lg font-bold text-orange-700">
                  θ<sub>t21</sub> = {m.theta_t2_f1.toFixed(3)}
                </div>
              </div>

              {/* θ₂₀ */}
              <div
                className={`border-2 p-4 rounded bg-white cursor-pointer transition-all ${
                  selectedParameter === "theta_t2_f0"
                    ? "border-red-400 bg-red-50 shadow-md"
                    : "border-red-200 hover:border-red-300"
                }`}
                onClick={() =>
                  onParameterSelect(
                    selectedParameter === "theta_t2_f0" ? null : "theta_t2_f0"
                  )
                }
              >
                <div className="font-mono font-bold text-red-700 text-lg mb-2">
                  θ<sub>t20</sub> = (Σ<sup>i</sup>{" "}
                  <span className="font-serif italic">q</span>
                  <sup>i</sup>(f=0,t₂=1)) / (Σ<sup>i</sup>{" "}
                  <span className="font-serif italic">q</span>
                  <sup>i</sup>(f=0))
                </div>
                <div className="text-sm">
                  Numerator = {m.num_t2_f0.toFixed(3)} &nbsp;&nbsp; Denominator
                  = {m.denom_f0.toFixed(3)}
                </div>
                <div className="mt-1 text-lg font-bold text-red-700">
                  θ<sub>t20</sub> = {m.theta_t2_f0.toFixed(3)}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ExpectationMaximizationDemo() {
  const [params, setParams] = useState<BayesianParams>({
    theta_f: 0.5,
    theta_t1_f1: 0.85,
    theta_t1_f0: 0.2,
    theta_t2_f1: 0.75,
    theta_t2_f0: 0.1,
  });

  const [data, setData] = useState<DataPoint[]>([
    { t1: 1, f: 1 }, // t2 missing
    { f: 1, t1: 1, t2: 1 }, // complete
    { t2: 0, f: 0 }, // t1 missing
    { t1: 1, t2: 0, f: 1 }, // complete
    { t2: 1 }, // t1 and f missing
  ]);

  const [iteration, setIteration] = useState(0);
  const [currentStep, setCurrentStep] = useState<
    "ready" | "e-completed" | "m-completed"
  >("ready");
  const [expectations, setExpectations] = useState<number[][]>([]);
  const [stepInProgress, setStepInProgress] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedParameter, setSelectedParameter] = useState<string | null>(
    null
  );

  const runEStep = () => {
    setStepInProgress(true);
    const newExpectations: number[][] = [];

    data.forEach((point, i) => {
      const missingF = point.f === undefined;
      const missingT1 = point.t1 === undefined;
      const missingT2 = point.t2 === undefined;

      if (!missingF && !missingT1 && !missingT2) {
        newExpectations[i] = [1]; // placeholder for complete
      } else if (missingF && !missingT1 && !missingT2) {
        // q(f | t1, t2)
        const p_t1_f1 =
          point.t1 === 1 ? params.theta_t1_f1 : 1 - params.theta_t1_f1;
        const p_t1_f0 =
          point.t1 === 1 ? params.theta_t1_f0 : 1 - params.theta_t1_f0;
        const p_t2_f1 =
          point.t2 === 1 ? params.theta_t2_f1 : 1 - params.theta_t2_f1;
        const p_t2_f0 =
          point.t2 === 1 ? params.theta_t2_f0 : 1 - params.theta_t2_f0;
        const num1 = params.theta_f * p_t1_f1 * p_t2_f1;
        const num0 = (1 - params.theta_f) * p_t1_f0 * p_t2_f0;
        const Z = num1 + num0;
        const qf1 = Z > 0 ? num1 / Z : 0.5;
        newExpectations[i] = [qf1, 1 - qf1];
      } else if (!missingF && missingT1 && !missingT2) {
        const pt1 = point.f === 1 ? params.theta_t1_f1 : params.theta_t1_f0;
        newExpectations[i] = [pt1, 1 - pt1];
      } else if (!missingF && !missingT1 && missingT2) {
        const pt2 = point.f === 1 ? params.theta_t2_f1 : params.theta_t2_f0;
        newExpectations[i] = [pt2, 1 - pt2];
      } else if (missingF && missingT1 && !missingT2) {
        // JOINT q(f,t1 | t2) = q(f|t2) * P(t1|f)
        const p_t2_f1 =
          point.t2 === 1 ? params.theta_t2_f1 : 1 - params.theta_t2_f1;
        const p_t2_f0 =
          point.t2 === 1 ? params.theta_t2_f0 : 1 - params.theta_t2_f0;
        const num1 = params.theta_f * p_t2_f1;
        const num0 = (1 - params.theta_f) * p_t2_f0;
        const Z = num1 + num0;
        const qf1_t2 = Z > 0 ? num1 / Z : 0.5;
        const qf0_t2 = 1 - qf1_t2;
        const q11 = qf1_t2 * params.theta_t1_f1;
        const q10 = qf1_t2 * (1 - params.theta_t1_f1);
        const q01 = qf0_t2 * params.theta_t1_f0;
        const q00 = qf0_t2 * (1 - params.theta_t1_f0);
        newExpectations[i] = [q11, q10, q01, q00];
      } else {
        newExpectations[i] = [0.5, 0.5];
      }
    });

    setExpectations(newExpectations);
    setCurrentStep("e-completed");
    setStepInProgress(false);
  };

  const runMStep = () => {
    setStepInProgress(true);
    if (expectations.length === 0) {
      setStepInProgress(false);
      return;
    }

    const N = data.length;
    // compute sums as in MathFormulas.calcMSums to keep consistency
    let sum_qf1 = 0;
    let denom_f1 = 0,
      denom_f0 = 0;
    let num_t1_f1 = 0,
      num_t1_f0 = 0;
    let num_t2_f1 = 0,
      num_t2_f0 = 0;

    data.forEach((p, i) => {
      const e = expectations[i] || [];
      const missingF = p.f === undefined;
      const missingT1 = p.t1 === undefined;
      const missingT2 = p.t2 === undefined;

      let qf1 = 0,
        qf0 = 0;
      if (!missingF) {
        qf1 = p.f === 1 ? 1 : 0;
        qf0 = p.f === 0 ? 1 : 0;
      } else if (missingF && !missingT1) {
        qf1 = e[0] ?? 0;
        qf0 = e[1] ?? 0;
      } else if (missingF && missingT1) {
        qf1 = (e[0] ?? 0) + (e[1] ?? 0);
        qf0 = (e[2] ?? 0) + (e[3] ?? 0);
      }

      sum_qf1 += qf1;
      denom_f1 += qf1;
      denom_f0 += qf0;

      if (!missingF && !missingT1) {
        if (p.f === 1 && p.t1 === 1) num_t1_f1 += 1;
        if (p.f === 0 && p.t1 === 1) num_t1_f0 += 1;
      } else if (!missingF && missingT1) {
        if (p.f === 1) num_t1_f1 += e[0] ?? 0;
        if (p.f === 0) num_t1_f0 += e[0] ?? 0;
      } else if (missingF && !missingT1) {
        if (p.t1 === 1) {
          num_t1_f1 += e[0] ?? 0;
          num_t1_f0 += e[1] ?? 0;
        }
      } else if (missingF && missingT1) {
        num_t1_f1 += e[0] ?? 0;
        num_t1_f0 += e[2] ?? 0;
      }

      if (!missingF && !missingT2) {
        if (p.f === 1 && p.t2 === 1) num_t2_f1 += 1;
        if (p.f === 0 && p.t2 === 1) num_t2_f0 += 1;
      } else if (!missingF && missingT2) {
        if (p.f === 1) num_t2_f1 += e[0] ?? 0;
        if (p.f === 0) num_t2_f0 += e[0] ?? 0;
      } else if (missingF && !missingT2) {
        if (p.t2 === 1) {
          num_t2_f1 += e[0] ?? 0;
          num_t2_f0 += e[1] ?? 0;
        }
      } else if (missingF && missingT1 && !missingT2) {
        if (p.t2 === 1) {
          num_t2_f1 += (e[0] ?? 0) + (e[1] ?? 0);
          num_t2_f0 += (e[2] ?? 0) + (e[3] ?? 0);
        }
      }
    });

    const new_theta_f = sum_qf1 / N;
    const new_theta_t1_f1 =
      denom_f1 > 0 ? num_t1_f1 / denom_f1 : params.theta_t1_f1;
    const new_theta_t1_f0 =
      denom_f0 > 0 ? num_t1_f0 / denom_f0 : params.theta_t1_f0;
    const new_theta_t2_f1 =
      denom_f1 > 0 ? num_t2_f1 / denom_f1 : params.theta_t2_f1;
    const new_theta_t2_f0 =
      denom_f0 > 0 ? num_t2_f0 / denom_f0 : params.theta_t2_f0;

    setParams({
      theta_f: new_theta_f,
      theta_t1_f1: new_theta_t1_f1,
      theta_t1_f0: new_theta_t1_f0,
      theta_t2_f1: new_theta_t2_f1,
      theta_t2_f0: new_theta_t2_f0,
    });
    setIteration((prev) => prev + 1);
    setCurrentStep("m-completed");
    setStepInProgress(false);
  };

  const nextIteration = () => {
    setCurrentStep("ready");
    setSelectedRow(null);
    setSelectedParameter(null);
  };
  const reset = () => {
    setParams({
      theta_f: 0.5,
      theta_t1_f1: 0.85,
      theta_t1_f0: 0.2,
      theta_t2_f1: 0.75,
      theta_t2_f0: 0.1,
    });
    setIteration(0);
    setExpectations([]);
    setCurrentStep("ready");
    setStepInProgress(false);
    setSelectedRow(null);
    setSelectedParameter(null);
  };
  const handleRowClick = (index: number) => {
    setSelectedRow(selectedRow === index ? null : index);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-4">Network Structure</h3>
              <NetworkDiagram />
            </div>
            <div>
              <h3 className="font-semibold mb-4">
                Current Parameters (Iteration {iteration})
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>P(F=1) = θ_F</span>
                  <Badge variant="outline">{params.theta_f.toFixed(3)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>
                    P(T₁=1|F=1) = θ<sub>t11</sub>
                  </span>
                  <Badge variant="outline">
                    {params.theta_t1_f1.toFixed(3)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>
                    P(T₁=1|F=0) = θ<sub>t10</sub>
                  </span>
                  <Badge variant="outline">
                    {params.theta_t1_f0.toFixed(3)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>
                    P(T₂=1|F=1) = θ<sub>t21</sub>
                  </span>
                  <Badge variant="outline">
                    {params.theta_t2_f1.toFixed(3)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>
                    P(T₂=1|F=0) = θ<sub>t20</sub>
                  </span>
                  <Badge variant="outline">
                    {params.theta_t2_f0.toFixed(3)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Training Data (expanded) & Weights</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={data}
            expectations={expectations}
            currentStep={currentStep}
            onRowClick={handleRowClick}
            selectedRow={selectedRow}
            selectedParameter={selectedParameter}
          />
        </CardContent>
      </Card>

      <RowCalculationDetails
        selectedRow={selectedRow}
        data={data}
        params={params}
        expectations={expectations}
        currentStep={currentStep}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Algorithm Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={runEStep}
                disabled={stepInProgress || currentStep !== "ready"}
                className="flex-1"
                variant={currentStep === "ready" ? "default" : "outline"}
              >
                {stepInProgress && currentStep === "ready"
                  ? "Running E-Step..."
                  : "Run E-Step"}
              </Button>
              <Button
                onClick={runMStep}
                disabled={stepInProgress || currentStep !== "e-completed"}
                className="flex-1"
                variant={currentStep === "e-completed" ? "default" : "outline"}
              >
                {stepInProgress && currentStep === "e-completed"
                  ? "Running M-Step..."
                  : "Run M-Step"}
              </Button>
              {currentStep === "m-completed" && (
                <Button
                  onClick={nextIteration}
                  variant="default"
                  className="flex-1"
                >
                  Next Iteration
                </Button>
              )}
              <Button onClick={reset} variant="outline">
                Reset
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                {currentStep === "ready" && (
                  <>
                    <Badge className="bg-blue-600">Ready</Badge>
                    <span className="font-semibold"></span>
                  </>
                )}
                {currentStep === "e-completed" && (
                  <>
                    <Badge className="bg-green-600">E-Step Complete</Badge>
                    <span className="font-semibold"></span>
                  </>
                )}
                {currentStep === "m-completed" && (
                  <>
                    <Badge className="bg-purple-600">M-Step Complete</Badge>
                    <span className="font-semibold"></span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-700">
                {currentStep === "ready"
                  ? "Click “Run E-Step” to calculate posteriors (expectations)."
                  : currentStep === "e-completed"
                  ? "Click “Run M-Step” to update parameters."
                  : "Parameters updated. Click “Next Iteration” to continue."}
              </p>
            </div>
          </CardContent>
        </Card>

        <MathFormulas
          currentStep={currentStep}
          params={params}
          data={data}
          expectations={expectations}
          selectedParameter={selectedParameter}
          onParameterSelect={setSelectedParameter}
        />
      </div>
    </div>
  );
}

export { ExpectationMaximizationDemo };
