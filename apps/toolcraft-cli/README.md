# Toolcraft CLI

Create standalone Toolcraft apps from the command line.

Toolcraft is a Pixel Point starter kit and UI/runtime library for building
personal creative design tools with AI. It gives generated apps a ready canvas,
control panel, export flow, AI workflow instructions, and verification checks so
you can focus prompts on the visual idea instead of rebuilding common creative
tool plumbing.

You use Toolcraft when a custom tool is faster or clearer than forcing a broad
design app to fit one specific job: procedural graphics, image effects, branded
asset generators, animation controllers, shader experiments, or quick visual
tools for client work.

## Usage

```bash
npx @pixel-point/toolcraft create
```

The create command uses the current directory when no target directory is passed, prompts for missing project values in an interactive terminal, generates the app, runs `pnpm install`, then prints the command to start the dev server.

After dependencies are installed, Toolcraft installs the required workflow skills
in a batch through the `skills` CLI. The skill installer uses the same agent,
scope, and installation prompts as `npx skills add`.

Example:

```bash
npx @pixel-point/toolcraft create my-ascii-tool
cd my-ascii-tool
pnpm dev
```

Then open the generated folder in Codex, Claude Code, Cursor, or another AI
coding agent and prompt for the creative output you want, for example:

```text
Build an app that applies an ASCII effect to an uploaded image.
```

Scripted usage:

```bash
npx @pixel-point/toolcraft create my-toolcraft-app --name my-toolcraft-app --yes --force
```

Install Toolcraft skills to specific agents or locations:

```bash
npx @pixel-point/toolcraft create my-toolcraft-app --agent codex --agent claude-code
npx @pixel-point/toolcraft create my-toolcraft-app --agent codex --global
npx @pixel-point/toolcraft create my-toolcraft-app --all
npx @pixel-point/toolcraft create my-toolcraft-app --no-skills
```

Local source test without publishing:

```bash
mkdir -p /tmp/toolcraft-local-cli-test
cd /tmp/toolcraft-local-cli-test
node /Users/alex/Projects/primeui-v2/cli/bin/toolcraft.mjs --name local-cli-test --yes --force --no-install --no-skills
```

Local tarball test, matching the published package layout:

```bash
cd cli
npm pack --pack-destination /tmp
cd ..
TOOLCRAFT_SKIP_INSTALL=1 TOOLCRAFT_SKIP_SKILLS=1 npm exec --package /tmp/pixel-point-toolcraft-0.0.10.tgz -- toolcraft create /tmp/toolcraft-pack-exec-test --name pack-exec-test --yes --force
```

## Learn more

- [How to craft personal design tools with AI](https://pixelpoint.io/blog/how-to-craft-personal-design-tools-with-toolcraft/)
- [Toolcraft YouTube tutorial](https://youtu.be/-QlmkGZLzFo)

## License

Toolcraft is distributed under the Toolcraft Designer License in `LICENSE.md`.
Designer client work is permitted under that license. Using AI coding assistants
or agents such as Codex, Claude, ChatGPT, Cursor, or similar tools to work on
generated apps is permitted. Platform, generator, AI software product,
app-builder, website-builder, template-marketplace, and resale uses require a
separate commercial license from Pixel Point.
