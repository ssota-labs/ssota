"use client";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";

const profileSectionClass = "px-3 py-3";

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
              "cn-button-console-trigger w-full justify-start gap-2 font-normal",
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
        sideOffset={8}
        alignOffset={0}
        className="cn-popover-menu cn-popover-menu-solid w-60 overflow-hidden"
      >
        <section className={cn(profileSectionClass, "space-y-1")}>
          <p className="text-xs text-muted-foreground">{signedInAsLabel}</p>
          <p className="truncate text-sm font-medium">{userEmail}</p>
        </section>

        <div className="border-t border-border" />

        <section className={cn(profileSectionClass, "space-y-4")}>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{themeLabel}</Label>
            <ToggleGroup
              variant="outline"
              spacing={0}
              value={[themeValue]}
              onValueChange={(value) => {
                const next = value[0];
                if (next === "light" || next === "dark") {
                  onThemeChange(next);
                }
              }}
              className="w-full"
            >
              <ToggleGroupItem
                value="light"
                aria-label="Light mode"
                className="h-7 flex-1 gap-1 border-border/50 text-xs"
              >
                <SunIcon className="size-3.5" />
                Light
              </ToggleGroupItem>
              <ToggleGroupItem
                value="dark"
                aria-label="Dark mode"
                className="h-7 flex-1 gap-1 border-border/50 text-xs"
              >
                <MoonIcon className="size-3.5" />
                Dark
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2">
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
              <SelectTrigger id="profile-locale" className="h-7 w-full">
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
        </section>

        <div className="border-t border-border" />

        <section className={profileSectionClass}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full justify-start px-0 text-destructive hover:text-destructive"
            onClick={onSignOut}
          >
            {signOutLabel}
          </Button>
        </section>
      </PopoverContent>
    </Popover>
  );
}
