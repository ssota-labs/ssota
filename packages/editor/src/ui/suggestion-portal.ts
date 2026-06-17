import { ReactRenderer } from "@tiptap/react";
import { flushSync } from "react-dom";
import type { ComponentType } from "react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";

export type SuggestionPortalInjectedProps = {
  suggestionSelectedIndex: number;
  onSuggestionSelectIndex: (index: number) => void;
};

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
  mapProps: (
    props: SuggestionProps<TItem>,
    menu: SuggestionPortalInjectedProps,
  ) => TComponentProps;
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
  let selectedIndex = 0;
  let lastSuggestionProps: SuggestionProps<TItem> | null = null;

  function menuProps(): SuggestionPortalInjectedProps {
    return {
      suggestionSelectedIndex: selectedIndex,
      onSuggestionSelectIndex: (index: number) => {
        selectedIndex = index;
        updateMenu();
      },
    };
  }

  function mappedProps(props: SuggestionProps<TItem>): TComponentProps {
    return options.mapProps(props, menuProps());
  }

  function syncSelectedDom() {
    if (!bundle?.root) return;
    const items = bundle.root.querySelectorAll('[data-slot="command-item"]');
    items.forEach((node, index) => {
      const selected = index === selectedIndex;
      if (selected) {
        node.setAttribute("data-selected", "true");
        node.setAttribute("aria-selected", "true");
      } else {
        node.removeAttribute("data-selected");
        node.setAttribute("aria-selected", "false");
      }
    });
  }

  function updateMenu() {
    if (!bundle || !lastSuggestionProps) return;
    const nextProps = mappedProps(lastSuggestionProps);
    flushSync(() => {
      bundle?.component.updateProps(nextProps);
    });
    syncSelectedDom();
  }

  function selectIndex(index: number) {
    const item = lastSuggestionProps?.items[index];
    if (item && lastSuggestionProps) {
      lastSuggestionProps.command(item);
    }
  }

  function setSelectedIndex(index: number) {
    selectedIndex = index;
    updateMenu();
  }

  function handleImperativeKeyDown(props: SuggestionKeyDownProps): boolean {
    if (!lastSuggestionProps) return false;
    const count = lastSuggestionProps.items.length;
    if (count === 0) return false;

    if (props.event.key === "ArrowUp") {
      setSelectedIndex(
        selectedIndex <= 0 ? count - 1 : selectedIndex - 1,
      );
      return true;
    }

    if (props.event.key === "ArrowDown") {
      setSelectedIndex(
        selectedIndex >= count - 1 ? 0 : selectedIndex + 1,
      );
      return true;
    }

    if (props.event.key === "Enter") {
      selectIndex(selectedIndex);
      return true;
    }

    return false;
  }

  function teardown() {
    bundle?.component.destroy();
    bundle?.root.remove();
    bundle = null;
  }

  return {
    onStart: (props: SuggestionProps<TItem>) => {
      if (typeof document === "undefined" || !document.body) return;

      teardown();

      selectedIndex = 0;
      lastSuggestionProps = props;

      const menuRoot = document.createElement("div");
      menuRoot.setAttribute("data-ssota-suggestion-root", "true");
      document.body.appendChild(menuRoot);

      const component = new ReactRenderer(options.component, {
        props: mappedProps(props),
        editor: props.editor,
      });

      menuRoot.appendChild(component.element);
      bundle = { component, root: menuRoot };
      positionSuggestionMenu(menuRoot, props.clientRect);
      queueMicrotask(() => {
        props.editor.commands.focus();
        syncSelectedDom();
      });
    },
    onUpdate: (props: SuggestionProps<TItem>) => {
      lastSuggestionProps = props;
      if (selectedIndex >= props.items.length) {
        selectedIndex = 0;
      }
      bundle?.component.updateProps(mappedProps(props));
      if (bundle?.root) {
        positionSuggestionMenu(bundle.root, props.clientRect);
      }
    },
    onKeyDown: (props: SuggestionKeyDownProps) => {
      if (props.event.key === "Escape") return false;
      return handleImperativeKeyDown(props);
    },
    onExit: () => {
      teardown();
    },
  };
}
