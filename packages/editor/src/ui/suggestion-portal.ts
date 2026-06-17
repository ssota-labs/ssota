import { ReactRenderer } from "@tiptap/react";
import type { ComponentType } from "react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";

export function positionSuggestionMenu(
  element: HTMLElement,
  clientRect?: (() => DOMRect | null) | null,
) {
  const rect = clientRect?.();
  if (!rect) return;
  element.style.position = "fixed";
  element.style.left = `${rect.left}px`;
  element.style.top = `${rect.bottom + 8}px`;
  element.style.zIndex = "70";
}

type SuggestionPortalOptions<TItem, TComponentProps extends object> = {
  component: ComponentType<TComponentProps>;
  mapProps: (props: SuggestionProps<TItem>) => TComponentProps;
};

type PortalBundle = {
  component: ReactRenderer;
  root: HTMLElement;
};

export function createSuggestionPortal<
  TItem,
  TComponentProps extends object = object,
>(
  options: SuggestionPortalOptions<TItem, TComponentProps>,
) {
  let bundle: PortalBundle | null = null;

  function teardown() {
    bundle?.component.destroy();
    bundle?.root.remove();
    bundle = null;
  }

  return {
    onStart: (props: SuggestionProps<TItem>) => {
      if (typeof document === "undefined" || !document.body) return;

      teardown();

      const menuRoot = document.createElement("div");
      menuRoot.setAttribute("data-ssota-suggestion-root", "true");
      document.body.appendChild(menuRoot);

      const component = new ReactRenderer(options.component, {
        props: options.mapProps(props),
        editor: props.editor,
      });

      menuRoot.appendChild(component.element);
      bundle = { component, root: menuRoot };
      positionSuggestionMenu(menuRoot, props.clientRect);
    },
    onUpdate: (props: SuggestionProps<TItem>) => {
      bundle?.component.updateProps(options.mapProps(props));
      if (bundle?.root) {
        positionSuggestionMenu(bundle.root, props.clientRect);
      }
    },
    onKeyDown: (props: SuggestionKeyDownProps) => {
      if (props.event.key === "Escape") return false;
      const handle = bundle?.component.ref as {
        onKeyDown?: (p: SuggestionKeyDownProps) => boolean;
      } | null;
      return handle?.onKeyDown?.(props) ?? false;
    },
    onExit: () => {
      teardown();
    },
  };
}
