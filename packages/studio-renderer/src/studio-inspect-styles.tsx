export function StudioInspectStyle() {
  return (
    <style id="studio-inspect-overrides">{`
.studio-inspect-mode [data-studio-id]:hover {
  outline: 1px dashed #60a5fa;
  outline-offset: 2px;
}
.studio-inspect-mode [data-studio-id][data-studio-selected="true"] {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
`}</style>
  );
}
