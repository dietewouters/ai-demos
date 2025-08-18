"use client";

import type { DPLLStep } from "@/components/solvers/lib/dpll-types";
import { formatFormula } from "@/components/solvers/lib/formula-parser";

export function TreeNode({
  step,
  isActive,
  onClick,
}: {
  step: DPLLStep;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const status =
    step.result === "SAT"
      ? "bg-green-50 border-green-500"
      : step.result === "UNSAT"
      ? "bg-red-50 border-red-500"
      : "bg-white border-gray-300";

  const ring = isActive ? "ring-2 ring-blue-400" : "";

  return (
    <div
      onClick={onClick}
      className={`rounded-xl px-4 py-2 border shadow-sm ${status} ${ring}`}
    >
      <div className="text-sm font-mono text-center">
        {"{"}
        {formatFormula(step.formula).replace(/ ∧ /g, "; ")}
        {"}"}
      </div>
      {typeof step.modelCount === "number" && (
        <div className="text-[11px] mt-1 text-center text-purple-700">
          {step.modelCount} models
        </div>
      )}
    </div>
  );
}
