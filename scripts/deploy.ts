/**
 * Denox deploy command generator.
 *
 * Usage:
 *   deno task deploy <target>            # print the deploy plan
 *   deno task deploy <target> --run      # execute it
 *   deno task deploy                     # list targets
 *
 * Targets map to the platform manifests in this repository (root fly.toml,
 * railway.toml, render.yaml, Dockerfile and deploy/*). The script never
 * stores credentials: authentication is delegated to each platform CLI
 * (`fly auth login`, `railway login`, ...). Precursor of the future
 * `denox deploy` CLI (ROADMAP 0.5).
 */

import { logger } from "@/shared/logger.ts";

/** A deployment target definition. */
interface DeployTarget {
  /** CLI identifier (e.g. `fly`). */
  readonly id: string;
  /** Human readable platform name. */
  readonly name: string;
  /** Binary that must exist on PATH, or null when none is required. */
  readonly requires: string | null;
  /** Hint printed when the required binary is missing. */
  readonly installHint: string;
  /** Ordered shell commands executed by `--run`. */
  readonly commands: readonly string[];
  /** Reminders printed with the plan (env vars, one-time setup). */
  readonly notes: readonly string[];
}

/** Every supported deployment target. */
const TARGETS: readonly DeployTarget[] = [
  {
    id: "deno-deploy",
    name: "Deno Deploy",
    requires: "deployctl",
    installHint: "deno install -gArf jsr:@deno/deployctl",
    commands: [
      "deno task routes",
      "deployctl deploy --project=denox --entrypoint=src/main.ts",
    ],
    notes: [
      "First time: create the project at https://dash.deno.com and run `deployctl login`.",
      "Set CORS_ORIGIN and APP_ENV=production in the project's environment variables.",
    ],
  },
  {
    id: "fly",
    name: "Fly.io",
    requires: "fly",
    installHint: "curl -L https://fly.io/install.sh | sh",
    commands: [
      "fly deploy",
    ],
    notes: [
      "First time: `fly auth login` and `fly launch --no-deploy` (keeps the existing fly.toml).",
      "Secrets: `fly secrets set CORS_ORIGIN=https://yourdomain.com`.",
    ],
  },
  {
    id: "railway",
    name: "Railway",
    requires: "railway",
    installHint: "npm i -g @railway/cli",
    commands: [
      "railway up --ci",
    ],
    notes: [
      "First time: `railway login` and `railway link`.",
      "Set APP_ENV=production, HOSTNAME=0.0.0.0 and CORS_ORIGIN in the service variables.",
    ],
  },
  {
    id: "render",
    name: "Render",
    requires: null,
    installHint: "",
    commands: [],
    notes: [
      "Render deploys from Git: connect the repository at https://dashboard.render.com",
      "using Blueprints — it reads render.yaml automatically.",
      "Set CORS_ORIGIN in the dashboard (marked sync:false in render.yaml).",
    ],
  },
  {
    id: "docker",
    name: "Docker (any host)",
    requires: "docker",
    installHint: "https://docs.docker.com/get-docker/",
    commands: [
      "docker compose up -d --build",
    ],
    notes: [
      "Requires a .env file with APP_ENV=production and a real CORS_ORIGIN.",
      "Put Nginx (deploy/nginx.conf) or Caddy (deploy/Caddyfile) in front for TLS.",
    ],
  },
  {
    id: "vps",
    name: "VPS / bare metal (systemd)",
    requires: null,
    installHint: "",
    commands: [
      "deno task compile",
    ],
    notes: [
      "Then follow deploy/README.md > Production: copy dist/app and .env to",
      "/opt/denox and install deploy/denox.service.",
    ],
  },
];

/** Checks whether a binary is available on PATH. */
async function binaryExists(binary: string): Promise<boolean> {
  try {
    const command = new Deno.Command(binary, {
      args: ["--version"],
      stdout: "null",
      stderr: "null",
    });
    const { success } = await command.output();
    return success;
  } catch {
    return false;
  }
}

/** Runs a shell command inheriting stdio; returns its success flag. */
async function runCommand(commandLine: string): Promise<boolean> {
  logger.info(`$ ${commandLine}`);
  const [binary, ...args] = commandLine.split(" ");
  if (binary === undefined) return false;
  const command = new Deno.Command(binary, {
    args,
    stdout: "inherit",
    stderr: "inherit",
  });
  const { success } = await command.output();
  return success;
}

/** Prints every available target. */
function printTargets(): void {
  logger.info("Available deploy targets:");
  for (const target of TARGETS) {
    logger.info(`  ${target.id.padEnd(12)} ${target.name}`);
  }
  logger.info("Usage: deno task deploy <target> [--run]");
}

const [targetId, flag] = Deno.args;

if (targetId === undefined) {
  printTargets();
  Deno.exit(0);
}

const target = TARGETS.find((candidate) => candidate.id === targetId);

if (target === undefined) {
  logger.error(`Unknown target "${targetId}".`);
  printTargets();
  Deno.exit(1);
}

logger.info(`Deploy plan — ${target.name}`);
for (const note of target.notes) {
  logger.info(`  note: ${note}`);
}
for (const commandLine of target.commands) {
  logger.info(`  step: ${commandLine}`);
}

if (flag !== "--run") {
  if (target.commands.length > 0) {
    logger.info("Dry run only. Re-run with --run to execute.");
  }
  Deno.exit(0);
}

if (target.requires !== null && !(await binaryExists(target.requires))) {
  logger.error(
    `Required CLI "${target.requires}" not found. Install it first: ${target.installHint}`,
  );
  Deno.exit(1);
}

for (const commandLine of target.commands) {
  const success = await runCommand(commandLine);
  if (!success) {
    logger.error(`Step failed: ${commandLine}`);
    Deno.exit(1);
  }
}

logger.info(`${target.name}: all steps completed.`);
