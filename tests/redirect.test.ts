import { describe, expect, test } from "bun:test";
import { isGitCommit } from "../src/redirect.ts";

describe("isGitCommit", () => {
  test.each([
    "git commit",
    "git commit -m 'feat: test'",
    "git  commit -am 'feat: test'",
    "git -C /repo commit -m test",
    "git -c user.name=test commit -m test",
    "git --no-pager commit -m test",
    "env FOO=bar git commit -m test",
    "sudo git commit -m test",
  ])("matches %s", (command) => {
    expect(isGitCommit(command)).toBe(true);
  });

  test.each([
    "git status",
    "git commit-tree abc",
    "git log --grep commit",
    "git push",
    "echo git commit",
    "npm run commit",
  ])("does not match %s", (command) => {
    expect(isGitCommit(command)).toBe(false);
  });
});
