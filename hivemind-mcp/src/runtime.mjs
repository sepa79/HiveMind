import { randomUUID } from "node:crypto";
import { HiveMindApiClientError } from "./api-client.mjs";

export function createHiveMindRuntime({ apiClient, apiClients } = {}) {
  const backends = normalizeBackends({ apiClient, apiClients });
  const routeCache = {
    contextTokens: new Map(),
    sessionIds: new Map()
  };

  return {
    async backendList() {
      return jsonResult({
        backends: backends.map((backend) => backendInfo(backend))
      });
    },

    async healthCheck(input = {}) {
      let backend = null;
      const startedAt = Date.now();
      try {
        const selectedBackends = input.backend_id ? [selectBackendById(backends, input.backend_id)] : backends;
        if (selectedBackends.length > 1) {
          const results = [];
          for (const backend of selectedBackends) {
            results.push(await checkBackendHealth(backend, input.timeout_ms));
          }
          return jsonResult({
            status: results.every((result) => result.status === "ok") ? "ok" : "degraded",
            backends: results
          });
        }
        backend = selectedBackends[0];
        const payload = await backend.apiClient.healthCheck({ timeoutMs: input.timeout_ms });
        return jsonResult({
          status: "ok",
          reachable: true,
          backend_id: backend.backend_id,
          api_base_url: backend.apiClient.baseUrl,
          latency_ms: Date.now() - startedAt,
          api: payload
        });
      } catch (error) {
        if (error instanceof HiveMindApiClientError) {
          return jsonResult({
            status: error.status === 0 ? "unreachable" : "unhealthy",
            reachable: error.status !== 0,
            backend_id: backend?.backend_id ?? null,
            api_base_url: backend?.apiClient?.baseUrl ?? null,
            latency_ms: Date.now() - startedAt,
            error: {
              code: error.code,
              message: error.message,
              details: error.details
            },
            meta: error.meta
          });
        }
        return errorResult(error);
      }
    },

    async projectRegister(input) {
      try {
        const backend = await resolveBackend(backends, input);
        const payload = await backend.apiClient.registerProject(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async projectList(input = {}) {
      try {
        if (input.backend_id) {
          const backend = selectBackendById(backends, input.backend_id);
          const payload = await backend.apiClient.listProjects();
          return jsonResult({
            projects: annotateProjects(payload.projects, backend),
            backends: [backendInfo(backend)],
            summary: `Found ${payload.projects.length} project${payload.projects.length === 1 ? "" : "s"} in backend '${backend.backend_id}'.`
          });
        }
        const projectLists = [];
        for (const backend of backends) {
          const payload = await backend.apiClient.listProjects();
          projectLists.push({ backend, projects: payload.projects });
        }
        ensureNoDuplicateProjects(projectLists);
        const projects = projectLists.flatMap(({ backend, projects }) => annotateProjects(projects, backend));
        return jsonResult({
          projects,
          backends: backends.map((backend) => backendInfo(backend)),
          summary: `Found ${projects.length} project${projects.length === 1 ? "" : "s"} across ${backends.length} backend${backends.length === 1 ? "" : "s"}.`
        });
      } catch (error) {
        return errorResult(error);
      }
    },

    async projectResolve(input) {
      try {
        if (input.backend_id) {
          const backend = selectBackendById(backends, input.backend_id);
          const payload = await backend.apiClient.resolveProject(stripRouting(input));
          return jsonResult(annotateProjectResolve(payload, backend));
        }
        const resolved = [];
        for (const backend of backends) {
          const payload = await backend.apiClient.resolveProject(stripRouting(input));
          resolved.push({ backend, payload });
        }
        const matches = resolved.filter((result) => result.payload.status === "matched");
        if (matches.length > 1) {
          throw new HiveMindRoutingError(
            "MCP_BACKEND_AMBIGUOUS",
            "Project resolution matched multiple configured HiveMind backends. Pass backend_id or fix duplicate backend/project configuration.",
            {
              matches: matches.map(({ backend, payload }) => ({
                backend_id: backend.backend_id,
                api_base_url: backend.apiClient.baseUrl,
                project_id: payload.project?.project_id ?? null,
                resolution_reason: payload.resolution_reason
              }))
            }
          );
        }
        if (matches.length === 1) {
          return jsonResult(annotateProjectResolve(matches[0].payload, matches[0].backend));
        }
        const ambiguous = resolved.filter((result) => result.payload.status === "ambiguous");
        if (ambiguous.length > 0) {
          throw new HiveMindRoutingError("MCP_BACKEND_AMBIGUOUS", "Project resolution is ambiguous in a configured backend.", {
            matches: ambiguous.flatMap(({ backend, payload }) =>
              payload.candidates.map((candidate) => ({
                backend_id: backend.backend_id,
                api_base_url: backend.apiClient.baseUrl,
                project_id: candidate.project.project_id,
                score: candidate.score
              }))
            )
          });
        }
        const payload = {
          status: "not_found",
          project: null,
          candidates: [],
          resolution_reason: "No configured HiveMind backend matched the provided repository or workspace hints."
        };
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async featureList(input) {
      try {
        const backend = await resolveBackend(backends, input);
        const payload = await backend.apiClient.listFeatures(input.project_id);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async featureAdd(input) {
      try {
        const backend = await resolveBackend(backends, input);
        const payload = await backend.apiClient.addFeature(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async featureRemove(input) {
      try {
        const backend = await resolveBackend(backends, input);
        const payload = await backend.apiClient.removeFeature(input.project_id, input.feature);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async featureRename(input) {
      try {
        const backend = await resolveBackend(backends, input);
        const payload = await backend.apiClient.renameFeature(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async contextOpen(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.openContext(stripRouting(input), {
          idempotencyKey: input.idempotencyKey ?? `context-${randomUUID()}`
        });
        rememberContextRoute(routeCache, payload.context?.context_token, backend);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async contextGet(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.getContext(input.context_token);
        rememberContextRoute(routeCache, payload.context?.context_token, backend);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async contextUpdate(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.updateContext(stripRouting(input));
        rememberContextRoute(routeCache, payload.context?.context_token, backend);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async contextClose(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.closeContext(input.context_token);
        rememberContextRoute(routeCache, payload.context?.context_token, backend);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async contextGetProjectBrief(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.getProjectBrief(input.context_token);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async contextGetBranchBrief(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.getBranchBrief(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async contextGetOpenThreads(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.getOpenThreads(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async learningCapture(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.captureLearning(stripRouting(input), {
          idempotencyKey: input.idempotencyKey ?? `learning-${randomUUID()}`
        });
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async learningFeedback(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.appendLearningFeedback(stripRouting(input), {
          idempotencyKey: input.idempotencyKey ?? `learning-feedback-${randomUUID()}`
        });
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async learningGetRecent(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.getRecentLearnings(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async learningSearch(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.searchLearnings(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async issueReport(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.reportIssue(stripRouting(input), {
          idempotencyKey: input.idempotencyKey ?? `issue-${randomUUID()}`
        });
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async issueGet(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.getIssue(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async issueAddEvent(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.addIssueEvent(stripRouting(input), {
          idempotencyKey: input.idempotencyKey ?? `issue-event-${randomUUID()}`
        });
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async issueList(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.listIssues(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async rulesDefine(input) {
      try {
        const backend = await resolveBackend(backends, input);
        const payload = await backend.apiClient.defineRules(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async rulesGet(input) {
      try {
        const backend = await resolveBackend(backends, input);
        const payload = await backend.apiClient.getRules(input.project_id);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async projectStandardProfileDefine(input) {
      try {
        const backend = await resolveBackend(backends, input);
        const payload = await backend.apiClient.defineProjectStandardProfile(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async rulesetCatalogList(input = {}) {
      try {
        const backend = await resolveBackend(backends, input);
        const payload = await backend.apiClient.listRulesetCatalogProfiles();
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async rulesetCatalogGet(input) {
      try {
        const backend = await resolveBackend(backends, input);
        const payload = input.include_files
          ? await backend.apiClient.getRulesetCatalogBundle(stripRouting(input))
          : await backend.apiClient.getRulesetCatalogProfile(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async guidanceCheck(input) {
      try {
        const backend = await resolveBackend(backends, input);
        const payload = await backend.apiClient.guidanceCheck(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async sessionStart(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.startSession(stripRouting(input), {
          idempotencyKey: input.idempotencyKey ?? `session-${randomUUID()}`
        });
        rememberSessionRoute(routeCache, payload.session?.session_id, backend);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async sessionEnd(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.endSession(stripRouting(input));
        rememberSessionRoute(routeCache, payload.session?.session_id, backend);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async entryAppend(input) {
      try {
        const backend = await resolveBackend(backends, input);
        const payload = await backend.apiClient.appendEntry(stripRouting(input), {
          idempotencyKey: input.idempotencyKey ?? `entry-${randomUUID()}`
        });
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async entryMark(input) {
      try {
        const backend = await resolveBackend(backends, input);
        const payload = await backend.apiClient.markEntry(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async entryCorrect(input) {
      try {
        const backend = await resolveBackend(backends, input);
        const payload = await backend.apiClient.correctEntry(stripRouting(input), {
          idempotencyKey: input.idempotencyKey ?? `entry-correct-${randomUUID()}`
        });
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async projectReview(input) {
      try {
        const backend = await resolveBackend(backends, input);
        const payload = await backend.apiClient.reviewProject(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async hivemindFeedback(input) {
      try {
        const backend = await resolveBackend(backends, { ...input, project_id: "hivemind" });
        const contextLines = [
          input.details,
          input.source_project_id ? `Source project: ${input.source_project_id}` : null,
          input.source_session_id ? `Source session: ${input.source_session_id}` : null,
          input.source_entry_id ? `Source entry: ${input.source_entry_id}` : null,
          input.source_workspace_path ? `Source workspace: ${input.source_workspace_path}` : null
        ].filter(Boolean);
        const payload = await backend.apiClient.appendEntry(
          {
            project_id: "hivemind",
            session_id: input.session_id,
            branch: input.branch,
            author_id: input.author_id,
            author_type: input.author_type,
            source: input.source,
            entry_type: "feedback",
            summary: input.summary,
            details: contextLines.length ? contextLines.join("\n") : undefined,
            category: "product-feedback",
            tags: [...new Set(["hivemind-feedback", ...(input.tags ?? [])])],
            lifecycle_state: "open",
            importance: "high"
          },
          { idempotencyKey: input.idempotencyKey ?? `hivemind-feedback-${randomUUID()}` }
        );
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async adminMemoryReview(input) {
      try {
        if (input.backend_id || backends.length === 1) {
          const backend = await resolveBackend(backends, input);
          const payload = await backend.apiClient.reviewAdminMemory(stripRouting(input));
          return jsonResult(annotateAdminMemoryReview(payload, backend));
        }
        const projectLists = [];
        for (const backend of backends) {
          const payload = await backend.apiClient.listProjects();
          projectLists.push({ backend, projects: payload.projects });
        }
        ensureNoDuplicateProjects(projectLists);
        const requestedProjectIds = new Set(input.project_ids ?? []);
        const knownProjectIds = new Set(projectLists.flatMap(({ projects }) => projects.map((project) => project.project_id)));
        const missingProjectIds = [...requestedProjectIds].filter((projectId) => !knownProjectIds.has(projectId));
        if (missingProjectIds.length > 0) {
          throw new HiveMindRoutingError("MCP_BACKEND_PROJECT_NOT_FOUND", "One or more requested projects were not found in configured HiveMind backends.", {
            project_ids: missingProjectIds
          });
        }
        const reviews = [];
        for (const { backend, projects } of projectLists) {
          const backendProjectIds = projects
            .map((project) => project.project_id)
            .filter((projectId) => requestedProjectIds.size === 0 || requestedProjectIds.has(projectId));
          if (backendProjectIds.length === 0) {
            continue;
          }
          const payload = await backend.apiClient.reviewAdminMemory({
            ...stripRouting(input),
            project_ids: backendProjectIds
          });
          reviews.push(annotateAdminMemoryReview(payload, backend));
        }
        const projectReviews = reviews.flatMap((review) => review.project_reviews);
        const recommendedActions = reviews.flatMap((review) => review.recommended_actions);
        return jsonResult({
          generated_at: new Date().toISOString(),
          project_reviews: projectReviews,
          recommended_actions: recommendedActions,
          backends: backends.map((backend) => backendInfo(backend)),
          summary: `Reviewed ${projectReviews.length} project${projectReviews.length === 1 ? "" : "s"} across ${backends.length} configured backends.`
        });
      } catch (error) {
        return errorResult(error);
      }
    },

    async ruleCheckSubmit(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.submitRuleCheck(stripRouting(input), {
          idempotencyKey: input.idempotencyKey ?? `rule-check-${randomUUID()}`
        });
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async ruleCheckListForSession(input) {
      try {
        const backend = await resolveBackend(backends, input, routeCache);
        const payload = await backend.apiClient.listRuleChecks(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async entrySearch(input) {
      try {
        const backend = await resolveBackend(backends, input);
        const payload = await backend.apiClient.searchEntries(stripRouting(input));
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    }
  };
}

class HiveMindRoutingError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "HiveMindRoutingError";
    this.code = code;
    this.details = details;
  }
}

function normalizeBackends({ apiClient, apiClients }) {
  const configured = apiClients ?? (apiClient ? [{ backend_id: "default", apiClient }] : []);
  if (configured.length === 0) {
    throw new Error("HiveMind runtime requires at least one API client.");
  }
  const seen = new Set();
  return configured.map((backend, index) => {
    const backendId = backend.backend_id ?? backend.id ?? (index === 0 ? "default" : null);
    if (!backendId) {
      throw new Error(`HiveMind API client at index ${index} is missing backend_id.`);
    }
    if (seen.has(backendId)) {
      throw new Error(`Duplicate HiveMind backend_id '${backendId}'.`);
    }
    seen.add(backendId);
    return {
      backend_id: backendId,
      label: backend.label ?? backendId,
      apiClient: backend.apiClient ?? backend.client
    };
  });
}

function backendInfo(backend) {
  return {
    backend_id: backend.backend_id,
    label: backend.label,
    api_base_url: backend.apiClient.baseUrl
  };
}

async function checkBackendHealth(backend, timeoutMs) {
  const startedAt = Date.now();
  try {
    const payload = await backend.apiClient.healthCheck({ timeoutMs });
    return {
      status: "ok",
      reachable: true,
      ...backendInfo(backend),
      latency_ms: Date.now() - startedAt,
      api: payload
    };
  } catch (error) {
    if (error instanceof HiveMindApiClientError) {
      return {
        status: error.status === 0 ? "unreachable" : "unhealthy",
        reachable: error.status !== 0,
        ...backendInfo(backend),
        latency_ms: Date.now() - startedAt,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        },
        meta: error.meta
      };
    }
    throw error;
  }
}

async function resolveBackend(backends, input, routeCache = null) {
  if (input.backend_id) {
    return selectBackendById(backends, input.backend_id);
  }
  if (backends.length === 1) {
    return backends[0];
  }
  const cachedBackendId = cachedRouteBackendId(routeCache, input);
  if (cachedBackendId) {
    return selectBackendById(backends, cachedBackendId);
  }
  if (!input.project_id) {
    throw new HiveMindRoutingError(
      "MCP_BACKEND_REQUIRED",
      "Multiple HiveMind backends are configured. Pass backend_id for this operation.",
      {
        backends: backends.map((backend) => backendInfo(backend))
      }
    );
  }
  const matches = [];
  for (const backend of backends) {
    const payload = await backend.apiClient.listProjects();
    if (payload.projects.some((project) => project.project_id === input.project_id)) {
      matches.push(backend);
    }
  }
  if (matches.length === 1) {
    return matches[0];
  }
  if (matches.length === 0) {
    throw new HiveMindRoutingError("MCP_BACKEND_PROJECT_NOT_FOUND", `Project '${input.project_id}' was not found in any configured HiveMind backend.`, {
      project_id: input.project_id,
      backends: backends.map((backend) => backendInfo(backend))
    });
  }
  throw new HiveMindRoutingError(
    "MCP_BACKEND_AMBIGUOUS",
    `Project '${input.project_id}' exists in multiple configured HiveMind backends. Pass backend_id or remove the duplicate configuration.`,
    {
      project_id: input.project_id,
      matches: matches.map((backend) => backendInfo(backend))
    }
  );
}

function cachedRouteBackendId(routeCache, input) {
  if (!routeCache) {
    return null;
  }
  if (input.context_token && routeCache.contextTokens.has(input.context_token)) {
    return routeCache.contextTokens.get(input.context_token);
  }
  if (input.session_id && routeCache.sessionIds.has(input.session_id)) {
    return routeCache.sessionIds.get(input.session_id);
  }
  return null;
}

function rememberContextRoute(routeCache, contextToken, backend) {
  if (contextToken) {
    routeCache.contextTokens.set(contextToken, backend.backend_id);
  }
}

function rememberSessionRoute(routeCache, sessionId, backend) {
  if (sessionId) {
    routeCache.sessionIds.set(sessionId, backend.backend_id);
  }
}

function selectBackendById(backends, backendId) {
  const backend = backends.find((candidate) => candidate.backend_id === backendId);
  if (!backend) {
    throw new HiveMindRoutingError("MCP_BACKEND_NOT_FOUND", `No HiveMind backend is configured with id '${backendId}'.`, {
      backend_id: backendId,
      backends: backends.map((candidate) => backendInfo(candidate))
    });
  }
  return backend;
}

function ensureNoDuplicateProjects(projectLists) {
  const seen = new Map();
  const duplicates = [];
  for (const { backend, projects } of projectLists) {
    for (const project of projects) {
      const existing = seen.get(project.project_id);
      if (existing) {
        duplicates.push({
          project_id: project.project_id,
          backends: [existing.backend_id, backend.backend_id]
        });
      } else {
        seen.set(project.project_id, backendInfo(backend));
      }
    }
  }
  if (duplicates.length > 0) {
    throw new HiveMindRoutingError(
      "MCP_BACKEND_DUPLICATE_PROJECT",
      "Duplicate project ids exist across configured HiveMind backends. Fix configuration or use explicit backend_id.",
      { duplicates }
    );
  }
}

function annotateProjects(projects, backend) {
  return projects.map((project) => ({
    ...project,
    backend_id: backend.backend_id,
    api_base_url: backend.apiClient.baseUrl
  }));
}

function annotateProjectResolve(payload, backend) {
  return {
    ...payload,
    project: payload.project ? annotateProject(payload.project, backend) : null,
    candidates: payload.candidates.map((candidate) => ({
      ...candidate,
      project: annotateProject(candidate.project, backend),
      backend_id: backend.backend_id,
      api_base_url: backend.apiClient.baseUrl
    })),
    backend_id: payload.status === "matched" ? backend.backend_id : null,
    api_base_url: payload.status === "matched" ? backend.apiClient.baseUrl : null
  };
}

function annotateProject(project, backend) {
  return {
    ...project,
    backend_id: backend.backend_id,
    api_base_url: backend.apiClient.baseUrl
  };
}

function annotateAdminMemoryReview(payload, backend) {
  return {
    ...payload,
    project_reviews: payload.project_reviews.map((review) => ({
      ...review,
      project: annotateProject(review.project, backend),
      backend_id: backend.backend_id,
      api_base_url: backend.apiClient.baseUrl,
      recommended_actions: review.recommended_actions.map((action) => ({
        ...action,
        backend_id: backend.backend_id
      }))
    })),
    recommended_actions: payload.recommended_actions.map((action) => ({
      ...action,
      backend_id: backend.backend_id
    })),
    backend_id: backend.backend_id,
    api_base_url: backend.apiClient.baseUrl
  };
}

function stripRouting(input) {
  const { backend_id, ...payload } = input;
  return payload;
}

function jsonResult(payload) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2)
      }
    ],
    structuredContent: payload
  };
}

function errorResult(error) {
  if (error instanceof HiveMindRoutingError) {
    return {
      isError: true,
      ...jsonResult({
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        },
        meta: {}
      })
    };
  }

  if (error instanceof HiveMindApiClientError) {
    return {
      isError: true,
      ...jsonResult({
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        },
        meta: error.meta
      })
    };
  }

  return {
    isError: true,
    ...jsonResult({
      error: {
        code: "MCP_RUNTIME_ERROR",
        message: error instanceof Error ? error.message : String(error),
        details: {}
      },
      meta: {}
    })
  };
}
