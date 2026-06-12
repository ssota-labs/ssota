import type { Preview } from "@storybook/react-vite";
import React from "react";
import "../../../packages/ui/src/styles/globals.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Light/dark via globals.css `.dark` CSS variables",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "light",
  },
  decorators: [
    (Story, { globals }) => {
      const isDark = globals.theme === "dark";
      return React.createElement(
        "div",
        { className: isDark ? "dark" : undefined },
        React.createElement(
          "div",
          {
            className:
              "min-h-[120px] bg-background p-6 font-sans text-foreground",
          },
          React.createElement(Story),
        ),
      );
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: { disable: true },
    layout: "fullscreen",
  },
};

export default preview;
