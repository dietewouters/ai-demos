"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
      {
        name: "Negated Assumption",
        formula: "¬∃x green(x) ↔ ∀x ¬green(x)",
        description: "Negated existential equivalent to universal negation",
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
      reset();
    }
  };

  const reset = () => {
    setSteps([]);
    setCurrentStep(0);
    setCompleted(false);
  };

  const convertToINF = () => {
    const newSteps: INFStep[] = [];
    let currentFormula = inputFormula.trim();
    let stepCount = 0;

    // Step 1: Original formula
    newSteps.push({
      step: stepCount++,
      formula: currentFormula,
      rule: "Original Formula",
      description: "Starting with the given first-order logic formula",
    });

    // Rule Example: male(y) ← pol(x) ∧ poor(x) ∧ pol(y)
    if (currentFormula.includes("male(y) ← pol(x) ∧ poor(x) ∧ pol(y)")) {
      currentFormula = "(∃x pol(x) ∧ poor(x)) → (∀y pol(y) → male(y))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Convert Rule to Implication",
        description: "Transform rule A ← B into logical implication form",
      });

      // Eliminate inner implication first
      currentFormula = "(∃x pol(x) ∧ poor(x)) → (∀y ¬pol(y) ∨ male(y))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Eliminate Inner Implication",
        description:
          "Replace inner implication pol(y) → male(y) with ¬pol(y) ∨ male(y)",
      });

      // Then eliminate outer implication
      currentFormula = "¬(∃x pol(x) ∧ poor(x)) ∨ (∀y ¬pol(y) ∨ male(y))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Eliminate Outer Implication",
        description: "Replace outer implication A → B with ¬A ∨ B",
      });

      // Move negations inward
      currentFormula = "∀x ∀y ¬pol(x) ∨ ¬poor(x) ∨ ¬pol(y) ∨ male(y)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Move Negations Inward",
        description: "Convert ¬∃x to ∀x¬ and distribute negations",
      });

      // Factor terms
      currentFormula = "∀x ∀y ¬(pol(x) ∧ poor(x) ∧ pol(y)) ∨ male(y)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Factor Terms",
        description: "Apply De Morgan's law in reverse to factor terms",
      });

      // Convert to implicative normal form
      currentFormula = "∀x ∀y pol(x) ∧ poor(x) ∧ pol(y) → male(y)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Implicative Normal Form",
        description:
          "Convert ¬A ∨ B to A → B to get final implicative normal form",
      });
    }
    // Complex Example: ∀x (pol(x) ∧ (∃y fr(y,x))) → poor(x) ∧ fem(x)
    else if (
      currentFormula.includes("∀x (pol(x) ∧ (∃y fr(y,x))) → poor(x) ∧ fem(x)")
    ) {
      // Eliminate implication
      currentFormula = "∀x ¬(pol(x) ∧ (∃y fr(y,x))) ∨ (poor(x) ∧ fem(x))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Eliminate Implications",
        description: "Replace A → B with ¬A ∨ B",
      });

      // Apply De Morgan's law
      currentFormula = "∀x ¬pol(x) ∨ ¬(∃y fr(y,x)) ∨ (poor(x) ∧ fem(x))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "De Morgan's Laws",
        description: "Apply ¬(A ∧ B) → ¬A ∨ ¬B",
      });

      // Move negations inward for existential quantifier
      currentFormula = "∀x ∀y ¬pol(x) ∨ ¬fr(y,x) ∨ (poor(x) ∧ fem(x))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Move Negations Inward",
        description: "Convert ¬∃y to ∀y¬",
      });

      // Distribute disjunction over conjunction
      currentFormula =
        "∀x ∀y (¬pol(x) ∨ ¬fr(y,x) ∨ poor(x)) ∧ (¬pol(x) ∨ ¬fr(y,x) ∨ fem(x))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Distribute Disjunction",
        description: "Distribute ∨ over ∧: A ∨ (B ∧ C) → (A ∨ B) ∧ (A ∨ C)",
      });

      // Factor terms using De Morgan's in reverse
      currentFormula =
        "∀x ∀y (¬(pol(x) ∧ fr(y,x)) ∨ poor(x)) ∧ (¬(pol(x) ∧ fr(y,x)) ∨ fem(x))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Factor Terms",
        description: "Apply De Morgan's law in reverse: ¬A ∨ ¬B → ¬(A ∧ B)",
      });

      // Convert to implicative normal form
      currentFormula =
        "∀x ∀y (pol(x) ∧ fr(y,x) → poor(x)) ∧ (pol(x) ∧ fr(y,x) → fem(x))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Implicative Normal Form",
        description:
          "Convert ¬A ∨ B to A → B to get final implicative normal form",
      });
    }
    // Negated Existential Example: ∀x lazy(x) → (¬(∃y fr(y,x)))
    else if (currentFormula.includes("∀x lazy(x) → (¬(∃y fr(y,x)))")) {
      // Eliminate implication
      currentFormula = "∀x ¬lazy(x) ∨ (¬(∃y fr(y,x)))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Eliminate Implications",
        description: "Replace A → B with ¬A ∨ B",
      });

      // Move negations inward for existential quantifier
      currentFormula = "∀x ¬lazy(x) ∨ (∀y ¬fr(y,x))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Move Negations Inward",
        description: "Convert ¬∃y to ∀y¬",
      });

      // Merge quantifiers
      currentFormula = "∀x ∀y ¬lazy(x) ∨ ¬fr(y,x)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Merge Quantifiers",
        description: "Combine universal quantifiers",
      });

      // Factor terms using De Morgan's in reverse
      currentFormula = "∀x ∀y ¬(lazy(x) ∧ fr(y,x))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Factor Terms",
        description: "Apply De Morgan's law in reverse: ¬A ∨ ¬B → ¬(A ∧ B)",
      });

      // Convert to implicative normal form
      currentFormula = "∀x ∀y lazy(x) ∧ fr(y,x) → false";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Implicative Normal Form",
        description:
          "Convert ¬A to A → false to get final implicative normal form",
      });
    }
    // Male Female Conjunction Example: ∀x (male(x) ∨ fem(x)) ∧ (¬(male(x) ∧ fem(x)))
    else if (
      currentFormula.includes("∀x (male(x) ∨ fem(x)) ∧ (¬(male(x) ∧ fem(x)))")
    ) {
      // Convert negated conjunction to implicative form
      currentFormula = "∀x (male(x) ∨ fem(x)) ∧ (male(x) ∧ fem(x) → false)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Convert Negated Conjunction",
        description: "Replace ¬(A ∧ B) with (A ∧ B) → false",
      });
    }
    // Steam Hightech Example: ∀x (steam(x) → ¬likes(x,Hightech))
    else if (currentFormula.includes("∀x (steam(x) → ¬likes(x,Hightech))")) {
      // Eliminate implication
      currentFormula = "∀x (¬steam(x) ∨ ¬likes(x,Hightech))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Eliminate Implications",
        description: "Replace A → B with ¬A ∨ B",
      });

      // Convert to contradiction form
      currentFormula = "∀x false ← likes(x,Hightech) ∧ steam(x)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Implicative Normal Form",
        description: "Convert ¬A ∨ ¬B to false ← A ∧ B (contradiction)",
      });
    }
    // Trainlv Disjunction Example: ∀x (trainlv(x) → steam(x) ∨ elec(x))
    else if (currentFormula.includes("∀x (trainlv(x) → steam(x) ∨ elec(x))")) {
      // Eliminate implication
      currentFormula = "∀x (¬trainlv(x) ∨ (steam(x) ∨ elec(x)))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Eliminate Implications",
        description: "Replace A → B with ¬A ∨ B",
      });

      // Convert to rule form
      currentFormula = "∀x steam(x) ∨ elec(x) ← trainlv(x)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Implicative Normal Form",
        description:
          "Convert ¬A ∨ B to B ← A to get final implicative normal form",
      });
    }
    // Simple Implication Example: ¬lazy(Joel) → pol(Joel)
    else if (currentFormula.includes("¬lazy(Joel) → pol(Joel)")) {
      // Eliminate implication (special case for negated antecedent)
      currentFormula = "lazy(Joel) ∨ pol(Joel)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Eliminate Implications",
        description: "Replace ¬A → B with A ∨ B",
      });
    }
    // Nested Implication Example: (∃x pol(x) ∧ poor(x)) → (∀y pol(y) → male(y))
    else if (
      currentFormula.includes("(∃x pol(x) ∧ poor(x)) → (∀y pol(y) → male(y))")
    ) {
      // First eliminate the inner implication: pol(y) → male(y) becomes ¬pol(y) ∨ male(y)
      currentFormula = "(∃x pol(x) ∧ poor(x)) → (∀y ¬pol(y) ∨ male(y))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Eliminate Inner Implication",
        description:
          "Replace inner implication pol(y) → male(y) with ¬pol(y) ∨ male(y)",
      });

      // Then eliminate the outer implication
      currentFormula = "¬(∃x pol(x) ∧ poor(x)) ∨ (∀y ¬pol(y) ∨ male(y))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Eliminate Outer Implication",
        description: "Replace outer implication A → B with ¬A ∨ B",
      });

      // Move negations inward
      currentFormula = "∀x ∀y ¬pol(x) ∨ ¬poor(x) ∨ ¬pol(y) ∨ male(y)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Move Negations Inward",
        description: "Convert ¬∃x to ∀x¬ and distribute negations",
      });

      // Factor terms
      currentFormula = "∀x ∀y ¬(pol(x) ∧ poor(x) ∧ pol(y)) ∨ male(y)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Factor Terms",
        description: "Apply De Morgan's law in reverse to factor terms",
      });

      // Convert to implicative normal form
      currentFormula = "∀x ∀y pol(x) ∧ poor(x) ∧ pol(y) → male(y)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Implicative Normal Form",
        description:
          "Convert ¬A ∨ B to A → B to get final implicative normal form",
      });
    }
    // Ann Tom Conflict Example: ∀x (likes(Ann,x) → ¬likes(Tom,x))
    else if (currentFormula.includes("∀x (likes(Ann,x) → ¬likes(Tom,x))")) {
      // Eliminate implication
      currentFormula = "∀x (¬likes(Ann,x) ∨ ¬likes(Tom,x))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Eliminate Implications",
        description: "Replace A → B with ¬A ∨ B",
      });

      // Convert to contradiction form
      currentFormula = "∀x false ← likes(Ann,x) ∧ likes(Tom,x)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Implicative Normal Form",
        description: "Convert ¬A ∨ ¬B to false ← A ∧ B (contradiction)",
      });
    }
    // Steam Electric Disjunction Example: ∀x (¬steam(x) ∨ elec(x))
    else if (currentFormula.includes("∀x (¬steam(x) ∨ elec(x))")) {
      // Convert to rule form directly
      currentFormula = "∀x elec(x) ← steam(x)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Implicative Normal Form",
        description:
          "Convert ¬A ∨ B to B ← A to get final implicative normal form",
      });
    }
    // Electric Likes Example: ∀x (elec(x) → likes(x,Speed))
    else if (currentFormula.includes("∀x (elec(x) → likes(x,Speed))")) {
      // Eliminate implication
      currentFormula = "∀x (¬elec(x) ∨ likes(x,Speed))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Eliminate Implications",
        description: "Replace A → B with ¬A ∨ B",
      });

      // Convert to rule form
      currentFormula = "∀x likes(x,Speed) ← elec(x)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Implicative Normal Form",
        description:
          "Convert ¬A ∨ B to B ← A to get final implicative normal form",
      });
    }
    // Simple Predicate Disjunction: ∀x p(x) ∨ ¬r(f(x))
    else if (currentFormula.includes("∀x p(x) ∨ ¬r(f(x))")) {
      // Convert to rule form directly
      currentFormula = "∀x p(x) ← r(f(x))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Implicative Normal Form",
        description:
          "Convert ¬A ∨ B to B ← A to get final implicative normal form",
      });
    }
    // Complex Function Disjunction: ∀x ∀y r(f(x)) ∨ r(f(f(y)))
    else if (currentFormula.includes("∀x ∀y r(f(x)) ∨ r(f(f(y)))")) {
      // Convert to rule form with true as antecedent
      currentFormula = "∀x ∀y r(f(x)) ∨ r(f(f(y))) ← true";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Implicative Normal Form",
        description:
          "Convert disjunction A ∨ B to A ∨ B ← true (always true antecedent)",
      });
    }
    // Nested Universal Implications: (∀x mov(x) → blue(x)) → (∀y ¬mov(y) → green(y))
    else if (
      currentFormula.includes("(∀x mov(x) → blue(x)) → (∀y ¬mov(y) → green(y))")
    ) {
      // Eliminate inner implications first
      currentFormula = "¬(∀x ¬mov(x) ∨ blue(x)) ∨ (∀y mov(y) ∨ green(y))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Eliminate Implications",
        description:
          "Replace A → B with ¬A ∨ B for both inner and outer implications",
      });

      // Move negations inward and apply De Morgan's laws
      currentFormula = "∀y (∃x mov(x) ∧ ¬blue(x)) ∨ mov(y) ∨ green(y)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Move Negations Inward",
        description:
          "Apply De Morgan's laws: ¬(∀x A ∨ B) becomes ∃x ¬A ∧ ¬B, then ¬¬mov(y) becomes mov(y)",
      });

      // Skolemization: replace ∃x with constant A
      currentFormula = "∀y (mov(A) ∧ ¬blue(A)) ∨ mov(y) ∨ green(y)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Skolemization",
        description: "Replace existential quantifier ∃x with Skolem constant A",
      });

      // Distribute conjunction over disjunction
      currentFormula =
        "∀y (mov(A) ∨ mov(y) ∨ green(y)) ∧ (¬blue(A) ∨ mov(y) ∨ green(y))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Distribute Conjunction",
        description: "Distribute (A ∧ B) ∨ C to (A ∨ C) ∧ (B ∨ C)",
      });

      // Convert to implicative normal form
      currentFormula =
        "(mov(A) ∨ mov(y) ∨ green(y) ← true)\n(mov(y) ∨ green(y) ← blue(A))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Implicative Normal Form",
        description:
          "Convert disjunctions to implicative form: A ∨ B ∨ C ← true and ¬D ∨ B ∨ C becomes B ∨ C ← D",
      });
    }
    // Existential to Universal: (∃x ¬mov(x)) → (∀y mov(y) → blue(y))
    else if (currentFormula.includes("(∃x ¬mov(x)) → (∀y mov(y) → blue(y))")) {
      // Eliminate inner implication first
      currentFormula = "(∃x ¬mov(x)) → (∀y ¬mov(y) ∨ blue(y))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Eliminate Inner Implication",
        description:
          "Replace inner implication mov(y) → blue(y) with ¬mov(y) ∨ blue(y)",
      });

      // Eliminate outer implication
      currentFormula = "¬(∃x ¬mov(x)) ∨ (∀y ¬mov(y) ∨ blue(y))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Eliminate Outer Implication",
        description: "Replace outer implication A → B with ¬A ∨ B",
      });

      // Move negations inward
      currentFormula = "(∀x mov(x)) ∨ (∀y ¬mov(y) ∨ blue(y))";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Move Negations Inward",
        description: "Convert ¬∃x to ∀x¬ and simplify double negation",
      });

      // Merge quantifiers and convert to implicative form
      currentFormula = "∀x ∀y mov(x) ∨ ¬mov(y) ∨ blue(y)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Merge Quantifiers",
        description: "Combine universal quantifiers over disjunction",
      });

      // Final implicative normal form
      currentFormula = "∀x ∀y mov(x) ∨ blue(y) ← mov(y)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Implicative Normal Form",
        description:
          "Convert ¬A ∨ B ∨ C to B ∨ C ← A for final implicative form",
      });
    }
    // Simple Negated Fact: ¬mov(D)
    else if (currentFormula.includes("¬mov(D)")) {
      // Convert to implicative form with false
      currentFormula = "false ← mov(D)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Implicative Normal Form",
        description: "Convert ¬A to false ← A (contradiction form)",
      });
    }
    // Negated Assumption: ¬∃x green(x) ↔ ∀x ¬green(x)
    else if (currentFormula.includes("¬∃x green(x) ↔ ∀x ¬green(x)")) {
      // Show equivalence transformation
      currentFormula = "∀x ¬green(x)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Quantifier Equivalence",
        description: "Apply equivalence: ¬∃x A ↔ ∀x ¬A",
      });

      // Convert to implicative form with contradiction
      currentFormula = "∀x false ← green(x)";
      newSteps.push({
        step: stepCount++,
        formula: currentFormula,
        rule: "Implicative Normal Form",
        description: "Convert ¬A to false ← A (contradiction form)",
      });
    }
    // General case with improved regex patterns
    else {
      let changed = true;
      const maxIterations = 10;
      let iterations = 0;

      while (changed && iterations < maxIterations) {
        const beforeTransform = currentFormula;
        iterations++;

        // Double negation elimination: ¬¬A → A
        if (currentFormula.includes("¬(¬")) {
          currentFormula = currentFormula.replace(/¬$$¬([^)]+)$$/g, "$1");
          if (currentFormula !== beforeTransform) {
            newSteps.push({
              step: stepCount++,
              formula: currentFormula,
              rule: "Double Negation Elimination",
              description: "Apply ¬¬A → A to eliminate double negations",
            });
            continue;
          }
        }

        // Special case: ¬A → B becomes A ∨ B
        if (currentFormula.match(/¬([^→\s]+(?:$$[^)]*$$)?)\s*→/)) {
          currentFormula = currentFormula.replace(
            /¬([^→\s]+(?:$$[^)]*$$)?)\s*→\s*([^→]+)/g,
            "$1 ∨ $2"
          );
          if (currentFormula !== beforeTransform) {
            newSteps.push({
              step: stepCount++,
              formula: currentFormula,
              rule: "Eliminate Negated Implication",
              description: "Replace ¬A → B with A ∨ B",
            });
            continue;
          }
        }

        // General implication elimination: A → B becomes ¬A ∨ B
        if (currentFormula.includes("→")) {
          currentFormula = currentFormula.replace(
            /([^→]+?)\s*→\s*([^→]+)/g,
            "¬($1) ∨ ($2)"
          );
          if (currentFormula !== beforeTransform) {
            newSteps.push({
              step: stepCount++,
              formula: currentFormula,
              rule: "Eliminate Implications",
              description: "Replace A → B with ¬A ∨ B",
            });
            continue;
          }
        }

        changed = currentFormula !== beforeTransform;
      }
    }

    setSteps(newSteps);
    setCompleted(true);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const selectedExerciseData = exercises.find(
    (ex) => ex.id === selectedExercise
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select Exercise and Formula</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="exercise-select">Choose Exercise</Label>
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
          </div>

          <div>
            <Label htmlFor="formula-select">Choose Formula</Label>
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
          </div>
        </div>

        {inputFormula && (
          <div>
            <Label>Selected Formula</Label>
            <div className="mt-1 p-3 bg-gray-50 rounded border font-mono text-lg">
              {inputFormula}
            </div>
          </div>
        )}

        <div className="flex gap-2">
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
                    <code className="text-lg font-mono">
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
                    <h4 className="font-medium text-green-800 mb-2">
                      Conversion Complete!
                    </h4>
                    <p className="text-sm text-green-700">
                      The formula is now in Implicative Normal Form and ready
                      for resolution-based theorem proving.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* <Card className="mt-6">
        <CardHeader>
          <CardTitle>Implicative Normal Form Algorithm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              {" "}
              <strong>1. Eliminate → and ↔:</strong> Replace <em>A → B</em> with{" "}
              <em>¬A ∨ B</em>, and <em>A ↔ B</em> with{" "}
              <em>(A → B) ∧ (B → A)</em>.{" "}
            </div>{" "}
            <div>
              {" "}
              <strong>2. Move Negations Inward (NNF):</strong> Push ¬ down to
              atoms using De&nbsp;Morgan and quantifier rules:{" "}
              <em>¬(A ∧ B) → (¬A ∨ ¬B)</em>, <em>¬(A ∨ B) → (¬A ∧ ¬B)</em>,{" "}
              <em>¬∀x&nbsp;φ → ∃x&nbsp;¬φ</em>, <em>¬∃x&nbsp;φ → ∀x&nbsp;¬φ</em>
              .{" "}
            </div>{" "}
            <div>
              {" "}
              <strong>3. Standardize &amp; Prenex:</strong> Rename bound
              variables to be distinct, then move all quantifiers to the front
              (prenex form).{" "}
            </div>{" "}
            <div>
              {" "}
              <strong>4. Skolemize:</strong> Eliminate each ∃ by a Skolem
              function of the surrounding ∀-variables (or a constant if none),
              then drop the remaining ∀ (implicit universal closure).{" "}
            </div>{" "}
            <div>
              {" "}
              <strong>5. Convert to CNF:</strong> Distribute <em>∨</em> over{" "}
              <em>∧</em> to get a conjunction of clauses.{" "}
            </div>{" "}
            <div>
              {" "}
              <strong>6. Convert CNF clauses to INF:</strong> For each clause{" "}
              <em>
                L₁ ∨ ⋯ ∨ L<sub>k</sub>
              </em>
              :{" "}
            </div>
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
}
