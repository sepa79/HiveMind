import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { adminAuthorizationMatches } from "../app/admin-token.mjs";
import { canonicalProjectIdFromRepositorySlug } from "../app/project-identity.mjs";
import { ApiError } from "../app/errors.mjs";
import { ProjectOperationGates, normalizeProjectGateKeys } from "./request-operation-gate.mjs";
import { renderHumanUi } from "./ui.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(__dirname, "..", "..", "..", "assets");
const allowedSvgAssets = new Set([
  "hivemind-radial-grid-logo.svg",
  "hivemind-radial-grid-mark.svg"
]);

export function createApp({ service, accessLogger = null, adminToken = null }) {
  const app = new Hono();
  const operationGates = new ProjectOperationGates();
  const withShared = sharedRoute(operationGates);
  const withSharedJson = sharedJsonRoute(operationGates);
  const withSharedProject = sharedRoute(operationGates, routeProjectIds("projectId"));
  const withSharedPayloadProject = sharedJsonRoute(operationGates, payloadProjectIds("project_id"));
  const withSharedProjectJson = sharedJsonRoute(operationGates, routeProjectIds("projectId"));
  const withSharedResolvedContext = resolvedSharedRoute(
    operationGates,
    routeResolvedProjectIds((contextToken) => service.resolveProjectIdForContextToken(contextToken), "contextToken")
  );
  const withSharedResolvedContextJson = resolvedSharedJsonRoute(
    operationGates,
    routeResolvedProjectIds((contextToken) => service.resolveProjectIdForContextToken(contextToken), "contextToken")
  );
  const withSharedResolvedContextPayload = resolvedSharedJsonRoute(
    operationGates,
    payloadResolvedProjectIds((contextToken) => service.resolveProjectIdForContextToken(contextToken), "context_token")
  );
  const withSharedResolvedContextQuery = resolvedSharedRoute(
    operationGates,
    queryResolvedProjectIds((contextToken) => service.resolveProjectIdForContextToken(contextToken), "context_token")
  );
  const withSharedResolvedSession = resolvedSharedRoute(
    operationGates,
    routeResolvedProjectIds((sessionId) => service.resolveProjectIdForSessionId(sessionId), "sessionId")
  );
  const withSharedResolvedSessionJson = resolvedSharedJsonRoute(
    operationGates,
    routeResolvedProjectIds((sessionId) => service.resolveProjectIdForSessionId(sessionId), "sessionId")
  );
  const withExclusiveProject = exclusiveRoute(
    operationGates,
    routeProjectIds("projectId")
  );
  const withExclusiveProjectJson = exclusiveJsonRoute(
    operationGates,
    routeProjectIds("projectId")
  );
  const withExclusiveProjectsJson = exclusiveJsonRoute(
    operationGates,
    payloadProjectIds("source_project_id", "target_project_id")
  );

  app.use("*", async (c, next) => {
    const requestId = c.req.header("x-request-id") || randomUUID();
    const startedAt = Date.now();
    c.set("requestId", requestId);
    let thrownError = null;
    try {
      await next();
    } catch (error) {
      thrownError = error;
      throw error;
    } finally {
      const errorCode = thrownError instanceof ApiError ? thrownError.code : c.get("errorCode");
      writeAccessLog(accessLogger, {
        event: "http_request",
        request_id: requestId,
        method: c.req.method,
        path: c.req.path,
        status: thrownError ? errorStatus(thrownError) : c.res.status,
        duration_ms: Date.now() - startedAt,
        client_ip: clientIp(c),
        user_agent: c.req.header("user-agent") || null,
        ...(errorCode
          ? {
              error_code: errorCode
            }
          : {})
      });
    }
  });

  app.get("/", (c) => c.html(renderHumanUi({ version: service.version })));
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

  app.use("/v1/admin/*", async (c, next) => {
    if (!adminToken) {
      throw new ApiError(503, "ADMIN_TOKEN_NOT_CONFIGURED", "Admin token is not configured for this HiveMind API instance.", {});
    }
    if (!adminAuthorizationMatches(c.req.header("authorization"), adminToken)) {
      throw new ApiError(401, "UNAUTHORIZED", "Admin token is required for this operation.", {});
    }
    await next();
  });

  app.onError((error, c) => {
    const requestId = c.get("requestId");
    const err =
      error instanceof ApiError
        ? error
        : new ApiError(500, "INTERNAL_SERVER_ERROR", error.message || "Internal server error.");
    c.set("errorCode", err.code);

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

  app.notFound((c) => {
    c.set("errorCode", "NOT_FOUND");
    return c.json(
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
    );
  });

  app.get("/health", async (c) => {
    const data = await service.getHealth();
    return success(c, data);
  });

  app.post("/v1/projects", sharedJsonRoute(operationGates, projectIdsFromProjectRegistration)(async (c, payload) => {
    const data = await service.registerProject(payload);
    return success(c, data, 201);
  }));

  app.get("/v1/projects", withShared(async (c) => {
    const data = await service.listProjects();
    return success(c, data);
  }));

  app.post("/v1/projects/resolve", withSharedJson(async (c, payload) => {
    const data = await service.resolveProject(payload);
    return success(c, data);
  }));

  app.get("/v1/projects/:projectId/features", withSharedProject(async (c) => {
    const data = await service.listFeatures(c.req.param("projectId"));
    return success(c, data);
  }));

  app.post("/v1/projects/:projectId/features", withSharedProjectJson(async (c, payload) => {
    const data = await service.addFeature({
      project_id: c.req.param("projectId"),
      ...payload
    });
    return success(c, data);
  }));

  app.delete("/v1/projects/:projectId/features/:feature", withSharedProject(async (c) => {
    const data = await service.removeFeature({
      project_id: c.req.param("projectId"),
      feature: c.req.param("feature")
    });
    return success(c, data);
  }));

  app.post("/v1/projects/:projectId/features/:feature/rename", withSharedProjectJson(async (c, payload) => {
    const data = await service.renameFeature({
      project_id: c.req.param("projectId"),
      feature: c.req.param("feature"),
      ...payload
    });
    return success(c, data);
  }));

  app.post("/v1/contexts", withSharedPayloadProject(async (c, payload) => {
    const data = await service.openContext(payload, {
      idempotencyKey: c.req.header("Idempotency-Key")
    });
    return success(c, data, 201);
  }));

  app.get("/v1/contexts/:contextToken", withSharedResolvedContext(async (c) => {
    const data = await service.getContext(c.req.param("contextToken"));
    return success(c, data);
  }));

  app.patch("/v1/contexts/:contextToken", withSharedResolvedContextJson(async (c, payload) => {
    const data = await service.updateContext({
      context_token: c.req.param("contextToken"),
      ...payload
    });
    return success(c, data);
  }));

  app.post("/v1/contexts/:contextToken/close", withSharedResolvedContext(async (c) => {
    const data = await service.closeContext({
      context_token: c.req.param("contextToken")
    });
    return success(c, data);
  }));

  app.get("/v1/contexts/:contextToken/project-brief", withSharedResolvedContext(async (c) => {
    const data = await service.getProjectBrief({
      context_token: c.req.param("contextToken")
    });
    return success(c, data);
  }));

  app.get("/v1/contexts/:contextToken/branch-brief", withSharedResolvedContext(async (c) => {
    const data = await service.getBranchBrief({
      context_token: c.req.param("contextToken"),
      branch: c.req.query("branch") || undefined
    });
    return success(c, data);
  }));

  app.get("/v1/contexts/:contextToken/open-threads", withSharedResolvedContext(async (c) => {
    const limit = c.req.query("limit");
    const data = await service.getOpenThreads({
      context_token: c.req.param("contextToken"),
      branch: c.req.query("branch") || undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined
    });
    return success(c, data);
  }));

  app.post("/v1/learnings", withSharedResolvedContextPayload(async (c, payload) => {
    const data = await service.captureLearning(payload, {
      idempotencyKey: c.req.header("Idempotency-Key")
    });
    return success(c, data, 201);
  }));

  app.post("/v1/learning-feedback", withSharedResolvedContextPayload(async (c, payload) => {
    const data = await service.appendLearningFeedback(payload, {
      idempotencyKey: c.req.header("Idempotency-Key")
    });
    return success(c, data, 201);
  }));

  app.post("/v1/projects/:projectId/learnings/:learningId/resolve", withExclusiveProjectJson(async (c, payload) => {
    const data = await service.resolveLearning(
      {
        ...payload,
        project_id: c.req.param("projectId"),
        learning_id: c.req.param("learningId")
      },
      { idempotencyKey: c.req.header("Idempotency-Key") }
    );
    return success(c, data);
  }));

  app.post("/v1/learnings/recent", withSharedResolvedContextPayload(async (c, payload) => {
    const data = await service.getRecentLearnings(payload);
    return success(c, data);
  }));

  app.post("/v1/learnings/search", withSharedResolvedContextPayload(async (c, payload) => {
    const data = await service.searchLearnings(payload);
    return success(c, data);
  }));

  app.post("/v1/issues", withSharedResolvedContextPayload(async (c, payload) => {
    const data = await service.reportIssue(payload, {
      idempotencyKey: c.req.header("Idempotency-Key")
    });
    return success(c, data, 201);
  }));

  app.get("/v1/issues", withSharedResolvedContextQuery(async (c) => {
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
  }));

  app.get("/v1/issues/:issueId", withSharedResolvedContextQuery(async (c) => {
    const data = await service.getIssue({
      context_token: c.req.query("context_token"),
      issue_id: c.req.param("issueId")
    });
    return success(c, data);
  }));

  app.post("/v1/issues/:issueId/events", withSharedResolvedContextPayload(async (c, payload) => {
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
  }));

  app.put("/v1/projects/:projectId/ruleset", withSharedProjectJson(async (c, payload) => {
    const data = await service.defineRules({
      project_id: c.req.param("projectId"),
      ...payload
    });
    return success(c, data);
  }));

  app.get("/v1/projects/:projectId/ruleset", withSharedProject(async (c) => {
    const data = await service.getRules(c.req.param("projectId"));
    return success(c, data);
  }));

  app.put("/v1/projects/:projectId/standard-profile", withSharedProjectJson(async (c, payload) => {
    const data = await service.defineProjectStandardProfile({
      project_id: c.req.param("projectId"),
      ...payload
    });
    return success(c, data);
  }));

  app.put("/v1/projects/:projectId/standard-marker", withSharedProjectJson(async (c, payload) => {
    const data = await service.updateProjectStandardMarker({
      project_id: c.req.param("projectId"),
      ...payload
    });
    return success(c, data);
  }));

  app.get("/v1/ruleset-catalog/profiles", withShared(async (c) => {
    const data = await service.listRulesetCatalogProfiles();
    return success(c, data);
  }));

  app.get("/v1/ruleset-catalog/profiles/:profileId/versions/:version", withShared(async (c) => {
    const data = await service.getRulesetCatalogProfile({
      profile_id: c.req.param("profileId"),
      version: c.req.param("version")
    });
    return success(c, data);
  }));

  app.get("/v1/ruleset-catalog/profiles/:profileId/versions/:version/bundle", withShared(async (c) => {
    const data = await service.getRulesetCatalogBundle({
      profile_id: c.req.param("profileId"),
      version: c.req.param("version")
    });
    return success(c, data);
  }));

  app.post("/v1/guidance/check", withSharedPayloadProject(async (c, payload) => {
    const data = await service.guidanceCheck(payload);
    return success(c, data);
  }));

  app.post("/v1/sessions", withSharedPayloadProject(async (c, payload) => {
    const data = await service.startSession(payload, {
      idempotencyKey: c.req.header("Idempotency-Key")
    });
    return success(c, data, 201);
  }));

  app.get("/v1/sessions/:sessionId", withSharedResolvedSession(async (c) => {
    return success(c, await service.getSession({ session_id: c.req.param("sessionId") }));
  }));

  app.post("/v1/sessions/:sessionId/end", withSharedResolvedSessionJson(async (c, payload) => {
    const data = await service.endSession({
      session_id: c.req.param("sessionId"),
      ...payload
    });
    return success(c, data);
  }));

  app.get("/v1/sessions/:sessionId/closeout", withSharedResolvedSession(async (c) => {
    const data = await service.getSessionCloseout({
      session_id: c.req.param("sessionId")
    });
    return success(c, data);
  }));

  app.get("/v1/projects/:projectId/sessions", withSharedProject(async (c) => {
    const limit = c.req.query("limit");
    const data = await service.listSessions({
      project_id: c.req.param("projectId"),
      status: c.req.query("status") || undefined,
      branch: c.req.query("branch") || undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined
    });
    return success(c, data);
  }));

  app.post("/v1/entries", withSharedPayloadProject(async (c, payload) => {
    const data = await service.appendEntry(payload, {
      idempotencyKey: c.req.header("Idempotency-Key")
    });
    return success(c, data, 201);
  }));

  app.post("/v1/projects/:projectId/entries/:entryId/mark", withSharedProjectJson(async (c, payload) => {
    const data = await service.markEntry({
      project_id: c.req.param("projectId"),
      entry_id: c.req.param("entryId"),
      ...payload
    });
    return success(c, data);
  }));

  app.post("/v1/projects/:projectId/entries/:entryId/corrections", withSharedProjectJson(async (c, payload) => {
    const data = await service.correctEntry(
      {
        project_id: c.req.param("projectId"),
        entry_id: c.req.param("entryId"),
        ...payload
      },
      { idempotencyKey: c.req.header("Idempotency-Key") }
    );
    return success(c, data, 201);
  }));

  app.post("/v1/projects/:projectId/review", withSharedProjectJson(async (c, payload) => {
    const data = await service.reviewProject({
      project_id: c.req.param("projectId"),
      ...payload
    });
    return success(c, data);
  }));

  app.post("/v1/admin/memory-review", withSharedJson(async (c, payload) => {
    const data = await service.reviewAdminMemory(payload);
    return success(c, data);
  }));

  app.delete("/v1/admin/projects/:projectId", withExclusiveProject(async (c) => {
    const data = await service.deleteProject({
      project_id: c.req.param("projectId"),
      reason: c.req.query("reason") || undefined
    });
    return success(c, data);
  }));

  app.post("/v1/admin/projects/merge", withExclusiveProjectsJson(async (c, payload) => {
    const data = await service.mergeProjects(payload);
    return success(c, data);
  }));

  app.post("/v1/rule-checks", withSharedPayloadProject(async (c, payload) => {
    const data = await service.submitRuleCheck(payload, {
      idempotencyKey: c.req.header("Idempotency-Key")
    });
    return success(c, data, 201);
  }));

  app.get("/v1/projects/:projectId/rule-checks", withSharedProject(async (c) => {
    const data = await service.listRuleChecks({
      project_id: c.req.param("projectId"),
      session_id: c.req.query("session_id") || undefined,
      rule_id: c.req.query("rule_id") || undefined,
      status: c.req.query("status") || undefined
    });
    return success(c, data);
  }));

  app.post("/v1/entries/search", withSharedPayloadProject(async (c, payload) => {
    const data = await service.searchEntries(payload);
    return success(c, data);
  }));

  return app;
}

async function readJsonBody(c) {
  let payload;
  try {
    payload = await c.req.json();
  } catch (error) {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.", {
      message: error instanceof Error ? error.message : String(error)
    });
  }
  const routeFields = {
    projectId: "project_id",
    sessionId: "session_id",
    contextToken: "context_token",
    entryId: "entry_id",
    learningId: "learning_id",
    issueId: "issue_id",
    feature: "feature"
  };
  for (const [param, field] of Object.entries(routeFields)) {
    const routeValue = c.req.param(param);
    if (routeValue !== undefined && payload?.[field] !== undefined &&
        (typeof payload[field] !== "string" || payload[field].trim() !== routeValue.trim())) {
      throw new ApiError(400, "ROUTE_PARAMETER_MISMATCH", `Body field '${field}' must match the URL parameter.`, { field });
    }
  }
  return payload;
}

