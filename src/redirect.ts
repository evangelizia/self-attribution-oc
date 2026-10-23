import type { PermissionEvaluation } from "@opencode/plugin/promise/permission";

export const REDIRECT_MESSAGE =
  "Direct `git commit` is disabled by self-attribution-oc. Use the `commit` or `commit_push` tool instead (stage changes with `git add` first).";

export function isGitCommit(resource: string): boolean {
  const command = resource.trim().replace(/\s+/g, " ");
  if (!command) return false;

  const match = command.match(
    /^(?:env\s+(?:\S+=\S+\s+)*)?(?:sudo\s+)?git\s+(.*)$/,
  );
  if (!match) return false;

  const args = match[1].split(" ");
  let index = 0;
  while (index < args.length) {
    const arg = args[index];
    if (
      arg === "-C" ||
      arg === "-c" ||
      arg === "--git-dir" ||
      arg === "--work-tree" ||
      arg === "--namespace"
    ) {
      index += 2;
      continue;
    }
    if (arg.startsWith("-")) {
      index += 1;
      continue;
    }
    return arg === "commit";
  }
  return false;
}

export function redirectGitCommit(event: PermissionEvaluation): void {
  if (event.action !== "shell") return;
  if (!event.resources.some(isGitCommit)) return;
  event.effect = "deny";
  event.message = REDIRECT_MESSAGE;
}
