"use client";

import type { DPLLStep } from "@/components/solvers/lib/dpll-types";

interface TreeNodeProps {
  step: DPLLStep;
  isActive?: boolean;
  onClick?: () => void;
}

export function TreeNode({ step, isActive = false, onClick }: TreeNodeProps) {
  const getNodeStyle = () => {
    if (step.result === "SAT") {
      return "border-green-500 bg-green-50";
    } else if (step.result === "UNSAT") {
      return "border-red-500 bg-red-50";
    } else if (isActive) {
      return "border-blue-500 bg-blue-50 ring-2 ring-blue-200";
    }
    return "border-gray-300 bg-white";
  };

  const displayFormula = () => {
    if (step.formula.clauses.length === 0) {
      return step.result === "SAT" ? "{}" : "{□}";
    }

    const clauses = step.formula.clauses.map((clause) => {
      if (clause.literals.length === 0) return "□";
      return clause.literals
        .map((lit) => (lit.negated ? "¬" : "") + lit.variable)
        .join(" ∨ ");
    });

    return `{${clauses.join("; ")}}`;
  };

  return (
    <div
      className={`
        px-4 py-2 border-2 rounded-lg cursor-pointer transition-all duration-200
        hover:shadow-md min-w-[120px] text-center
        ${getNodeStyle()}
      `}
      onClick={onClick}
    >
      <div className="font-mono text-sm">{displayFormula()}</div>
      {step.modelCount !== undefined && (
        <div className="text-xs text-purple-600 mt-1">
          {step.modelCount} models
        </div>
      )}
    </div>
  );
}
