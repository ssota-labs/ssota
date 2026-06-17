"use client";

import { Extension, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import Suggestion, {
  type SuggestionProps,
} from "@tiptap/suggestion";
import {
  createSuggestionPortal,
  type SuggestionPortalInjectedProps,
} from "./ui/suggestion-portal";
import {
  CaretCircleDownIcon,
  CodeBlockIcon,
  ImageIcon,
  InfoIcon,
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
import { pickImageFile, insertUploadedImage } from "./extensions/MentionExtension";
import { applyListType } from "./list-commands";
import {
  type ComponentType,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@ssota/ui/components/ui/command";

type SlashCommandOptions = {
  uploadImage?: (file: File) => Promise<string>;
};

type SlashCommandItem = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  search: string;
  command: (props: { editor: Editor; range: Range }) => void;
};

function deleteTrigger(editor: Editor, range: Range) {
  return editor.chain().focus().deleteRange(range);
}

function buildSlashItems(
  uploadImage?: (file: File) => Promise<string>,
): SlashCommandItem[] {
  return [
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
    command: ({ editor, range }) => {
      deleteTrigger(editor, range).run();
      applyListType(editor, "bulletList");
    },
  },
  {
    title: "Numbered list",
    description: "Ordered list",
    icon: ListNumbersIcon,
    search: "number ordered list",
    command: ({ editor, range }) => {
      deleteTrigger(editor, range).run();
      applyListType(editor, "orderedList");
    },
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
  ...(uploadImage
    ? [
        {
          title: "Image upload",
          description: "Upload to SSOTA storage",
          icon: ImageIcon,
          search: "image upload file storage",
          command: ({ editor, range }) => {
            void (async () => {
              const file = await pickImageFile();
              if (!file) return;
              deleteTrigger(editor, range).run();
              await insertUploadedImage(editor, file, uploadImage);
            })();
          },
        } satisfies SlashCommandItem,
      ]
    : []),
  {
    title: "Callout",
    description: "Highlighted info block",
    icon: InfoIcon,
    search: "callout info warning tip",
    command: ({ editor, range }) =>
      deleteTrigger(editor, range)
        .setCallout("info")
        .run(),
  },
  {
    title: "Toggle",
    description: "Collapsible block",
    icon: CaretCircleDownIcon,
    search: "toggle collapse accordion",
    command: ({ editor, range }) =>
      deleteTrigger(editor, range)
        .setToggle()
        .run(),
  },
];
}

function filterItems(query: string, items: SlashCommandItem[]) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) =>
    `${item.title} ${item.description} ${item.search}`
      .toLowerCase()
      .includes(normalized),
  );
}

type SlashCommandListProps = SuggestionProps<SlashCommandItem> &
  SuggestionPortalInjectedProps;

function SlashCommandList(props: SlashCommandListProps) {
  const { command, editor, suggestionSelectedIndex, onSuggestionSelectIndex } =
    props;
  const items = useMemo(() => props.items, [props.items]);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIndex = suggestionSelectedIndex;

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) command(item);
    },
    [command, items],
  );

  useEffect(() => {
    const selected = listRef.current?.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    editor.commands.focus();
  }, [editor, items]);

  return (
    <Command
      shouldFilter={false}
      tabIndex={-1}
      onMouseDown={(event) => event.preventDefault()}
      className="ssota-slash-menu"
      aria-label="Insert block"
      data-testid="ssota-slash-menu"
    >
      <CommandList ref={listRef}>
        <CommandEmpty>No blocks found.</CommandEmpty>
        <CommandGroup>
          {items.map((item, index) => (
            <SlashItem
              key={item.title}
              active={index === selectedIndex}
              onMouseEnter={() => onSuggestionSelectIndex(index)}
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
}

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

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",
  priority: 10_000,

  addOptions() {
    return {
      uploadImage: undefined,
    };
  },

  addProseMirrorPlugins() {
    const slashItems = buildSlashItems(this.options.uploadImage);

    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        char: "/",
        pluginKey: new PluginKey("ssotaSlashCommand"),
        startOfLine: false,
        allowedPrefixes: null,
        items: ({ query }) => filterItems(query, slashItems),
        command: ({ editor, range, props }) => props.command({ editor, range }),
        render: () =>
          createSuggestionPortal<
            SlashCommandItem,
            SlashCommandListProps
          >({
            component: SlashCommandList,
            mapProps: (props, menu) => ({
              ...props,
              ...menu,
            }),
          }),
      }),
    ];
  },
});
