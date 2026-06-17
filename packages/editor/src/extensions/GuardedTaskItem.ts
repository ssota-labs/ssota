import TaskItem from "@tiptap/extension-task-item";

/** Tab/Shift-Tab은 SsotaEditor `handleKeyDown`에서 일괄 처리한다. */
export const GuardedTaskItem = TaskItem.extend({
  addKeyboardShortcuts() {
    const parent = this.parent?.() ?? {};
    const { Tab: _tab, "Shift-Tab": _shiftTab, ...rest } = parent;
    return rest;
  },
});