function sharedRoute(operationGates, projectIdResolver = null) {
  return (handler) => async (c) => {
    const projectIds = projectIdResolver ? await projectIdResolver(c) : [];
    return operationGates.runShared(projectIds, () => handler(c));
  };
}

function sharedJsonRoute(operationGates, projectIdResolver = null) {
  return (handler) => async (c) => {
    const payload = await readJsonBody(c);
    const projectIds = projectIdResolver ? await projectIdResolver(c, payload) : [];
    return operationGates.runShared(projectIds, () => handler(c, payload));
  };
}

function exclusiveRoute(operationGates, projectIdResolver = null) {
  return (handler) => async (c) => {
    const projectIds = projectIdResolver ? await projectIdResolver(c) : [];
    return operationGates.runExclusive(projectIds, () => handler(c));
  };
}

function exclusiveJsonRoute(operationGates, projectIdResolver = null) {
  return (handler) => async (c) => {
    const payload = await readJsonBody(c);
    const projectIds = projectIdResolver ? await projectIdResolver(c, payload) : [];
    return operationGates.runExclusive(projectIds, () => handler(c, payload));
  };
}

function resolvedSharedRoute(operationGates, projectIdResolver) {
  return (handler) => async (c) => runResolvedRoute(operationGates, projectIdResolver, c, undefined, handler);
}

