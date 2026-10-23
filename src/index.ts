import { Plugin } from "@opencode/plugin";
import { redirectGitCommit } from "./redirect.ts";
import { createCommitPushTool, createCommitTool } from "./tools.ts";

export default Plugin.define({
  id: "self-attribution-oc",
  async setup(ctx) {
    const deps = { session: ctx.session };

    await ctx.tool.transform((editor) => {
      editor.add(createCommitTool(deps));
      editor.add(createCommitPushTool(deps));
    });

    await ctx.permission.hook("evaluate", redirectGitCommit);
  },
});
