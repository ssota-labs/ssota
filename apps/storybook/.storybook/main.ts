import type { StorybookConfig } from "@storybook/react-vite";
import path from "node:path";

const config: StorybookConfig = {
  stories: [
    "../../../packages/ui/src/**/*.stories.@(ts|tsx)",
    "../src/**/*.stories.@(ts|tsx)",
  ],
  addons: ["@storybook/addon-docs"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => {
    const uiRoot = path.resolve(__dirname, "../../../packages/ui/src");
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": uiRoot,
      "@ssota/ui": uiRoot,
    };
    return config;
  },
};

export default config;
