import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { after, describe, it } from "node:test";

import { parseCreateArgs, resolveCreateOptions, runToolcraftCli } from "./cli.mjs";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const tempRoots = [];

after(async () => {
  await Promise.all(
    tempRoots.map((tempRoot) => fs.rm(tempRoot, { force: true, recursive: true })),
  );
});

function createWritableCapture() {
  return {
    text: "",
    write(chunk) {
      this.text += String(chunk);
    },
  };
}

async function createTempRoot() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "toolcraft-cli-run-"));
  tempRoots.push(tempRoot);
  return tempRoot;
}

describe("parseCreateArgs", () => {
  it("parses create options for scripted usage", () => {
    assert.deepEqual(
      parseCreateArgs([
        "generated-app",
        "--name",
        "Generated App",
        "--force",
        "--yes",
        "--no-install",
      ]),
      {
        agent: [],
        copy: false,
        force: true,
        global: false,
        help: false,
        install: false,
        name: "Generated App",
        skills: true,
        skillsAll: false,
        targetDir: "generated-app",
        yes: true,
      },
    );
  });

  it("parses --dir as the target directory", () => {
    assert.equal(parseCreateArgs(["--dir", "target-app"]).targetDir, "target-app");
  });

  it("parses skills add compatible options", () => {
    const options = parseCreateArgs([
      "generated-app",
      "--agent",
      "codex",
      "claude-code",
      "--global",
      "--copy",
      "--all",
      "--no-skills",
    ]);

    assert.deepEqual(options.agent, ["codex", "claude-code"]);
    assert.equal(options.global, true);
    assert.equal(options.copy, true);
    assert.equal(options.skillsAll, true);
    assert.equal(options.skills, false);
  });

  it("rejects duplicate target directory values", () => {
    assert.throws(
      () => parseCreateArgs(["target-app", "--dir", "other-app"]),
      /Pass either a positional target directory or --dir/,
    );
  });
});

describe("resolveCreateOptions", () => {
  it("defaults missing target directory and package name to the current directory", async () => {
    const tempRoot = await createTempRoot();
    const options = await resolveCreateOptions(parseCreateArgs(["--yes", "--no-install"]), {
      cwd: tempRoot,
      env: {},
    });

    assert.deepEqual(options, {
      force: false,
      install: false,
      name: path.basename(tempRoot).toLowerCase(),
      skills: true,
      targetDir: ".",
    });
  });

  it("uses the prompted project name as the target folder from a non-empty parent directory", async () => {
    const tempRoot = await createTempRoot();
    await fs.writeFile(path.join(tempRoot, "README.md"), "existing");
    let confirmCalled = false;

    const options = await resolveCreateOptions(parseCreateArgs([]), {
      cwd: tempRoot,
      env: {},
      prompts: {
        async text({ label, defaultValue }) {
          assert.equal(label, "Project name");
          assert.equal(defaultValue, path.basename(tempRoot).toLowerCase());
          return "Prompted App";
        },
        async confirm({ label, defaultValue }) {
          confirmCalled = true;
          throw new Error(`Unexpected confirmation: ${label} ${defaultValue}`);
        },
      },
    });

    assert.deepEqual(options, {
      force: false,
      install: true,
      name: "prompted-app",
      skills: true,
      targetDir: "./prompted-app",
    });
    assert.equal(confirmCalled, false);
  });

  it("confirms when the prompted project target folder is non-empty", async () => {
    const tempRoot = await createTempRoot();
    const targetDir = path.join(tempRoot, "prompted-app");
    await fs.mkdir(targetDir);
    await fs.writeFile(path.join(targetDir, "README.md"), "existing");

    const options = await resolveCreateOptions(parseCreateArgs([]), {
      cwd: tempRoot,
      env: {},
      prompts: {
        async text({ label }) {
          assert.equal(label, "Project name");
          return "Prompted App";
        },
        async confirm({ label, defaultValue }) {
          assert.equal(label, "Directory is not empty. Continue?");
          assert.equal(defaultValue, false);
          return true;
        },
      },
    });

    assert.deepEqual(options, {
      force: true,
      install: true,
      name: "prompted-app",
      skills: true,
      targetDir: "./prompted-app",
    });
  });

  it("does not force non-empty folders when --yes is used without --force", async () => {
    const tempRoot = await createTempRoot();
    const targetDir = path.join(tempRoot, "existing-app");
    await fs.mkdir(targetDir);
    await fs.writeFile(path.join(targetDir, "README.md"), "existing");

    await assert.rejects(
      () =>
        resolveCreateOptions(parseCreateArgs(["existing-app", "--yes"]), {
          cwd: tempRoot,
          env: {},
        }),
      /Use --force/,
    );
  });
});

