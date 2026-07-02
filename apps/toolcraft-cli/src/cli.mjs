import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

import spawn from "cross-spawn";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  note,
  outro,
  spinner,
  text,
} from "@clack/prompts";

import { pathExists } from "./copy-recursive.mjs";
import { generateToolcraft } from "./generate.mjs";
import { sanitizePackageName } from "./package-json.mjs";

const DEFAULT_PROJECT_NAME = "my-toolcraft-app";
const PACKAGE_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const require = createRequire(import.meta.url);

function writeLine(stream, message = "") {
  stream.write(`${message}\n`);
}

function writeBlock(stream, message) {
  stream.write(message.endsWith("\n") ? message : `${message}\n`);
}

function getStdout(context) {
  return context.stdout ?? process.stdout;
}

function getStderr(context) {
  return context.stderr ?? process.stderr;
}

function getStdin(context) {
  return context.stdin ?? process.stdin;
}

function setExitCode(context, exitCode) {
  if (typeof context.setExitCode === "function") {
    context.setExitCode(exitCode);
    return;
  }

  process.exitCode = exitCode;
}

function canPrompt(context) {
  const stdin = getStdin(context);
  const stdout = getStdout(context);
  return Boolean(context.forcePrompts || (stdin.isTTY && stdout.isTTY));
}

function canUseClack(context) {
  return Boolean(
    !context.disableClack &&
      !context.prompts &&
      getStdin(context).isTTY &&
      getStdout(context).isTTY,
  );
}

function handleCancel(value) {
  if (!isCancel(value)) {
    return value;
  }

  cancel("Operation cancelled");
  throw new Error("Operation cancelled.");
}

async function runWithSpinner(context, startMessage, successMessage, task) {
  if (!canUseClack(context)) {
    writeLine(getStdout(context), startMessage);
    return task();
  }

  const taskSpinner = spinner();
  taskSpinner.start(startMessage);

  try {
    const result = await task();
    taskSpinner.stop(successMessage);
    return result;
  } catch (error) {
    taskSpinner.stop("Failed");
    throw error;
  }
}

function createMissingValueError(valueName) {
  return new Error(`${valueName} is required. Pass it with a flag, or run in an interactive terminal.`);
}

function defaultNameForTarget(cwd, targetDir) {
  if (!targetDir) {
    return sanitizePackageName(path.basename(cwd)) || DEFAULT_PROJECT_NAME;
  }

  const basename = path.basename(path.resolve(cwd, targetDir));
  return sanitizePackageName(basename === "." ? path.basename(cwd) : basename) || DEFAULT_PROJECT_NAME;
}

async function promptText(context, label, defaultValue) {
  if (context.prompts?.text) {
    return context.prompts.text({ label, defaultValue });
  }

  if (!canPrompt(context)) {
    throw createMissingValueError(label);
  }

  if (canUseClack(context)) {
    const answer = handleCancel(
      await text({
        message: label,
        placeholder: defaultValue,
        defaultValue,
      }),
    );
    return String(answer).trim() || defaultValue;
  }

  const rl = readline.createInterface({
    input: getStdin(context),
    output: getStdout(context),
  });

  try {
    const answer = await rl.question(`? ${label} (${defaultValue}): `);
    return answer.trim() || defaultValue;
  } finally {
    rl.close();
  }
}

async function promptConfirm(context, label, defaultValue = false) {
  if (context.prompts?.confirm) {
    return context.prompts.confirm({ label, defaultValue });
  }

  if (!canPrompt(context)) {
    return defaultValue;
  }

  if (canUseClack(context)) {
    return handleCancel(
      await confirm({
        message: label,
        initialValue: defaultValue,
      }),
    );
  }

  const suffix = defaultValue ? "Y/n" : "y/N";
  const rl = readline.createInterface({
    input: getStdin(context),
    output: getStdout(context),
  });

  try {
    const answer = (await rl.question(`? ${label} (${suffix}): `)).trim().toLowerCase();
    if (!answer) {
      return defaultValue;
    }

    return ["y", "yes"].includes(answer);
  } finally {
    rl.close();
  }
}

async function directoryHasMeaningfulEntries(directoryPath) {
  if (!(await pathExists(directoryPath))) {
    return false;
  }

  const stats = await fs.stat(directoryPath);
  if (!stats.isDirectory()) {
    return true;
  }

  const entries = await fs.readdir(directoryPath);
  return entries.some((entry) => entry !== ".DS_Store");
}

function readOptionValue(argv, index, optionName) {
  const value = argv[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`${optionName} requires a value.`);
  }

  return value;
}

