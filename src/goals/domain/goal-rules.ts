/** Pure domain rule, also useful to check imported goal hierarchies later. */
export function createsGoalCycle(
  goalId: string,
  nextParentId: string | null,
  parentByGoalId: ReadonlyMap<string, string | null>,
): boolean {
  const visited = new Set<string>([goalId]);
  let current = nextParentId;
  while (current !== null) {
    if (visited.has(current)) return true;
    visited.add(current);
    current = parentByGoalId.get(current) ?? null;
  }
  return false;
}
