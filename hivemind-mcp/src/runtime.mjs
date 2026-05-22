import { randomUUID } from "node:crypto";
import { HiveMindApiClientError } from "./api-client.mjs";

export function createHiveMindRuntime({ apiClient }) {
  return {
    async healthCheck(input = {}) {
      const startedAt = Date.now();
      try {
        const payload = await apiClient.healthCheck({ timeoutMs: input.timeout_ms });
        return jsonResult({
          status: "ok",
          reachable: true,
          api_base_url: apiClient.baseUrl,
          latency_ms: Date.now() - startedAt,
          api: payload
        });
      } catch (error) {
        if (error instanceof HiveMindApiClientError) {
          return jsonResult({
            status: error.status === 0 ? "unreachable" : "unhealthy",
            reachable: error.status !== 0,
            api_base_url: apiClient.baseUrl,
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
        const payload = await apiClient.registerProject(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async projectList() {
      try {
        const payload = await apiClient.listProjects();
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async projectResolve(input) {
      try {
        const payload = await apiClient.resolveProject(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async featureList(input) {
      try {
        const payload = await apiClient.listFeatures(input.project_id);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async featureAdd(input) {
      try {
        const payload = await apiClient.addFeature(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async featureRemove(input) {
      try {
        const payload = await apiClient.removeFeature(input.project_id, input.feature);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async featureRename(input) {
      try {
        const payload = await apiClient.renameFeature(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async contextOpen(input) {
      try {
        const payload = await apiClient.openContext(input, {
          idempotencyKey: input.idempotencyKey ?? `context-${randomUUID()}`
        });
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async contextGet(input) {
      try {
        const payload = await apiClient.getContext(input.context_token);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async contextUpdate(input) {
      try {
        const payload = await apiClient.updateContext(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async contextClose(input) {
      try {
        const payload = await apiClient.closeContext(input.context_token);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async contextGetProjectBrief(input) {
      try {
        const payload = await apiClient.getProjectBrief(input.context_token);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async contextGetBranchBrief(input) {
      try {
        const payload = await apiClient.getBranchBrief(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async contextGetOpenThreads(input) {
      try {
        const payload = await apiClient.getOpenThreads(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async learningCapture(input) {
      try {
        const payload = await apiClient.captureLearning(input, {
          idempotencyKey: input.idempotencyKey ?? `learning-${randomUUID()}`
        });
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async learningFeedback(input) {
      try {
        const payload = await apiClient.appendLearningFeedback(input, {
          idempotencyKey: input.idempotencyKey ?? `learning-feedback-${randomUUID()}`
        });
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async learningGetRecent(input) {
      try {
        const payload = await apiClient.getRecentLearnings(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async learningSearch(input) {
      try {
        const payload = await apiClient.searchLearnings(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async issueReport(input) {
      try {
        const payload = await apiClient.reportIssue(input, {
          idempotencyKey: input.idempotencyKey ?? `issue-${randomUUID()}`
        });
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async issueGet(input) {
      try {
        const payload = await apiClient.getIssue(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async issueAddEvent(input) {
      try {
        const payload = await apiClient.addIssueEvent(input, {
          idempotencyKey: input.idempotencyKey ?? `issue-event-${randomUUID()}`
        });
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async issueList(input) {
      try {
        const payload = await apiClient.listIssues(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async rulesDefine(input) {
      try {
        const payload = await apiClient.defineRules(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async rulesGet(input) {
      try {
        const payload = await apiClient.getRules(input.project_id);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async projectStandardProfileDefine(input) {
      try {
        const payload = await apiClient.defineProjectStandardProfile(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async rulesetCatalogList() {
      try {
        const payload = await apiClient.listRulesetCatalogProfiles();
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async rulesetCatalogGet(input) {
      try {
        const payload = input.include_files
          ? await apiClient.getRulesetCatalogBundle(input)
          : await apiClient.getRulesetCatalogProfile(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async guidanceCheck(input) {
      try {
        const payload = await apiClient.guidanceCheck(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async sessionStart(input) {
      try {
        const payload = await apiClient.startSession(input, {
          idempotencyKey: input.idempotencyKey ?? `session-${randomUUID()}`
        });
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async sessionEnd(input) {
      try {
        const payload = await apiClient.endSession(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async entryAppend(input) {
      try {
        const payload = await apiClient.appendEntry(input, {
          idempotencyKey: input.idempotencyKey ?? `entry-${randomUUID()}`
        });
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async entryMark(input) {
      try {
        const payload = await apiClient.markEntry(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async entryCorrect(input) {
      try {
        const payload = await apiClient.correctEntry(input, {
          idempotencyKey: input.idempotencyKey ?? `entry-correct-${randomUUID()}`
        });
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async projectReview(input) {
      try {
        const payload = await apiClient.reviewProject(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async hivemindFeedback(input) {
      try {
        const contextLines = [
          input.details,
          input.source_project_id ? `Source project: ${input.source_project_id}` : null,
          input.source_session_id ? `Source session: ${input.source_session_id}` : null,
          input.source_entry_id ? `Source entry: ${input.source_entry_id}` : null,
          input.source_workspace_path ? `Source workspace: ${input.source_workspace_path}` : null
        ].filter(Boolean);
        const payload = await apiClient.appendEntry(
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
        const payload = await apiClient.reviewAdminMemory(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async ruleCheckSubmit(input) {
      try {
        const payload = await apiClient.submitRuleCheck(input, {
          idempotencyKey: input.idempotencyKey ?? `rule-check-${randomUUID()}`
        });
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async ruleCheckListForSession(input) {
      try {
        const payload = await apiClient.listRuleChecks(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    },

    async entrySearch(input) {
      try {
        const payload = await apiClient.searchEntries(input);
        return jsonResult(payload);
      } catch (error) {
        return errorResult(error);
      }
    }
  };
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
