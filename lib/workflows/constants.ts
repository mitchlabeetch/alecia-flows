export const CURRENT_WORKFLOW_NAME = "~~__CURRENT__~~";

export function isInternalWorkflowName(name: string): boolean {
  return name === CURRENT_WORKFLOW_NAME;
}
