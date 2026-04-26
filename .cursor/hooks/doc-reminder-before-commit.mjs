/**
 * beforeShellExecution: nudge the agent to re-check docs before any `git commit`.
 * Matcher in hooks.json limits when this runs; stdin still includes the full command.
 * Disable: CURSOR_DOC_HOOK=0 (or "off" / "false" / "no").
 * User confirmation each time: DOC_HOOK_STRICT=1 (permission "ask" instead of "allow").
 */
import { readFileSync } from "node:fs";

const out = (obj) => {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
  process.exit(0);
};

if (["0", "off", "false", "no"].includes(String(process.env.CURSOR_DOC_HOOK ?? "").toLowerCase())) {
  out({ permission: "allow" });
}

let input = "";
try {
  input = readFileSync(0, "utf8");
} catch {
  out({ permission: "allow" });
}

try {
  JSON.parse(input);
} catch {
  out({ permission: "allow" });
}

const text =
  "Pre-commit doc check: re-read README.md, AGENTS.md, and any relevant .cursor/rules for this repo. " +
  "If this commit changes behavior, setup, or workflows, update those docs in the same commit. " +
  "If documentation is already accurate, continue.";

const strict = ["1", "true", "yes", "on"].includes(
  String(process.env.DOC_HOOK_STRICT ?? "").toLowerCase(),
);

if (strict) {
  out({
    permission: "ask",
    user_message: "Doc drift check: confirm README / AGENTS / .cursor rules are still accurate, then continue.",
    agent_message: text,
  });
}

out({
  permission: "allow",
  agent_message: text,
});
