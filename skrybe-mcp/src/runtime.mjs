import { randomUUID } from "node:crypto";
import { HiveMindApiClientError } from "./api-client.mjs";

export function createHiveMindRuntime({ apiClient }) {
  return {
    async projectRegister(input) {
      try {
        const payload = await apiClient.registerProject(input);
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
