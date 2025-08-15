import type { DPLLTree } from "./dpll-types";

export function getStepTraversalOrder(tree: DPLLTree): string[] {
  const order: string[] = [];
  const visited = new Set<string>();

  // Depth-first traversal to create logical step order
  function traverse(stepId: string) {
    if (visited.has(stepId)) return;

    visited.add(stepId);
    order.push(stepId);

    const step = tree.steps.get(stepId);
    if (step) {
      // Traverse children in order
      for (const childId of step.children) {
        traverse(childId);
      }
    }
  }

  traverse(tree.rootId);
  return order;
}

export function getNextStepId(
  tree: DPLLTree,
  currentStepId: string
): string | null {
  const order = getStepTraversalOrder(tree);
  const currentIndex = order.indexOf(currentStepId);

  if (currentIndex === -1 || currentIndex === order.length - 1) {
    return null; // No next step
  }

  return order[currentIndex + 1];
}

export function getPreviousStepId(
  tree: DPLLTree,
  currentStepId: string
): string | null {
  const order = getStepTraversalOrder(tree);
  const currentIndex = order.indexOf(currentStepId);

  if (currentIndex <= 0) {
    return null; // No previous step
  }

  return order[currentIndex - 1];
}

export function getStepPosition(
  tree: DPLLTree,
  currentStepId: string
): { current: number; total: number } {
  const order = getStepTraversalOrder(tree);
  const currentIndex = order.indexOf(currentStepId);

  return {
    current: currentIndex + 1,
    total: order.length,
  };
}
