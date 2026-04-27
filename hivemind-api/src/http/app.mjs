import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { ApiError } from "../app/errors.mjs";
import { renderHumanUi } from "./ui.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(__dirname, "..", "..", "..", "assets");
const allowedSvgAssets = new Set(["hivemind-radial-grid-logo.svg", "hivemind-radial-grid-mark.svg"]);

export function createApp({ service }) {
  const app = new Hono();

  app.use("*", async (c, next) => {
    const requestId = c.req.header("x-request-id") || randomUUID();
    c.set("requestId", requestId);
    await next();
  });

  app.get("/", (c) => c.html(renderHumanUi()));
  app.get("/favicon.ico", (c) => c.body(null, 204));
  app.get("/assets/:assetName", async (c) => {
    const assetName = c.req.param("assetName");
    if (!allowedSvgAssets.has(assetName)) {
      throw new ApiError(404, "ASSET_NOT_FOUND", `No asset exists with name '${assetName}'.`, {
        asset_name: assetName
      });
    }

    return c.body(await readFile(join(assetsDir, assetName), "utf8"), 200, {
      "content-type": "image/svg+xml; charset=utf-8"
    });
  });

  app.onError((error, c) => {
    const requestId = c.get("requestId");
    const err =
      error instanceof ApiError
        ? error
        : new ApiError(500, "INTERNAL_SERVER_ERROR", error.message || "Internal server error.");

    return c.json(
      {
        ok: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details
        },
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString()
        }
      },
      err.status
    );
  });

  app.notFound((c) =>
    c.json(
      {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: `No route matches ${c.req.method} ${c.req.path}.`,
          details: {}
        },
        meta: {
          request_id: c.get("requestId"),
          timestamp: new Date().toISOString()
        }
      },
      404
    )
  );

  app.get("/health", async (c) => {
    const data = await service.getHealth();
    return success(c, data);
  });

  app.post("/v1/projects", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.registerProject(payload);
    return success(c, data, 201);
  });

  app.get("/v1/projects", async (c) => {
    const data = await service.listProjects();
    return success(c, data);
  });

  app.get("/v1/projects/:projectId/features", async (c) => {
    const data = await service.listFeatures(c.req.param("projectId"));
    return success(c, data);
  });

  app.post("/v1/projects/:projectId/features", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.addFeature({
      project_id: c.req.param("projectId"),
      ...payload
    });
    return success(c, data);
  });

  app.delete("/v1/projects/:projectId/features/:feature", async (c) => {
    const data = await service.removeFeature({
      project_id: c.req.param("projectId"),
      feature: c.req.param("feature")
    });
    return success(c, data);
  });

  app.post("/v1/projects/:projectId/features/:feature/rename", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.renameFeature({
      project_id: c.req.param("projectId"),
      feature: c.req.param("feature"),
      ...payload
    });
    return success(c, data);
  });

  app.post("/v1/contexts", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.openContext(payload, {
      idempotencyKey: c.req.header("Idempotency-Key")
    });
    return success(c, data, 201);
  });

  app.get("/v1/contexts/:contextToken", async (c) => {
    const data = await service.getContext(c.req.param("contextToken"));
    return success(c, data);
  });

  app.patch("/v1/contexts/:contextToken", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.updateContext({
      context_token: c.req.param("contextToken"),
      ...payload
    });
    return success(c, data);
  });

  app.post("/v1/contexts/:contextToken/close", async (c) => {
    const data = await service.closeContext({
      context_token: c.req.param("contextToken")
    });
    return success(c, data);
  });

  app.get("/v1/contexts/:contextToken/project-brief", async (c) => {
    const data = await service.getProjectBrief({
      context_token: c.req.param("contextToken")
    });
    return success(c, data);
  });

  app.get("/v1/contexts/:contextToken/branch-brief", async (c) => {
    const data = await service.getBranchBrief({
      context_token: c.req.param("contextToken"),
      branch: c.req.query("branch") || undefined
    });
    return success(c, data);
  });

  app.get("/v1/contexts/:contextToken/open-threads", async (c) => {
    const limit = c.req.query("limit");
    const data = await service.getOpenThreads({
      context_token: c.req.param("contextToken"),
      branch: c.req.query("branch") || undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined
    });
    return success(c, data);
  });

  app.post("/v1/learnings", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.captureLearning(payload, {
      idempotencyKey: c.req.header("Idempotency-Key")
    });
    return success(c, data, 201);
  });

  app.post("/v1/learning-feedback", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.appendLearningFeedback(payload, {
      idempotencyKey: c.req.header("Idempotency-Key")
    });
    return success(c, data, 201);
  });

  app.post("/v1/learnings/recent", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.getRecentLearnings(payload);
    return success(c, data);
  });

  app.post("/v1/learnings/search", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.searchLearnings(payload);
    return success(c, data);
  });

  app.post("/v1/issues", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.reportIssue(payload, {
      idempotencyKey: c.req.header("Idempotency-Key")
    });
    return success(c, data, 201);
  });

  app.get("/v1/issues", async (c) => {
    const data = await service.listIssues({
      context_token: c.req.query("context_token"),
      branch: c.req.query("branch") || undefined,
      feature: c.req.query("feature") || undefined,
      source_tool: c.req.query("source_tool") || undefined,
      status: c.req.query("status") || undefined,
      tags: parseCsvQuery(c.req.query("tags")),
      query: c.req.query("query") || undefined,
      limit: c.req.query("limit") ? Number.parseInt(c.req.query("limit"), 10) : undefined,
      sort: c.req.query("sort") || undefined
    });
    return success(c, data);
  });

  app.get("/v1/issues/:issueId", async (c) => {
    const data = await service.getIssue({
      context_token: c.req.query("context_token"),
      issue_id: c.req.param("issueId")
    });
    return success(c, data);
  });

  app.post("/v1/issues/:issueId/events", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.addIssueEvent(
      {
        issue_id: c.req.param("issueId"),
        ...payload
      },
      {
        idempotencyKey: c.req.header("Idempotency-Key")
      }
    );
    return success(c, data, 201);
  });

  app.put("/v1/projects/:projectId/ruleset", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.defineRules({
      project_id: c.req.param("projectId"),
      ...payload
    });
    return success(c, data);
  });

  app.get("/v1/projects/:projectId/ruleset", async (c) => {
    const data = await service.getRules(c.req.param("projectId"));
    return success(c, data);
  });

  app.post("/v1/sessions", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.startSession(payload, {
      idempotencyKey: c.req.header("Idempotency-Key")
    });
    return success(c, data, 201);
  });

  app.post("/v1/sessions/:sessionId/end", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.endSession({
      session_id: c.req.param("sessionId"),
      ...payload
    });
    return success(c, data);
  });

  app.get("/v1/sessions/:sessionId/closeout", async (c) => {
    const data = await service.getSessionCloseout({
      session_id: c.req.param("sessionId")
    });
    return success(c, data);
  });

  app.get("/v1/projects/:projectId/sessions", async (c) => {
    const limit = c.req.query("limit");
    const data = await service.listSessions({
      project_id: c.req.param("projectId"),
      status: c.req.query("status") || undefined,
      branch: c.req.query("branch") || undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined
    });
    return success(c, data);
  });

  app.post("/v1/entries", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.appendEntry(payload, {
      idempotencyKey: c.req.header("Idempotency-Key")
    });
    return success(c, data, 201);
  });

  app.post("/v1/rule-checks", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.submitRuleCheck(payload, {
      idempotencyKey: c.req.header("Idempotency-Key")
    });
    return success(c, data, 201);
  });

  app.get("/v1/projects/:projectId/rule-checks", async (c) => {
    const data = await service.listRuleChecks({
      project_id: c.req.param("projectId"),
      session_id: c.req.query("session_id") || undefined,
      rule_id: c.req.query("rule_id") || undefined,
      status: c.req.query("status") || undefined
    });
    return success(c, data);
  });

  app.post("/v1/entries/search", async (c) => {
    const payload = await readJsonBody(c);
    const data = await service.searchEntries(payload);
    return success(c, data);
  });

  return app;
}

async function readJsonBody(c) {
  try {
    return await c.req.json();
  } catch (error) {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.", {
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

function parseCsvQuery(value) {
  if (!value) {
    return undefined;
  }
  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return values.length > 0 ? values : undefined;
}

function success(c, data, status = 200) {
  return c.json(
    {
      ok: true,
      data,
      meta: {
        request_id: c.get("requestId"),
        timestamp: new Date().toISOString()
      }
    },
    status
  );
}
