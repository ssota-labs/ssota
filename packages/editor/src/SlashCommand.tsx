"use client";

import { Extension, type Range } from "@tiptap/core";
import { ReactRenderer, type Editor } from "@tiptap/react";
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";
import {
  CodeBlockIcon,
  ImageIcon,
  ListBulletsIcon,
  ListChecksIcon,
  ListNumbersIcon,
  MinusIcon,
  ParagraphIcon,
  QuotesIcon,
  TableIcon,
  TextHOneIcon,
  TextHThreeIcon,
  TextHTwoIcon,
} from "@phosphor-icons/react";
import {
  forwardRef,
  type ComponentType,
  type ReactNode,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@ssota/ui/components/ui/command";

type SlashCommandItem = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  search: string;
  command: (props: { editor: Editor; range: Range }) => void;
};

type SlashCommandListHandle = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

function deleteTrigger(editor: Editor, range: Range) {
  return editor.chain().focus().deleteRange(range);
}

const slashItems: SlashCommandItem[] = [
  {
    title: "Paragraph",
    description: "Plain text block",
    icon: ParagraphIcon,
    search: "paragraph text",
    command: ({ editor, range }) => deleteTrigger(editor, range).setParagraph().run(),
  },
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: TextHOneIcon,
    search: "h1 heading title",
    command: ({ editor, range }) =>
      deleteTrigger(editor, range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: TextHTwoIcon,
    search: "h2 heading subtitle",
    command: ({ editor, range }) =>
      deleteTrigger(editor, range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: TextHThreeIcon,
    search: "h3 heading",
    command: ({ editor, range }) =>
      deleteTrigger(editor, range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Bullet list",
    description: "Unordered list",
    icon: ListBulletsIcon,
    search: "bullet unordered list",
    command: ({ editor, range }) =>
      deleteTrigger(editor, range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    description: "Ordered list",
    icon: ListNumbersIcon,
    search: "number ordered list",
    command: ({ editor, range }) =>
      deleteTrigger(editor, range).toggleOrderedList().run(),
  },
  {
    title: "Task list",
    description: "Checklist items",
    icon: ListChecksIcon,
    search: "todo task checklist",
    command: ({ editor, range }) =>
      deleteTrigger(editor, range).toggleTaskList().run(),
  },
  {
    title: "Quote",
    description: "Quoted block",
    icon: QuotesIcon,
    search: "blockquote quote",
    command: ({ editor, range }) =>
      deleteTrigger(editor, range).toggleBlockquote().run(),
  },
  {
    title: "Code block",
    description: "Preformatted code",
    icon: CodeBlockIcon,
    search: "code pre",
    command: ({ editor, range }) =>
      deleteTrigger(editor, range).toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    description: "Horizontal rule",
    icon: MinusIcon,
    search: "divider horizontal rule hr",
    command: ({ editor, range }) =>
      deleteTrigger(editor, range).setHorizontalRule().run(),
  },
  {
    title: "Table",
    description: "3 by 3 table",
    icon: TableIcon,
    search: "table grid",
    command: ({ editor, range }) =>
      deleteTrigger(editor, range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: "Image URL",
    description: "Insert an external image",
    icon: ImageIcon,
    search: "image picture url",
    command: ({ editor, range }) => {
      const src = window.prompt("Image URL");
      if (!src) return;
      deleteTrigger(editor, range).setImage({ src }).run();
    },
  },
];

function filterItems(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return slashItems;
  return slashItems.filter((item) =>
    `${item.title} ${item.description} ${item.search}`
      .toLowerCase()
      .includes(normalized),
  );
}

const SlashCommandList = forwardRef<
  SlashCommandListHandle,
  SuggestionProps<SlashCommandItem>
>(function SlashCommandList(props, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const items = useMemo(() => props.items, [props.items]);

  function selectItem(index: number) {
    const item = items[index];
    if (item) props.command(item);
  }

  useImperativeHandle(ref, () => ({
    onKeyDown({ event }) {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selected) =>
          selected <= 0 ? items.length - 1 : selected - 1,
        );
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((selected) =>
          selected >= items.length - 1 ? 0 : selected + 1,
        );
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  return (
    <Command className="ssota-slash-menu" aria-label="Insert block">
      <CommandList>
        <CommandEmpty>No blocks found.</CommandEmpty>
        <CommandGroup>
          {items.map((item, index) => (
            <SlashItem
              key={item.title}
              active={index === selectedIndex}
              onMouseEnter={() => setSelectedIndex(index)}
              onSelect={() => selectItem(index)}
              icon={<item.icon className="size-4" />}
              title={item.title}
              description={item.description}
            />
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
});

function SlashItem({
  active,
  icon,
  title,
  description,
  onMouseEnter,
  onSelect,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onMouseEnter: () => void;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={title}
      data-selected={active ? "true" : undefined}
      onMouseEnter={onMouseEnter}
      onSelect={onSelect}
      className="ssota-slash-menu-item"
    >
      <span className="ssota-slash-menu-icon">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {description}
        </span>
      </span>
    </CommandItem>
  );
}

function positionMenu(element: HTMLElement, props: SuggestionProps<SlashCommandItem>) {
  const rect = props.clientRect?.();
  if (!rect) return;
  element.style.position = "fixed";
  element.style.left = `${rect.left}px`;
  element.style.top = `${rect.bottom + 8}px`;
  element.style.zIndex = "70";
}

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        char: "/",
        startOfLine: false,
        items: ({ query }) => filterItems(query),
        command: ({ editor, range, props }) => props.command({ editor, range }),
        render: () => {
          let component: ReactRenderer<SlashCommandListHandle> | null = null;
          let root: HTMLElement | null = null;

          return {
            onStart: (props) => {
              root = document.createElement("div");
              document.body.appendChild(root);
              component = new ReactRenderer(SlashCommandList, {
                props,
                editor: props.editor,
              });
              root.appendChild(component.element);
              positionMenu(root, props);
            },
            onUpdate: (props) => {
              component?.updateProps(props);
              if (root) positionMenu(root, props);
            },
            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                return false;
              }
              return component?.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              component?.destroy();
              root?.remove();
              component = null;
              root = null;
            },
          };
        },
      }),
    ];
  },
});
