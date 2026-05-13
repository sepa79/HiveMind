#!/usr/bin/env node

import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { HiveMindApiClient } from "./api-client.mjs";
import { createHiveMindRuntime } from "./runtime.mjs";

const apiBaseUrl = process.env.HIVEMIND_API_BASE_URL || "http://127.0.0.1:4010";
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

function createHiveMindMcpServer() {
const server = new McpServer({
  name: "hivemind",
  version: packageJson.version
});

const runtime = createHiveMindRuntime({
  apiClient: new HiveMindApiClient({ baseUrl: apiBaseUrl })
});

server.registerTool(
  "project_register",
  {
    title: "Register or update a HiveMind project",
    description: "Create or update one project definition in HiveMind.",
    inputSchema: {
      project_id: z.string(),
      name: z.string(),
      root_path: z.string(),
      default_branch: z.string(),
      description: z.string().optional()
    }
  },
  runtime.projectRegister
);

server.registerTool(
  "feature_list",
  {
    title: "List project features",
    description: "Fetch the managed feature vocabulary for one project.",
    inputSchema: {
      project_id: z.string()
    }
  },
  runtime.featureList
);

server.registerTool(
  "feature_add",
  {
    title: "Add a project feature",
    description: "Add one feature or user-story name to the managed project vocabulary so agents can tag future entries consistently.",
    inputSchema: {
      project_id: z.string(),
      feature: z.string()
    }
  },
  runtime.featureAdd
);

server.registerTool(
  "feature_remove",
  {
    title: "Remove a project feature",
    description: "Remove one feature name from the managed project vocabulary if it is not used in stored project memory.",
    inputSchema: {
      project_id: z.string(),
      feature: z.string()
    }
  },
  runtime.featureRemove
);

server.registerTool(
  "feature_rename",
  {
    title: "Rename a project feature",
    description: "Rename one feature in the managed vocabulary and cascade the rename through stored feature references.",
    inputSchema: {
      project_id: z.string(),
      feature: z.string(),
      new_feature: z.string()
    }
  },
  runtime.featureRename
);

server.registerTool(
  "context_open",
  {
    title: "Open a reusable HiveMind context",
    description: "Bind repeated project and tool context once and receive a reusable context token.",
    inputSchema: {
      project_id: z.string(),
      branch: z.string(),
      workspace_path: z.string(),
      feature: z.string().optional(),
      source_tool: z.string().optional(),
      tool_version: z.string().optional(),
      environment: z.string().optional(),
      dataset_version: z.string().optional(),
      author_id: z.string(),
      author_type: z.enum(["human", "agent", "system"]),
      source: z.enum(["mcp", "cli", "web", "import"]),
      agent_id: z.string().optional(),
      idempotencyKey: z.string().optional()
    }
  },
  runtime.contextOpen
);

server.registerTool(
  "context_get",
  {
    title: "Get a reusable HiveMind context",
    description: "Fetch the stored context behind a context token.",
    inputSchema: {
      context_token: z.string()
    }
  },
  runtime.contextGet
);

server.registerTool(
  "context_update",
  {
    title: "Update a reusable HiveMind context",
    description: "Patch the mutable fields of a stored context token.",
    inputSchema: {
      context_token: z.string(),
      branch: z.string().optional(),
      workspace_path: z.string().optional(),
      feature: z.string().optional(),
      source_tool: z.string().optional(),
      tool_version: z.string().optional(),
      environment: z.string().optional(),
      dataset_version: z.string().optional(),
      agent_id: z.string().optional()
    }
  },
  runtime.contextUpdate
);

server.registerTool(
  "context_close",
  {
    title: "Close a reusable HiveMind context",
    description: "Mark a stored context token as closed.",
    inputSchema: {
      context_token: z.string()
    }
  },
  runtime.contextClose
);

server.registerTool(
  "context_get_project_brief",
  {
    title: "Get a project brief for a context",
    description: "Fetch a bounded project summary including rules, recent decisions, recent learnings, active issues, and open threads.",
    inputSchema: {
      context_token: z.string()
    }
  },
  runtime.contextGetProjectBrief
);

server.registerTool(
  "context_get_branch_brief",
  {
    title: "Get a branch brief for a context",
    description: "Fetch a bounded branch summary including rules, recent decisions, recent learnings, active issues, and open threads.",
    inputSchema: {
      context_token: z.string(),
      branch: z.string().optional()
    }
  },
  runtime.contextGetBranchBrief
);

server.registerTool(
  "context_get_open_threads",
  {
    title: "Get open threads for a context",
    description: "Fetch bounded open threads for the resolved project and branch context.",
    inputSchema: {
      context_token: z.string(),
      branch: z.string().optional(),
      limit: z.number().int().positive().max(50).optional()
    }
  },
  runtime.contextGetOpenThreads
);

server.registerTool(
  "learning_capture",
  {
    title: "Capture a reusable learning",
    description: "Store a project learning using an existing context token instead of repeating full project metadata.",
    inputSchema: {
      context_token: z.string(),
      summary: z.string(),
      details: z.string().optional(),
      scope: z.enum(["tool", "env", "data", "workflow", "test_strategy"]),
      recommended_action: z.string(),
      status: z.enum(["active", "superseded", "resolved"]).optional(),
      importance: z.enum(["low", "normal", "high"]).optional(),
      tags: z.array(z.string()).optional(),
      links: z
        .array(
          z.object({
            kind: z.enum(["file", "repo_file", "commit", "pr", "command", "url"]),
            target: z.string(),
            label: z.string().optional()
          })
        )
        .optional(),
      artifacts: z
        .array(
          z.object({
            kind: z.enum(["file", "repo_file", "commit", "pr", "command", "url"]),
            target: z.string(),
            label: z.string().optional()
          })
        )
        .optional(),
      related_issue_ids: z.array(z.string()).optional(),
      idempotencyKey: z.string().optional()
    }
  },
  runtime.learningCapture
);

server.registerTool(
  "learning_get_recent",
  {
    title: "Get recent learnings for a context",
    description: "Fetch the most relevant recent learnings for a context, defaulting to active learnings for the same feature/tool when present.",
    inputSchema: {
      context_token: z.string(),
      feature: z.string().optional(),
      source_tool: z.string().optional(),
      scope: z.enum(["tool", "env", "data", "workflow", "test_strategy"]).optional(),
      status: z.enum(["active", "superseded", "resolved"]).optional(),
      limit: z.number().int().positive().max(50).optional()
    }
  },
  runtime.learningGetRecent
);

server.registerTool(
  "learning_feedback",
  {
    title: "Attach follow-up feedback to a learning",
    description: "Record confirmation, negative confirmation, or a comment for an existing learning without rewriting the original learning.",
    inputSchema: {
      context_token: z.string(),
      learning_id: z.string(),
      feedback_type: z.enum(["confirm", "did_not_work", "comment"]),
      comment: z.string().optional(),
      idempotencyKey: z.string().optional()
    }
  },
  runtime.learningFeedback
);

server.registerTool(
  "learning_search",
  {
    title: "Search project learnings",
    description: "Search project learnings within the project resolved by a context token.",
    inputSchema: {
      context_token: z.string(),
      branch: z.string().optional(),
      feature: z.string().optional(),
      source_tool: z.string().optional(),
      scope: z.enum(["tool", "env", "data", "workflow", "test_strategy"]).optional(),
      status: z.enum(["active", "superseded", "resolved"]).optional(),
      tags: z.array(z.string()).optional(),
      query: z.string().optional(),
      limit: z.number().int().positive().max(200).optional(),
      sort: z.enum(["recent", "importance"]).optional()
    }
  },
  runtime.learningSearch
);

server.registerTool(
  "issue_report",
  {
    title: "Report a tracked issue",
    description: "Create a first-class issue bound to an existing context token.",
    inputSchema: {
      context_token: z.string(),
      title: z.string(),
      summary: z.string(),
      details: z.string().optional(),
      severity: z.enum(["low", "normal", "high", "critical"]),
      tags: z.array(z.string()).optional(),
      github_issue_url: z.string().optional(),
      idempotencyKey: z.string().optional()
    }
  },
  runtime.issueReport
);

server.registerTool(
  "issue_get",
  {
    title: "Get one tracked issue",
    description: "Fetch one issue together with its event history.",
    inputSchema: {
      context_token: z.string(),
      issue_id: z.string()
    }
  },
  runtime.issueGet
);

server.registerTool(
  "issue_add_event",
  {
    title: "Append an issue lifecycle event",
    description: "Record a workaround, GitHub link, fix link, verification, or reopen event for a tracked issue.",
    inputSchema: {
      context_token: z.string(),
      issue_id: z.string(),
      event_type: z.enum([
        "reported",
        "workaround_added",
        "github_issue_linked",
        "fix_linked",
        "verified_fixed",
        "reopened"
      ]),
      summary: z.string(),
      details: z.string().optional(),
      version: z.string().optional(),
      branch: z.string().optional(),
      github_issue_url: z.string().optional(),
      links: z
        .array(
          z.object({
            kind: z.enum(["file", "repo_file", "commit", "pr", "command", "url"]),
            target: z.string(),
            label: z.string().optional()
          })
        )
        .optional(),
      artifacts: z
        .array(
          z.object({
            kind: z.enum(["file", "repo_file", "commit", "pr", "command", "url"]),
            target: z.string(),
            label: z.string().optional()
          })
        )
        .optional(),
      idempotencyKey: z.string().optional()
    }
  },
  runtime.issueAddEvent
);

server.registerTool(
  "issue_list",
  {
    title: "List tracked issues",
    description: "List issues for the project resolved by a context token, with filters for branch, feature, tool, and status.",
    inputSchema: {
      context_token: z.string(),
      branch: z.string().optional(),
      feature: z.string().optional(),
      source_tool: z.string().optional(),
      status: z.enum(["open", "fixed_pending_verification", "resolved", "closed", "active", "all"]).optional(),
      tags: z.array(z.string()).optional(),
      query: z.string().optional(),
      limit: z.number().int().positive().max(200).optional(),
      sort: z.enum(["recent", "severity"]).optional()
    }
  },
  runtime.issueList
);

server.registerTool(
  "rules_define",
  {
    title: "Define or update a project ruleset",
    description: "Store the active structured ruleset for one project.",
    inputSchema: {
      project_id: z.string(),
      rules: z.array(
        z.object({
          rule_id: z.string(),
          label: z.string(),
          description: z.string(),
          severity: z.enum(["required", "advisory"]),
          check_mode: z.enum([
            "manual_confirm",
            "artifact_required",
            "file_reference_required",
            "command_reference_required"
          ]),
          evidence_hint: z.string().optional(),
          applies_to: z.array(z.string()).optional(),
          tags: z.array(z.string()).optional()
        })
      )
    }
  },
  runtime.rulesDefine
);

server.registerTool(
  "rules_get",
  {
    title: "Get the active project ruleset",
    description: "Fetch the current structured ruleset for one project.",
    inputSchema: {
      project_id: z.string()
    }
  },
  runtime.rulesGet
);

server.registerTool(
  "session_start",
  {
    title: "Start a HiveMind session",
    description: "Open a HiveMind session and receive bounded warm-start context, including project features agents should use when tagging entries.",
    inputSchema: {
      project_id: z.string(),
      branch: z.string(),
      workspace_path: z.string(),
      author_id: z.string(),
      author_type: z.enum(["human", "agent", "system"]),
      source: z.enum(["mcp", "cli", "web", "import"]),
      agent_id: z.string(),
      goal: z.string(),
      plan_ref: z
        .object({
          kind: z.literal("file"),
          target: z.string(),
          label: z.string().optional(),
          source: z.enum(["agent_plan", "human_plan", "imported"]).optional(),
          digest: z.string().optional()
        })
        .optional(),
      idempotencyKey: z.string().optional()
    }
  },
  runtime.sessionStart
);

server.registerTool(
  "session_end",
  {
    title: "End a HiveMind session",
    description: "Mark a work-unit session ended and return a closeout report.",
    inputSchema: {
      session_id: z.string(),
      status: z.enum(["completed", "abandoned"]).optional()
    }
  },
  runtime.sessionEnd
);

server.registerTool(
  "entry_append",
  {
    title: "Append a HiveMind entry",
    description: "Store one structured journal entry in HiveMind. Use a feature from session_start context when the entry belongs to a feature, user story, or work stream.",
    inputSchema: {
      project_id: z.string(),
      session_id: z.string(),
      branch: z.string(),
      author_id: z.string(),
      author_type: z.enum(["human", "agent", "system"]),
      source: z.enum(["mcp", "cli", "web", "import"]),
      entry_type: z.enum(["decision", "plan_ref", "progress", "feedback", "artifact_ref", "tooling_note", "risk"]),
      summary: z.string(),
      details: z.string().optional(),
      feature: z.string().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      links: z
        .array(
          z.object({
            kind: z.enum(["file", "repo_file", "commit", "pr", "command", "url"]),
            target: z.string(),
            label: z.string().optional()
          })
        )
        .optional(),
      artifacts: z
        .array(
          z.object({
            kind: z.enum(["file", "repo_file", "commit", "pr", "command", "url"]),
            target: z.string(),
            label: z.string().optional()
          })
        )
        .optional(),
      lifecycle_state: z.enum(["open", "resolved", "superseded"]).optional(),
      importance: z.enum(["low", "normal", "high"]).optional(),
      idempotencyKey: z.string().optional()
    }
  },
  runtime.entryAppend
);

server.registerTool(
  "rule_check_submit",
  {
    title: "Submit one rule check",
    description: "Record whether one project rule was followed in a session.",
    inputSchema: {
      project_id: z.string(),
      session_id: z.string(),
      rule_id: z.string(),
      author_id: z.string(),
      author_type: z.enum(["human", "agent", "system"]),
      source: z.enum(["mcp", "cli", "web", "import"]),
      status: z.enum(["applied", "not_applicable", "blocked", "skipped"]),
      evidence: z.string().optional(),
      note: z.string().optional(),
      links: z
        .array(
          z.object({
            kind: z.enum(["file", "repo_file", "commit", "pr", "command", "url"]),
            target: z.string(),
            label: z.string().optional()
          })
        )
        .optional(),
      idempotencyKey: z.string().optional()
    }
  },
  runtime.ruleCheckSubmit
);

server.registerTool(
  "rule_check_list_for_session",
  {
    title: "List rule checks for one session",
    description: "Fetch stored rule checks for one project session.",
    inputSchema: {
      project_id: z.string(),
      session_id: z.string(),
      rule_id: z.string().optional(),
      status: z.enum(["applied", "not_applicable", "blocked", "skipped"]).optional()
    }
  },
  runtime.ruleCheckListForSession
);

server.registerTool(
  "entry_search",
  {
    title: "Search HiveMind entries",
    description: "Search entries in one HiveMind project.",
    inputSchema: {
      project_id: z.string(),
      branch: z.string().optional(),
      session_id: z.string().optional(),
      entry_type: z
        .array(z.enum(["decision", "plan_ref", "progress", "feedback", "artifact_ref", "tooling_note", "risk"]))
        .optional(),
      feature: z.string().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      lifecycle_state: z.enum(["open", "resolved", "superseded"]).optional(),
      query: z.string().optional(),
      limit: z.number().int().positive().max(200).optional(),
      sort: z.enum(["recent", "importance"]).optional()
    }
  },
  runtime.entrySearch
);

return server;
}

