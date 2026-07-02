export function sanitizePackageName(value) {
  const sanitized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9._/-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "toolcraft-app";
}

export function normalizeProjectTitle(value) {
  const words = String(value ?? "")
    .trim()
    .replace(/^@/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  const title = words
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");

  return title || "Toolcraft App";
}

function isWorkspaceDependency(name, specifier) {
  return name.startsWith("@repo/") || String(specifier).startsWith("workspace:");
}

function createStandaloneDependencies(dependencies = {}) {
  return Object.fromEntries(
    Object.entries(dependencies).filter(
      ([name, specifier]) => !isWorkspaceDependency(name, specifier),
    ),
  );
}

function addDependencyGroup(packageJson, groupName, dependencies) {
  const standaloneDependencies = createStandaloneDependencies(dependencies);

  if (Object.keys(standaloneDependencies).length > 0) {
    packageJson[groupName] = standaloneDependencies;
  }
}

export function createGeneratedPackageJson({ name, starterPackageJson }) {
  if (!starterPackageJson || typeof starterPackageJson !== "object") {
    throw new Error("starterPackageJson is required to create a generated package manifest.");
  }

  const packageJson = {
    name: sanitizePackageName(name),
    private: true,
    license: starterPackageJson.license,
    type: starterPackageJson.type ?? "module",
    scripts: starterPackageJson.scripts ?? {},
  };

  addDependencyGroup(packageJson, "dependencies", starterPackageJson.dependencies);
  addDependencyGroup(packageJson, "devDependencies", starterPackageJson.devDependencies);
  addDependencyGroup(packageJson, "peerDependencies", starterPackageJson.peerDependencies);
  addDependencyGroup(packageJson, "optionalDependencies", starterPackageJson.optionalDependencies);

  return packageJson;
}

export function createGeneratedTsConfig() {
  return {
    $schema: "https://json.schemastore.org/tsconfig",
    compilerOptions: {
      target: "ES2022",
      useDefineForClassFields: true,
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      allowJs: false,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      module: "ESNext",
      moduleResolution: "Bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "react-jsx",
      noEmit: true,
      types: ["vite/client", "node"],
      paths: {
        "@/*": ["./src/*"],
        "#/*": ["./src/*"],
      },
    },
    include: ["src", "vite.config.ts"],
  };
}
