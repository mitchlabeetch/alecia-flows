/**
 * Sentinel name reserved for the internal auto-save workflow.
 * Keep this centralized so internal workflow records stay hidden from user-facing UI.
 */
export const AUTOSAVE_WORKFLOW_SENTINEL = "~~__CURRENT__~~";

/**
 * Legacy sentinel names kept for backward compatibility with older records.
 * New writes should always normalize to AUTOSAVE_WORKFLOW_SENTINEL.
 */
export const LEGACY_AUTOSAVE_WORKFLOW_SENTINELS = ["__current__"] as const;

export const CURRENT_WORKFLOW_NAME = AUTOSAVE_WORKFLOW_SENTINEL;

export function isInternalWorkflowName(name: string): boolean {
  return (
    name === AUTOSAVE_WORKFLOW_SENTINEL ||
    LEGACY_AUTOSAVE_WORKFLOW_SENTINELS.includes(
      name as (typeof LEGACY_AUTOSAVE_WORKFLOW_SENTINELS)[number]
    )
  );
}
