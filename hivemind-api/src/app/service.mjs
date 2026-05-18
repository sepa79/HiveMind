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
  GuidanceCheckInputSchema,
  GuidanceCheckResultSchema,
  LearningCaptureInputSchema,
  LearningFeedbackCreateInputSchema,
  LearningFeedbackRecordSchema,
  LearningListResultSchema,
  LearningRecordSchema,
  LearningGetRecentInputSchema,
  LearningSearchInputSchema,
  ProjectListResultSchema,
  ProjectRegisterInputSchema,
  ProjectResolveInputSchema,
  ProjectResolveResultSchema,
  ProjectStandardProfileDefineInputSchema,
  ProjectStandardProfileDefineResultSchema,
  RuleCheckCreateInputSchema,
  RuleCheckListInputSchema,
  RuleCheckListResultSchema,
  RuleCheckSubmitResultSchema,
  RulesetCatalogBundleResultSchema,
  RulesetCatalogListResultSchema,
  RulesetCatalogProfileResultSchema,
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
import { RulesetCatalog, parseProfileRef } from "./ruleset-catalog.mjs";

export class HiveMindService {
  constructor({ storage, dataRoot = null, version = "0.0.0", rulesetCatalog = new RulesetCatalog() } = {}) {
    this.storage = storage;
    this.dataRoot = dataRoot;
    this.version = version;
    this.rulesetCatalog = rulesetCatalog;
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
        repository_slug: project.repository_slug,
        features: project.features
      }))
    };
  }

  async registerProject(input) {
    const payload = parseWithSchema(ProjectRegisterInputSchema, input);
    if (payload.standard_profile_ref) {
      this.rulesetCatalog.getByRef(payload.standard_profile_ref);
    }
    return {
      project: await this.storage.createProject(payload)
    };
  }

  async listProjects() {
    return parseWithSchema(ProjectListResultSchema, await this.storage.listProjects());
  }

  async resolveProject(input) {
    const payload = parseWithSchema(ProjectResolveInputSchema, input);
    const { projects } = await this.storage.listProjects();
    const candidates = projects
      .map((project) => scoreProjectResolution(project, payload))
      .filter((candidate) => candidate.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        return left.project.project_id.localeCompare(right.project.project_id);
      });

    if (candidates.length === 0) {
      return parseWithSchema(ProjectResolveResultSchema, {
        status: "not_found",
        project: null,
        candidates: [],
        resolution_reason: "No registered project matched the provided repository or workspace hints."
      });
    }

    const topScore = candidates[0].score;
    const topCandidates = candidates.filter((candidate) => candidate.score === topScore);
    if (topCandidates.length === 1) {
      return parseWithSchema(ProjectResolveResultSchema, {
        status: "matched",
        project: topCandidates[0].project,
        candidates: topCandidates,
        resolution_reason: topCandidates[0].reasons.join("; ")
      });
    }

    return parseWithSchema(ProjectResolveResultSchema, {
      status: "ambiguous",
      project: null,
      candidates: topCandidates,
      resolution_reason: `${topCandidates.length} registered projects matched with the same confidence.`
    });
  }

  async listFeatures(projectId) {
    return parseWithSchema(FeatureListResultSchema, await this.storage.listFeatures(projectId));
  }

  async defineProjectStandardProfile(input) {
    const payload = parseWithSchema(ProjectStandardProfileDefineInputSchema, input);
    this.rulesetCatalog.getByRef(payload.standard_profile_ref);
    return parseWithSchema(ProjectStandardProfileDefineResultSchema, {
      project: await this.storage.updateProjectStandardProfile(payload.project_id, payload.standard_profile_ref)
    });
  }

  async listRulesetCatalogProfiles() {
    return parseWithSchema(RulesetCatalogListResultSchema, this.rulesetCatalog.listProfiles());
  }

  async getRulesetCatalogProfile({ profile_id, version }) {
    return parseWithSchema(RulesetCatalogProfileResultSchema, this.rulesetCatalog.getProfile(profile_id, version));
  }

  async getRulesetCatalogBundle({ profile_id, version }) {
    return parseWithSchema(RulesetCatalogBundleResultSchema, this.rulesetCatalog.getBundle(profile_id, version));
  }

  async guidanceCheck(input) {
    const payload = parseWithSchema(GuidanceCheckInputSchema, input);
    const project = await this.storage.getProject(payload.project_id);
    if (!project) {
      return parseWithSchema(GuidanceCheckResultSchema, {
        project: null,
        selected_profile_ref: null,
        recommended_action: "unregistered",
        guidance_version: {
          profile_ref: null,
          catalog_source_url: this.rulesetCatalog.catalogSourceUrl
        },
        profile: null,
        required_files: [],
        recommended_files: [],
        drift: [],
        summary: `Project '${payload.project_id}' is not registered.`
      });
    }

    const selectedProfileRef = project.standard_profile_ref ?? null;
    if (!selectedProfileRef) {
      return parseWithSchema(GuidanceCheckResultSchema, {
        project,
        selected_profile_ref: null,
        recommended_action: "apply",
        guidance_version: {
          profile_ref: null,
          catalog_source_url: this.rulesetCatalog.catalogSourceUrl
        },
        profile: null,
        required_files: [],
        recommended_files: [],
        drift: [],
        summary: `Project '${payload.project_id}' has no standard profile assigned.`
      });
    }

    const { profileId, version } = parseProfileRef(selectedProfileRef);
    const bundle = this.rulesetCatalog.getBundle(profileId, version, {
      project_id: project.project_id,
      project_name: project.name
    });
    const markerFiles = new Map((payload.standard_marker?.files ?? []).map((file) => [file.target, file.sha256]));
    const drift = bundle.files.map((file) => {
      const actualSha = markerFiles.get(file.target) ?? null;
      return {
        target: file.target,
        required: file.required,
        expected_sha256: file.sha256,
        actual_sha256: actualSha,
        status: actualSha === null ? "missing" : actualSha === file.sha256 ? "template_unmodified" : "customized"
      };
    });
    const markerProfileMatches = payload.standard_marker?.profile_ref === selectedProfileRef;
    const missingRequiredFiles = drift.filter((file) => file.required && file.status === "missing");
    const allRequiredPresent = markerProfileMatches && missingRequiredFiles.length === 0;
    const recommendedAction = allRequiredPresent
      ? "current"
      : payload.standard_marker?.profile_ref && !markerProfileMatches
        ? "update"
        : "apply";
    const profile = {
      profile_id: bundle.manifest.profile_id,
      version: bundle.manifest.version,
      profile_ref: bundle.manifest.profile_ref,
      label: bundle.manifest.label,
      description: bundle.manifest.description,
      extends: bundle.manifest.extends,
      file_count: bundle.manifest.files.length,
      rule_count: bundle.manifest.rules.length
    };

    return parseWithSchema(GuidanceCheckResultSchema, {
      project,
      selected_profile_ref: selectedProfileRef,
      recommended_action: recommendedAction,
      guidance_version: {
        profile_ref: selectedProfileRef,
        catalog_source_url: this.rulesetCatalog.catalogSourceUrl
      },
      profile,
      required_files: bundle.manifest.files.filter((file) => file.required),
      recommended_files: bundle.manifest.files.filter((file) => !file.required),
      drift,
      summary:
        recommendedAction === "current"
          ? `Project '${payload.project_id}' is current on '${selectedProfileRef}'.`
          : `Project '${payload.project_id}' should ${recommendedAction} standard profile '${selectedProfileRef}'.`
    });
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

function scoreProjectResolution(project, input) {
  const reasons = [];
  let score = 0;
  if (input.project_id_hint && project.project_id === input.project_id_hint) {
    score += 100;
    reasons.push("project_id_hint matched project_id exactly");
  }
  if (input.repository_url && normalizeRepositoryUrl(project.repository_url) === normalizeRepositoryUrl(input.repository_url)) {
    score += 80;
    reasons.push("repository_url matched exactly after normalization");
  }
  if (input.repository_slug && normalizeRepositorySlug(project.repository_slug) === normalizeRepositorySlug(input.repository_slug)) {
    score += 60;
    reasons.push("repository_slug matched exactly after normalization");
  }
  const inputSlugFromUrl = input.repository_url ? repositorySlugFromUrl(input.repository_url) : null;
  if (inputSlugFromUrl && normalizeRepositorySlug(project.repository_slug) === normalizeRepositorySlug(inputSlugFromUrl)) {
    score += 50;
    reasons.push("repository_url resolved to the registered repository_slug");
  }
  if (input.workspace_path && normalizePath(project.root_path) === normalizePath(input.workspace_path)) {
    score += 40;
    reasons.push("workspace_path matched registered root_path exactly");
  }
  if (input.name_hint && normalizeText(project.name) === normalizeText(input.name_hint)) {
    score += 20;
    reasons.push("name_hint matched project name");
  }
  if (input.workspace_path && normalizeText(project.project_id) === normalizeText(pathBasename(input.workspace_path))) {
    score += 5;
    reasons.push("workspace_path basename weakly matched project_id");
  }

  return { project, score, reasons };
}

function normalizeRepositoryUrl(value) {
  return value.trim().replace(/\.git$/i, "").replace(/\/$/i, "").toLowerCase();
}

function normalizeRepositorySlug(value) {
  return value.trim().replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "").toLowerCase();
}

function repositorySlugFromUrl(value) {
  const trimmed = value.trim().replace(/\.git$/i, "").replace(/\/$/i, "");
  const scpStyle = trimmed.match(/^[^@]+@[^:]+:(?<slug>.+)$/);
  if (scpStyle?.groups?.slug) {
    return scpStyle.groups.slug;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.pathname.replace(/^\/+/, "");
  } catch {
    return null;
  }
}

function normalizePath(value) {
  return value.trim().replace(/\/+$/g, "");
}

function pathBasename(value) {
  return normalizePath(value).split("/").filter(Boolean).pop() ?? "";
}

function normalizeText(value) {
  return value.trim().toLowerCase();
}
