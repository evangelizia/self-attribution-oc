import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { COAUTHOR_TRAILER } from "../src/attribution.ts";
import { runGit } from "../src/git.ts";
import {
  createCommitPushTool,
  createCommitTool,
  type ToolDeps,
} from "../src/tools.ts";

const gitConfig = join(tmpdir(), "self-attribution-oc-gitconfig");
writeFileSync(gitConfig, "[safe]\n\tdirectory = *\n");
process.env.GIT_CONFIG_GLOBAL = gitConfig;

const cleanups: string[] = [];

function tempRepo(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  cleanups.push(dir);
  return dir;
}

async function seedRepo(): Promise<string> {
  const dir = tempRepo("self-attribution-oc-");
  await runGit(["init", "-q", "-b", "main"], dir);
  await runGit(["config", "user.name", "Test User"], dir);
  await runGit(["config", "user.email", "test@example.com"], dir);
  writeFileSync(join(dir, "file.txt"), "hello\n");
  await runGit(["add", "file.txt"], dir);
  return dir;
}

function depsFor(directory: string): ToolDeps {
  return {
    session: {
      get: async () => ({ location: { directory } }),
    } as unknown as ToolDeps["session"],
  };
}

function contextFor(): never {
  return { sessionID: "ses_test" } as never;
}

afterEach(() => {
  for (const dir of cleanups.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

afterAll(() => {
  rmSync(gitConfig, { force: true });
});

describe("commit tool", () => {
  test("adds the hard-coded co-author trailer", async () => {
    const dir = await seedRepo();
    const tool = createCommitTool(depsFor(dir));

    await tool.execute({ message: "feat: add a test" }, contextFor());

    const log = await runGit(["log", "-1", "--format=%B"], dir);
    expect(log.stdout).toContain("feat: add a test");
    expect(log.stdout).toContain(COAUTHOR_TRAILER);
  });

  test("does not duplicate a manually supplied trailer", async () => {
    const dir = await seedRepo();
    const tool = createCommitTool(depsFor(dir));
    const message = `feat: add a test\n\n${COAUTHOR_TRAILER}`;

    await tool.execute({ message }, contextFor());

    const log = await runGit(["log", "-1", "--format=%B"], dir);
    const count = (log.stdout.match(/Co-authored-by:/gi) ?? []).length;
    expect(count).toBe(1);
  });

  test("passes extra git commit arguments", async () => {
    const dir = await seedRepo();
    const tool = createCommitTool(depsFor(dir));

    await tool.execute(
      { message: "feat: add a test", args: ["--no-verify"] },
      contextFor(),
    );

    const log = await runGit(["log", "-1", "--format=%B"], dir);
    expect(log.stdout).toContain(COAUTHOR_TRAILER);
  });
});

describe("commit_push tool", () => {
  test("commits with the trailer and pushes to a remote", async () => {
    const dir = await seedRepo();
    const remote = tempRepo("self-attribution-remote-");
    await runGit(["init", "--bare", "-q"], remote);
    await runGit(["remote", "add", "origin", remote], dir);

    const tool = createCommitPushTool(depsFor(dir));
    await tool.execute({ message: "feat: push a test" }, contextFor());

    const localLog = await runGit(["log", "-1", "--format=%B"], dir);
    const remoteLog = await runGit(
      ["log", "-1", "--format=%B", "refs/heads/main"],
      remote,
    );
    expect(localLog.stdout).toContain(COAUTHOR_TRAILER);
    expect(remoteLog.stdout).toBe(localLog.stdout);
  });
});
