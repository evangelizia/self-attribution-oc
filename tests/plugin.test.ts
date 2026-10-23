import { describe, expect, test } from "bun:test";
import plugin from "../src/index.ts";

describe("plugin", () => {
  test("registers both commit tools and the permission redirect", async () => {
    const tools: string[] = [];
    const hooks: string[] = [];

    const ctx = {
      tool: {
        transform: async (
          callback: (editor: {
            add: (tool: { name: string }) => void;
          }) => void,
        ) => {
          callback({ add: (tool) => tools.push(tool.name) });
        },
      },
      permission: {
        hook: async (name: string) => {
          hooks.push(name);
        },
      },
      session: {
        get: async () => ({ location: { directory: process.cwd() } }),
      },
    };

    await plugin.setup(ctx as never);

    expect(tools).toEqual(["commit", "commit_push"]);
    expect(hooks).toEqual(["evaluate"]);
  });
});
