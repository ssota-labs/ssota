export function StudioInspectStyle() {
  return (
    <style id="studio-inspect-overrides">{`
.studio-inspect-mode [data-studio-id]:hover:not([data-studio-selected="true"]) {
  box-shadow: inset 0 0 0 9999px color-mix(in oklab, var(--primary) 8%, transparent);
}
.studio-inspect-mode [data-studio-id][data-studio-selected="true"] {
  box-shadow: inset 0 0 0 9999px color-mix(in oklab, var(--primary) 16%, transparent);
}
`}</style>
  );
}