const transportMode = process.env.HIVEMIND_MCP_TRANSPORT || (process.argv.includes("--http") ? "http" : "stdio");

if (transportMode === "http" || transportMode === "streamable-http") {
  await startHttpServer();
} else if (transportMode === "stdio") {
  await startStdioServer();
} else {
  throw new Error(`Unsupported HIVEMIND_MCP_TRANSPORT '${transportMode}'. Use 'stdio' or 'http'.`);
}

async function startStdioServer() {
  const server = createHiveMindMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function startHttpServer() {
  const host = process.env.HIVEMIND_MCP_HOST || "127.0.0.1";
  const port = Number(process.env.HIVEMIND_MCP_PORT || "4011");
  const path = process.env.HIVEMIND_MCP_PATH || "/mcp";

  const httpServer = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || `${host}:${port}`}`);

      if (url.pathname === "/health") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: true, name: "hivemind", version: packageJson.version }));
        return;
      }

      if (url.pathname !== path) {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "not_found" }));
        return;
      }

      if (req.method !== "POST") {
        res.writeHead(405, { "content-type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Method not allowed." },
          id: null
        }));
        return;
      }

      const body = await readJsonBody(req);
      const mcpServer = createHiveMindMcpServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, body);
      res.on("close", () => {
        transport.close().catch((error) => console.error("HiveMind MCP transport close failed:", error));
        mcpServer.close().catch((error) => console.error("HiveMind MCP server close failed:", error));
      });
    } catch (error) {
      console.error("HiveMind MCP HTTP request failed:", error);
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null
        }));
      }
    }
  });

  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, host, () => {
      httpServer.off("error", reject);
      console.error(`HiveMind MCP listening on http://${host}:${port}${path}`);
      resolve();
    });
  });
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return undefined;
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
