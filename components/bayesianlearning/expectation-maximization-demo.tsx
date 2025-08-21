"use client";
import { useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function Frac({
  num,
  den,
  className = "",
}: {
  num: ReactNode;
  den: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex flex-col items-center align-middle ${className}`}
    >
      <span className="px-1 leading-tight">{num}</span>
      <span className="w-full border-t border-current" />
      <span className="px-1 leading-tight">{den}</span>
    </span>
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

function contributesForParam(
  param: string,
  row: ExpandedDataPoint
): { num: boolean; den: boolean } {
  const hasW = (row.weight ?? 0) > 1e-6;
  switch (param) {
    case "theta_f":
      return { num: hasW && row.f === 1, den: true };
    case "theta_t1_f1":
      return {
        num: hasW && row.f === 1 && row.t1 === 1,
        den: hasW && row.f === 1,
      };
    case "theta_t1_f0":
      return {
        num: hasW && row.f === 0 && row.t1 === 1,
        den: hasW && row.f === 0,
      };
    case "theta_t2_f1":
      return {
        num: hasW && row.f === 1 && row.t2 === 1,
        den: hasW && row.f === 1,
      };
    case "theta_t2_f0":
      return {
        num: hasW && row.f === 0 && row.t2 === 1,
        den: hasW && row.f === 0,
      };
    default:
      return { num: false, den: false };
  }
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
      });
    } else if (!isInitial) {
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
  const initialRows: ExpandedDataPoint[] = data.map((p, idx) => ({
    f: p.f ?? 0,
    t1: p.t1 ?? 0,
    t2: p.t2 ?? 0,
    weight: 0,
    source_row: idx + 1,
    missing_f: p.f === undefined,
    missing_t1: p.t1 === undefined,
    missing_t2: p.t2 === undefined,
  }));
  const rowsToRender = isInitial ? initialRows : expandedData;

  const isGroupStart = (i: number) =>
    i === 0 || rowsToRender[i - 1].source_row !== rowsToRender[i].source_row;
  const isGroupEnd = (i: number) =>
    i === rowsToRender.length - 1 ||
    rowsToRender[i + 1].source_row !== rowsToRender[i].source_row;

  const cellHighlight = (
    row: ExpandedDataPoint,
    col: "f" | "t1" | "t2" | "weight" | "source"
  ): string => {
    if (!selectedParameter || currentStep !== "m-completed") return "";
    const c = contributesForParam(selectedParameter, row);
    const numCls = "outline outline-2 outline-sky-600";
    const denCls = "bg-green-100";
    if (selectedParameter === "theta_f") {
      if (col === "f") {
        // Denominator = alle rijen (fill), Numerator = f=1 (outline bovenop)
        if (c.num && c.den) return `${denCls} ${numCls}`;
        if (c.den) return denCls;
      }
    }
    switch (selectedParameter) {
      case "theta_t1_f1":
      case "theta_t1_f0":
        if (col === "f" && c.den) return denCls;
        if (col === "t1" && c.num) return numCls;
        if (col === "f" && c.num) return numCls;
        break;
      case "theta_t2_f1":
      case "theta_t2_f0":
        if (col === "f" && c.den) return denCls;
        if (col === "t2" && c.num) return numCls;
        if (col === "f" && c.num) return numCls;
        break;
    }
    if (col === "weight" && (c.num || c.den)) return "font-bold";
    return "";
  };
  const show = (v?: number) => (v === undefined ? "?" : String(v));

  const edgeColor = "border-neutral-700"; // iets subtieler

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
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

            // bepaal group-begins/ends (per aaneengesloten blok met zelfde source_row)
            const isStart =
              idx === 0 || rowsToRender[idx - 1].source_row !== row.source_row;
            const isEnd =
              idx === rowsToRender.length - 1 ||
              rowsToRender[idx + 1].source_row !== row.source_row;

            // rand-klassen: enkel rondom de groep, dunste binnenin
            const edgeColor = "border-neutral-700"; // subtiele donkergrijs
            const topCls =
              !isInitial && isStart ? "border-t-2 border-t-neutral-700" : "";
            const bottomCls =
              !isInitial && isEnd ? "border-b-2 border-b-neutral-700" : "";

            // alleen op 1e en laatste kolom-cel
            const leftEdgeCls = !isInitial
              ? "border-l-2 border-l-neutral-700"
              : "";
            const rightEdgeCls = !isInitial
              ? "border-r-2 border-r-neutral-700"
              : "";

            // basiscel
            const tdBase = `border border-gray-300 px-3 py-2 text-center font-mono`;

            return (
              <tr
                key={idx}
                className={`cursor-pointer hover:bg-gray-50 ${
                  selectedRow === originalRowIndex ? "bg-yellow-200" : ""
                }`}
              >
                <td
                  className={`border border-gray-300 px-3 py-2 text-center font-semibold
    ${cellHighlight(row, "source")}  /* eerst highlight */
    ${leftEdgeCls} ${topCls} ${bottomCls}             /* dan de randen */
  `}
                >
                  {row.source_row}
                </td>
                <td
                  className={`${tdBase} ${row.missing_f ? "font-bold" : ""}
  ${cellHighlight(row, "f")}  ${topCls} ${bottomCls}`}
                >
                  {isInitial ? show(row.missing_f ? undefined : row.f) : row.f}
                </td>

                <td
                  className={`${tdBase} ${row.missing_t1 ? "font-bold" : ""}
  ${cellHighlight(row, "t1")} ${topCls} ${bottomCls}`}
                >
                  {isInitial
                    ? show(row.missing_t1 ? undefined : row.t1)
                    : row.t1}
                </td>

                <td
                  className={`${tdBase} ${row.missing_t2 ? "font-bold" : ""}
  ${cellHighlight(row, "t2")} ${topCls} ${bottomCls}`}
                >
                  {isInitial
                    ? show(row.missing_t2 ? undefined : row.t2)
                    : row.t2}
                </td>

                <td
                  className={`${tdBase}
  ${cellHighlight(row, "weight")} ${topCls} ${bottomCls} ${rightEdgeCls}`}
                >
                  <div className="space-y-1">
                    <div className="font-mono text-xs">
                      {isInitial
                        ? row.missing_f || row.missing_t1 || row.missing_t2
                          ? "—"
                          : "1"
                        : row.weight.toFixed(3)}
                    </div>
                    {!isInitial && (
                      <div className="text-xs text-gray-700">
                        {(() => {
                          const i = row.source_row;
                          if (
                            row.missing_f &&
                            row.missing_t1 &&
                            !row.missing_t2
                          )
                            return (
                              <Q i={i}>
                                f={row.f}, t₁={row.t1}
                              </Q>
                            );
                          if (
                            row.missing_f &&
                            !row.missing_t1 &&
                            !row.missing_t2
                          )
                            return (
                              <Q i={i}>
                                <i>f</i>={row.f}
                              </Q>
                            );
                          if (
                            !row.missing_f &&
                            row.missing_t1 &&
                            !row.missing_t2
                          )
                            return <Q i={i}>t₁={row.t1}</Q>;
                          if (
                            !row.missing_f &&
                            !row.missing_t1 &&
                            row.missing_t2
                          )
                            return <Q i={i}>t₂={row.t2}</Q>;
                          return <>1</>;
                        })()}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QFunctionsPanel({
  data,
  params,
  expectations,
  currentStep,
  selectedQRow,
  setSelectedQRow,
}: {
  data: DataPoint[];
  params: BayesianParams;
  expectations: number[][];
  currentStep: string;
  selectedQRow: number | null;
  setSelectedQRow: (idx: number | null) => void;
}) {
  const fmt = (x: number, d = 6) =>
    Number.isFinite(x) ? x.toFixed(d) : String(x);
  const isAfterE = currentStep !== "ready";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Q-functions (E-step)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((p, i) => {
          const idx = i + 1;
          const missingF = p.f === undefined;
          const missingT1 = p.t1 === undefined;
          const missingT2 = p.t2 === undefined;
          const e = expectations[i] || [];
          let label: ReactNode = null;
          let details: ReactNode = null;

          if (!missingF && !missingT1 && missingT2) {
            label = (
              <>
                <Q i={idx}>
                  t₂ | f={p.f}, t₁={p.t1}
                </Q>
              </>
            );

            const ThetaT2_1 =
              p.f === 1 ? (
                <span>
                  θ<sub>t21</sub>
                </span>
              ) : (
                <span>
                  θ<sub>t20</sub>
                </span>
              );
            const ThetaT2_0 =
              p.f === 1 ? (
                <span>
                  (1−θ<sub>t21</sub>)
                </span>
              ) : (
                <span>
                  (1−θ<sub>t20</sub>)
                </span>
              );

            details = (
              <div className="space-y-3">
                {/* Definition as joint / evidence */}
                <div className="border rounded bg-white p-3 font-mono text-sm">
                  <div className="font-semibold mb-1">Definition</div>
                  <div className="flex items-center gap-2">
                    <span>
                      q(t₂ | f={p.f}, t₁={p.t1}) =
                    </span>
                    <Frac
                      num={
                        <>
                          q(t₂, f={p.f}, t₁={p.t1})
                        </>
                      }
                      den={
                        <>
                          ∑<sub>t₂∈&#123;0,1&#125;</sub> P(t₂, f={p.f}, t₁=
                          {p.t1})
                        </>
                      }
                    />
                  </div>
                </div>

                {/* Explicit substitution & simplification */}
                <div className="border rounded bg-white p-3 font-mono text-sm">
                  <div className="font-semibold mb-1">Derivation</div>
                  <div>
                    ={" "}
                    <Frac
                      num={
                        <>
                          P(f={p.f}) · P(t₁={p.t1} | f={p.f}) · P(t₂ | f={p.f})
                        </>
                      }
                      den={
                        <>
                          ∑<sub>t₂∈&#123;0,1&#125;</sub> P(f={p.f}) · P(t₁=
                          {p.t1} | f={p.f}) · P(t₂ | f={p.f})
                        </>
                      }
                    />
                  </div>
                  <div className="mt-1">= P(t₂ | f={p.f})</div>
                </div>

                {/* Effective probabilities */}
                <div className="grid gap-2 font-mono text-sm">
                  <article className="border rounded bg-green-50 p-2">
                    <header className="font-semibold mb-1">
                      <Q i={idx}>t₂=1</Q>
                    </header>
                    <div>
                      = P(t₂=1 | f={p.f}) = {ThetaT2_1}
                    </div>
                    {isAfterE && e.length >= 2 && (
                      <div className="text-xs text-gray-700">= {fmt(e[0])}</div>
                    )}
                  </article>

                  <article className="border rounded bg-green-50 p-2">
                    <header className="font-semibold mb-1">
                      <Q i={idx}>t₂=0</Q>
                    </header>
                    <div>
                      = P(t₂=0 | f={p.f}) = {ThetaT2_0}
                    </div>
                    {isAfterE && e.length >= 2 && (
                      <div className="text-xs text-gray-700">= {fmt(e[1])}</div>
                    )}
                  </article>
                </div>
              </div>
            );
          } else if (!missingF && missingT1 && !missingT2) {
            label = (
              <>
                <Q i={idx}>
                  t₁ | f={p.f}, t₂={p.t2}
                </Q>
              </>
            );

            const ThetaT1_1 =
              p.f === 1 ? (
                <span>
                  θ<sub>t11</sub>
                </span>
              ) : (
                <span>
                  θ<sub>t10</sub>
                </span>
              );
            const ThetaT1_0 =
              p.f === 1 ? (
                <span>
                  (1−θ<sub>t11</sub>)
                </span>
              ) : (
                <span>
                  (1−θ<sub>t10</sub>)
                </span>
              );

            details = (
              <div className="space-y-3">
                {/* Definition as joint / evidence */}
                <div className="border rounded bg-white p-3 font-mono text-sm">
                  <div className="font-semibold mb-1">Definition</div>
                  <div className="flex items-center gap-2">
                    <span>
                      q(t₁ | f={p.f}, t₂={p.t2}) =
                    </span>
                    <Frac
                      num={
                        <>
                          P(t₁, f={p.f}, t₂={p.t2})
                        </>
                      }
                      den={
                        <>
                          ∑<sub>t₁∈&#123;0,1&#125;</sub> P(t₁, f={p.f}, t₂=
                          {p.t2})
                        </>
                      }
                    />
                  </div>
                </div>

                {/* Explicit substitution & simplification */}
                <div className="border rounded bg-white p-3 font-mono text-sm">
                  <div className="font-semibold mb-1">Derivation</div>
                  <div>
                    ={" "}
                    <Frac
                      num={
                        <>
                          P(f={p.f}) · P(t₁ | f={p.f}) · P(t₂={p.t2} | f={p.f})
                        </>
                      }
                      den={
                        <>
                          ∑<sub>t₁∈&#123;0,1&#125;</sub> P(f={p.f}) · P(t₁ | f=
                          {p.f}) · P(t₂={p.t2} | f={p.f})
                        </>
                      }
                    />
                  </div>
                  <div className="mt-1">= P(t₁ | f={p.f})</div>
                </div>

                {/* Effective probabilities */}
                <div className="grid gap-2 font-mono text-sm">
                  <article className="border rounded bg-purple-50 p-2">
                    <header className="font-semibold mb-1">
                      <Q i={idx}>t₁=1</Q>
                    </header>
                    <div>
                      = P(t₁=1 | f={p.f}) = {ThetaT1_1}
                    </div>
                    {isAfterE && e.length >= 2 && (
                      <div className="text-xs text-gray-700">= {fmt(e[0])}</div>
                    )}
                  </article>

                  <article className="border rounded bg-purple-50 p-2">
                    <header className="font-semibold mb-1">
                      <Q i={idx}>t₁=0</Q>
                    </header>
                    <div>
                      = P(t₁=0 | f={p.f}) = {ThetaT1_0}
                    </div>
                    {isAfterE && e.length >= 2 && (
                      <div className="text-xs text-gray-700">= {fmt(e[1])}</div>
                    )}
                  </article>
                </div>
              </div>
            );
          } else if (missingF && !missingT1 && !missingT2) {
            label = (
              <>
                <Q i={idx}>
                  <i>f</i>=1
                </Q>{" "}
                = P(f=1 | t₁={p.t1}, t₂={p.t2})
              </>
            );

            const num = (
              <span>
                θ<sub>f</sub> ·{" "}
                {p.t1 === 1 ? (
                  <span>
                    θ<sub>t11</sub>
                  </span>
                ) : (
                  <span>
                    (1−θ<sub>t11</sub>)
                  </span>
                )}{" "}
                ·{" "}
                {p.t2 === 1 ? (
                  <span>
                    θ<sub>t21</sub>
                  </span>
                ) : (
                  <span>
                    (1−θ<sub>t21</sub>)
                  </span>
                )}
              </span>
            );

            const den = (
              <span>
                θ<sub>f</sub>·
                {p.t1 === 1 ? (
                  <span>
                    θ<sub>t11</sub>
                  </span>
                ) : (
                  <span>
                    (1−θ<sub>t11</sub>)
                  </span>
                )}
                ·
                {p.t2 === 1 ? (
                  <span>
                    θ<sub>t21</sub>
                  </span>
                ) : (
                  <span>
                    (1−θ<sub>t21</sub>)
                  </span>
                )}{" "}
                + (1−θ<sub>f</sub>)·
                {p.t1 === 1 ? (
                  <span>
                    θ<sub>t10</sub>
                  </span>
                ) : (
                  <span>
                    (1−θ<sub>t10</sub>)
                  </span>
                )}
                ·
                {p.t2 === 1 ? (
                  <span>
                    θ<sub>t20</sub>
                  </span>
                ) : (
                  <span>
                    (1−θ<sub>t20</sub>)
                  </span>
                )}
              </span>
            );

            details = (
              <div className="text-sm">
                <Frac num={num} den={den} />
                {isAfterE && e.length >= 2 && (
                  <div className="text-xs text-gray-700 mt-1">
                    Numeriek: {fmt(e[0])} en {fmt(e[1])}
                  </div>
                )}
              </div>
            );
          } else if (missingF && missingT1 && !missingT2) {
            label = (
              <>
                <Q i={idx}>f,t₁ | t₂={p.t2}</Q>
              </>
            );

            // symbolic pieces used in the explanation
            const T2f1Sym =
              p.t2 === 1 ? (
                <span>
                  θ<sub>t21</sub>
                </span>
              ) : (
                <span>
                  (1−θ<sub>t21</sub>)
                </span>
              );
            const T2f0Sym =
              p.t2 === 1 ? (
                <span>
                  θ<sub>t20</sub>
                </span>
              ) : (
                <span>
                  (1−θ<sub>t20</sub>)
                </span>
              );
            const DenSym = (
              <span>
                θ<sub>f</sub>·{T2f1Sym} + (1−θ<sub>f</sub>)·{T2f0Sym}
              </span>
            );

            // numeric values with current θ
            const tf = params.theta_f;
            const t11 = params.theta_t1_f1;
            const t10 = params.theta_t1_f0;
            const t2f1 =
              p.t2 === 1 ? params.theta_t2_f1 : 1 - params.theta_t2_f1;
            const t2f0 =
              p.t2 === 1 ? params.theta_t2_f0 : 1 - params.theta_t2_f0;

            // joint numerators for each (f,t1)
            const num11 = tf * t11 * t2f1; // P(f=1,t1=1,t2=obs)
            const num10 = tf * (1 - t11) * t2f1; // P(f=1,t1=0,t2=obs)
            const num01 = (1 - tf) * t10 * t2f0; // P(f=0,t1=1,t2=obs)
            const num00 = (1 - tf) * (1 - t10) * t2f0; // P(f=0,t1=0,t2=obs)
            const Z = num11 + num10 + num01 + num00; // P(t2=obs)

            const showNums = isAfterE && e.length >= 4;

            details = (
              <div className="space-y-3 text-sm">
                {/* 1) Main definition first */}
                <div className="border rounded bg-white p-3 font-mono">
                  <div className="font-semibold mb-1">Definition</div>
                  <div className="flex items-center gap-2">
                    <span>P(f,t₁ | t₂={p.t2}) =</span>
                    <Frac
                      num={<>P(f,t₁,t₂={p.t2})</>}
                      den={<>P(t₂={p.t2})</>}
                    />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    This is Bayes: joint / evidence.
                  </div>
                </div>

                {/* 2) Why the numerator? */}
                <div className="border rounded bg-white p-3 font-mono">
                  <div>
                    The numerator is the <strong>joint</strong> probability
                    P(f,t₁,t₂={p.t2}). Using independence given f: p(f,t₁,t₂) =
                    p(f)·p(t₁|f)·p(t₂|f)
                  </div>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>
                      N₁₁ = P(f=1,t₁=1,t₂={p.t2}) = θ<sub>f</sub>·θ
                      <sub>t11</sub>·{T2f1Sym}
                      {showNums && <> = {fmt(num11)}</>}
                    </li>
                    <li>
                      N₁₀ = P(f=1,t₁=0,t₂={p.t2}) = θ<sub>f</sub>·(1−θ
                      <sub>t11</sub>)·{T2f1Sym}
                      {showNums && <> = {fmt(num10)}</>}
                    </li>
                    <li>
                      N₀₁ = P(f=0,t₁=1,t₂={p.t2}) = (1−θ<sub>f</sub>)·θ
                      <sub>t10</sub>·{T2f0Sym}
                      {showNums && <> = {fmt(num01)}</>}
                    </li>
                    <li>
                      N₀₀ = P(f=0,t₁=0,t₂={p.t2}) = (1−θ<sub>f</sub>)·(1−θ
                      <sub>t10</sub>)·{T2f0Sym}
                      {showNums && <> = {fmt(num00)}</>}
                    </li>
                  </ul>
                </div>

                {/* 3) Why the denominator (evidence)? */}
                <div className="border rounded bg-white p-3 font-mono">
                  <div>
                    The denominator is the <strong>evidence</strong>: P(t₂=
                    {p.t2}) = Σ<sub>f,t₁</sub> P(f,t₁,t₂={p.t2}) = N₁₁ + N₁₀ +
                    N₀₁ + N₀₀.
                  </div>
                </div>

                {/* 4) The four posteriors */}
                <div className="grid gap-2 font-mono">
                  <article className="border rounded bg-orange-50 p-2">
                    <header className="font-semibold mb-1">
                      <Q i={idx}>
                        <em>f</em>=1, t₁=1
                      </Q>
                    </header>
                    <div>
                      <Frac num={<>N₁₁</>} den={<>Z</>} />
                    </div>
                    {showNums && (
                      <div className="text-xs text-gray-700 mt-1">
                        = {fmt(num11)} / {fmt(Z)} ⇒ {fmt(e[0])}
                      </div>
                    )}
                  </article>

                  <article className="border rounded bg-orange-50 p-2">
                    <header className="font-semibold mb-1">
                      <Q i={idx}>
                        <em>f</em>=1, t₁=0
                      </Q>
                    </header>
                    <div>
                      <Frac num={<>N₁₀</>} den={<>Z</>} />
                    </div>
                    {showNums && (
                      <div className="text-xs text-gray-700 mt-1">
                        = {fmt(num10)} / {fmt(Z)} ⇒ {fmt(e[1])}
                      </div>
                    )}
                  </article>

                  <article className="border rounded bg-orange-50 p-2">
                    <header className="font-semibold mb-1">
                      <Q i={idx}>
                        <em>f</em>=0, t₁=1
                      </Q>
                    </header>
                    <div>
                      <Frac num={<>N₀₁</>} den={<>Z</>} />
                    </div>
                    {showNums && (
                      <div className="text-xs text-gray-700 mt-1">
                        = {fmt(num01)} / {fmt(Z)} ⇒ {fmt(e[2])}
                      </div>
                    )}
                  </article>

                  <article className="border rounded bg-orange-50 p-2">
                    <header className="font-semibold mb-1">
                      <Q i={idx}>
                        <em>f</em>=0, t₁=0
                      </Q>
                    </header>
                    <div>
                      <Frac num={<>N₀₀</>} den={<>Z</>} />
                    </div>
                    {showNums && (
                      <div className="text-xs text-gray-700 mt-1">
                        = {fmt(num00)} / {fmt(Z)} ⇒ {fmt(e[3])}
                      </div>
                    )}
                  </article>
                </div>
              </div>
            );
          } else {
            label = (
              <>
                <Q i={idx}>—</Q> (complete)
              </>
            );
            details = null;
          }

          const open = selectedQRow === i;

          return (
            <div key={i} className="border rounded-lg p-3 bg-white">
              <button
                className="w-full text-left"
                onClick={() => setSelectedQRow(open ? null : i)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm">{label}</div>
                </div>
              </button>
              {open && details && <div className="mt-2">{details}</div>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function MStepPanel({
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
  onParameterSelect: (p: string | null) => void;
}) {
  // S: bereken M-stap sommen (blijft hetzelfde)
  const calc = () => {
    const N = data.length;
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

    const theta_f = sum_qf1 / N;
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

  const m = calc();

  // Belangrijk: toon *huidige* params tot de M-stap uitgevoerd is
  const isUpdated = currentStep === "m-completed";
  const display = isUpdated
    ? {
        theta_f: m.theta_f,
        theta_t1_f1: m.theta_t1_f1,
        theta_t1_f0: m.theta_t1_f0,
        theta_t2_f1: m.theta_t2_f1,
        theta_t2_f0: m.theta_t2_f0,
      }
    : {
        theta_f: params.theta_f,
        theta_t1_f1: params.theta_t1_f1,
        theta_t1_f0: params.theta_t1_f0,
        theta_t2_f1: params.theta_t2_f1,
        theta_t2_f0: params.theta_t2_f0,
      };

  const Box = ({
    id,
    title,
    num,
    den,
    value,
  }: {
    id: string;
    title: ReactNode;
    num: ReactNode;
    den: ReactNode;
    value: number;
  }) => {
    const selected = selectedParameter === id;
    return (
      <div
        className={`border-2 p-4 rounded bg-white cursor-pointer transition-all ${
          selected
            ? "border-sky-400 bg-sky-50 shadow"
            : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => onParameterSelect(selected ? null : id)}
      >
        <div className="font-mono text-lg mb-2">
          {title} = <Frac num={num} den={den} className="align-middle" />
        </div>

        <div className="mt-1 text-lg font-bold">= {value.toFixed(3)} </div>

        {isUpdated ? (
          <p className="text-xs text-gray-600 mt-1">
            Click to highlight relevant cells in the table (numerator =
            outlined, denominator = solid colour).
          </p>
        ) : (
          <p className="text-xs text-gray-500 mt-1"></p>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>θ-updates (M-step)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Box
          id="theta_f"
          title={
            <>
              <span className="align-middle">θ</span>
              <sub>F</sub>
            </>
          }
          num={
            <span>
              Σ<sup>i</sup> q<sup>i</sup>(f=1)
            </span>
          }
          den={<span>N</span>}
          value={display.theta_f}
        />
        <Box
          id="theta_t1_f1"
          title={
            <>
              <span>θ</span>
              <sub>t11</sub>
            </>
          }
          num={
            <span>
              Σ<sup>i</sup> q<sup>i</sup>(f=1, t₁=1)
            </span>
          }
          den={
            <span>
              Σ<sup>i</sup> q<sup>i</sup>(f=1)
            </span>
          }
          value={display.theta_t1_f1}
        />
        <Box
          id="theta_t1_f0"
          title={
            <>
              <span>θ</span>
              <sub>t10</sub>
            </>
          }
          num={
            <span>
              Σ<sup>i</sup> q<sup>i</sup>(f=0, t₁=1)
            </span>
          }
          den={
            <span>
              Σ<sup>i</sup> q<sup>i</sup>(f=0)
            </span>
          }
          value={display.theta_t1_f0}
        />
        <Box
          id="theta_t2_f1"
          title={
            <>
              <span>θ</span>
              <sub>t21</sub>
            </>
          }
          num={
            <span>
              Σ<sup>i</sup> q<sup>i</sup>(f=1, t₂=1)
            </span>
          }
          den={
            <span>
              Σ<sup>i</sup> q<sup>i</sup>(f=1)
            </span>
          }
          value={display.theta_t2_f1}
        />
        <Box
          id="theta_t2_f0"
          title={
            <>
              <span>θ</span>
              <sub>t20</sub>
            </>
          }
          num={
            <span>
              Σ<sup>i</sup> q<sup>i</sup>(f=0, t₂=1)
            </span>
          }
          den={
            <span>
              Σ<sup>i</sup> q<sup>i</sup>(f=0)
            </span>
          }
          value={display.theta_t2_f0}
        />
      </CardContent>
    </Card>
  );
}

function RowCalculationDetails({
  selectedRow,
  data,
  expectations,
  currentStep,
}: {
  selectedRow: number | null;
  data: DataPoint[];
  expectations: number[][];
  currentStep: string;
}) {
  if (selectedRow === null) return null;
  const point = data[selectedRow];
  const exp = expectations[selectedRow] || [];
  const missingF = point.f === undefined;
  const missingT1 = point.t1 === undefined;
  const missingT2 = point.t2 === undefined;
  const fmt = (x: number, d = 6) => x.toFixed(d);
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
          Rij {selectedRow + 1} — E-stap details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="font-mono text-sm mb-3">
            f = {point.f ?? "?"}, t₁ = {point.t1 ?? "?"}, t₂ = {point.t2 ?? "?"}
          </div>
          {!missingF && !missingT1 && !missingT2 && (
            <div className="text-sm">Volledig geobserveerd → weight = 1.</div>
          )}
          {missingF &&
            !missingT1 &&
            !missingT2 &&
            currentStep === "e-completed" &&
            exp.length >= 2 && (
              <div className="space-y-2 text-sm">
                <div className="font-semibold">q(f=1 | t₁,t₂)</div>
                <Frac
                  num={
                    <>
                      θ<sub>f</sub> · P(t₁={point.t1}|f=1) · P(t₂={point.t2}
                      |f=1)
                    </>
                  }
                  den={
                    <>
                      θ<sub>f</sub> · P(t₁={point.t1}|1) · P(t₂={point.t2}|1) +
                      (1−θ<sub>f</sub>) · P(t₁={point.t1}|0) · P(t₂={point.t2}
                      |0)
                    </>
                  }
                />
                <div className="border rounded bg-white p-2">
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
            )}
          {!missingF &&
            missingT1 &&
            !missingT2 &&
            currentStep === "e-completed" &&
            exp.length >= 2 && (
              <div className="space-y-2 text-sm">
                <div className="font-semibold">q(t₁=1 | f)</div>
                <div>
                  P(t₁=1 | f={point.f}) ={" "}
                  {point.f === 1 ? (
                    <span>
                      θ<sub>t11</sub>
                    </span>
                  ) : (
                    <span>
                      θ<sub>t10</sub>
                    </span>
                  )}
                </div>
                <div className="border rounded bg-white p-2">
                  <div>
                    <Q i={selectedRow + 1}>t₁=1</Q> = {fmt(exp[0])}
                  </div>
                  <div>
                    <Q i={selectedRow + 1}>t₁=0</Q> = {fmt(exp[1])}
                  </div>
                </div>
              </div>
            )}
          {!missingF &&
            !missingT1 &&
            missingT2 &&
            currentStep === "e-completed" &&
            exp.length >= 2 && (
              <div className="space-y-2 text-sm">
                <div className="font-semibold">q(t₂=1 | f)</div>
                <div>
                  P(t₂=1 | f={point.f}) ={" "}
                  {point.f === 1 ? (
                    <span>
                      θ<sub>t21</sub>
                    </span>
                  ) : (
                    <span>
                      θ<sub>t20</sub>
                    </span>
                  )}
                </div>
                <div className="border rounded bg-white p-2">
                  <div>
                    <Q i={selectedRow + 1}>t₂=1</Q> = {fmt(exp[0])}
                  </div>
                  <div>
                    <Q i={selectedRow + 1}>t₂=0</Q> = {fmt(exp[1])}
                  </div>
                </div>
              </div>
            )}
          {missingF &&
            missingT1 &&
            !missingT2 &&
            currentStep === "e-completed" &&
            exp.length >= 4 && (
              <section className="space-y-2 text-sm">
                <div className="font-semibold">q(f,t₁ | t₂={point.t2})</div>
                <div className="space-y-1">
                  <div>
                    <strong>f=1,t₁=1:</strong>{" "}
                    <Frac
                      num={
                        <>
                          <span>
                            θ<sub>t11</sub>·{T2_given_f1}·θ<sub>f</sub>
                          </span>
                        </>
                      }
                      den={Den}
                    />
                  </div>
                  <div>
                    <strong>f=1,t₁=0:</strong>{" "}
                    <Frac
                      num={
                        <>
                          <span>
                            (1−θ<sub>t11</sub>)·{T2_given_f1}·θ<sub>f</sub>
                          </span>
                        </>
                      }
                      den={Den}
                    />
                  </div>
                  <div>
                    <strong>f=0,t₁=1:</strong>{" "}
                    <Frac
                      num={
                        <>
                          <span>
                            θ<sub>t10</sub>·{T2_given_f0}·(1−θ<sub>f</sub>)
                          </span>
                        </>
                      }
                      den={Den}
                    />
                  </div>
                  <div>
                    <strong>f=0,t₁=0:</strong>{" "}
                    <Frac
                      num={
                        <>
                          <span>
                            (1−θ<sub>t10</sub>)·{T2_given_f0}·(1−θ<sub>f</sub>)
                          </span>
                        </>
                      }
                      den={Den}
                    />
                  </div>
                  <div className="text-xs text-gray-700">
                    Numeriek: [{fmt(exp[0])}, {fmt(exp[1])}, {fmt(exp[2])},{" "}
                    {fmt(exp[3])}]
                  </div>
                </div>
              </section>
            )}
        </div>
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
    { t1: 1, f: 1 },
    { f: 1, t1: 1, t2: 1 },
    { t2: 0, f: 0 },
    { t1: 1, t2: 0, f: 1 },
    { t2: 1 },
  ]);
  const [iteration, setIteration] = useState(0);
  const [currentStep, setCurrentStep] = useState<
    "ready" | "e-completed" | "m-completed"
  >("ready");
  const [expectations, setExpectations] = useState<number[][]>([]);
  const [busy, setBusy] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedParameter, setSelectedParameter] = useState<string | null>(
    null
  );
  const [selectedQRow, setSelectedQRow] = useState<number | null>(null);

  const runEStep = () => {
    setBusy(true);
    const newExpectations: number[][] = [];
    data.forEach((point, i) => {
      const missingF = point.f === undefined;
      const missingT1 = point.t1 === undefined;
      const missingT2 = point.t2 === undefined;
      if (!missingF && !missingT1 && !missingT2) {
        newExpectations[i] = [1];
      } else if (missingF && !missingT1 && !missingT2) {
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
    setBusy(false);
    setSelectedParameter(null);
  };

  const runMStep = () => {
    setBusy(true);
    if (expectations.length === 0) {
      setBusy(false);
      return;
    }
    const N = data.length;
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
    setIteration((v) => v + 1);
    setCurrentStep("m-completed");
    setBusy(false);
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
    setBusy(false);
    setSelectedRow(null);
    setSelectedParameter(null);
    setSelectedQRow(null);
  };
  const canRunE =
    !busy && (currentStep === "ready" || currentStep === "m-completed");
  const canRunM = !busy && currentStep === "e-completed";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex gap-2 w-full">
        <Button onClick={runEStep} disabled={!canRunE} className="flex-1">
          {busy && currentStep === "ready" ? "Running E-Step..." : "Run E-Step"}
        </Button>
        <Button
          onClick={runMStep}
          disabled={!canRunM}
          className="flex-1"
          variant={canRunM ? "default" : "outline"}
        >
          {busy && currentStep === "e-completed"
            ? "Running M-Step..."
            : "Run M-Step"}
        </Button>
        <Button onClick={reset} variant="outline">
          Reset
        </Button>
      </div>
      <Card>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-4">Network Structure</h3>
              <NetworkDiagram />
            </div>
            <div>
              <h3 className="font-semibold mb-4">
                Current parameters (Iteratie {iteration})
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>
                    P(F=1) = θ<sub>F</sub>
                  </span>
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
          <CardTitle>
            {currentStep === "ready"
              ? "Input Data (raw)"
              : "Training Data (expanded) & Weights"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={data}
            expectations={expectations}
            currentStep={currentStep}
            onRowClick={(i) => setSelectedRow(selectedRow === i ? null : i)}
            selectedRow={selectedRow}
            selectedParameter={selectedParameter}
          />
        </CardContent>
      </Card>
      <div className="grid lg:grid-cols-2 gap-6">
        <QFunctionsPanel
          data={data}
          params={params}
          expectations={expectations}
          currentStep={currentStep}
          selectedQRow={selectedQRow}
          setSelectedQRow={setSelectedQRow}
        />
        <MStepPanel
          currentStep={currentStep}
          params={params}
          data={data}
          expectations={expectations}
          selectedParameter={selectedParameter}
          onParameterSelect={setSelectedParameter}
        />
      </div>
      <RowCalculationDetails
        selectedRow={selectedRow}
        data={data}
        expectations={expectations}
        currentStep={currentStep}
      />
    </div>
  );
}

export { ExpectationMaximizationDemo };