export function parseCreateArgs(argv) {
  const options = {
    agent: [],
    copy: false,
    force: false,
    global: false,
    help: false,
    install: true,
    name: undefined,
    skills: true,
    skillsAll: false,
    targetDir: undefined,
    yes: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--force" || arg === "-f") {
      options.force = true;
      continue;
    }

    if (arg === "--global" || arg === "-g") {
      options.global = true;
      continue;
    }

    if (arg === "--copy") {
      options.copy = true;
      continue;
    }

    if (arg === "--all") {
      options.skillsAll = true;
      continue;
    }

    if (arg === "--yes" || arg === "-y") {
      options.yes = true;
      continue;
    }

    if (arg === "--no-install") {
      options.install = false;
      continue;
    }

    if (arg === "--no-skills") {
      options.skills = false;
      continue;
    }

    if (arg === "--name") {
      options.name = readOptionValue(argv, index, "--name");
      index += 1;
      continue;
    }

    if (arg === "--agent" || arg === "-a") {
      const startIndex = index;
      while (argv[index + 1] && !argv[index + 1].startsWith("-")) {
        options.agent.push(argv[index + 1]);
        index += 1;
      }

      if (index === startIndex) {
        throw new Error(`${arg} requires an agent name.`);
      }

      continue;
    }

    if (arg === "--dir") {
      if (options.targetDir) {
        throw new Error("Pass either a positional target directory or --dir, not both.");
      }

      options.targetDir = readOptionValue(argv, index, "--dir");
      index += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (options.targetDir) {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }

    options.targetDir = arg;
  }

  return options;
}

export async function resolveCreateOptions(parsedOptions, context = {}) {
  const cwd = path.resolve(context.cwd ?? process.cwd());
  let name = parsedOptions.name?.trim();
  let targetDir = parsedOptions.targetDir?.trim();
  let promptedForName = false;

  if (!name) {
    const defaultName = defaultNameForTarget(cwd, targetDir);
    const shouldPrompt = !parsedOptions.yes && (context.prompts?.text || canPrompt(context));
    if (shouldPrompt) {
      name = await promptText(context, "Project name", defaultName);
      promptedForName = true;
    } else {
      name = defaultName;
    }
  }

  name = sanitizePackageName(name);

  if (!targetDir) {
    const shouldCreateNamedFolder =
      promptedForName && (await directoryHasMeaningfulEntries(cwd));
    targetDir = shouldCreateNamedFolder ? `./${name}` : ".";
  }

  targetDir = targetDir || ".";
  const resolvedTargetDir = path.resolve(cwd, targetDir);
  let force = parsedOptions.force;

  if (!force && (await directoryHasMeaningfulEntries(resolvedTargetDir))) {
    const shouldContinue =
      !parsedOptions.yes &&
      (await promptConfirm(context, "Directory is not empty. Continue?", false));

    if (!shouldContinue) {
      throw new Error(
        `Target directory is not empty: ${resolvedTargetDir}. Use --force to write into it.`,
      );
    }

    force = true;
  }

  return {
    force,
    install: parsedOptions.install && context.env?.TOOLCRAFT_SKIP_INSTALL !== "1",
    name,
    skills: parsedOptions.skills && context.env?.TOOLCRAFT_SKIP_SKILLS !== "1",
    targetDir,
  };
}