describe("runToolcraftCli", () => {
  it("creates in the current directory when no command or target is passed", async () => {
    const tempRoot = await createTempRoot();
    const stdout = createWritableCapture();
    const stderr = createWritableCapture();

    const result = await runToolcraftCli(["--no-install", "--no-skills"], {
      cwd: tempRoot,
      env: {},
      stderr,
      stdout,
      throwOnError: true,
    });

    assert.equal(result.ok, true);
    assert.ok(await fs.stat(path.join(tempRoot, "src/app/app-schema.ts")));
    assert.match(stdout.text, new RegExp(`Created ${path.basename(tempRoot).toLowerCase()}`));
    assert.doesNotMatch(stdout.text, /cd /);
    assert.match(stdout.text, /pnpm dev/);
    assert.equal(stderr.text, "");
  });

  it("creates a standalone app through toolcraft create without installing in tests", async () => {
    const tempRoot = await createTempRoot();
    const stdout = createWritableCapture();
    const stderr = createWritableCapture();

    const result = await runToolcraftCli(
      [
        "create",
        "generated-app",
        "--name",
        "Generated App",
        "--yes",
        "--force",
        "--no-install",
        "--no-skills",
      ],
      {
        cwd: tempRoot,
        env: {},
        stderr,
        stdout,
        throwOnError: true,
      },
    );

    assert.equal(result.ok, true);
    assert.ok(await fs.stat(path.join(tempRoot, "generated-app/src/app/app-schema.ts")));
    assert.match(stdout.text, /Created generated-app/);
    assert.match(stdout.text, /cd generated-app/);
    assert.match(stdout.text, /pnpm dev/);
    assert.doesNotMatch(stdout.text, /pnpm verify:final/);
    assert.equal(stderr.text, "");
  });

  it("runs pnpm install and Toolcraft skills install by default after creating the app", async () => {
    const tempRoot = await createTempRoot();
    const stdout = createWritableCapture();
    const installs = [];
    const skillsCliPath = path.join(tempRoot, "skills-cli.mjs");
    const skillsSourceDir = path.join(tempRoot, "toolcraft-skills");

    await runToolcraftCli(["create", "install-app", "--name", "Install App", "--yes", "--force"], {
      cwd: tempRoot,
      env: {},
      stdout,
      skillsCliPath,
      throwOnError: true,
      toolcraftSkillsSourceDir: skillsSourceDir,
      async runCommand(command, args, options) {
        installs.push({ args, command, cwd: options.cwd, shell: options.shell });
      },
    });

    assert.deepEqual(installs, [
      {
        args: ["install"],
        command: "pnpm",
        cwd: path.join(tempRoot, "install-app"),
        shell: false,
      },
      {
        args: [skillsCliPath, "add", skillsSourceDir, "--skill", "*", "--yes"],
        command: process.execPath,
        cwd: path.join(tempRoot, "install-app"),
        shell: false,
      },
    ]);
    assert.match(stdout.text, /Installing dependencies with pnpm/);
    assert.match(stdout.text, /Installing Toolcraft skills/);
    assert.match(stdout.text, /pnpm dev/);
  });

  it("forwards skills add compatible options", async () => {
    const tempRoot = await createTempRoot();
    const skillsCommands = [];
    const skillsCliPath = path.join(tempRoot, "skills-cli.mjs");
    const skillsSourceDir = path.join(tempRoot, "toolcraft-skills");

    await runToolcraftCli(
      [
        "create",
        "skills-options-app",
        "--name",
        "Skills Options App",
        "--yes",
        "--force",
        "--no-install",
        "--agent",
        "codex",
        "claude-code",
        "--global",
        "--copy",
      ],
      {
        cwd: tempRoot,
        env: {},
        skillsCliPath,
        throwOnError: true,
        toolcraftSkillsSourceDir: skillsSourceDir,
        async runCommand(command, args, options) {
          skillsCommands.push({ args, command, cwd: options.cwd, shell: options.shell });
        },
      },
    );

    assert.deepEqual(skillsCommands, [
      {
        args: [
          skillsCliPath,
          "add",
          skillsSourceDir,
          "--skill",
          "*",
          "--agent",
          "codex",
          "--agent",
          "claude-code",
          "--global",
          "--copy",
          "--yes",
        ],
        command: process.execPath,
        cwd: path.join(tempRoot, "skills-options-app"),
        shell: false,
      },
    ]);
  });

  it("skips Toolcraft skills installation with --no-skills", async () => {
    const tempRoot = await createTempRoot();
    const commands = [];

    await runToolcraftCli(
      [
        "create",
        "no-skills-app",
        "--name",
        "No Skills App",
        "--yes",
        "--force",
        "--no-install",
        "--no-skills",
      ],
      {
        cwd: tempRoot,
        env: {},
        throwOnError: true,
        async runCommand(command, args, options) {
          commands.push({ args, command, cwd: options.cwd });
        },
      },
    );

    assert.deepEqual(commands, []);
  });

  it("prints create help with the npx command", async () => {
    const stdout = createWritableCapture();

    const result = await runToolcraftCli(["create", "--help"], {
      stdout,
      throwOnError: true,
    });

    assert.equal(result.ok, true);
    assert.match(stdout.text, /npx @pixel-point\/toolcraft create/);
    assert.match(stdout.text, /--agent/);
    assert.match(stdout.text, /--global/);
    assert.match(stdout.text, /--no-skills/);
    assert.match(stdout.text, /--no-install/);
  });

  it("keeps create-toolcraft-app as a compatibility wrapper", async () => {
    const tempRoot = await createTempRoot();
    const binPath = path.join(packageRoot, "bin/create-toolcraft-app.mjs");

    const { stdout } = await execFileAsync(
      process.execPath,
      [
        binPath,
        "wrapped-app",
        "--name",
        "Wrapped App",
        "--yes",
        "--force",
        "--no-install",
        "--no-skills",
      ],
      {
        cwd: tempRoot,
        env: {
          ...process.env,
        },
      },
    );

    assert.match(stdout, /Created wrapped-app/);
    assert.ok(await fs.stat(path.join(tempRoot, "wrapped-app/src/app/app-schema.ts")));
  });
});
