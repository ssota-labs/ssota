/**
 * Landing read-only previews: hand-tool pan on drag only (no trackpad pan/zoom),
 * no selection. Trackpad/wheel scroll passes through so the page can scroll.
 */
export function getFlowInteractionProps(
  interactionLocked: boolean,
  zoomPanLocked: boolean,
) {
  if (interactionLocked) {
    return {
      panOnDrag: true,
      panOnScroll: false,
      zoomOnScroll: false,
      zoomOnPinch: false,
      zoomOnDoubleClick: false,
      preventScrolling: false,
      selectionOnDrag: false,
      elementsSelectable: false,
    };
  }

  return {
    panOnDrag: !zoomPanLocked,
    panOnScroll: false,
    zoomOnScroll: !zoomPanLocked,
    zoomOnPinch: !zoomPanLocked,
    zoomOnDoubleClick: !zoomPanLocked,
    preventScrolling: !zoomPanLocked,
    selectionOnDrag: false,
    elementsSelectable: true,
  };
}

export const FLOW_HAND_PAN_STYLES = `
.ssota-flow--hand-pan .react-flow__pane { cursor: grab; }
.ssota-flow--hand-pan .react-flow__pane:active { cursor: grabbing; }
.ssota-erd--hand-pan .react-flow__pane { cursor: grab; }
.ssota-erd--hand-pan .react-flow__pane:active { cursor: grabbing; }
`;
