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
  AdminMemoryReviewInputSchema,
  AdminMemoryReviewResultSchema,
  EntryCorrectInputSchema,
  EntryCorrectResultSchema,
  EntryCreateInputSchema,
  EntryMarkInputSchema,
  EntryMarkResultSchema,
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
  ProjectReviewInputSchema,
  ProjectReviewResultSchema,
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

  async markEntry(input) {
    const payload = parseWithSchema(EntryMarkInputSchema, input);
    return parseWithSchema(EntryMarkResultSchema, await this.storage.markEntryLifecycle(payload));
  }

  async correctEntry(input, { idempotencyKey }) {
    if (!idempotencyKey) {
      throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "Missing required Idempotency-Key header.");
    }
    const payload = parseWithSchema(EntryCorrectInputSchema, input);
    const original = await this.storage.getEntry(payload.project_id, payload.entry_id);
    if (!original) {
      throw new ApiError(404, "ENTRY_NOT_FOUND", `No entry exists with id '${payload.entry_id}' in project '${payload.project_id}'.`, {
        project_id: payload.project_id,
        entry_id: payload.entry_id
      });
    }

    const { entry_id: entryId, reason, ...entryInput } = payload;
    const { entry: correctionEntry } = await this.storage.appendEntry(
      {
        ...entryInput,
        entry_type: entryInput.entry_type ?? "feedback",
        category: entryInput.category ?? "correction",
        tags: [...new Set([...(entryInput.tags ?? []), "correction"])],
        related_entry_ids: [entryId],
        lifecycle_state: "open"
      },
      { idempotencyKey }
    );
    const markReason = reason ?? `Superseded by correction entry '${correctionEntry.entry_id}'.`;
    const currentOriginal = await this.storage.getEntry(payload.project_id, entryId);
    const alreadyMarked =
      currentOriginal?.lifecycle_state === "superseded" &&
      (currentOriginal.related_entry_ids ?? []).includes(correctionEntry.entry_id);
    const marked = alreadyMarked
      ? { entry: currentOriginal }
      : await this.storage.markEntryLifecycle({
          project_id: payload.project_id,
          entry_id: entryId,
          lifecycle_state: "superseded",
          reason: markReason,
          replacement_entry_id: correctionEntry.entry_id
        });

    return parseWithSchema(EntryCorrectResultSchema, {
      original_entry: marked.entry,
      correction_entry: correctionEntry,
      action: {
        entry_id: entryId,
        correction_entry_id: correctionEntry.entry_id,
        lifecycle_state: "superseded",
        reason: markReason
      }
    });
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

  async reviewProject(input) {
    const payload = parseWithSchema(ProjectReviewInputSchema, input);
    const project = await this.storage.getProject(payload.project_id);
    if (!project) {
      throw new ApiError(404, "PROJECT_NOT_FOUND", `No project exists with id '${payload.project_id}'.`, {
        project_id: payload.project_id
      });
    }
    return parseWithSchema(ProjectReviewResultSchema, await this.#buildProjectReview(project, payload));
  }

  async reviewAdminMemory(input) {
    const payload = parseWithSchema(AdminMemoryReviewInputSchema, input);
    const { projects } = await this.storage.listProjects();
    const selectedProjectIds = new Set(payload.project_ids ?? projects.map((project) => project.project_id));
    const missingProjectIds = [...selectedProjectIds].filter(
      (projectId) => !projects.some((project) => project.project_id === projectId)
    );
    if (missingProjectIds.length > 0) {
      throw new ApiError(404, "PROJECT_NOT_FOUND", `Unknown project id '${missingProjectIds[0]}'.`, {
        project_ids: missingProjectIds
      });
    }
    const selectedProjects = projects.filter((project) => selectedProjectIds.has(project.project_id));
    const projectReviews = [];
    for (const project of selectedProjects) {
      projectReviews.push(
        await this.#buildProjectReview(project, {
          branch: payload.branch,
          query: payload.query,
          limit: payload.limit ?? 10
        })
      );
    }
    const recommendedActions = projectReviews.flatMap((review) => review.recommended_actions);
    const staleCount = projectReviews.reduce((sum, review) => sum + review.signals.stale_open_entries.length, 0);
    const summary =
      projectReviews.length === 0
        ? "No registered projects matched the memory review request."
        : `Reviewed ${projectReviews.length} project${projectReviews.length === 1 ? "" : "s"}; found ${recommendedActions.length} recommended action${recommendedActions.length === 1 ? "" : "s"} and ${staleCount} stale open entr${staleCount === 1 ? "y" : "ies"}.`;

    return parseWithSchema(AdminMemoryReviewResultSchema, {
      generated_at: new Date().toISOString(),
      project_reviews: projectReviews,
      recommended_actions: recommendedActions,
      summary
    });
  }

  async #buildProjectReview(project, { branch, query, limit = 10 } = {}) {
    const projectId = project.project_id;
    const base = {
      project_id: projectId,
      ...(branch ? { branch } : {}),
      ...(query ? { query } : {})
    };
    const [recent, openEntries, openFeedback, openRisks, toolingNotes] = await Promise.all([
      this.storage.searchEntries({ ...base, entry_type: ["decision"], limit, sort: "recent" }),
      this.storage.searchEntries({ ...base, lifecycle_state: "open", limit: 200, sort: "recent" }),
      this.storage.searchEntries({ ...base, entry_type: ["feedback"], lifecycle_state: "open", limit, sort: "recent" }),
      this.storage.searchEntries({ ...base, entry_type: ["risk"], lifecycle_state: "open", limit, sort: "recent" }),
      this.storage.searchEntries({ ...base, entry_type: ["tooling_note"], limit, sort: "recent" })
    ]);
    const staleCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const staleOpenEntries = openEntries.entries
      .filter((entry) => new Date(entry.updated_at).getTime() < staleCutoff)
      .slice(0, limit);
    const recommendedActions = [
      ...openFeedback.entries.map((entry) => ({
        action_type: "review",
        target_kind: "entry",
        target_id: entry.entry_id,
        summary: `Review open feedback: ${entry.summary}`,
        reason: "Open feedback is waiting for triage.",
        priority: entry.importance === "high" ? "high" : "normal"
      })),
      ...openRisks.entries.map((entry) => ({
        action_type: "review",
        target_kind: "entry",
        target_id: entry.entry_id,
        summary: `Review open risk: ${entry.summary}`,
        reason: "Open risk may need mitigation or resolution.",
        priority: entry.importance === "high" ? "high" : "normal"
      })),
      ...staleOpenEntries.map((entry) => ({
        action_type: "mark_resolved",
        target_kind: "entry",
        target_id: entry.entry_id,
        summary: `Resolve or supersede stale open entry: ${entry.summary}`,
        reason: "Open entry has not been updated for at least 7 days.",
        priority: "normal"
      }))
    ].slice(0, limit);

    return {
      project,
      branch: branch ?? null,
      generated_at: new Date().toISOString(),
      signals: {
        recent_decisions: recent.entries,
        open_feedback: openFeedback.entries,
        open_risks: openRisks.entries,
        stale_open_entries: staleOpenEntries,
        tooling_notes: toolingNotes.entries
      },
      recommended_actions: recommendedActions,
      summary:
        recommendedActions.length === 0
          ? `No immediate memory cleanup actions found for project '${projectId}'.`
          : `Found ${recommendedActions.length} recommended memory action${recommendedActions.length === 1 ? "" : "s"} for project '${projectId}'.`
    };
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
