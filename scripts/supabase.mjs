// Supabase CLI for this project only (owner, 2026-11-23). Other projects on this PC log the global CLI
// in to other accounts, so every command here runs with SUPABASE_ACCESS_TOKEN from .env.local (a
// personal access token of the hamzabuildsweb account) and always targets this project's ref.
// The token is passed to the CLI through the environment only; it is never printed or written anywhere.
//
//   npm run db:push            apply new migrations (add -- --yes in non-interactive runs)
//   npm run db:types           regenerate src/lib/supabase/database.types.ts (only written on success)
//   npm run supabase -- <args> any other CLI command, e.g. npm run supabase -- migration list --linked
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
/** hamzabuildsweb's project (Sydney). Never another one. */
const PROJECT_REF = "nuewfjfpdlujusoebklf";
/** Pinned CLI version, so a new global CLI can't change behaviour. */
const CLI = "supabase@3.3.0";
const TYPES_FILE = join(ROOT, "src/lib/supabase/database.types.ts");

/** One variable from .env.local (KEY=value, optional quotes, comments ignored). */
const readEnvLocal = (name) => {
  const file = join(ROOT, ".env.local");
  if (!existsSync(file)) return null;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[1] === name) return m[2].replace(/^(['"])(.*)\1$/, "$2").trim() || null;
  }
  return null;
};

const token = readEnvLocal("SUPABASE_ACCESS_TOKEN");
if (!token) {
  console.error(
    "SUPABASE_ACCESS_TOKEN is missing in .env.local.\n" +
      "Create one on the hamzabuildsweb account (supabase.com/dashboard/account/tokens) and add the line\n" +
      "SUPABASE_ACCESS_TOKEN=<token> to .env.local. The global `supabase login` is not used for this project.",
  );
  process.exit(1);
}
if (!/^sbp_[A-Za-z0-9]{20,}$/.test(token)) {
  console.error("SUPABASE_ACCESS_TOKEN in .env.local doesn't look like a Supabase personal access token (sbp_…).");
  process.exit(1);
}

// --linked reads supabase/.temp/project-ref (gitignored, local): keep it on this project.
const refFile = join(ROOT, "supabase/.temp/project-ref");
if (!existsSync(refFile) || readFileSync(refFile, "utf8").trim() !== PROJECT_REF) {
  mkdirSync(dirname(refFile), { recursive: true });
  writeFileSync(refFile, PROJECT_REF);
}

const env = { ...process.env, SUPABASE_ACCESS_TOKEN: token };
const run = (args, capture = false) =>
  new Promise((resolve) => {
    const child = spawn("npx", ["--yes", CLI, ...args], { cwd: ROOT, env, shell: process.platform === "win32", stdio: capture ? ["inherit", "pipe", "inherit"] : "inherit" });
    let out = "";
    if (capture) child.stdout.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ code: code ?? 1, out }));
  });

const [cmd, ...rest] = process.argv.slice(2);
if (!cmd) {
  console.error("Usage: node scripts/supabase.mjs <types | supabase CLI arguments>");
  process.exit(1);
}

if (cmd === "types") {
  // Written only when the CLI succeeded and returned real types: a failed run never empties the file.
  const { code, out } = await run(["gen", "types", "typescript", "--project-id", PROJECT_REF, "--schema", "public", ...rest], true);
  if (code !== 0 || !out.includes("export type Database")) {
    console.error(`Type generation failed (exit ${code}); ${TYPES_FILE} was not changed.`);
    process.exit(code || 1);
  }
  writeFileSync(TYPES_FILE, out);
  console.log(`Types written to src/lib/supabase/database.types.ts (${out.split("\n").length} lines).`);
} else {
  const { code } = await run([cmd, ...rest]);
  process.exit(code);
}
