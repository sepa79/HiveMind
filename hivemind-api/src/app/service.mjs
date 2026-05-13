import {
  ContextBranchBriefInputSchema,
  ContextBranchBriefResultSchema,
  ContextCloseInputSchema,
  ContextOpenThreadsInputSchema,
  ContextOpenThreadsResultSchema,
  ContextOpenInputSchema,
  ContextOpenResultSchema,
  ContextProjectBriefInputSchema,
  ContextProjectBriefResultSchema,
  ContextRecordSchema,
  ContextUpdateInputSchema,
  EntryCreateInputSchema,
  EntrySearchInputSchema,
  FeatureAddInputSchema,
  FeatureListResultSchema,
  FeatureRemoveInputSchema,
  FeatureRenameInputSchema,
  IssueEventCreateInputSchema,
  IssueEventRecordSchema,
  IssueGetInputSchema,
  IssueGetResultSchema,
  IssueListInputSchema,
  IssueListResultSchema,
  IssueRecordSchema,
  IssueReportInputSchema,
  LearningCaptureInputSchema,
  LearningFeedbackCreateInputSchema,
  LearningFeedbackRecordSchema,
  LearningListResultSchema,
  LearningRecordSchema,
  LearningGetRecentInputSchema,
  LearningSearchInputSchema,
  ProjectListResultSchema,
  ProjectRegisterInputSchema,
  RuleCheckCreateInputSchema,
  RuleCheckListInputSchema,
  RuleCheckListResultSchema,
  RuleCheckSubmitResultSchema,
  RulesetDefineInputSchema,
  RulesetRecordSchema,
  SearchResultSchema,
  SessionCloseoutInputSchema,
  SessionCloseoutResultSchema,
  SessionEndInputSchema,
  SessionEndResultSchema,
  SessionListInputSchema,
  SessionListResultSchema,
  SessionStartContextSchema,
  SessionStartInputSchema,
  SessionStartResultSchema
} from "../domain/schemas.mjs";
import { ApiError } from "./errors.mjs";

export class HiveMindService {
  constructor({ storage, dataRoot = null, version = "0.0.0" } = {}) {
    this.storage = storage;
    this.dataRoot = dataRoot;
    this.version = version;
  }

  async getHealth() {
    const { projects } = await this.storage.listProjects();
    return {
      status: "ok",
      service: "hivemind-api",
      version: this.version,
      data_root: this.dataRoot,
      project_count: projects.length,
      projects: projects.map((project) => ({
        project_id: project.project_id,
        name: project.name,
        features: project.features
      }))
    };
  }

  async registerProject(input) {
    const payload = parseWithSchema(ProjectRegisterInputSchema, input);
    return {
      project: await this.storage.createProject(payload)
    };
  }

  async listProjects() {
    return parseWithSchema(ProjectListResultSchema, await this.storage.listProjects());
  }

  async listFeatures(projectId) {
    return parseWithSchema(FeatureListResultSchema, await this.storage.listFeatures(projectId));
  }

  async addFeature(input) {
    const payload = parseWithSchema(FeatureAddInputSchema, input);
    return parseWithSchema(FeatureListResultSchema, await this.storage.addFeature(payload.project_id, payload.feature));
  }

  async removeFeature(input) {
    const payload = parseWithSchema(FeatureRemoveInputSchema, input);
    return parseWithSchema(FeatureListResultSchema, await this.storage.removeFeature(payload.project_id, payload.feature));
  }

  async renameFeature(input) {
    const payload = parseWithSchema(FeatureRenameInputSchema, input);
    return parseWithSchema(
      FeatureListResultSchema,
      await this.storage.renameFeature(payload.project_id, payload.feature, payload.new_feature)
    );
  }

  async openContext(input, { idempotencyKey }) {
    if (!idempotencyKey) {
      throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Missing required Idempotency-Key header.");
    }
    const payload = parseWithSchema(ContextOpenInputSchema, input);
    const { context } = await this.storage.openContext(payload, { idempotencyKey });
    return parseWithSchema(ContextOpenResultSchema, {
      context: parseWithSchema(ContextRecordSchema, context)
      ,
      startup_summary: await this.storage.getStartupSummary(context.project_id, context.branch, context.feature)
    });
  }

