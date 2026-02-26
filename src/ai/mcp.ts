// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/26.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import packageJSON from "../../package.json";
import { RecordSchema } from "../base/schema";
import { pup } from "../pup";

export const PupMCPSchema = z
  .object({ source: z.string().describe("file://, http(s)://, or data: URI") })
  .extend(RecordSchema.shape);

export const MCP_TOOL_NAME = packageJSON.name;
export const MCP_TOOL_TITLE = "Record Webpage";
export const MCP_TOOL_DESC = "Record a webpage to video";

export function mcpAddPup(server: McpServer) {
  server.registerTool(
    MCP_TOOL_NAME,
    {
      title: MCP_TOOL_TITLE,
      description: MCP_TOOL_DESC,
      inputSchema: PupMCPSchema,
    },
    async (args) => {
      try {
        const result = await pup(args.source, args);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            { type: "text", text: JSON.stringify({ error: String(error) }) },
          ],
        };
      }
    },
  );
}

export async function startMCPServer() {
  const server = new McpServer(packageJSON);
  mcpAddPup(server);
  await server.connect(new StdioServerTransport());
}
