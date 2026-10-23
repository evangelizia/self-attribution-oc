import { execFile } from "node:child_process";

export interface GitResult {
  code: number;
  stdout: string;
  stderr: string;
}

export function runGit(args: string[], cwd: string): Promise<GitResult> {
  return new Promise((resolve) => {
    execFile(
      "git",
      args,
      { cwd, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const code = error
          ? typeof error.code === "number"
            ? error.code
            : 1
          : 0;
        resolve({ code, stdout, stderr });
      },
    );
  });
}

export async function currentBranch(cwd: string): Promise<string | undefined> {
  const result = await runGit(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  if (result.code !== 0) return undefined;
  const branch = result.stdout.trim();
  return branch && branch !== "HEAD" ? branch : undefined;
}

export async function hasUpstream(cwd: string): Promise<boolean> {
  const result = await runGit(
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
    cwd,
  );
  return result.code === 0;
}
