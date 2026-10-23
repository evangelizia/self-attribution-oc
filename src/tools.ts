import type { SessionDomain } from "@opencode/plugin/promise/session";
import type { Info as ToolInfo } from "@opencode/plugin/promise/tool";
import { COAUTHOR_TRAILER, hasCoauthorTrailer } from "./attribution.ts";
import { currentBranch, hasUpstream, runGit } from "./git.ts";

export interface ToolDeps {
  session: Pick<SessionDomain, "get">;
}

const commitInput = {
  type: "object",
  properties: {
    message: {
      type: "string",
      description: "Commit message. Stage changes with git add first.",
    },
    args: {
      type: "array",
      items: { type: "string" },
      description: 'Extra git commit arguments, for example ["-a"].',
    },
  },
  required: ["message"],
  additionalProperties: false,
};

const commitPushInput = {
  ...commitInput,
  properties: {
    ...commitInput.properties,
    remote: {
      type: "string",
      description: "Remote to push to. Defaults to the tracked upstream or origin.",
    },
    branch: {
      type: "string",
      description: "Branch to push. Defaults to the current branch.",
    },
  },
};

function formatResult(result: { stdout: string; stderr: string }): string {
  return [result.stdout, result.stderr]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n");
}

export function buildCommitArgs(message: string, extra?: string[]): string[] {
  const extras = extra ?? [];
  const separator = extras.indexOf("--");
  const before = separator === -1 ? extras : extras.slice(0, separator);
  const after = separator === -1 ? [] : extras.slice(separator);

  const args = ["commit", ...before, "-m", message];
  if (!hasCoauthorTrailer(message)) {
    args.push("--trailer", COAUTHOR_TRAILER);
  }
  args.push(...after);
  return args;
}

export function createCommitTool(
  deps: ToolDeps,
): ToolInfo<typeof commitInput> {
  return {
    name: "commit",
    description:
      "Create a git commit with the required co-author trailer. Stage changes with git add first. Use this instead of git commit.",
    input: commitInput,
    execute: async (parameters, context) => {
      const { message, args } = parameters as {
        message: string;
        args?: string[];
      };
      const session = await deps.session.get({ sessionID: context.sessionID });
      const cwd = session.location.directory;

      const result = await runGit(buildCommitArgs(message, args), cwd);
      const output = formatResult(result);
      if (result.code !== 0) {
        throw new Error(output || `git commit failed (exit code ${result.code})`);
      }
      return { content: output || "Committed." };
    },
  };
}

export function createCommitPushTool(
  deps: ToolDeps,
): ToolInfo<typeof commitPushInput> {
  return {
    name: "commit_push",
    description:
      "Create a git commit with the required co-author trailer, then push it. Stage changes with git add first.",
    input: commitPushInput,
    execute: async (parameters, context) => {
      const { message, args, remote, branch } = parameters as {
        message: string;
        args?: string[];
        remote?: string;
        branch?: string;
      };
      const session = await deps.session.get({ sessionID: context.sessionID });
      const cwd = session.location.directory;

      const commit = await runGit(buildCommitArgs(message, args), cwd);
      const commitOutput = formatResult(commit);
      if (commit.code !== 0) {
        throw new Error(
          commitOutput || `git commit failed (exit code ${commit.code})`,
        );
      }

      const current = await currentBranch(cwd);
      const targetBranch = branch ?? current;
      if (!targetBranch) {
        throw new Error(
          "Commit created, but push was skipped because HEAD is detached. Pass a branch name to push explicitly.",
        );
      }

      const targetRemote = remote ?? "origin";
      const tracked = await hasUpstream(cwd);
      const pushArgs =
        tracked && !remote && !branch
          ? ["push"]
          : ["push", "-u", targetRemote, targetBranch];

      const push = await runGit(pushArgs, cwd);
      const pushOutput = formatResult(push);
      if (push.code !== 0) {
        throw new Error(
          [commitOutput, pushOutput].filter(Boolean).join("\n") ||
            `git push failed (exit code ${push.code})`,
        );
      }

      return {
        content:
          [commitOutput, pushOutput].filter(Boolean).join("\n") ||
          "Committed and pushed.",
      };
    },
  };
}
