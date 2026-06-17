import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConsoleProfileMenu } from "@/components/console/console-profile-menu";

const meta = {
  title: "PagePatterns/ConsoleProfileMenu",
  component: ConsoleProfileMenu,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof ConsoleProfileMenu>;

export default meta;
type Story = StoryObj<typeof ConsoleProfileMenu>;

export const SidebarFooter: Story = {
  render: () => (
    <div className="w-60 rounded-lg border bg-sidebar p-2">
      <ConsoleProfileMenu
        userEmail="smoke@ssota.test"
        userInitials="SM"
        signedInAsLabel="Signed in as"
        themeLabel="Appearance"
        themeValue="light"
        onThemeChange={() => undefined}
        languageLabel="Language"
        languageValue="en"
        languageOptions={[
          { value: "en", label: "English" },
          { value: "ko", label: "한국어" },
        ]}
        onLanguageChange={() => undefined}
        signOutLabel="Sign out"
        onSignOut={() => undefined}
      />
    </div>
  ),
};
