import type { StudioPatch } from "./protocol.js";

export function applyStudioPatch(nodeId: string, patch: StudioPatch): boolean {
  const element = document.querySelector(`[data-studio-id="${nodeId}"]`);
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (patch.className !== undefined) {
    element.className = patch.className;
  }
  if (patch.tag !== undefined) {
    element.dataset.studioTag = patch.tag;
  }
  if (patch.text !== undefined) {
    element.textContent = patch.text;
  }
  if (patch.attributes) {
    for (const [key, value] of Object.entries(patch.attributes)) {
      element.setAttribute(key, value);
    }
  }
  return true;
}