function resolvedSharedJsonRoute(operationGates, projectIdResolver) {
  return (handler) => async (c) => {
    const payload = await readJsonBody(c);
    return runResolvedRoute(operationGates, projectIdResolver, c, payload, handler);
  };
}

async function runResolvedRoute(operationGates, projectIdResolver, c, payload, handler) {
  const projectIds = normalizeProjectGateKeys(await projectIdResolver(c, payload));
  return operationGates.runShared(projectIds, async () => {
    // A merge may move the resource while this request waits for its project.
    // Revalidate under the lock; never execute against an unlocked new owner.
    const currentProjectIds = normalizeProjectGateKeys(await projectIdResolver(c, payload));
    if (JSON.stringify(currentProjectIds) !== JSON.stringify(projectIds)) {
      throw new ApiError(409, "PROJECT_SCOPE_CHANGED", "Resource ownership changed while acquiring its project lock.", {});
    }
    return payload === undefined ? handler(c) : handler(c, payload);
  });
}

function routeProjectIds(paramName) {
  return (c) => [c.req.param(paramName)];
}

function routeResolvedProjectIds(resolveProjectId, paramName) {
  return async (c) => [await resolveProjectId(c.req.param(paramName))];
}

function queryResolvedProjectIds(resolveProjectId, queryName) {
  return async (c) => [await resolveProjectId(c.req.query(queryName))];
}

function payloadProjectIds(...fieldNames) {
  return (_c, payload) => fieldNames.map((fieldName) => payload?.[fieldName]);
}

function payloadResolvedProjectIds(resolveProjectId, fieldName) {
  return async (_c, payload) => [await resolveProjectId(payload?.[fieldName])];
}

function projectIdsFromProjectRegistration(_c, payload) {
  const slug = payload?.repository_slug;
  // Invalid types are rejected by the canonical service schema, before any write.
  return [payload?.project_id, typeof slug === "string" ? canonicalProjectIdFromRepositorySlug(slug) : null];
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

function writeAccessLog(accessLogger, entry) {
  if (!accessLogger) {
    return;
  }
  const line = JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString()
  });
  if (typeof accessLogger === "function") {
    accessLogger(line);
    return;
  }
  accessLogger.log(line);
}

function errorStatus(error) {
  return error instanceof ApiError ? error.status : 500;
}

function clientIp(c) {
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return c.req.header("x-real-ip") || null;
}