  async getContext(contextToken) {
    const context = await this.storage.getContext(contextToken);
    if (!context) {
      throw new ApiError(404, "CONTEXT_NOT_FOUND", `No context exists with token '${contextToken}'.`, {
        context_token: contextToken
      });
    }
    return {
      context: parseWithSchema(ContextRecordSchema, context)
    };
  }

  async updateContext(input) {
    const payload = parseWithSchema(ContextUpdateInputSchema, input);
    return {
      context: parseWithSchema(ContextRecordSchema, await this.storage.updateContext(payload.context_token, payload))
    };
  }

  async closeContext(input) {
    const payload = parseWithSchema(ContextCloseInputSchema, input);
    return {
      context: parseWithSchema(ContextRecordSchema, await this.storage.closeContext(payload.context_token))
    };
  }

  async getProjectBrief(input) {
    const payload = parseWithSchema(ContextProjectBriefInputSchema, input);
    return parseWithSchema(ContextProjectBriefResultSchema, await this.storage.getProjectBrief(payload.context_token));
  }

  async getBranchBrief(input) {
    const payload = parseWithSchema(ContextBranchBriefInputSchema, input);
    return parseWithSchema(
      ContextBranchBriefResultSchema,
      await this.storage.getBranchBrief(payload.context_token, payload.branch)
    );
  }

  async getOpenThreads(input) {
    const payload = parseWithSchema(ContextOpenThreadsInputSchema, input);
    return parseWithSchema(
      ContextOpenThreadsResultSchema,
      await this.storage.getOpenThreadsReadModel(payload.context_token, payload.branch, payload.limit)
    );
  }

  async captureLearning(input, { idempotencyKey }) {
    if (!idempotencyKey) {
      throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Missing required Idempotency-Key header.");
    }
    const payload = parseWithSchema(LearningCaptureInputSchema, input);
    const { learning } = await this.storage.captureLearning(payload, { idempotencyKey });
    return {
      learning: parseWithSchema(LearningRecordSchema, learning)
    };
  }

  async appendLearningFeedback(input, { idempotencyKey }) {
    if (!idempotencyKey) {
      throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Missing required Idempotency-Key header.");
    }
    const payload = parseWithSchema(LearningFeedbackCreateInputSchema, input);
    const { feedback } = await this.storage.appendLearningFeedback(payload, { idempotencyKey });
    return {
      feedback: parseWithSchema(LearningFeedbackRecordSchema, feedback)
    };
  }

  async getRecentLearnings(input) {
    const payload = parseWithSchema(LearningGetRecentInputSchema, input);
    return parseWithSchema(LearningListResultSchema, await this.storage.getRecentLearnings(payload));
  }

  async searchLearnings(input) {
    const payload = parseWithSchema(LearningSearchInputSchema, input);
    return parseWithSchema(LearningListResultSchema, await this.storage.searchLearnings(payload));
  }

  async reportIssue(input, { idempotencyKey }) {
    if (!idempotencyKey) {
      throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Missing required Idempotency-Key header.");
    }
    const payload = parseWithSchema(IssueReportInputSchema, input);
    const { issue } = await this.storage.createIssue(payload, { idempotencyKey });
    return {
      issue: parseWithSchema(IssueRecordSchema, issue)
    };
  }

  async getIssue(input) {
    const payload = parseWithSchema(IssueGetInputSchema, input);
    return parseWithSchema(IssueGetResultSchema, await this.storage.getIssue(payload.context_token, payload.issue_id));
  }

  async addIssueEvent(input, { idempotencyKey }) {
    if (!idempotencyKey) {
      throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Missing required Idempotency-Key header.");
    }
    const payload = parseWithSchema(IssueEventCreateInputSchema, input);
    const { issue_event } = await this.storage.appendIssueEvent(payload, { idempotencyKey });
    return {
      issue_event: parseWithSchema(IssueEventRecordSchema, issue_event)
    };
  }

  async listIssues(input) {
    const payload = parseWithSchema(IssueListInputSchema, input);
    return parseWithSchema(IssueListResultSchema, await this.storage.listIssues(payload));
  }

  async defineRules(input) {
    const payload = parseWithSchema(RulesetDefineInputSchema, input);
    return {
      ruleset: parseWithSchema(RulesetRecordSchema, await this.storage.upsertRuleset(payload.project_id, payload))
    };
  }

