"use client";

import { useState, useTransition } from "react";
import { ChatCircleIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ssota/ui/components/ui/card";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@ssota/ui/components/ui/native-select";
import {
  linkChatWorkspaceAction,
  unlinkChatWorkspaceAction,
} from "@/app/[orgSlug]/[projectSlug]/connections/actions";

export interface ChatWorkspaceItem {
  id: string;
  platform: string;
  workspaceKey: string;
  name: string | null;
}

const PLATFORMS = [
  { value: "slack", label: "Slack", hint: "Workspace (team) id, e.g. T0123ABCD" },
  { value: "discord", label: "Discord", hint: "Server (guild) id" },
  { value: "telegram", label: "Telegram", hint: "Chat id" },
] as const;

interface ChatWorkspacesProps {
  projectId: string;
  workspaces: ChatWorkspaceItem[];
  returnTo: string;
}

/**
 * Links chat workspaces (Slack/Discord/Telegram) to this project so inbound
 * @mentions route to this project's agent. Replaces the raw /api/chat/link
 * call — the creator connects each of their workspaces here.
 */
export function ChatWorkspaces({
  projectId,
  workspaces,
  returnTo,
}: ChatWorkspacesProps) {
  const [platform, setPlatform] = useState<string>(PLATFORMS[0].value);
  const [workspaceKey, setWorkspaceKey] = useState("");
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  const hint = PLATFORMS.find((p) => p.value === platform)?.hint;

  function link() {
    const key = workspaceKey.trim();
    if (!key) return;
    startTransition(async () => {
      await linkChatWorkspaceAction({
        projectId,
        platform,
        workspaceKey: key,
        name: name.trim() || undefined,
        revalidate: returnTo,
      });
      setWorkspaceKey("");
      setName("");
    });
  }

  function unlink(id: string) {
    startTransition(async () => {
      await unlinkChatWorkspaceAction({ projectId, id, revalidate: returnTo });
    });
  }

  return (
    <Card data-testid="chat-workspaces">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChatCircleIcon className="size-4 text-muted-foreground" />
          Chat workspaces
        </CardTitle>
        <CardDescription>
          Slack and Discord workspaces link automatically when you Connect them
          above — messages that mention the bot run this project&apos;s agent. Use
          manual linking only for Telegram or to fix a mapping by hand.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {workspaces.length > 0 ? (
          <div className="space-y-2">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
                data-testid="chat-workspace-row"
              >
                <span className="flex items-center gap-2 text-sm">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] capitalize text-muted-foreground">
                    {ws.platform}
                  </span>
                  <span className="font-mono">{ws.workspaceKey}</span>
                  {ws.name ? (
                    <span className="text-muted-foreground">— {ws.name}</span>
                  ) : null}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => unlink(ws.id)}
                >
                  <XIcon className="size-4" />
                  Unlink
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No workspaces linked yet.
          </p>
        )}

        <details className="border-t pt-4">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Link a workspace manually
          </summary>
          <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="chat-platform">Platform</Label>
            <NativeSelect
              id="chat-platform"
              size="sm"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              {PLATFORMS.map((p) => (
                <NativeSelectOption key={p.value} value={p.value}>
                  {p.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chat-workspace-key">Workspace id</Label>
            <Input
              id="chat-workspace-key"
              className="w-56 font-mono"
              placeholder={hint}
              value={workspaceKey}
              onChange={(e) => setWorkspaceKey(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chat-workspace-name">Name (optional)</Label>
            <Input
              id="chat-workspace-name"
              className="w-40"
              placeholder="Acme Slack"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            disabled={isPending || !workspaceKey.trim()}
            onClick={link}
            data-testid="chat-workspace-link"
          >
            <PlusIcon className="size-4" />
            Link
          </Button>
          </div>
          {hint ? (
            <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </details>
      </CardContent>
    </Card>
  );
}
