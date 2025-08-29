"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as React from "react";
import { ChevronRight } from "lucide-react";

type Props = {
  title: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
};

export function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
  className,
}: Props) {
  return (
    <Card className={className}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 p-4 text-left font-medium cursor-pointer select-none"
        aria-expanded={isOpen}
      >
        <ChevronRight
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
          strokeWidth={1.2} // dun pijltje
        />
        <span>{title}</span>
      </button>
      {isOpen && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

/** ───────────────── Helpers ───────────────── */
const round3 = (x: number) => Math.round(x * 1000) / 1000;
const changed = (a?: number, b?: number) =>
  typeof a === "number" && typeof b === "number"
    ? round3(a) !== round3(b)
    : false;

function useFlashTick(tick: number, ms = 1900) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (tick === 0) return; // 0 = nog nooit gepulst
    setOn(true);
    const id = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(id);
  }, [tick, ms]);
  return on;
}

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

/** ───────────────── DataTable (met change flash) ───────────────── */
function DataTable({
  data,
  expectations,
  prevExpectations,
  flashE,
  flashEpoch = 0,
  currentStep,
  selectedParameter, // blijft
}: {
  data: DataPoint[];
  expectations: number[][];
  prevExpectations: number[][];
  flashE: boolean;
  flashEpoch?: number;
  currentStep: string;
  selectedParameter: string | null;
}) {
  const isInitial = currentStep === "ready";

  // helper om expanded rows te bouwen uit expectations
  const buildExpanded = (points: DataPoint[], exps: number[][]) => {
    const out: ExpandedDataPoint[] = [];
    points.forEach((point, rowIndex) => {
      const missingF = point.f === undefined;
      const missingT1 = point.t1 === undefined;
      const missingT2 = point.t2 === undefined;
      const exp = exps[rowIndex];
      if (!missingF && !missingT1 && !missingT2) {
        out.push({
          f: point.f!,
          t1: point.t1!,
          t2: point.t2!,
          weight: 1,
          source_row: rowIndex + 1,
        });
      } else if (exp && exp.length) {
        if (!missingF && !missingT1 && missingT2 && exp.length >= 2) {
          out.push({
            f: point.f!,
            t1: point.t1!,
            t2: 1,
            weight: exp[0],
            source_row: rowIndex + 1,
            missing_t2: true,
          });
          out.push({
            f: point.f!,
            t1: point.t1!,
            t2: 0,
            weight: exp[1],
            source_row: rowIndex + 1,
            missing_t2: true,
          });
        } else if (!missingF && missingT1 && !missingT2 && exp.length >= 2) {
          out.push({
            f: point.f!,
            t1: 1,
            t2: point.t2!,
            weight: exp[0],
            source_row: rowIndex + 1,
            missing_t1: true,
          });
          out.push({
            f: point.f!,
            t1: 0,
            t2: point.t2!,
            weight: exp[1],
            source_row: rowIndex + 1,
            missing_t1: true,
          });
        } else if (missingF && !missingT1 && !missingT2 && exp.length >= 2) {
          out.push({
            f: 1,
            t1: point.t1!,
            t2: point.t2!,
            weight: exp[0],
            source_row: rowIndex + 1,
            missing_f: true,
          });
          out.push({
            f: 0,
            t1: point.t1!,
            t2: point.t2!,
            weight: exp[1],
            source_row: rowIndex + 1,
            missing_f: true,
          });
        } else if (missingF && missingT1 && !missingT2 && exp.length >= 4) {
          out.push({
            f: 1,
            t1: 1,
            t2: point.t2!,
            weight: exp[0],
            source_row: rowIndex + 1,
            missing_f: true,
            missing_t1: true,
          });
          out.push({
            f: 1,
            t1: 0,
            t2: point.t2!,
            weight: exp[1],
            source_row: rowIndex + 1,
            missing_f: true,
            missing_t1: true,
          });
          out.push({
            f: 0,
            t1: 1,
            t2: point.t2!,
            weight: exp[2],
            source_row: rowIndex + 1,
            missing_f: true,
            missing_t1: true,
          });
          out.push({
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
    return out;
  };

  const expandedData = buildExpanded(data, expectations);
  const prevExpandedData = buildExpanded(data, prevExpectations || []);

  const findPrevWeight = (r: ExpandedDataPoint) => {
    const hit = prevExpandedData.find(
      (x) =>
        x.source_row === r.source_row &&
        x.f === r.f &&
        x.t1 === r.t1 &&
        x.t2 === r.t2
    );
    return hit?.weight;
  };

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

  const cellHighlight = (
    row: ExpandedDataPoint,
    col: "f" | "t1" | "t2" | "weight" | "source"
  ): string => {
    if (!selectedParameter || currentStep !== "m-completed") return "";

    const { num, den } = contributesForParam(selectedParameter, row);
    const cls: string[] = [];

    // Noemer: highlight context op f
    if (den && col === "f") cls.push("bg-green-100");

    switch (selectedParameter) {
      case "theta_f":
        // Teller enkel in f → één gesloten kader
        if (num && col === "f") cls.push("em-num-single");
        break;

      case "theta_t1_f1":
      case "theta_t1_f0":
        // Teller over f+t1 → doorlopende horizontale kader
        if (num && col === "f") cls.push("em-num-left");
        if (num && col === "t1") cls.push("em-num-right");
        break;

      case "theta_t2_f1":
      case "theta_t2_f0":
        // Teller over f én t2 → twee aparte gesloten kaders
        if (num && (col === "f" || col === "t2")) cls.push("em-num-single");
        break;
    }

    if (col === "weight" && (num || den)) cls.push("font-bold");
    return cls.join(" ");
  };

  const show = (v?: number) => (v === undefined ? "?" : String(v));

  return (
    <div className="rounded-md border-[1.5px] border-neutral-700 overflow-hidden">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr className="bg-gray-100">
            <th className="border-[0.5px] border-gray-300 px-3 py-2">
              Source Row
            </th>
            <th className="border-[0.5px] border-gray-300 px-3 py-2">f</th>
            <th className="border-[0.5px] border-gray-300 px-3 py-2">t₁</th>
            <th className="border-[0.5px] border-gray-300 px-3 py-2">t₂</th>
            <th className="border-[0.5px] border-gray-300 px-3 py-2">weight</th>
          </tr>
        </thead>
        <tbody>
          {rowsToRender.map((row, idx) => {
            const originalRowIndex = row.source_row - 1;

            const isStart =
              idx === 0 || rowsToRender[idx - 1].source_row !== row.source_row;
            const isEnd =
              idx === rowsToRender.length - 1 ||
              rowsToRender[idx + 1].source_row !== row.source_row;

            const topCls =
              !isInitial && isStart
                ? "border-t-[1.5px] border-t-neutral-700"
                : "";

            const bottomCls =
              !isInitial && isEnd
                ? "border-b-[1.5px] border-b-neutral-700"
                : "";

            // verticale randen langs de groep (alle rijen van de groep krijgen deze)
            const leftEdgeCls = !isInitial
              ? "border-l-[1.5px] border-l-neutral-700"
              : "";
            const rightEdgeCls = !isInitial
              ? "border-r-[1.5px] border-r-neutral-700"
              : "";

            const tdBase = `border-[1px] border-gray-300 px-3 py-2 text-center font-mono text-[18px]`;

            // change detection for weight (only after E-step)
            const prevW = !isInitial ? findPrevWeight(row) : undefined;
            const isFirstEStep =
              (prevExpectations?.length ?? 0) === 0 && expectations.length > 0;

            const weightChanged =
              !isInitial &&
              (isFirstEStep || // eerste E-step: alles wat nu gewogen is, laten pulsen
                (typeof prevW === "number" && changed(row.weight, prevW)));

            return (
              <tr key={idx} className="hover:bg-gray-50">
                <td
                  className={`border border-gray-300 px-3 py-2 text-center font-semibold text-[16px]
                    ${cellHighlight(row, "source")}
                    ${leftEdgeCls} ${topCls} ${bottomCls}`}
                >
                  {row.source_row}
                </td>

                <td
                  className={`${tdBase} ${
                    row.missing_f ? "font-bold" : ""
                  } ${cellHighlight(row, "f")}  ${topCls} ${bottomCls}`}
                >
                  {isInitial ? show(row.missing_f ? undefined : row.f) : row.f}
                </td>

                <td
                  className={`${tdBase} ${
                    row.missing_t1 ? "font-bold" : ""
                  } ${cellHighlight(row, "t1")} ${topCls} ${bottomCls}`}
                >
                  {isInitial
                    ? show(row.missing_t1 ? undefined : row.t1)
                    : row.t1}
                </td>

                <td
                  className={`${tdBase} ${
                    row.missing_t2 ? "font-bold" : ""
                  } ${cellHighlight(row, "t2")} ${topCls} ${bottomCls}`}
                >
                  {isInitial
                    ? show(row.missing_t2 ? undefined : row.t2)
                    : row.t2}
                </td>

                <td
                  className={`${tdBase} ${cellHighlight(
                    row,
                    "weight"
                  )} ${topCls} ${bottomCls} ${rightEdgeCls}`}
                >
                  <div className="space-y-1">
                    <div
                      key={`${row.source_row}-${row.f}-${row.t1}-${row.t2}-${
                        flashE && weightChanged ? flashEpoch : "static"
                      }`}
                      className={`font-mono text-[18px] transition-all ${
                        flashE && weightChanged ? "em-flash-weight" : ""
                      }`}
                    >
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

/** ───────────────── Q panel (ongewijzigde inhoud) ───────────────── */
function QPlain({ i }: { i: number }) {
  return (
    <>
      <span className="font-serif italic">q</span>
      <sup>{i}</sup>
    </>
  );
}

function QFunctionsPanel({
  data,
  params,
  expectations,
  currentStep,
}: {
  data: DataPoint[];
  params: BayesianParams;
  expectations: number[][];
  currentStep: string;
}) {
  const isAfterE = currentStep !== "ready";
  const [expanded, setExpanded] = useState<string | null>(null);

  const EBox = ({
    id,
    title,
    num,
    den,
    rhs,
    value,
    steps,
  }: {
    id: string;
    title: ReactNode;
    num?: ReactNode;
    den?: ReactNode;
    rhs?: ReactNode;
    value?: number;
    steps?: ReactNode[];
  }) => {
    const open = expanded === id;
    // binnen EBox in QFunctionsPanel
    const hasExpr = (!!num && !!den) || rhs !== undefined;

    return (
      <div
        className={`border-2 p-4 rounded bg-white cursor-pointer transition-all ${
          open
            ? "border-sky-400 bg-sky-50 shadow"
            : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => setExpanded(open ? null : id)}
      >
        {/* alles op één regel */}
        <div className="font-mono text-lg flex flex-wrap items-center gap-2">
          {title}
          {num && den ? (
            <>
              <span>=</span>
              <Frac num={num} den={den} className="align-middle" />
              {typeof value === "number" && (
                <>
                  <span>=</span>
                  <span className="font-bold">{value.toFixed(3)}</span>
                </>
              )}
            </>
          ) : rhs ? (
            <>
              <span>=</span>
              <span className="inline-flex items-center">{rhs}</span>
              {typeof value === "number" && (
                <>
                  <span>=</span>
                  <span className="font-bold">{value.toFixed(3)}</span>
                </>
              )}
            </>
          ) : (
            // geen expressie (bv. complete rij) → één "=" met de waarde
            typeof value === "number" && (
              <>
                <span>=</span>
                <span className="font-bold">{value.toFixed(3)}</span>
              </>
            )
          )}
        </div>

        {open && steps && steps.length > 0 && (
          <div className="mt-3 space-y-2">
            {steps.map((block, k) => (
              <div key={k} className="border rounded bg-white p-2 text-sm">
                {block}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // helpers voor stap-teksten
  const StepLabel = ({ children }: { children: ReactNode }) => (
    <div className="text-xs text-gray-500 mb-1">{children}</div>
  );

  return (
    <Card>
      <CardContent className="space-y-6">
        {data.map((p, i) => {
          const idx = i + 1;
          const e = expectations[i] || [];

          const missingF = p.f === undefined;
          const missingT1 = p.t1 === undefined;
          const missingT2 = p.t2 === undefined;

          const T1_f1 =
            p.t1 === 1 ? (
              <>
                θ<sub>t11</sub>
              </>
            ) : (
              <>
                (1−θ<sub>t11</sub>)
              </>
            );
          const T1_f0 =
            p.t1 === 1 ? (
              <>
                θ<sub>t10</sub>
              </>
            ) : (
              <>
                (1−θ<sub>t10</sub>)
              </>
            );
          const T2_f1 =
            p.t2 === 1 ? (
              <>
                θ<sub>t21</sub>
              </>
            ) : (
              <>
                (1−θ<sub>t21</sub>)
              </>
            );
          const T2_f0 =
            p.t2 === 1 ? (
              <>
                θ<sub>t20</sub>
              </>
            ) : (
              <>
                (1−θ<sub>t20</sub>)
              </>
            );

          const Zsym = (
            <>
              θ<sub>f</sub>·{T2_f1} + (1−θ<sub>f</sub>)·{T2_f0}
            </>
          );

          const boxes: ReactNode[] = [];

          // Case A: f,t1 bekend — t2 ontbreekt → q(t2 | f,t1)
          if (!missingF && !missingT1 && missingT2) {
            // q(t2=1 | f,t1)
            boxes.push(
              <EBox
                key={`${idx}-t2-1`}
                id={`${idx}-t2-1`}
                title={
                  <>
                    <Q i={idx}>
                      t₂=1 | f={p.f}, t₁={p.t1}
                    </Q>
                  </>
                }
                rhs={
                  p.f === 1 ? (
                    <>
                      θ<sub>t21</sub>
                    </>
                  ) : (
                    <>
                      θ<sub>t20</sub>
                    </>
                  )
                }
                value={isAfterE && e.length >= 2 ? e[0] : undefined}
                steps={[
                  <>
                    <StepLabel>
                      Weight is the probability of the completed row given the
                      known data
                    </StepLabel>
                    P(t₂=1 | f={p.f}, t₁={p.t1})
                  </>,
                  <>
                    <StepLabel>Rewrite the conditional probability</StepLabel>={" "}
                    <Frac
                      num={
                        <>
                          P(t₂=1, f={p.f}, t₁={p.t1})
                        </>
                      }
                      den={
                        <>
                          <span>∑</span>
                          <sub>t₂</sub> P(t₂, f={p.f}, t₁={p.t1})
                        </>
                      }
                    />
                  </>,
                  <>
                    <StepLabel>
                      Simplify according to the Bayesian net
                    </StepLabel>
                    ={" "}
                    <Frac
                      num={
                        <>
                          P(t₂=1|f={p.f})·P(f={p.f})·P(t₁={p.t1}|f={p.f})
                        </>
                      }
                      den={
                        <>
                          <span>∑</span>
                          <sub>t₂</sub> P(t₂|f={p.f})·P(f={p.f})·P(t₁={p.t1}|f=
                          {p.f})
                        </>
                      }
                    />
                  </>,
                  <>
                    <StepLabel>Simplify numerator and denominator</StepLabel>=
                    P(t₂=1 | f={p.f})
                  </>,
                  <>
                    <StepLabel>Fill in theta</StepLabel>={" "}
                    {p.f === 1 ? (
                      <>
                        θ<sub>t21</sub>
                      </>
                    ) : (
                      <>
                        θ<sub>t20</sub>
                      </>
                    )}
                  </>,
                ]}
              />
            );

            // q(t2=0 | f,t1)
            boxes.push(
              <EBox
                key={`${idx}-t2-0`}
                id={`${idx}-t2-0`}
                title={
                  <>
                    <Q i={idx}>
                      t₂=0 | f={p.f}, t₁={p.t1}
                    </Q>
                  </>
                }
                rhs={
                  p.f === 1 ? (
                    <>
                      (1−θ<sub>t21</sub>)
                    </>
                  ) : (
                    <>
                      (1−θ<sub>t20</sub>)
                    </>
                  )
                }
                value={isAfterE && e.length >= 2 ? e[1] : undefined}
                steps={[
                  <>
                    <StepLabel>
                      Weight is the probability of the completed row given the
                      known data
                    </StepLabel>
                    P(t₂=0 | f={p.f}, t₁={p.t1})
                  </>,
                  <>
                    <StepLabel>Rewrite the conditional probability</StepLabel>={" "}
                    <Frac
                      num={
                        <>
                          P(t₂=0, f={p.f}, t₁={p.t1})
                        </>
                      }
                      den={
                        <>
                          <span>∑</span>
                          <sub>t₂</sub> P(t₂, f={p.f}, t₁={p.t1})
                        </>
                      }
                    />
                  </>,
                  <>
                    <StepLabel>
                      Simplify according to the Bayesian net
                    </StepLabel>
                    ={" "}
                    <Frac
                      num={
                        <>
                          P(t₂=0|f={p.f})·P(f={p.f})·P(t₁={p.t1}|f={p.f})
                        </>
                      }
                      den={
                        <>
                          <span>∑</span>
                          <sub>t₂</sub> P(t₂|f={p.f})·P(f={p.f})·P(t₁={p.t1}|f=
                          {p.f})
                        </>
                      }
                    />
                  </>,
                  <>
                    <StepLabel>Simplify numerator and denominator</StepLabel>=
                    P(t₂=0 | f={p.f})
                  </>,
                  <>
                    <StepLabel>Fill in theta</StepLabel>={" "}
                    {p.f === 1 ? (
                      <>
                        (1−θ<sub>t21</sub>)
                      </>
                    ) : (
                      <>
                        (1−θ<sub>t20</sub>)
                      </>
                    )}
                  </>,
                ]}
              />
            );
          }

          // Case B: f,t2 bekend — t1 ontbreekt → q(t1 | f,t2)
          if (!missingF && missingT1 && !missingT2) {
            boxes.push(
              <EBox
                key={`${idx}-t1-1`}
                id={`${idx}-t1-1`}
                title={
                  <>
                    <Q i={idx}>
                      t₁=1 | f={p.f}, t₂={p.t2}
                    </Q>
                  </>
                }
                rhs={
                  p.f === 1 ? (
                    <>
                      θ<sub>t11</sub>
                    </>
                  ) : (
                    <>
                      θ<sub>t10</sub>
                    </>
                  )
                }
                value={isAfterE && e.length >= 2 ? e[0] : undefined}
                steps={[
                  <>
                    <StepLabel>
                      Weight is the probability of the completed row given the
                      known data
                    </StepLabel>
                    P(t₁=1 | f={p.f}, t₂={p.t2})
                  </>,
                  <>
                    <StepLabel>Rewrite the conditional probability</StepLabel>={" "}
                    <Frac
                      num={
                        <>
                          P(t₁=1, f={p.f}, t₂={p.t2})
                        </>
                      }
                      den={
                        <>
                          <span>∑</span>
                          <sub>t₁</sub> P(t₁, f={p.f}, t₂={p.t2})
                        </>
                      }
                    />
                  </>,
                  <>
                    <StepLabel>
                      Simplify according to the Bayesian net
                    </StepLabel>
                    ={" "}
                    <Frac
                      num={
                        <>
                          P(t₁=1|f={p.f})·P(f={p.f})·P(t₂={p.t2}|f={p.f})
                        </>
                      }
                      den={
                        <>
                          <span>∑</span>
                          <sub>t₁</sub> P(t₁|f={p.f})·P(f={p.f})·P(t₂={p.t2}|f=
                          {p.f})
                        </>
                      }
                    />
                  </>,
                  <>
                    <StepLabel>Simplify numerator and denominator</StepLabel>=
                    P(t₁=1 | f={p.f})
                  </>,
                  <>
                    <StepLabel>Fill in theta</StepLabel>={" "}
                    {p.f === 1 ? (
                      <>
                        θ<sub>t11</sub>
                      </>
                    ) : (
                      <>
                        θ<sub>t10</sub>
                      </>
                    )}
                  </>,
                ]}
              />
            );

            boxes.push(
              <EBox
                key={`${idx}-t1-0`}
                id={`${idx}-t1-0`}
                title={
                  <>
                    <Q i={idx}>
                      t₁=0 | f={p.f}, t₂={p.t2}
                    </Q>
                  </>
                }
                rhs={
                  p.f === 1 ? (
                    <>
                      (1−θ<sub>t11</sub>)
                    </>
                  ) : (
                    <>
                      (1−θ<sub>t10</sub>)
                    </>
                  )
                }
                value={isAfterE && e.length >= 2 ? e[1] : undefined}
                steps={[
                  <>
                    <StepLabel>
                      Weight is the probability of the completed row given the
                      known data
                    </StepLabel>
                    P(t₁=0 | f={p.f}, t₂={p.t2})
                  </>,
                  <>
                    <StepLabel>Rewrite the conditional probability</StepLabel>={" "}
                    <Frac
                      num={
                        <>
                          P(t₁=0, f={p.f}, t₂={p.t2})
                        </>
                      }
                      den={
                        <>
                          <span>∑</span>
                          <sub>t₁</sub> P(t₁, f={p.f}, t₂={p.t2})
                        </>
                      }
                    />
                  </>,
                  <>
                    <StepLabel>
                      Simplify according to the Bayesian net
                    </StepLabel>
                    ={" "}
                    <Frac
                      num={
                        <>
                          P(t₁=0|f={p.f})·P(f={p.f})·P(t₂={p.t2}|f={p.f})
                        </>
                      }
                      den={
                        <>
                          <span>∑</span>
                          <sub>t₁</sub> P(t₁|f={p.f})·P(f={p.f})·P(t₂={p.t2}|f=
                          {p.f})
                        </>
                      }
                    />
                  </>,
                  <>
                    <StepLabel>Simplify numerator and denominator</StepLabel>=
                    P(t₁=0 | f={p.f})
                  </>,
                  <>
                    <StepLabel>Fill in theta</StepLabel>={" "}
                    {p.f === 1 ? (
                      <>
                        (1−θ<sub>t11</sub>)
                      </>
                    ) : (
                      <>
                        (1−θ<sub>t10</sub>)
                      </>
                    )}
                  </>,
                ]}
              />
            );
          }

          // Case C: t1,t2 bekend — f ontbreekt → q(f | t1,t2)
          if (missingF && !missingT1 && !missingT2) {
            boxes.push(
              <EBox
                key={`${idx}-f-1`}
                id={`${idx}-f-1`}
                title={
                  <>
                    <Q i={idx}>
                      <em>f</em>=1 | t₁={p.t1}, t₂={p.t2}
                    </Q>
                  </>
                }
                num={
                  <>
                    <span>
                      θ<sub>f</sub>·
                    </span>
                    {T1_f1}·{T2_f1}
                  </>
                }
                den={<>{Zsym}</>}
                value={isAfterE && e.length >= 2 ? e[0] : undefined}
                steps={[
                  <>
                    <StepLabel>
                      Weight is the probability of the completed row given the
                      known data
                    </StepLabel>
                    P(f=1 | t₁={p.t1}, t₂={p.t2})
                  </>,
                  <>
                    <StepLabel>Rewrite the conditional probability</StepLabel>={" "}
                    <Frac
                      num={
                        <>
                          P(f=1, t₁={p.t1}, t₂={p.t2})
                        </>
                      }
                      den={
                        <>
                          P(t₁={p.t1}, t₂={p.t2})
                        </>
                      }
                    />
                  </>,
                  <>
                    <StepLabel>
                      Simplify according to the Bayesian net
                    </StepLabel>
                    ={" "}
                    <Frac
                      num={
                        <>
                          P(f=1)·P(t₁={p.t1}|f=1)·P(t₂={p.t2}|f=1)
                        </>
                      }
                      den={
                        <>
                          P(t₂={p.t2}|f=1)·P(f=1) + P(t₂={p.t2}|f=0)·P(f=0)
                        </>
                      }
                    />
                  </>,
                  <>
                    <StepLabel>Simplify numerator and denominator</StepLabel>={" "}
                    <Frac
                      num={
                        <>
                          θ<sub>f</sub>·{T1_f1}·{T2_f1}
                        </>
                      }
                      den={<>{Zsym}</>}
                    />
                  </>,
                  <>
                    <StepLabel>Fill in theta</StepLabel>= zoals hierboven.
                  </>,
                ]}
              />
            );

            boxes.push(
              <EBox
                key={`${idx}-f-0`}
                id={`${idx}-f-0`}
                title={
                  <>
                    <Q i={idx}>
                      <em>f</em>=0 | t₁={p.t1}, t₂={p.t2}
                    </Q>
                  </>
                }
                num={
                  <>
                    (1−θ<sub>f</sub>)·{T1_f0}·{T2_f0}
                  </>
                }
                den={<>{Zsym}</>}
                value={isAfterE && e.length >= 2 ? e[1] : undefined}
                steps={[
                  <>
                    <StepLabel>
                      Weight is the probability of the completed row given the
                      known data
                    </StepLabel>
                    P(f=0 | t₁={p.t1}, t₂={p.t2})
                  </>,
                  <>
                    <StepLabel>Rewrite the conditional probability</StepLabel>={" "}
                    <Frac
                      num={
                        <>
                          P(f=0, t₁={p.t1}, t₂={p.t2})
                        </>
                      }
                      den={
                        <>
                          P(t₁={p.t1}, t₂={p.t2})
                        </>
                      }
                    />
                  </>,
                  <>
                    <StepLabel>
                      Simplify according to the Bayesian net
                    </StepLabel>
                    ={" "}
                    <Frac
                      num={
                        <>
                          P(f=0)·P(t₁={p.t1}|f=0)·P(t₂={p.t2}|f=0)
                        </>
                      }
                      den={
                        <>
                          P(t₂={p.t2}|f=1)·P(f=1) + P(t₂={p.t2}|f=0)·P(f=0)
                        </>
                      }
                    />
                  </>,
                  <>
                    <StepLabel>Simplify numerator and denominator</StepLabel>={" "}
                    <Frac
                      num={
                        <>
                          (1−θ<sub>f</sub>)·{T1_f0}·{T2_f0}
                        </>
                      }
                      den={<>{Zsym}</>}
                    />
                  </>,
                  <>
                    <StepLabel>Fill in theta</StepLabel>= zoals hierboven.
                  </>,
                ]}
              />
            );
          }

          // Case D: t2 bekend — f én t1 ontbreken → q(f,t1 | t2)
          if (missingF && missingT1 && !missingT2) {
            const labelFor = (ft: "1-1" | "1-0" | "0-1" | "0-0") => {
              const [fVal, t1Val] = ft.split("-");
              return (
                <Q i={idx}>
                  <em>f</em>={fVal}, t₁={t1Val} | t₂={p.t2}
                </Q>
              );
            };

            const numFor: Record<
              "1-1" | "1-0" | "0-1" | "0-0",
              React.ReactNode
            > = {
              "1-1": (
                <>
                  θ<sub>f</sub>·θ<sub>t11</sub>·{T2_f1}
                </>
              ),
              "1-0": (
                <>
                  θ<sub>f</sub>·(1−θ<sub>t11</sub>)·{T2_f1}
                </>
              ),
              "0-1": (
                <>
                  (1−θ<sub>f</sub>)·θ<sub>t10</sub>·{T2_f0}
                </>
              ),
              "0-0": (
                <>
                  (1−θ<sub>f</sub>)·(1−θ<sub>t10</sub>)·{T2_f0}
                </>
              ),
            };

            const valFor = (ft: "1-1" | "1-0" | "0-1" | "0-0") =>
              isAfterE && e.length >= 4
                ? ft === "1-1"
                  ? e[0]
                  : ft === "1-0"
                  ? e[1]
                  : ft === "0-1"
                  ? e[2]
                  : e[3]
                : undefined;

            const stepsFor = (ft: "1-1" | "1-0" | "0-1" | "0-0") => {
              const [fVal, t1Val] = ft.split("-");

              // P(·)-notatie voor stap 4 (geen thetas!)
              const probNumFor: Record<typeof ft, React.ReactNode> = {
                "1-1": (
                  <>
                    P(<em>f</em>=1)·P(t₁=1|<em>f</em>=1)·P(t₂={p.t2}|<em>f</em>
                    =1)
                  </>
                ),
                "1-0": (
                  <>
                    P(<em>f</em>=1)·P(t₁=0|<em>f</em>=1)·P(t₂={p.t2}|<em>f</em>
                    =1)
                  </>
                ),
                "0-1": (
                  <>
                    P(<em>f</em>=0)·P(t₁=1|<em>f</em>=0)·P(t₂={p.t2}|<em>f</em>
                    =0)
                  </>
                ),
                "0-0": (
                  <>
                    P(<em>f</em>=0)·P(t₁=0|<em>f</em>=0)·P(t₂={p.t2}|<em>f</em>
                    =0)
                  </>
                ),
              };

              const probDen = (
                <>
                  P(t₂={p.t2}|<em>f</em>=1)·P(<em>f</em>=1) + P(t₂={p.t2}|
                  <em>f</em>=0)·P(<em>f</em>=0)
                </>
              );

              return [
                <>
                  <StepLabel>
                    Weight is the probability of the completed row given the
                    known data
                  </StepLabel>
                  q<sup>{idx}</sup>(<em>f</em>={fVal}, t₁={t1Val} | t₂={p.t2})
                </>,
                <>
                  <StepLabel>Rewrite the conditional probability</StepLabel> ={" "}
                  <Frac
                    num={
                      <>
                        P(<em>f</em>={fVal}, t₁={t1Val}, t₂={p.t2})
                      </>
                    }
                    den={<>P(t₂={p.t2})</>}
                  />
                </>,
                <>
                  <StepLabel>Simplify according to the Bayesian net</StepLabel>{" "}
                  ={" "}
                  <Frac
                    num={
                      <>
                        P(<em>f</em>={fVal})·P(t₁={t1Val}|<em>f</em>={fVal}
                        )·P(t₂={p.t2}|<em>f</em>={fVal})
                      </>
                    }
                    den={
                      <>
                        <span>∑</span>
                        <sub>f,t₁</sub> P(f)·P(t₁|f)·P(t₂={p.t2}|f)
                      </>
                    }
                  />
                </>,
                <>
                  <StepLabel>Simplify numerator and denominator</StepLabel> ={" "}
                  <Frac num={probNumFor[ft]} den={probDen} />
                </>,
                <>
                  <StepLabel>Fill in theta</StepLabel> ={" "}
                  <Frac num={numFor[ft]} den={<>{Zsym}</>} />
                </>,
              ];
            };

            (["1-1", "1-0", "0-1", "0-0"] as const).forEach((ft) =>
              boxes.push(
                <EBox
                  key={`${idx}-${ft}`}
                  id={`${idx}-${ft}`}
                  title={labelFor(ft)}
                  num={numFor[ft]}
                  den={<>{Zsym}</>}
                  value={valFor(ft)}
                  steps={stepsFor(ft)}
                />
              )
            );
          }

          // Case E: complete row
          if (!missingF && !missingT1 && !missingT2) {
            boxes.push(
              <EBox
                key={`${idx}-complete`}
                id={`${idx}-complete`}
                title={<QPlain i={idx} />}
                value={1}
                steps={[
                  <>
                    <StepLabel>Complete observation</StepLabel>
                    All variables are known; the weight is exactly 1.
                  </>,
                ]}
              />
            );
          }

          return (
            <section key={i} className="space-y-3">
              <div className="text-xs text-gray-500">row {idx}</div>
              <div className="space-y-3">{boxes}</div>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}

/** ───────────────── M-step panel (ongewijzigde inhoud, maar we gebruiken elders flash) ───────────────── */
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

    return { theta_f, theta_t1_f1, theta_t1_f0, theta_t2_f1, theta_t2_f0 };
  };

  const m = calc();

  // Box UI
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
    const coloredNum = selected ? (
      <span className="text-sky-700 font-semibold">{num}</span>
    ) : (
      num
    );
    const coloredDen = selected ? (
      <span className="text-green-700 font-semibold">{den}</span>
    ) : (
      den
    );

    return (
      <div
        className={`border-2 p-4 rounded bg-white cursor-pointer transition-all ${
          selected
            ? "border-sky-400 bg-sky-50 shadow"
            : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => onParameterSelect(selected ? null : id)}
      >
        {/* alles op één regel */}
        <div className="font-mono text-lg flex flex-wrap items-center gap-2">
          {title}
          <span>=</span>
          <Frac num={coloredNum} den={coloredDen} className="align-middle" />
          <span className="font-bold">= {value.toFixed(3)}</span>
        </div>
      </div>
    );
  };

  const display = currentStep === "m-completed" ? m : params;

  return (
    <Card>
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

/** ───────────────── Detailkaart (ongewijzigd) ───────────────── */
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
  const fmt = (x: number, d = 3) => x.toFixed(d);

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
                </div>
              </section>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

/** ───────────────── Main ───────────────── */
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
  const [prevExpectations, setPrevExpectations] = useState<number[][]>([]);
  const [prevParams, setPrevParams] = useState<BayesianParams | null>(null);

  const [busy, setBusy] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedParameter, setSelectedParameter] = useState<string | null>(
    null
  );
  const [setSelectedQRow] = useState<number | null>(null);

  // flash flags
  const [eTick, setETick] = useState(0);
  const [mTick, setMTick] = useState(0);

  const flashE = useFlashTick(eTick, 1900);
  const flashM = useFlashTick(mTick, 1900);

  const runEStep = () => {
    setBusy(true);
    setPrevExpectations(expectations);

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

    setETick((t) => t + 1);
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

    // bewaar vorige params voor highlight
    setPrevParams(params);

    setParams({
      theta_f: new_theta_f,
      theta_t1_f1: new_theta_t1_f1,
      theta_t1_f0: new_theta_t1_f0,
      theta_t2_f1: new_theta_t2_f1,
      theta_t2_f0: new_theta_t2_f0,
    });
    setPrevParams(params);
    setIteration((v) => v + 1);
    setCurrentStep("m-completed");
    setBusy(false);

    setMTick((t) => t + 1);
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
    setPrevExpectations([]);
    setPrevParams(null);
    setCurrentStep("ready");
    setBusy(false);
    setSelectedRow(null);
    setSelectedParameter(null);
  };

  const canRunE =
    !busy && (currentStep === "ready" || currentStep === "m-completed");
  const canRunM = !busy && currentStep === "e-completed";

  // helper om badge met flash te renderen
  // BOVEN in de main component (bij de andere helpers)
  const ParamBadge = ({
    value,
    prev,
    step,
  }: {
    value: number;
    prev?: number;
    step: "ready" | "e-completed" | "m-completed";
  }) => {
    const isChanged = typeof prev === "number" && changed(value, prev);

    // Pulse θ’s alleen direct na M-step
    const shouldPulse = step === "m-completed" && flashM && isChanged;

    return (
      <Badge
        variant="outline"
        className={`text-[15px] px-3 py-1.5 transition-all ${
          shouldPulse ? "em-flash-param" : ""
        }`}
      >
        {value.toFixed(3)}
      </Badge>
    );
  };
  const [qOpen, setQOpen] = React.useState(false);
  const [mOpen, setMOpen] = React.useState(false);
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
      <style jsx global>{`
        @keyframes em-flash-weight {
          0%,
          100% {
            background-color: transparent;
            box-shadow: 0 0 0 0 rgba(251, 191, 36, 0);
          }
          50% {
            background-color: rgba(254, 243, 199, 1);
            box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.55);
          }
        }
        .em-flash-weight {
          animation: em-flash-weight 0.6s ease-in-out 1;
          border-radius: 0.25rem;
        }

        @keyframes em-flash-param {
          0%,
          100% {
            background-color: transparent;
            box-shadow: 0 0 0 0 rgba(132, 204, 22, 0);
          }
          50% {
            background-color: rgba(236, 252, 203, 1);
            box-shadow: 0 0 0 3px rgba(132, 204, 22, 0.55);
          }
        }
        .em-flash-param {
          animation: em-flash-param 0.6s ease-in-out 1;
          border-radius: 0.375rem;
        }

        td.em-num-left,
        td.em-num-right,
        td.em-num-single {
          position: relative;
        }

        td.em-num-left {
          border-top: 2px solid #0284c7 !important;
          border-bottom: 2px solid #0284c7 !important;
          border-left: 2px solid #0284c7 !important;
          /* géén right border -> naadloos met .em-num-right */
        }
        td.em-num-right {
          border-top: 2px solid #0284c7 !important;
          border-bottom: 2px solid #0284c7 !important;
          border-right: 2px solid #0284c7 !important;
          /* géén left border -> naadloos met .em-num-left */
        }
        td.em-num-single {
          border: 2px solid #0284c7 !important; /* θ_f teller (enkel f) */
        }
      `}</style>

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
              <div className="space-y-3 text-[15px]">
                <div className="flex justify-between">
                  <span>
                    {" "}
                    P(F=1) = θ<sub>F</sub>{" "}
                  </span>
                  <ParamBadge
                    value={params.theta_f}
                    prev={prevParams?.theta_f}
                    step={currentStep}
                  />
                </div>
                <div className="flex justify-between">
                  <span>
                    {" "}
                    P(T₁=1|F=1) = θ<sub>t11</sub>{" "}
                  </span>
                  <ParamBadge
                    value={params.theta_t1_f1}
                    prev={prevParams?.theta_t1_f1}
                    step={currentStep}
                  />
                </div>
                <div className="flex justify-between">
                  <span>
                    {" "}
                    P(T₁=1|F=0) = θ<sub>t10</sub>{" "}
                  </span>
                  <ParamBadge
                    value={params.theta_t1_f0}
                    prev={prevParams?.theta_t1_f0}
                    step={currentStep}
                  />
                </div>
                <div className="flex justify-between">
                  <span>
                    {" "}
                    P(T₂=1|F=1) = θ<sub>t21</sub>{" "}
                  </span>
                  <ParamBadge
                    value={params.theta_t2_f1}
                    prev={prevParams?.theta_t2_f1}
                    step={currentStep}
                  />
                </div>
                <div className="flex justify-between">
                  <span>
                    {" "}
                    P(T₂=1|F=0) = θ<sub>t20</sub>{" "}
                  </span>
                  <ParamBadge
                    value={params.theta_t2_f0}
                    prev={prevParams?.theta_t2_f0}
                    step={currentStep}
                  />
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
            prevExpectations={prevExpectations}
            flashE={flashE}
            flashEpoch={eTick}
            currentStep={currentStep}
            selectedParameter={selectedParameter}
          />
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <CollapsibleSection
          title="Q-functions (E-step)"
          isOpen={qOpen}
          onToggle={() => setQOpen((v) => !v)}
          className="self-start"
        >
          <QFunctionsPanel
            data={data}
            params={params}
            expectations={expectations}
            currentStep={currentStep}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="θ-updates (M-step)"
          isOpen={mOpen}
          onToggle={() => setMOpen((v) => !v)}
          className="self-start"
        >
          <MStepPanel
            currentStep={currentStep}
            params={params}
            data={data}
            expectations={expectations}
            selectedParameter={selectedParameter}
            onParameterSelect={setSelectedParameter}
          />
        </CollapsibleSection>
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
