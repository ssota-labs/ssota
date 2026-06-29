"use client";

import type { OrganizationMembersView } from "@ssota/contracts";
import { useState, useEffect, useTransition } from "react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { Input } from "@ssota/ui/components/ui/input";
import { Label } from "@ssota/ui/components/ui/label";
import { Badge } from "@ssota/ui/components/ui/badge";
import { Card } from "@ssota/ui/components/ui/card";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  inviteMemberAction,
  searchUserByEmailAction,
} from "@/app/settings/member-actions";
import { toast } from "@ssota/ui/components/ui/sonner";
import { cn } from "@ssota/ui/lib/utils";

type SelectedInvitee = {
  email: string;
  name: string;
};

type MemberInvitationFormProps = {
  organizationId: string;
  orgSlug: string;
  teamspaceSlug: string;
  view: OrganizationMembersView;
  onSuccess?: () => void;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function MemberInvitationForm({
  organizationId,
  orgSlug,
  teamspaceSlug,
  view,
  onSuccess,
}: MemberInvitationFormProps) {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<SelectedInvitee[]>([]);
  const [searchResults, setSearchResults] = useState<
    { userId: string; name: string; email: string }[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  const memberEmails = new Set(
    view.currentMembers.map((m) => normalizeEmail(m.email)),
  );
  const pendingEmails = new Set(
    view.pendingInvitations.map((i) => normalizeEmail(i.inviteeEmail)),
  );

  useEffect(() => {
    if (!email || email.length < 3) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await searchUserByEmailAction({
          organizationId,
          email,
        });
        if (result.ok) {
          setSearchResults(result.results);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [email, organizationId]);

  const addInvitee = (invitee: SelectedInvitee) => {
    const normalized = normalizeEmail(invitee.email);
    if (memberEmails.has(normalized) || pendingEmails.has(normalized)) return;
    if (selected.some((s) => normalizeEmail(s.email) === normalized)) return;
    setSelected((prev) => [...prev, invitee]);
    setEmail("");
    setSearchResults([]);
  };

  const handleAddRawEmail = () => {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) return;
    addInvitee({ email: trimmed, name: trimmed });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const toInvite =
      selected.length > 0
        ? selected
        : email.trim().includes("@")
          ? [{ email: email.trim(), name: email.trim() }]
          : [];

    if (toInvite.length === 0) return;

    startTransition(async () => {
      for (const invitee of toInvite) {
        const result = await inviteMemberAction({
          organizationId,
          orgSlug,
          teamspaceSlug,
          inviteeEmail: invitee.email,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
      }
      toast.success(t("settings.membersInviteSuccess"));
      setSelected([]);
      setEmail("");
      onSuccess?.();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="invite-email">{t("settings.membersSearchLabel")}</Label>
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="invite-email"
              type="email"
              placeholder={t("settings.membersSearchPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
              disabled={isPending}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isPending || !email.includes("@")}
            onClick={handleAddRawEmail}
          >
            {t("settings.membersAddEmail")}
          </Button>
        </div>

        {searchResults.length > 0 ? (
          <Card className="mt-2 max-h-[200px] overflow-y-auto p-2">
            <div className="space-y-1">
              {searchResults.map((user) => {
                const normalized = normalizeEmail(user.email);
                const isDisabled =
                  memberEmails.has(normalized) ||
                  pendingEmails.has(normalized) ||
                  selected.some((s) => normalizeEmail(s.email) === normalized);

                return (
                  <button
                    key={user.userId}
                    type="button"
                    onClick={() =>
                      !isDisabled &&
                      addInvitee({ email: user.email, name: user.name })
                    }
                    disabled={isDisabled}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                      isDisabled && "cursor-not-allowed bg-muted opacity-50",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    {memberEmails.has(normalized) ? (
                      <Badge variant="secondary" className="text-xs">
                        {t("settings.membersAlreadyMember")}
                      </Badge>
                    ) : null}
                    {pendingEmails.has(normalized) ? (
                      <Badge variant="outline" className="text-xs">
                        {t("settings.membersAlreadyInvited")}
                      </Badge>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </Card>
        ) : null}

        {isSearching ? (
          <p className="text-sm text-muted-foreground">
            {t("settings.membersSearching")}
          </p>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <div className="space-y-2">
          <Label>
            {t("settings.membersSelectedCount", { count: selected.length })}
          </Label>
          <div className="flex flex-wrap gap-2 rounded-md border border-border/30 bg-muted/30 p-3">
            {selected.map((invitee) => (
              <Badge
                key={invitee.email}
                variant="secondary"
                className="flex items-center gap-1 py-1.5 pr-1"
              >
                <span className="text-xs">{invitee.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setSelected((prev) =>
                      prev.filter((s) => s.email !== invitee.email),
                    )
                  }
                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                  disabled={isPending}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={
          isPending ||
          (selected.length === 0 && !email.trim().includes("@"))
        }
      >
        {isPending
          ? t("settings.membersInviting")
          : t("settings.membersSendInvite")}
      </Button>
    </form>
  );
}
