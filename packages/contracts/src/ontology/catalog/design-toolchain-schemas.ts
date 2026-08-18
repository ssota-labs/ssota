import { z } from "zod";
import { propertiesWithKnownKeys } from "./common.js";

export const DESIGN_TOOLCHAIN_SCHEMA_VERSION = 1 as const;

export type DesignToolchainPackageJson = {
  name: string;
  private?: boolean;
  type?: "module";
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export const PLATFORM_DESIGN_TOOLCHAIN_PACKAGE_JSON: DesignToolchainPackageJson =
  {
    name: "studio-user-components",
    private: true,
    type: "module",
    dependencies: {
      react: "^19.1.0",
      "react-dom": "^19.1.0",
      "@base-ui/react": "^1.0.0",
      "class-variance-authority": "^0.7.1",
      clsx: "^2.1.1",
      "tailwind-merge": "^3.3.0",
    },
    devDependencies: {
      vite: "^6.3.5",
      "@vitejs/plugin-react": "^4.5.2",
      tailwindcss: "^4.1.8",
      "@tailwindcss/vite": "^4.1.8",
      typescript: "^5.8.3",
    },
  };

/** Minimal lockfile placeholder — replaced by asset in adapter seed. */
export const PLATFORM_DESIGN_TOOLCHAIN_LOCKFILE = `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    dependencies:
      '@base-ui/react':
        specifier: ^1.0.0
        version: 1.0.0
      class-variance-authority:
        specifier: ^0.7.1
        version: 0.7.1
      clsx:
        specifier: ^2.1.1
        version: 2.1.1
      react:
        specifier: ^19.1.0
        version: 19.1.0
      react-dom:
        specifier: ^19.1.0
        version: 19.1.0(react@19.1.0)
      tailwind-merge:
        specifier: ^3.3.0
        version: 3.3.0
    devDependencies:
      '@tailwindcss/vite':
        specifier: ^4.1.8
        version: 4.1.8(vite@6.3.5)
      '@vitejs/plugin-react':
        specifier: ^4.5.2
        version: 4.5.2(vite@6.3.5)
      tailwindcss:
        specifier: ^4.1.8
        version: 4.1.8
      typescript:
        specifier: ^5.8.3
        version: 5.8.3
      vite:
        specifier: ^6.3.5
        version: 6.3.5
`;

const packageJsonSchema = z.object({
  name: z.string().min(1),
  private: z.boolean().optional(),
  type: z.enum(["module"]).optional(),
  dependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
});

export const designToolchainPropertiesSchema = propertiesWithKnownKeys({
  schema_version: z.literal(DESIGN_TOOLCHAIN_SCHEMA_VERSION).optional(),
  package_json: packageJsonSchema.optional(),
  lockfile: z.string().optional(),
});

export type DesignToolchainProperties = z.infer<
  typeof designToolchainPropertiesSchema
>;

export function mergeDesignToolchainPackageJson(
  userPackageJson?: DesignToolchainPackageJson | null,
): DesignToolchainPackageJson {
  return {
    ...PLATFORM_DESIGN_TOOLCHAIN_PACKAGE_JSON,
    ...(userPackageJson ?? {}),
    dependencies: {
      ...PLATFORM_DESIGN_TOOLCHAIN_PACKAGE_JSON.dependencies,
      ...(userPackageJson?.dependencies ?? {}),
    },
    devDependencies: {
      ...PLATFORM_DESIGN_TOOLCHAIN_PACKAGE_JSON.devDependencies,
      ...(userPackageJson?.devDependencies ?? {}),
    },
  };
}

export function mergeDesignToolchainLockfile(
  userLockfile?: string | null,
): string {
  const trimmed = userLockfile?.trim();
  return trimmed && trimmed.length > 0
    ? trimmed
    : PLATFORM_DESIGN_TOOLCHAIN_LOCKFILE;
}

export function computeToolchainDigest(input: {
  packageJson: DesignToolchainPackageJson;
  lockfile: string;
}): string {
  return JSON.stringify({
    packageJson: input.packageJson,
    lockfile: input.lockfile,
  });
}

export function buildDesignToolchainPropertiesForSave(input: {
  packageJson: DesignToolchainPackageJson;
  lockfile: string;
}): Record<string, unknown> {
  return {
    schema_version: DESIGN_TOOLCHAIN_SCHEMA_VERSION,
    package_json: input.packageJson,
    lockfile: input.lockfile,
  };
}
