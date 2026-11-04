export type RecoveryAction = "restore" | "signed-out" | "wipe-orphan";

export function tokenRecoveryAction(
  hasKey: boolean,
  hasStore: boolean,
): RecoveryAction {
  if (hasKey) return "restore";
  return hasStore ? "wipe-orphan" : "signed-out";
}
