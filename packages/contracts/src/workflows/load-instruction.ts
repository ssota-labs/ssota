import { INSTRUCTION_BODIES } from "./instruction-bodies.js";

export function loadWorkflowInstruction(filename: string): string {
  const body = INSTRUCTION_BODIES[filename];
  if (!body) {
    throw new Error(`Missing workflow instruction body for ${filename}`);
  }
  return body;
}
