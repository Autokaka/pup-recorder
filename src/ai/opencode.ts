// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/26.

import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import {
  DEFAULT_DURATION,
  DEFAULT_FPS,
  DEFAULT_HEIGHT,
  DEFAULT_OUT_DIR,
  DEFAULT_WIDTH,
} from "../base/schema";
import { pup } from "../pup";
import { MCP_TOOL_DESC, MCP_TOOL_NAME, PupMCPSchema } from "./mcp";

const z = tool.schema;

const PupPluginSchema = z.object({
  source: z.string().describe(PupMCPSchema.shape.source.description!),
  duration: z
    .number()
    .optional()
    .default(DEFAULT_DURATION)
    .describe(PupMCPSchema.shape.duration.description!),
  width: z
    .number()
    .optional()
    .default(DEFAULT_WIDTH)
    .describe(PupMCPSchema.shape.width.description!),
  height: z
    .number()
    .optional()
    .default(DEFAULT_HEIGHT)
    .describe(PupMCPSchema.shape.height.description!),
  fps: z
    .number()
    .optional()
    .default(DEFAULT_FPS)
    .describe(PupMCPSchema.shape.fps.description!),
  withAlphaChannel: z
    .boolean()
    .optional()
    .default(false)
    .describe(PupMCPSchema.shape.withAlphaChannel.description!),
  outDir: z
    .string()
    .optional()
    .default(DEFAULT_OUT_DIR)
    .describe(PupMCPSchema.shape.outDir.description!),
  useInnerProxy: z
    .boolean()
    .optional()
    .default(false)
    .describe(PupMCPSchema.shape.useInnerProxy.description!),
});

export const PupOpenCodePlugin: Plugin = async () => {
  return {
    tool: {
      [MCP_TOOL_NAME]: tool({
        description: MCP_TOOL_DESC,
        args: PupPluginSchema.shape,
        async execute(args) {
          try {
            const result = await pup(args.source, args);
            return JSON.stringify(result, null, 2);
          } catch (error) {
            return JSON.stringify({ error: String(error) });
          }
        },
      }),
    },
  };
};
