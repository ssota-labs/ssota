"use client";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Item, ItemGroup } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import type { ReactElement } from "react";

export type ConsoleProfileLanguageOption = {
  value: string;
  label: string;
};

export type ConsoleProfileMenuProps = {
  userEmail: string;
  userInitials: string;
  signedInAsLabel: string;
  themeLabel: string;
  themeValue: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  languageLabel: string;
  languageValue: string;
  languageOptions: ConsoleProfileLanguageOption[];
  onLanguageChange: (value: string) => void;
  languagePending?: boolean;
  developerSetupLabel: string;
  developerSetupItem: ReactElement;
  settingsLabel: string;
  settingsItem: ReactElement;
  signOutLabel: string;
  onSignOut: () => void;
  className?: string;
};

export function ConsoleProfileMenu({
  userEmail,
  userInitials,
  signedInAsLabel,
  themeLabel,
  themeValue,
  onThemeChange,
  languageLabel,
  languageValue,
  languageOptions,
  onLanguageChange,
  languagePending = false,
  developerSetupLabel,
  developerSetupItem,
  settingsLabel,
  settingsItem,
  signOutLabel,
  onSignOut,
  className,
}: ConsoleProfileMenuProps) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={signedInAsLabel}
        render={
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 w-full justify-start gap-2 px-2 font-normal",
              className,
            )}
          />
        }
      >
        <Avatar size="sm">
          <AvatarFallback>{userInitials}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate text-left text-sm">
          {userEmail}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="cn-menu-translucent w-72 gap-0 p-0"
      >
        <div className="space-y-1 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">{signedInAsLabel}</p>
          <p className="truncate text-sm font-medium">{userEmail}</p>
        </div>
        <Separator />
        <div className="space-y-3 px-3 py-2.5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{themeLabel}</Label>
            <ToggleGroup
              value={[themeValue]}
              onValueChange={(value) => {
                const next = value[0];
                if (next === "light" || next === "dark") {
                  onThemeChange(next);
                }
              }}
              className="w-full"
            >
              <ToggleGroupItem value="light" aria-label="Light mode" className="flex-1 gap-1.5">
                <SunIcon className="size-3.5" />
                Light
              </ToggleGroupItem>
              <ToggleGroupItem value="dark" aria-label="Dark mode" className="flex-1 gap-1.5">
                <MoonIcon className="size-3.5" />
                Dark
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-locale" className="text-xs text-muted-foreground">
              {languageLabel}
            </Label>
            <Select
              value={languageValue}
              onValueChange={(value) => {
                if (value) onLanguageChange(value);
              }}
              disabled={languagePending}
              items={languageOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            >
              <SelectTrigger id="profile-locale" className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator />
        <ItemGroup className="p-1">
          <Item
            size="sm"
            render={developerSetupItem}
            className="cursor-pointer rounded-sm px-2"
          >
            {developerSetupLabel}
          </Item>
          <Item
            size="sm"
            render={settingsItem}
            className="cursor-pointer rounded-sm px-2"
          >
            {settingsLabel}
          </Item>
        </ItemGroup>
        <Separator />
        <div className="p-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-start px-2 text-destructive hover:text-destructive"
            onClick={onSignOut}
          >
            {signOutLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