function runCommand(command, args, options = {}, context = {}) {
  if (context.runCommand) {
    return context.runCommand(command, args, options);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: options.shell ?? false,
      stdio: options.stdio ?? "inherit",
    });

    child.on("error", reject);
    child.on("exit", (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${exitCode}.`));
    });
  });
}

function getSkillsCliPath(context = {}) {
  if (context.skillsCliPath) {
    return context.skillsCliPath;
  }

  const skillsPackageJsonPath = require.resolve("skills/package.json");
  return path.join(path.dirname(skillsPackageJsonPath), "bin/cli.mjs");
}

function getToolcraftSkillsSourceDir(context = {}) {
  return context.toolcraftSkillsSourceDir ?? path.join(PACKAGE_ROOT, "toolcraft-skills");
}

function createSkillsAddArgs(parsedOptions, context = {}) {
  const args = ["add", getToolcraftSkillsSourceDir(context)];

  if (parsedOptions.skillsAll) {
    args.push("--all");
  } else {
    args.push("--skill", "*");
  }

  for (const agent of parsedOptions.agent) {
    args.push("--agent", agent);
  }

  if (parsedOptions.global) {
    args.push("--global");
  }

  if (parsedOptions.copy) {
    args.push("--copy");
  }

  if (parsedOptions.yes && !parsedOptions.skillsAll) {
    args.push("--yes");
  }

  return args;
}

async function installToolcraftSkills(parsedOptions, targetDir, context = {}) {
  const skillsSourceDir = getToolcraftSkillsSourceDir(context);
  const skillsCliPath = getSkillsCliPath(context);

  const args = createSkillsAddArgs(parsedOptions, {
    ...context,
    toolcraftSkillsSourceDir: skillsSourceDir,
  });

  await runCommand(
    process.execPath,
    [skillsCliPath, ...args],
    {
      cwd: targetDir,
      env: {
        ...process.env,
        ...(context.env ?? {}),
      },
      shell: false,
      stdio: "inherit",
    },
    context,
  );
}

function writeFinalSummary(stdout, result, createOptions) {
  const sameDirectory = result.targetDir === path.resolve(createOptions.cwd);

  writeLine(stdout, "");
  writeLine(stdout, `Created ${result.packageName} at ${result.targetDir}`);
  writeLine(stdout, "");
  writeLine(stdout, "Next steps:");
  if (!sameDirectory) {
    const displayTargetDir = path.isAbsolute(createOptions.targetDir)
      ? result.targetDir
      : result.relativeTargetDir;
    writeLine(stdout, `  cd ${displayTargetDir}`);
  }
  writeLine(stdout, "  pnpm dev");
}

export async function runCreateCommand(parsedOptions, context = {}) {
  const cwd = path.resolve(context.cwd ?? process.cwd());
  const stdout = getStdout(context);
  const usingClack = canUseClack(context);

  if (usingClack) {
    intro("Create Toolcraft app");
  }

  const createOptions = await resolveCreateOptions(parsedOptions, context);

  const result = await runWithSpinner(context, "Creating Toolcraft app...", "Created app", () =>
    generateToolcraft({
      cwd,
      force: createOptions.force,
      name: createOptions.name,
      targetDir: createOptions.targetDir,
    }),
  );

  if (createOptions.install) {
    writeLine(stdout, "");
    writeLine(stdout, "Installing dependencies with pnpm...");
    await runCommand(
      "pnpm",
      ["install"],
      {
        cwd: result.targetDir,
        env: {
          ...process.env,
          ...(context.env ?? {}),
        },
        shell: false,
        stdio: "inherit",
      },
      context,
    );
  }

  if (createOptions.skills) {
    writeLine(stdout, "");
    writeLine(stdout, "Installing Toolcraft skills with skills add...");
    await installToolcraftSkills(parsedOptions, result.targetDir, context);
  }

  if (usingClack) {
    const nextSteps = [
      ...(result.targetDir === cwd ? [] : [`cd ${result.relativeTargetDir}`]),
      "pnpm dev",
    ].join("\n");
    note(nextSteps, "Next steps");
    outro(`Created ${result.packageName}`);
  } else {
    writeFinalSummary(stdout, result, { ...createOptions, cwd });
  }

  return result;
}

export function getMainHelp() {
  return `Usage:
  npx @pixel-point/toolcraft [create] [target-dir] [options]
  toolcraft [create] [target-dir] [options]

Commands:
  create    Create a standalone Toolcraft template app. This is the default command.

Options:
  --help, -h    Show this help message.`;
}

export function getCreateHelp() {
  return `Usage:
  npx @pixel-point/toolcraft create [target-dir] [options]

Creates a standalone Toolcraft template app. When target-dir is omitted, the current directory is used.
Missing project values are prompted in an interactive terminal.

Options:
  --name <name>    Package name for the generated app.
  --dir <dir>      Target directory for the generated app.
  --force, -f      Allow writing into a non-empty target folder.
  --yes, -y        Use defaults for missing values and skip prompts.
  --agent, -a      Install Toolcraft skills to specific agents. Repeat or pass multiple values.
  --global, -g     Install Toolcraft skills globally instead of project-level.
  --copy           Copy skills instead of using the skills CLI default link behavior.
  --all            Install Toolcraft skills to all supported agents without skills prompts.
  --no-skills      Skip Toolcraft skills installation.
  --no-install     Skip automatic pnpm install. Intended for local CLI tests and automation.
  --help, -h       Show this help message.`;
}

export async function runToolcraftCli(argv, context = {}) {
  const stdout = getStdout(context);
  const stderr = getStderr(context);

  try {
    const [command, ...rest] = argv;

    if (command === "--help" || command === "-h") {
      writeBlock(stdout, getMainHelp());
      return { ok: true };
    }

    if (!command || command.startsWith("-")) {
      const createOptions = parseCreateArgs(argv);
      if (createOptions.help) {
        writeBlock(stdout, getMainHelp());
        return { ok: true };
      }

      const result = await runCreateCommand(createOptions, context);
      return { ok: true, result };
    }

    if (command !== "create") {
      throw new Error(`Unknown command: ${command}`);
    }

    const createOptions = parseCreateArgs(rest);
    if (createOptions.help) {
      writeBlock(stdout, getCreateHelp());
      return { ok: true };
    }

    const result = await runCreateCommand(createOptions, context);
    return { ok: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeLine(stderr, message);

    if (context.throwOnError) {
      throw error;
    }

    setExitCode(context, 1);
    return { ok: false, error };
  }
}
