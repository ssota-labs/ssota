/**
 * Landing read-only previews: hand-tool pan (drag + trackpad scroll), no zoom,
 * no selection. Wheel events stay on the canvas so the page does not scroll.
 */
export function getFlowInteractionProps(
  interactionLocked: boolean,
  zoomPanLocked: boolean,
) {
  if (interactionLocked) {
    return {
      panOnDrag: true,
      panOnScroll: true,
      zoomOnScroll: false,
      zoomOnPinch: false,
      zoomOnDoubleClick: false,
      preventScrolling: true,
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
