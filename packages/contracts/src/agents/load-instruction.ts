import { INSTRUCTION_BODIES } from "./instruction-bodies.js";

export function loadAgentInstruction(filename: string): string {
  const body = INSTRUCTION_BODIES[filename];
  if (!body) {
    throw new Error(`Missing agent instruction body for ${filename}`);
  }
  return body;
}