  async getRules(projectId) {
    const ruleset = await this.storage.getRuleset(projectId);
    if (!ruleset) {
      throw new ApiError(404, "PROJECT_NOT_FOUND", `No project exists with id '${projectId}'.`, {
        project_id: projectId
      });
    }
    return {
      ruleset: parseWithSchema(RulesetRecordSchema, ruleset)
    };
  }

  async startSession(input, { idempotencyKey }) {
    if (!idempotencyKey) {
      throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Missing required Idempotency-Key header.");
    }
    const payload = parseWithSchema(SessionStartInputSchema, input);
    const { session } = await this.storage.createSession(payload, { idempotencyKey });
    return parseWithSchema(SessionStartResultSchema, {
      session,
      context: parseWithSchema(
        SessionStartContextSchema,
        await this.storage.getSessionStartContext({
          project_id: payload.project_id,
          branch: payload.branch
        })
      ),
      startup_summary: await this.storage.getStartupSummary(payload.project_id, payload.branch)
    });
  }

  async endSession(input) {
    const payload = parseWithSchema(SessionEndInputSchema, input);
    const session = await this.storage.endSession(payload.session_id, payload.status);
    return parseWithSchema(SessionEndResultSchema, {
      session,
      closeout: await this.storage.getSessionCloseout(session.session_id)
    });
  }

  async getSessionCloseout(input) {
    const payload = parseWithSchema(SessionCloseoutInputSchema, input);
    return parseWithSchema(SessionCloseoutResultSchema, {
      closeout: await this.storage.getSessionCloseout(payload.session_id)
    });
  }

  async listSessions(input) {
    const payload = parseWithSchema(SessionListInputSchema, input);
    return parseWithSchema(SessionListResultSchema, await this.storage.listSessions(payload));
  }

  async appendEntry(input, { idempotencyKey }) {
    if (!idempotencyKey) {
      throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Missing required Idempotency-Key header.");
    }
    const payload = parseWithSchema(EntryCreateInputSchema, input);
    const { entry } = await this.storage.appendEntry(payload, { idempotencyKey });
    return {
      entry,
      hints: {
        possible_duplicates: [],
        related_entries: []
      }
    };
  }

  async submitRuleCheck(input, { idempotencyKey }) {
    if (!idempotencyKey) {
      throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Missing required Idempotency-Key header.");
    }
    const payload = parseWithSchema(RuleCheckCreateInputSchema, input);
    const { ruleCheck } = await this.storage.appendRuleCheck(payload, { idempotencyKey });
    return parseWithSchema(RuleCheckSubmitResultSchema, {
      rule_check: ruleCheck,
      reminder: await this.#buildRuleCheckReminder(payload.project_id, payload.session_id)
    });
  }

  async listRuleChecks(input) {
    const payload = parseWithSchema(RuleCheckListInputSchema, input);
    return parseWithSchema(RuleCheckListResultSchema, await this.storage.listRuleChecks(payload));
  }

  async searchEntries(input) {
    const payload = parseWithSchema(EntrySearchInputSchema, input);
    return parseWithSchema(SearchResultSchema, await this.storage.searchEntries(payload));
  }

  async #buildRuleCheckReminder(projectId, sessionId) {
    const ruleset = await this.storage.getRuleset(projectId);
    const ruleChecks = await this.storage.listRuleChecks({
      project_id: projectId,
      session_id: sessionId
    });
    const coveredRuleIds = new Set(ruleChecks.rule_checks.map((ruleCheck) => ruleCheck.rule_id));
    const missingRequiredRules = (ruleset?.rules ?? []).filter(
      (rule) => rule.severity === "required" && !coveredRuleIds.has(rule.rule_id)
    );

    if (missingRequiredRules.length === 0) {
      return null;
    }

    return {
      missing_required_rules: missingRequiredRules,
      summary:
        missingRequiredRules.length === 1
          ? "1 required rule still has no check for this session."
          : `${missingRequiredRules.length} required rules still have no checks for this session.`
    };
  }

}

function parseWithSchema(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "Request validation failed.", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code
      }))
    });
  }
  return result.data;
}
