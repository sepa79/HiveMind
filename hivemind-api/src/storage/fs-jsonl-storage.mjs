import { randomUUID, createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ApiError, ensure } from "../app/errors.mjs";
import { StorageAdapter } from "./adapter.mjs";

const IMPORTANCE_WEIGHT = {
  high: 3,
  normal: 2,
  low: 1
};

const ISSUE_SEVERITY_WEIGHT = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1
};

const SESSION_START_LIMITS = {
  recent_decisions: 3,
  recent_risks: 3,
  recent_tooling_notes: 3,
  recent_learnings: 3,
  active_issues: 3,
  open_threads: 5
};

const STARTUP_SUMMARY_LIMITS = {
  learnings: 3,
  issues: 3,
  open_threads: 3
};

export class FsJsonlStorage extends StorageAdapter {
  constructor({ dataRoot }) {
    super();
    this.dataRoot = resolve(dataRoot);
  }

  async createProject(projectInput) {
    const projectDir = this.#projectDir(projectInput.project_id);
    mkdirSync(projectDir, { recursive: true });
    mkdirSync(join(projectDir, "contexts"), { recursive: true });
    mkdirSync(join(projectDir, "issues"), { recursive: true });
    mkdirSync(join(projectDir, "sessions"), { recursive: true });
    mkdirSync(join(projectDir, "indexes"), { recursive: true });

    const existing = this.#readJsonFile(this.#projectFile(projectInput.project_id), null);
    const now = isoNow();
    const project = {
      project_id: projectInput.project_id,
      name: projectInput.name,
      root_path: projectInput.root_path,
      default_branch: projectInput.default_branch,
      description: projectInput.description ?? existing?.description ?? "",
      features: existing?.features ?? [],
      categories: existing?.categories ?? [],
      ruleset_id: existing?.ruleset_id ?? `${projectInput.project_id}:0`,
      created_at: existing?.created_at ?? now,
      updated_at: now
    };

    this.#writeJsonFile(this.#projectFile(project.project_id), project);

    const rulesetPath = this.#rulesetFile(project.project_id);
    if (!existsSync(rulesetPath)) {
      this.#writeJsonFile(rulesetPath, {
        project_id: project.project_id,
        ruleset_id: project.ruleset_id,
        version: 0,
        rules: [],
        created_at: now,
        updated_at: now
      });
    }

    return project;
  }

  async getProject(projectId) {
    return this.#readJsonFile(this.#projectFile(projectId), null);
  }

  async listProjects() {
    return {
      projects: this.#listProjectIds()
        .map((projectId) => this.#readJsonFile(this.#projectFile(projectId), null))
        .filter(Boolean)
        .sort((left, right) => left.project_id.localeCompare(right.project_id))
    };
  }

  async listFeatures(projectId) {
    const project = await this.getProject(projectId);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${projectId}'.`, {
      project_id: projectId
    });
    return {
      project_id: projectId,
      features: project.features ?? []
    };
  }

  async addFeature(projectId, feature) {
    const project = await this.getProject(projectId);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${projectId}'.`, {
      project_id: projectId
    });

    if ((project.features ?? []).includes(feature)) {
      return {
        project_id: projectId,
        features: project.features ?? []
      };
    }

    const updated = {
      ...project,
      features: [...(project.features ?? []), feature],
      updated_at: isoNow()
    };
    this.#writeJsonFile(this.#projectFile(projectId), updated);
    return {
      project_id: projectId,
      features: updated.features
    };
  }

  async removeFeature(projectId, feature) {
    const project = await this.getProject(projectId);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${projectId}'.`, {
      project_id: projectId
    });
    ensure(
      (project.features ?? []).includes(feature),
      404,
      "FEATURE_NOT_FOUND",
      `No feature '${feature}' exists in project '${projectId}'.`,
      {
        project_id: projectId,
        feature
      }
    );

    const usage = this.#featureUsageSummary(projectId, feature);
    ensure(
      usage.total === 0,
      409,
      "FEATURE_IN_USE",
      `Feature '${feature}' is still referenced in project memory and cannot be removed.`,
      {
        project_id: projectId,
        feature,
        usage
      }
    );

    const updated = {
      ...project,
      features: (project.features ?? []).filter((value) => value !== feature),
      updated_at: isoNow()
    };
    this.#writeJsonFile(this.#projectFile(projectId), updated);
    return {
      project_id: projectId,
      features: updated.features
    };
  }

  async renameFeature(projectId, feature, newFeature) {
    const project = await this.getProject(projectId);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${projectId}'.`, {
      project_id: projectId
    });
    ensure(
      (project.features ?? []).includes(feature),
      404,
      "FEATURE_NOT_FOUND",
      `No feature '${feature}' exists in project '${projectId}'.`,
      {
        project_id: projectId,
        feature
      }
    );

    if (feature === newFeature) {
      return {
        project_id: projectId,
        features: project.features ?? []
      };
    }

    ensure(
      !(project.features ?? []).includes(newFeature),
      409,
      "FEATURE_ALREADY_EXISTS",
      `Feature '${newFeature}' already exists in project '${projectId}'.`,
      {
        project_id: projectId,
        feature: newFeature
      }
    );

    const updatedProject = {
      ...project,
      features: (project.features ?? []).map((value) => (value === feature ? newFeature : value)),
      updated_at: isoNow()
    };
    this.#writeJsonFile(this.#projectFile(projectId), updatedProject);

    for (const context of this.#listProjectContexts(projectId)) {
      if (context.feature !== feature) {
        continue;
      }
      this.#writeJsonFile(this.#contextFile(projectId, context.context_id), {
        ...context,
        feature: newFeature,
        updated_at: isoNow()
      });
    }

    this.#rewriteJsonLines(this.#entriesFile(projectId), (entry) =>
      entry.feature === feature ? { ...entry, feature: newFeature, updated_at: isoNow() } : entry
    );
    this.#rewriteJsonLines(this.#learningsFile(projectId), (learning) =>
      learning.context?.feature === feature
        ? {
            ...learning,
            context: {
              ...learning.context,
              feature: newFeature
            },
            updated_at: isoNow()
          }
        : learning
    );
    this.#rewriteJsonLines(this.#issueEventsFile(projectId), (issueEvent) =>
      issueEvent.context?.feature === feature
        ? {
            ...issueEvent,
            context: {
              ...issueEvent.context,
              feature: newFeature
            }
          }
        : issueEvent
    );

    for (const issue of this.#listProjectIssues(projectId)) {
      if (issue.context?.feature !== feature) {
        continue;
      }
      this.#writeJsonFile(this.#issueFile(projectId, issue.issue_id), {
        ...issue,
        context: {
          ...issue.context,
          feature: newFeature
        },
        updated_at: isoNow()
      });
    }

    return {
      project_id: projectId,
      features: updatedProject.features
    };
  }

  async openContext(contextInput, { idempotencyKey }) {
    const project = await this.getProject(contextInput.project_id);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${contextInput.project_id}'.`, {
      project_id: contextInput.project_id
    });

    const requestHash = digest({ operation: "context.open", payload: contextInput });
    const idempotentRecord = this.#findIdempotencyRecord(contextInput.project_id, "context.open", idempotencyKey);
    if (idempotentRecord) {
      this.#ensureIdempotentPayload(idempotentRecord, requestHash);
      return {
        context: this.#readRequiredContext(contextInput.project_id, idempotentRecord.resource_id),
        idempotent: true
      };
    }

    const now = isoNow();
    const context = {
      context_id: `ctx-${randomUUID()}`,
      context_token: `ctx-${randomUUID()}`,
      project_id: contextInput.project_id,
      branch: contextInput.branch,
      workspace_path: contextInput.workspace_path,
      feature: contextInput.feature,
      source_tool: contextInput.source_tool,
      tool_version: contextInput.tool_version,
      environment: contextInput.environment,
      dataset_version: contextInput.dataset_version,
      author_id: contextInput.author_id,
      author_type: contextInput.author_type,
      source: contextInput.source,
      agent_id: contextInput.agent_id ?? null,
      status: "active",
      closed_at: null,
      created_at: now,
      updated_at: now
    };

    this.#writeJsonFile(this.#contextFile(context.project_id, context.context_id), context);
    this.#appendIdempotencyRecord(context.project_id, {
      key: idempotencyKey,
      operation: "context.open",
      request_hash: requestHash,
      resource_type: "context",
      resource_id: context.context_id,
      timestamp: now
    });
    return { context, idempotent: false };
  }

  async getContext(contextToken) {
    for (const projectId of this.#listProjectIds()) {
      const context = this.#listProjectContexts(projectId).find((candidate) => candidate.context_token === contextToken) ?? null;
      if (context) {
        return context;
      }
    }
    return null;
  }

  async updateContext(contextToken, patch) {
    const context = await this.getContext(contextToken);
    ensure(context, 404, "CONTEXT_NOT_FOUND", `No context exists with token '${contextToken}'.`, {
      context_token: contextToken
    });
    ensure(
      context.status === "active",
      409,
      "CONTEXT_CLOSED",
      `Context '${contextToken}' is already closed and cannot be updated.`,
      {
        context_token: contextToken
      }
    );

    const updated = {
      ...context,
      branch: patch.branch ?? context.branch,
      workspace_path: patch.workspace_path ?? context.workspace_path,
      feature: patch.feature ?? context.feature,
      source_tool: patch.source_tool ?? context.source_tool,
      tool_version: patch.tool_version ?? context.tool_version,
      environment: patch.environment ?? context.environment,
      dataset_version: patch.dataset_version ?? context.dataset_version,
      agent_id: patch.agent_id ?? context.agent_id,
      updated_at: isoNow()
    };

    this.#writeJsonFile(this.#contextFile(updated.project_id, updated.context_id), updated);
    return updated;
  }

  async closeContext(contextToken) {
    const context = await this.getContext(contextToken);
    ensure(context, 404, "CONTEXT_NOT_FOUND", `No context exists with token '${contextToken}'.`, {
      context_token: contextToken
    });

    if (context.status === "closed") {
      return context;
    }

    const now = isoNow();
    const closed = {
      ...context,
      status: "closed",
      closed_at: now,
      updated_at: now
    };
    this.#writeJsonFile(this.#contextFile(closed.project_id, closed.context_id), closed);
    return closed;
  }

  async captureLearning(learningInput, { idempotencyKey }) {
    const context = await this.getContext(learningInput.context_token);
    ensure(context, 404, "CONTEXT_NOT_FOUND", `No context exists with token '${learningInput.context_token}'.`, {
      context_token: learningInput.context_token
    });
    ensure(
      context.status === "active",
      409,
      "CONTEXT_CLOSED",
      `Context '${learningInput.context_token}' is already closed and cannot capture new learnings.`,
      {
        context_token: learningInput.context_token
      }
    );

    const requestHash = digest({ operation: "learning.capture", payload: learningInput });
    const idempotentRecord = this.#findIdempotencyRecord(context.project_id, "learning.capture", idempotencyKey);
    if (idempotentRecord) {
      this.#ensureIdempotentPayload(idempotentRecord, requestHash);
      return {
        learning: this.#readRequiredLearning(context.project_id, idempotentRecord.resource_id),
        idempotent: true
      };
    }

    const now = isoNow();
    const learning = {
      learning_id: `lrn-${randomUUID()}`,
      context_token: learningInput.context_token,
      context: this.#toLearningContextSnapshot(context),
      summary: learningInput.summary,
      details: learningInput.details,
      scope: learningInput.scope,
      recommended_action: learningInput.recommended_action,
      status: learningInput.status ?? "active",
      importance: learningInput.importance ?? "normal",
      tags: learningInput.tags ?? [],
      links: learningInput.links ?? [],
      artifacts: learningInput.artifacts ?? [],
      related_issue_ids: learningInput.related_issue_ids ?? [],
      created_at: now,
      updated_at: now
    };

    this.#appendJsonLine(this.#learningsFile(context.project_id), learning);
    this.#appendIdempotencyRecord(context.project_id, {
      key: idempotencyKey,
      operation: "learning.capture",
      request_hash: requestHash,
      resource_type: "learning",
      resource_id: learning.learning_id,
      timestamp: now
    });
    return { learning: this.#withLearningFeedbackSummary(context.project_id, learning), idempotent: false };
  }

  async appendLearningFeedback(feedbackInput, { idempotencyKey }) {
    const context = await this.getContext(feedbackInput.context_token);
    ensure(context, 404, "CONTEXT_NOT_FOUND", `No context exists with token '${feedbackInput.context_token}'.`, {
      context_token: feedbackInput.context_token
    });
    ensure(
      context.status === "active",
      409,
      "CONTEXT_CLOSED",
      `Context '${feedbackInput.context_token}' is already closed and cannot append learning feedback.`,
      {
        context_token: feedbackInput.context_token
      }
    );

    const learning = this.#readLearning(context.project_id, feedbackInput.learning_id);
    ensure(
      learning,
      404,
      "LEARNING_NOT_FOUND",
      `No learning exists with id '${feedbackInput.learning_id}' in project '${context.project_id}'.`,
      {
        learning_id: feedbackInput.learning_id
      }
    );

    const requestHash = digest({ operation: "learning.feedback", payload: feedbackInput });
    const idempotentRecord = this.#findIdempotencyRecord(context.project_id, "learning.feedback", idempotencyKey);
    if (idempotentRecord) {
      this.#ensureIdempotentPayload(idempotentRecord, requestHash);
      return {
        feedback: this.#readRequiredLearningFeedback(context.project_id, idempotentRecord.resource_id),
        idempotent: true
      };
    }

    const now = isoNow();
    const feedback = {
      feedback_id: `lfb-${randomUUID()}`,
      learning_id: feedbackInput.learning_id,
      context_token: feedbackInput.context_token,
      context: this.#toLearningContextSnapshot(context),
      feedback_type: feedbackInput.feedback_type,
      comment: feedbackInput.comment,
      created_at: now
    };

    this.#appendJsonLine(this.#learningFeedbackFile(context.project_id), feedback);
    this.#appendIdempotencyRecord(context.project_id, {
      key: idempotencyKey,
      operation: "learning.feedback",
      request_hash: requestHash,
      resource_type: "learning_feedback",
      resource_id: feedback.feedback_id,
      timestamp: now
    });
    return { feedback, idempotent: false };
  }

  async getRecentLearnings(query) {
    const context = await this.getContext(query.context_token);
    ensure(context, 404, "CONTEXT_NOT_FOUND", `No context exists with token '${query.context_token}'.`, {
      context_token: query.context_token
    });

    let learnings = this.#readJsonLines(this.#learningsFile(context.project_id));
    learnings = learnings.filter((learning) =>
      this.#matchesLearningQuery(learning, {
        branch: undefined,
        feature: query.feature ?? context.feature,
        source_tool: query.source_tool ?? context.source_tool,
        scope: query.scope,
        status: query.status ?? "active",
        tags: undefined,
        query: undefined
      })
    );
    learnings = this.#sortLearnings(learnings, "importance").slice(0, query.limit ?? 10);
    learnings = learnings.map((learning) => this.#withLearningFeedbackSummary(context.project_id, learning));

    return {
      learnings,
      summary:
        learnings.length === 0
          ? "No recent learnings matched this context."
          : `Found ${learnings.length} recent learning${learnings.length === 1 ? "" : "s"} for this context.`
    };
  }

  async searchLearnings(query) {
    const context = await this.getContext(query.context_token);
    ensure(context, 404, "CONTEXT_NOT_FOUND", `No context exists with token '${query.context_token}'.`, {
      context_token: query.context_token
    });

    let learnings = this.#readJsonLines(this.#learningsFile(context.project_id));
    learnings = learnings.filter((learning) => this.#matchesLearningQuery(learning, query));
    learnings = this.#sortLearnings(learnings, query.sort ?? "recent").slice(0, query.limit ?? 50);
    learnings = learnings.map((learning) => this.#withLearningFeedbackSummary(context.project_id, learning));

    return {
      learnings,
      summary:
        learnings.length === 0
          ? "No learnings matched this search."
          : `Found ${learnings.length} learning${learnings.length === 1 ? "" : "s"} in this project.`
    };
  }

  async createIssue(issueInput, { idempotencyKey }) {
    const context = await this.getContext(issueInput.context_token);
    ensure(context, 404, "CONTEXT_NOT_FOUND", `No context exists with token '${issueInput.context_token}'.`, {
      context_token: issueInput.context_token
    });
    ensure(
      context.status === "active",
      409,
      "CONTEXT_CLOSED",
      `Context '${issueInput.context_token}' is already closed and cannot report a new issue.`,
      {
        context_token: issueInput.context_token
      }
    );

    const requestHash = digest({ operation: "issue.report", payload: issueInput });
    const idempotentRecord = this.#findIdempotencyRecord(context.project_id, "issue.report", idempotencyKey);
    if (idempotentRecord) {
      this.#ensureIdempotentPayload(idempotentRecord, requestHash);
      return {
        issue: this.#readRequiredIssue(context.project_id, idempotentRecord.resource_id),
        idempotent: true
      };
    }

    const now = isoNow();
    const issue = {
      issue_id: `iss-${randomUUID()}`,
      context_token: issueInput.context_token,
      context: this.#toLearningContextSnapshot(context),
      title: issueInput.title,
      summary: issueInput.summary,
      details: issueInput.details,
      status: "open",
      severity: issueInput.severity,
      tags: issueInput.tags ?? [],
      github_issue_url: issueInput.github_issue_url ?? null,
      created_at: now,
      updated_at: now
    };
    const reportedEvent = {
      issue_event_id: `ise-${randomUUID()}`,
      issue_id: issue.issue_id,
      context_token: issueInput.context_token,
      context: this.#toLearningContextSnapshot(context),
      event_type: "reported",
      summary: issueInput.summary,
      details: issueInput.details,
      version: undefined,
      branch: context.branch,
      github_issue_url: issue.github_issue_url,
      links: [],
      artifacts: [],
      created_at: now
    };

    this.#writeJsonFile(this.#issueFile(context.project_id, issue.issue_id), issue);
    this.#appendJsonLine(this.#issueEventsFile(context.project_id), reportedEvent);
    this.#appendIdempotencyRecord(context.project_id, {
      key: idempotencyKey,
      operation: "issue.report",
      request_hash: requestHash,
      resource_type: "issue",
      resource_id: issue.issue_id,
      timestamp: now
    });
    return { issue, idempotent: false };
  }

  async getIssue(contextToken, issueId) {
    const context = await this.getContext(contextToken);
    ensure(context, 404, "CONTEXT_NOT_FOUND", `No context exists with token '${contextToken}'.`, {
      context_token: contextToken
    });

    const issue = this.#readIssue(context.project_id, issueId);
    ensure(issue, 404, "ISSUE_NOT_FOUND", `No issue exists with id '${issueId}' in project '${context.project_id}'.`, {
      issue_id: issueId
    });

    return {
      issue,
      events: this.#readIssueEvents(context.project_id, issueId).sort((left, right) =>
        left.created_at.localeCompare(right.created_at)
      )
    };
  }

  async appendIssueEvent(eventInput, { idempotencyKey }) {
    const context = await this.getContext(eventInput.context_token);
    ensure(context, 404, "CONTEXT_NOT_FOUND", `No context exists with token '${eventInput.context_token}'.`, {
      context_token: eventInput.context_token
    });
    ensure(
      context.status === "active",
      409,
      "CONTEXT_CLOSED",
      `Context '${eventInput.context_token}' is already closed and cannot append issue events.`,
      {
        context_token: eventInput.context_token
      }
    );

    const issue = this.#readIssue(context.project_id, eventInput.issue_id);
    ensure(
      issue,
      404,
      "ISSUE_NOT_FOUND",
      `No issue exists with id '${eventInput.issue_id}' in project '${context.project_id}'.`,
      {
        issue_id: eventInput.issue_id
      }
    );
    if (eventInput.event_type === "github_issue_linked") {
      ensure(
        eventInput.github_issue_url,
        400,
        "GITHUB_ISSUE_URL_REQUIRED",
        "Issue events of type 'github_issue_linked' must include github_issue_url.",
        {
          issue_id: eventInput.issue_id
        }
      );
    }

    const requestHash = digest({ operation: "issue.add_event", payload: eventInput });
    const idempotentRecord = this.#findIdempotencyRecord(context.project_id, "issue.add_event", idempotencyKey);
    if (idempotentRecord) {
      this.#ensureIdempotentPayload(idempotentRecord, requestHash);
      return {
        issue_event: this.#readRequiredIssueEvent(context.project_id, idempotentRecord.resource_id),
        idempotent: true
      };
    }

    const now = isoNow();
    const issueEvent = {
      issue_event_id: `ise-${randomUUID()}`,
      issue_id: eventInput.issue_id,
      context_token: eventInput.context_token,
      context: this.#toLearningContextSnapshot(context),
      event_type: eventInput.event_type,
      summary: eventInput.summary,
      details: eventInput.details,
      version: eventInput.version,
      branch: eventInput.branch ?? context.branch,
      github_issue_url: eventInput.github_issue_url ?? issue.github_issue_url ?? null,
      links: eventInput.links ?? [],
      artifacts: eventInput.artifacts ?? [],
      created_at: now
    };
    const updatedIssue = this.#applyIssueEvent(issue, issueEvent);

    this.#appendJsonLine(this.#issueEventsFile(context.project_id), issueEvent);
    this.#writeJsonFile(this.#issueFile(context.project_id, issue.issue_id), updatedIssue);
    this.#appendIdempotencyRecord(context.project_id, {
      key: idempotencyKey,
      operation: "issue.add_event",
      request_hash: requestHash,
      resource_type: "issue_event",
      resource_id: issueEvent.issue_event_id,
      timestamp: now
    });
    return { issue_event: issueEvent, idempotent: false };
  }

  async listIssues(query) {
    const context = await this.getContext(query.context_token);
    ensure(context, 404, "CONTEXT_NOT_FOUND", `No context exists with token '${query.context_token}'.`, {
      context_token: query.context_token
    });

    let issues = this.#listProjectIssues(context.project_id);
    issues = issues.filter((issue) => this.#matchesIssueQuery(issue, query));
    issues = this.#sortIssues(issues, query.sort ?? "recent", {
      branch: query.branch ?? context.branch
    }).slice(0, query.limit ?? 50);

    return {
      issues,
      summary:
        issues.length === 0
          ? "No issues matched this search."
          : `Found ${issues.length} issue${issues.length === 1 ? "" : "s"} in this project.`
    };
  }

  async listActiveIssues(projectId, branch, limit = 3) {
    const project = await this.getProject(projectId);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${projectId}'.`, {
      project_id: projectId
    });

    return this.#sortIssues(
      this.#listProjectIssues(projectId).filter((issue) => isActiveIssueStatus(issue.status)),
      "severity",
      { branch }
    ).slice(0, limit);
  }

  async getProjectBrief(contextToken) {
    const context = await this.getContext(contextToken);
    ensure(context, 404, "CONTEXT_NOT_FOUND", `No context exists with token '${contextToken}'.`, {
      context_token: contextToken
    });

    return this.#buildContextBrief({
      projectId: context.project_id,
      branch: context.branch
    });
  }

  async getBranchBrief(contextToken, branch) {
    const context = await this.getContext(contextToken);
    ensure(context, 404, "CONTEXT_NOT_FOUND", `No context exists with token '${contextToken}'.`, {
      context_token: contextToken
    });

    return this.#buildContextBrief({
      projectId: context.project_id,
      branch: branch ?? context.branch,
      includeBranch: true
    });
  }

  async getOpenThreadsReadModel(contextToken, branch, limit) {
    const context = await this.getContext(contextToken);
    ensure(context, 404, "CONTEXT_NOT_FOUND", `No context exists with token '${contextToken}'.`, {
      context_token: contextToken
    });

    const projectId = context.project_id;
    const resolvedBranch = branch ?? context.branch;
    const entries = this.#readJsonLines(this.#entriesFile(projectId));
    const ruleChecks = this.#readJsonLines(this.#ruleChecksFile(projectId));
    const issues = this.#listProjectIssues(projectId);
    const ruleset = await this.getRuleset(projectId);

    return {
      branch: resolvedBranch,
      open_threads: this.#selectOpenThreads({
        branch: resolvedBranch,
        entries,
        ruleChecks,
        issues,
        ruleset,
        projectId,
        limit: limit ?? SESSION_START_LIMITS.open_threads
      })
    };
  }

  async getStartupSummary(projectId, branch, feature) {
    const project = await this.getProject(projectId);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${projectId}'.`, {
      project_id: projectId
    });

    return this.#buildStartupSummary({ projectId, branch, feature });
  }

  async getRuleset(projectId) {
    return this.#readJsonFile(this.#rulesetFile(projectId), null);
  }

  async upsertRuleset(projectId, rulesetInput) {
    const project = await this.getProject(projectId);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${projectId}'.`, {
      project_id: projectId
    });

    const existing = await this.getRuleset(projectId);
    const incomingRules = rulesetInput.rules ?? [];
    if (existing && stableStringify(existing.rules) === stableStringify(incomingRules)) {
      return existing;
    }

    const now = isoNow();
    const version = existing ? existing.version + 1 : 1;
    const ruleset = {
      project_id: projectId,
      ruleset_id: `${projectId}:${version}`,
      version,
      rules: incomingRules,
      created_at: existing?.created_at ?? now,
      updated_at: now
    };

    this.#writeJsonFile(this.#rulesetFile(projectId), ruleset);
    this.#writeJsonFile(this.#projectFile(projectId), {
      ...project,
      ruleset_id: ruleset.ruleset_id,
      updated_at: now
    });

    return ruleset;
  }

  async createSession(sessionInput, { idempotencyKey }) {
    const project = await this.getProject(sessionInput.project_id);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${sessionInput.project_id}'.`, {
      project_id: sessionInput.project_id
    });

    const requestHash = digest({ operation: "session.create", payload: sessionInput });
    const idempotentRecord = this.#findIdempotencyRecord(sessionInput.project_id, "session.create", idempotencyKey);
    if (idempotentRecord) {
      this.#ensureIdempotentPayload(idempotentRecord, requestHash);
      return {
        session: this.#readRequiredSession(idempotentRecord.resource_id, sessionInput.project_id),
        idempotent: true
      };
    }

    const now = isoNow();
    const ruleset = await this.getRuleset(sessionInput.project_id);
    const session = {
      session_id: `sess-${randomUUID()}`,
      project_id: sessionInput.project_id,
      branch: sessionInput.branch,
      workspace_path: sessionInput.workspace_path,
      author_id: sessionInput.author_id,
      author_type: sessionInput.author_type,
      source: sessionInput.source,
      agent_id: sessionInput.agent_id,
      started_at: now,
      ended_at: null,
      status: "active",
      goal: sessionInput.goal,
      plan_ref: sessionInput.plan_ref ?? null,
      ruleset_version: ruleset?.version ?? 0,
      visibility: "project",
      created_at: now,
      updated_at: now
    };

    this.#writeJsonFile(this.#sessionFile(session.project_id, session.session_id), session);
    this.#appendIdempotencyRecord(session.project_id, {
      key: idempotencyKey,
      operation: "session.create",
      request_hash: requestHash,
      resource_type: "session",
      resource_id: session.session_id,
      timestamp: now
    });
    return { session, idempotent: false };
  }

  async endSession(sessionId, status) {
    const session = await this.getSession(sessionId);
    ensure(session, 404, "SESSION_NOT_FOUND", `No session exists with id '${sessionId}'.`, {
      session_id: sessionId
    });
    const finalStatus = status ?? "completed";

    if (session.status === "completed" || session.status === "abandoned") {
      ensure(
        session.status === finalStatus,
        409,
        "SESSION_ALREADY_ENDED_WITH_DIFFERENT_STATUS",
        `Session '${sessionId}' is already '${session.status}' and cannot be changed to '${finalStatus}'.`,
        {
          session_id: sessionId,
          status: session.status,
          requested_status: finalStatus
        }
      );
      return session;
    }

    const now = isoNow();
    const ended = {
      ...session,
      status: finalStatus,
      ended_at: now,
      updated_at: now
    };
    this.#writeJsonFile(this.#sessionFile(ended.project_id, ended.session_id), ended);
    return ended;
  }

  async listSessions({ project_id, status, branch, limit }) {
    const project = await this.getProject(project_id);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${project_id}'.`, {
      project_id
    });

    const entries = this.#readJsonLines(this.#entriesFile(project_id));
    const ruleChecks = this.#readJsonLines(this.#ruleChecksFile(project_id));
    const sessions = this.#listProjectSessions(project_id)
      .filter((session) => !status || session.status === status)
      .filter((session) => !branch || session.branch === branch)
      .map((session) => this.#withSessionActivity(session, entries, ruleChecks))
      .sort((left, right) => {
        const byLastSeen = right.last_seen_at.localeCompare(left.last_seen_at);
        if (byLastSeen !== 0) {
          return byLastSeen;
        }
        return right.started_at.localeCompare(left.started_at);
      })
      .slice(0, limit ?? 100);

    return {
      sessions,
      summary:
        sessions.length === 1
          ? "1 session matched the query."
          : `${sessions.length} sessions matched the query.`
    };
  }

  async getSession(sessionId) {
    for (const projectId of this.#listProjectIds()) {
      const sessionPath = this.#sessionFile(projectId, sessionId);
      if (existsSync(sessionPath)) {
        return this.#readJsonFile(sessionPath, null);
      }
    }
    return null;
  }

  async getSessionCloseout(sessionId) {
    const session = await this.getSession(sessionId);
    ensure(session, 404, "SESSION_NOT_FOUND", `No session exists with id '${sessionId}'.`, {
      session_id: sessionId
    });

    const entries = this.#readJsonLines(this.#entriesFile(session.project_id));
    const ruleChecks = this.#readJsonLines(this.#ruleChecksFile(session.project_id));
    const sessionEntries = entries.filter((entry) => entry.session_id === session.session_id);
    const sessionRuleChecks = ruleChecks.filter((ruleCheck) => ruleCheck.session_id === session.session_id);
    const sessionWithActivity = this.#withSessionActivity(session, entries, ruleChecks);
    const ruleset = await this.getRuleset(session.project_id);
    const coveredRuleIds = new Set(sessionRuleChecks.map((ruleCheck) => ruleCheck.rule_id));
    const missingRequiredRules = (ruleset?.rules ?? []).filter(
      (rule) => rule.severity === "required" && !coveredRuleIds.has(rule.rule_id)
    );
    const activeLearningSummaries = await this.listActiveBranchLearnings(session.project_id, session.branch, 5);
    const activeIssueSummaries = await this.listActiveIssues(session.project_id, session.branch, 5);

    const entryGroups = [...groupBy(sessionEntries, (entry) => entry.entry_type).entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([entryType, groupedEntries]) => ({
        entry_type: entryType,
        count: groupedEntries.length,
        entries: groupedEntries.sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      }));

    const parts = [
      `Session '${session.goal}' recorded ${sessionEntries.length} entr${sessionEntries.length === 1 ? "y" : "ies"} and ${sessionRuleChecks.length} rule check${sessionRuleChecks.length === 1 ? "" : "s"}.`
    ];
    if (missingRequiredRules.length > 0) {
      parts.push(
        missingRequiredRules.length === 1
          ? "1 required rule still has no check for this work unit."
          : `${missingRequiredRules.length} required rules still have no checks for this work unit.`
      );
    }
    if (activeLearningSummaries.length > 0) {
      parts.push(
        activeLearningSummaries.length === 1
          ? "1 active learning remains on this branch."
          : `${activeLearningSummaries.length} active learnings remain on this branch.`
      );
    }
    if (activeIssueSummaries.length > 0) {
      parts.push(
        activeIssueSummaries.length === 1
          ? "1 active issue remains on this branch."
          : `${activeIssueSummaries.length} active issues remain on this branch.`
      );
    }

    return {
      session_id: session.session_id,
      project_id: session.project_id,
      branch: session.branch,
      goal: session.goal,
      plan_ref: session.plan_ref,
      status: session.status,
      started_at: session.started_at,
      ended_at: session.ended_at,
      last_seen_at: sessionWithActivity.last_seen_at,
      activity_counts: sessionWithActivity.activity_counts,
      entry_groups: entryGroups,
      rule_checks: sessionRuleChecks.sort((left, right) => right.timestamp.localeCompare(left.timestamp)),
      missing_required_rules: missingRequiredRules,
      active_learning_count: activeLearningSummaries.length,
      active_learning_summaries: activeLearningSummaries,
      active_issue_count: activeIssueSummaries.length,
      active_issue_summaries: activeIssueSummaries,
      summary: parts.join(" ")
    };
  }

  async getSessionStartContext({ project_id, branch }) {
    const project = await this.getProject(project_id);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${project_id}'.`, {
      project_id
    });

    const ruleset = await this.getRuleset(project_id);
    const entries = this.#readJsonLines(this.#entriesFile(project_id));
    const learnings = this.#readJsonLines(this.#learningsFile(project_id));
    const ruleChecks = this.#readJsonLines(this.#ruleChecksFile(project_id));
    const issues = this.#listProjectIssues(project_id);

    return {
      rules: ruleset?.rules ?? [],
      features: project.features ?? [],
      recent_decisions: this.#selectRecallEntries(entries, {
        branch,
        entryTypes: ["decision"],
        limit: SESSION_START_LIMITS.recent_decisions
      }),
      recent_risks: this.#selectRecallEntries(entries, {
        branch,
        entryTypes: ["risk"],
        limit: SESSION_START_LIMITS.recent_risks,
        openFirst: true
      }),
      recent_tooling_notes: this.#selectRecallEntries(entries, {
        branch,
        entryTypes: ["tooling_note"],
        limit: SESSION_START_LIMITS.recent_tooling_notes
      }),
      recent_learnings: this.#selectRecentLearnings(project_id, learnings, {
        branch,
        limit: SESSION_START_LIMITS.recent_learnings
      }),
      open_threads: this.#selectOpenThreads({
        branch,
        entries,
        ruleChecks,
        issues,
        ruleset,
        projectId: project_id,
        limit: SESSION_START_LIMITS.open_threads
      })
    };
  }

  async listActiveBranchLearnings(projectId, branch, limit = 3) {
    const project = await this.getProject(projectId);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${projectId}'.`, {
      project_id: projectId
    });

    return this.#selectRecentLearnings(projectId, this.#readJsonLines(this.#learningsFile(projectId)), {
      branch,
      limit
    });
  }

  async appendEntry(entryInput, { idempotencyKey }) {
    const project = await this.getProject(entryInput.project_id);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${entryInput.project_id}'.`, {
      project_id: entryInput.project_id
    });
    const session = await this.getSession(entryInput.session_id);
    ensure(session, 404, "SESSION_NOT_FOUND", `No session exists with id '${entryInput.session_id}'.`, {
      session_id: entryInput.session_id
    });
    ensure(
      session.project_id === entryInput.project_id,
      409,
      "SESSION_PROJECT_MISMATCH",
      `Session '${entryInput.session_id}' does not belong to project '${entryInput.project_id}'.`,
      {
        session_id: entryInput.session_id,
        project_id: entryInput.project_id
      }
    );
    ensure(
      session.branch === entryInput.branch,
      409,
      "SESSION_BRANCH_MISMATCH",
      `Session '${entryInput.session_id}' belongs to branch '${session.branch}', not '${entryInput.branch}'.`,
      {
        session_id: entryInput.session_id,
        expected_branch: session.branch,
        branch: entryInput.branch
      }
    );

    const requestHash = digest({ operation: "entry.append", payload: entryInput });
    const idempotentRecord = this.#findIdempotencyRecord(entryInput.project_id, "entry.append", idempotencyKey);
    if (idempotentRecord) {
      this.#ensureIdempotentPayload(idempotentRecord, requestHash);
      return {
        entry: this.#readRequiredEntry(entryInput.project_id, idempotentRecord.resource_id),
        idempotent: true
      };
    }

    const now = isoNow();
    const entry = {
      entry_id: `ent-${randomUUID()}`,
      project_id: entryInput.project_id,
      session_id: entryInput.session_id,
      branch: entryInput.branch,
      author_id: entryInput.author_id,
      author_type: entryInput.author_type,
      source: entryInput.source,
      entry_type: entryInput.entry_type,
      timestamp: now,
      summary: entryInput.summary,
      details: entryInput.details,
      feature: entryInput.feature,
      category: entryInput.category,
      tags: entryInput.tags ?? [],
      links: entryInput.links ?? [],
      artifacts: entryInput.artifacts ?? [],
      related_rule_ids: [],
      related_entry_ids: [],
      lifecycle_state: entryInput.lifecycle_state ?? null,
      importance: entryInput.importance ?? "normal",
      visibility: "project",
      created_at: now,
      updated_at: now
    };

    this.#appendJsonLine(this.#entriesFile(entry.project_id), entry);
    this.#appendIdempotencyRecord(entry.project_id, {
      key: idempotencyKey,
      operation: "entry.append",
      request_hash: requestHash,
      resource_type: "entry",
      resource_id: entry.entry_id,
      timestamp: now
    });

    return { entry, idempotent: false };
  }

  async appendRuleCheck(ruleCheckInput, { idempotencyKey }) {
    const project = await this.getProject(ruleCheckInput.project_id);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${ruleCheckInput.project_id}'.`, {
      project_id: ruleCheckInput.project_id
    });
    const session = await this.getSession(ruleCheckInput.session_id);
    ensure(session, 404, "SESSION_NOT_FOUND", `No session exists with id '${ruleCheckInput.session_id}'.`, {
      session_id: ruleCheckInput.session_id
    });
    ensure(
      session.project_id === ruleCheckInput.project_id,
      409,
      "SESSION_PROJECT_MISMATCH",
      `Session '${ruleCheckInput.session_id}' does not belong to project '${ruleCheckInput.project_id}'.`,
      {
        session_id: ruleCheckInput.session_id,
        project_id: ruleCheckInput.project_id
      }
    );

    const ruleset = await this.getRuleset(ruleCheckInput.project_id);
    const rule = (ruleset?.rules ?? []).find((candidate) => candidate.rule_id === ruleCheckInput.rule_id);
    ensure(
      rule,
      404,
      "RULE_NOT_FOUND",
      `No active rule exists with id '${ruleCheckInput.rule_id}' in project '${ruleCheckInput.project_id}'.`,
      {
        project_id: ruleCheckInput.project_id,
        rule_id: ruleCheckInput.rule_id
      }
    );

    const requestHash = digest({ operation: "rule_check.append", payload: ruleCheckInput });
    const idempotentRecord = this.#findIdempotencyRecord(ruleCheckInput.project_id, "rule_check.append", idempotencyKey);
    if (idempotentRecord) {
      this.#ensureIdempotentPayload(idempotentRecord, requestHash);
      return {
        ruleCheck: this.#readRequiredRuleCheck(ruleCheckInput.project_id, idempotentRecord.resource_id),
        idempotent: true
      };
    }

    const now = isoNow();
    const ruleCheck = {
      rule_check_id: `rc-${randomUUID()}`,
      project_id: ruleCheckInput.project_id,
      session_id: ruleCheckInput.session_id,
      rule_id: ruleCheckInput.rule_id,
      author_id: ruleCheckInput.author_id,
      author_type: ruleCheckInput.author_type,
      source: ruleCheckInput.source,
      timestamp: now,
      status: ruleCheckInput.status,
      evidence: ruleCheckInput.evidence,
      note: ruleCheckInput.note,
      links: ruleCheckInput.links ?? [],
      visibility: "project"
    };

    this.#appendJsonLine(this.#ruleChecksFile(ruleCheck.project_id), ruleCheck);
    this.#appendIdempotencyRecord(ruleCheck.project_id, {
      key: idempotencyKey,
      operation: "rule_check.append",
      request_hash: requestHash,
      resource_type: "rule_check",
      resource_id: ruleCheck.rule_check_id,
      timestamp: now
    });

    return { ruleCheck, idempotent: false };
  }

  async listRuleChecks(query) {
    const project = await this.getProject(query.project_id);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${query.project_id}'.`, {
      project_id: query.project_id
    });

    const ruleChecks = this.#readJsonLines(this.#ruleChecksFile(query.project_id))
      .filter((ruleCheck) => (query.session_id ? ruleCheck.session_id === query.session_id : true))
      .filter((ruleCheck) => (query.rule_id ? ruleCheck.rule_id === query.rule_id : true))
      .filter((ruleCheck) => (query.status ? ruleCheck.status === query.status : true))
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp));

    return {
      rule_checks: ruleChecks,
      summary:
        ruleChecks.length === 0
          ? `No rule checks found for project '${query.project_id}'.`
          : `Found ${ruleChecks.length} rule check${ruleChecks.length === 1 ? "" : "s"} for project '${query.project_id}'.`
    };
  }

  async searchEntries(query) {
    const project = await this.getProject(query.project_id);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${query.project_id}'.`, {
      project_id: query.project_id
    });

    let entries = this.#readJsonLines(this.#entriesFile(query.project_id));
    entries = entries.filter((entry) => this.#matchesQuery(entry, query));
    entries = this.#sortEntries(entries, query.sort ?? "recent").slice(0, query.limit ?? 50);

    return {
      entries,
      facets: {
        entry_types: toCountFacet(entries.map((entry) => entry.entry_type)),
        categories: toCountFacet(entries.map((entry) => entry.category).filter(Boolean)),
        tags: toCountFacet(entries.flatMap((entry) => entry.tags ?? []))
      },
      summary:
        entries.length === 0
          ? `No entries found for project '${query.project_id}'.`
          : `Found ${entries.length} entr${entries.length === 1 ? "y" : "ies"} for project '${query.project_id}'.`
    };
  }

  #matchesQuery(entry, query) {
    if (query.branch && entry.branch !== query.branch) {
      return false;
    }
    if (query.session_id && entry.session_id !== query.session_id) {
      return false;
    }
    if (query.entry_type?.length && !query.entry_type.includes(entry.entry_type)) {
      return false;
    }
    if (query.feature && entry.feature !== query.feature) {
      return false;
    }
    if (query.category && entry.category !== query.category) {
      return false;
    }
    if (query.lifecycle_state && entry.lifecycle_state !== query.lifecycle_state) {
      return false;
    }
    if (query.tags?.length) {
      const entryTags = new Set(entry.tags ?? []);
      for (const tag of query.tags) {
        if (!entryTags.has(tag)) {
          return false;
        }
      }
    }
    if (query.query) {
      const needle = query.query.toLowerCase();
      const haystack = `${entry.summary}\n${entry.details ?? ""}`.toLowerCase();
      if (!haystack.includes(needle)) {
        return false;
      }
    }
    return true;
  }

  #matchesLearningQuery(learning, query) {
    if (query.branch && learning.context.branch !== query.branch) {
      return false;
    }
    if (query.feature && learning.context.feature !== query.feature) {
      return false;
    }
    if (query.source_tool && learning.context.source_tool !== query.source_tool) {
      return false;
    }
    if (query.scope && learning.scope !== query.scope) {
      return false;
    }
    if (query.status && learning.status !== query.status) {
      return false;
    }
    if (query.tags?.length) {
      const learningTags = new Set(learning.tags ?? []);
      for (const tag of query.tags) {
        if (!learningTags.has(tag)) {
          return false;
        }
      }
    }
    if (query.query) {
      const needle = query.query.toLowerCase();
      const haystack = `${learning.summary}\n${learning.details ?? ""}\n${learning.recommended_action}`.toLowerCase();
      if (!haystack.includes(needle)) {
        return false;
      }
    }
    return true;
  }

  #matchesIssueQuery(issue, query) {
    if (query.branch && issue.context.branch !== query.branch) {
      return false;
    }
    if (query.feature && issue.context.feature !== query.feature) {
      return false;
    }
    if (query.source_tool && issue.context.source_tool !== query.source_tool) {
      return false;
    }
    if (query.status && query.status !== "all") {
      if (query.status === "active") {
        if (!isActiveIssueStatus(issue.status)) {
          return false;
        }
      } else if (issue.status !== query.status) {
        return false;
      }
    }
    if (query.tags?.length) {
      const issueTags = new Set(issue.tags ?? []);
      for (const tag of query.tags) {
        if (!issueTags.has(tag)) {
          return false;
        }
      }
    }
    if (query.query) {
      const needle = query.query.toLowerCase();
      const haystack = `${issue.title}\n${issue.summary}\n${issue.details ?? ""}\n${issue.github_issue_url ?? ""}`.toLowerCase();
      if (!haystack.includes(needle)) {
        return false;
      }
    }
    return true;
  }

  #selectRecentLearnings(projectId, learnings, { branch, limit }) {
    return this.#sortLearnings(
      learnings.filter((learning) => learning.status === "active"),
      "importance",
      { branch }
    )
      .slice(0, limit)
      .map((learning) => this.#withLearningFeedbackSummary(projectId, learning));
  }

  #sortEntries(entries, sort) {
    return [...entries].sort((left, right) => {
      if (sort === "importance") {
        const byImportance = IMPORTANCE_WEIGHT[right.importance] - IMPORTANCE_WEIGHT[left.importance];
        if (byImportance !== 0) {
          return byImportance;
        }
      }
      return right.timestamp.localeCompare(left.timestamp);
    });
  }

  #sortLearnings(learnings, sort, { branch } = {}) {
    return [...learnings].sort((left, right) => {
      const byBranch = compareBranchMatch(left.context, right.context, branch);
      if (byBranch !== 0) {
        return byBranch;
      }
      if (sort === "importance") {
        const byImportance = IMPORTANCE_WEIGHT[right.importance] - IMPORTANCE_WEIGHT[left.importance];
        if (byImportance !== 0) {
          return byImportance;
        }
      }
      return right.updated_at.localeCompare(left.updated_at);
    });
  }

  #sortIssues(issues, sort, { branch } = {}) {
    return [...issues].sort((left, right) => {
      const byBranch = compareIssueBranchMatch(left, right, branch);
      if (byBranch !== 0) {
        return byBranch;
      }
      if (sort === "severity") {
        const bySeverity = ISSUE_SEVERITY_WEIGHT[right.severity] - ISSUE_SEVERITY_WEIGHT[left.severity];
        if (bySeverity !== 0) {
          return bySeverity;
        }
      }
      return right.updated_at.localeCompare(left.updated_at);
    });
  }

  #ensureIdempotentPayload(record, requestHash) {
    ensure(
      record.request_hash === requestHash,
      409,
      "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
      "The same idempotency key was reused with a different payload.",
      {
        idempotency_key: record.key
      }
    );
  }

  #findIdempotencyRecord(projectId, operation, key) {
    const records = this.#readJsonLines(this.#idempotencyFile(projectId));
    return records.find((record) => record.operation === operation && record.key === key) ?? null;
  }

  #appendIdempotencyRecord(projectId, record) {
    this.#appendJsonLine(this.#idempotencyFile(projectId), record);
  }

  #readRequiredSession(sessionId, projectId) {
    const session = this.#readJsonFile(this.#sessionFile(projectId, sessionId), null);
    ensure(session, 500, "SESSION_IDEMPOTENCY_TARGET_MISSING", `Session '${sessionId}' was not found.`, {
      session_id: sessionId
    });
    return session;
  }

  #readRequiredEntry(projectId, entryId) {
    const entry = this.#readJsonLines(this.#entriesFile(projectId)).find((item) => item.entry_id === entryId) ?? null;
    ensure(entry, 500, "ENTRY_IDEMPOTENCY_TARGET_MISSING", `Entry '${entryId}' was not found.`, {
      entry_id: entryId
    });
    return entry;
  }

  #readRequiredRuleCheck(projectId, ruleCheckId) {
    const ruleCheck =
      this.#readJsonLines(this.#ruleChecksFile(projectId)).find((item) => item.rule_check_id === ruleCheckId) ?? null;
    ensure(ruleCheck, 500, "RULE_CHECK_IDEMPOTENCY_TARGET_MISSING", `Rule check '${ruleCheckId}' was not found.`, {
      rule_check_id: ruleCheckId
    });
    return ruleCheck;
  }

  #readRequiredContext(projectId, contextId) {
    const context = this.#readJsonFile(this.#contextFile(projectId, contextId), null);
    ensure(context, 500, "CONTEXT_IDEMPOTENCY_TARGET_MISSING", `Context '${contextId}' was not found.`, {
      context_id: contextId
    });
    return context;
  }

  #readRequiredLearning(projectId, learningId) {
    const learning = this.#readLearning(projectId, learningId);
    ensure(learning, 500, "LEARNING_IDEMPOTENCY_TARGET_MISSING", `Learning '${learningId}' was not found.`, {
      learning_id: learningId
    });
    return this.#withLearningFeedbackSummary(projectId, learning);
  }

  #readLearning(projectId, learningId) {
    return this.#readJsonLines(this.#learningsFile(projectId)).find((item) => item.learning_id === learningId) ?? null;
  }

  #readRequiredLearningFeedback(projectId, feedbackId) {
    const feedback = this.#readJsonLines(this.#learningFeedbackFile(projectId)).find((item) => item.feedback_id === feedbackId) ?? null;
    ensure(feedback, 500, "LEARNING_FEEDBACK_IDEMPOTENCY_TARGET_MISSING", `Learning feedback '${feedbackId}' was not found.`, {
      feedback_id: feedbackId
    });
    return feedback;
  }

  #readRequiredIssue(projectId, issueId) {
    const issue = this.#readIssue(projectId, issueId);
    ensure(issue, 500, "ISSUE_IDEMPOTENCY_TARGET_MISSING", `Issue '${issueId}' was not found.`, {
      issue_id: issueId
    });
    return issue;
  }

  #readIssue(projectId, issueId) {
    return this.#readJsonFile(this.#issueFile(projectId, issueId), null);
  }

  #readRequiredIssueEvent(projectId, issueEventId) {
    const issueEvent =
      this.#readJsonLines(this.#issueEventsFile(projectId)).find((item) => item.issue_event_id === issueEventId) ?? null;
    ensure(issueEvent, 500, "ISSUE_EVENT_IDEMPOTENCY_TARGET_MISSING", `Issue event '${issueEventId}' was not found.`, {
      issue_event_id: issueEventId
    });
    return issueEvent;
  }

  #readIssueEvents(projectId, issueId) {
    return this.#readJsonLines(this.#issueEventsFile(projectId)).filter((item) => item.issue_id === issueId);
  }

  #applyIssueEvent(issue, issueEvent) {
    let status = issue.status;
    let githubIssueUrl = issue.github_issue_url;

    if (issueEvent.github_issue_url) {
      githubIssueUrl = issueEvent.github_issue_url;
    }
    if (issueEvent.event_type === "fix_linked") {
      status = "fixed_pending_verification";
    } else if (issueEvent.event_type === "verified_fixed") {
      status = "resolved";
    } else if (issueEvent.event_type === "reopened") {
      status = "open";
    }

    return {
      ...issue,
      status,
      github_issue_url: githubIssueUrl,
      updated_at: issueEvent.created_at
    };
  }

  #toLearningContextSnapshot(context) {
    return {
      branch: context.branch,
      workspace_path: context.workspace_path,
      feature: context.feature,
      source_tool: context.source_tool,
      tool_version: context.tool_version,
      environment: context.environment,
      dataset_version: context.dataset_version,
      author_id: context.author_id,
      author_type: context.author_type,
      source: context.source,
      agent_id: context.agent_id ?? null
    };
  }

  #projectDir(projectId) {
    return resolve(this.dataRoot, "projects", projectId);
  }

  #projectFile(projectId) {
    return join(this.#projectDir(projectId), "project.json");
  }

  #rulesetFile(projectId) {
    return join(this.#projectDir(projectId), "ruleset.json");
  }

  #sessionFile(projectId, sessionId) {
    return join(this.#projectDir(projectId), "sessions", `${sessionId}.json`);
  }

  #contextFile(projectId, contextId) {
    return join(this.#projectDir(projectId), "contexts", `${contextId}.json`);
  }

  #entriesFile(projectId) {
    return join(this.#projectDir(projectId), "entries.jsonl");
  }

  #issueFile(projectId, issueId) {
    return join(this.#projectDir(projectId), "issues", `${issueId}.json`);
  }

  #issueEventsFile(projectId) {
    return join(this.#projectDir(projectId), "issue-events.jsonl");
  }

  #learningsFile(projectId) {
    return join(this.#projectDir(projectId), "learnings.jsonl");
  }

  #learningFeedbackFile(projectId) {
    return join(this.#projectDir(projectId), "learning-feedback.jsonl");
  }

  #ruleChecksFile(projectId) {
    return join(this.#projectDir(projectId), "rule-checks.jsonl");
  }

  #idempotencyFile(projectId) {
    return join(this.#projectDir(projectId), "idempotency.jsonl");
  }

  #listProjectIds() {
    const projectsDir = resolve(this.dataRoot, "projects");
    if (!existsSync(projectsDir)) {
      return [];
    }
    return readdirSync(projectsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  }

  #readJsonFile(filePath, fallback) {
    if (!existsSync(filePath)) {
      return fallback;
    }
    return JSON.parse(readFileSync(filePath, "utf8"));
  }

  #writeJsonFile(filePath, value) {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }

  #rewriteJsonLines(filePath, mapLine) {
    const values = this.#readJsonLines(filePath).map((value) => mapLine(value));
    if (values.length === 0 && !existsSync(filePath)) {
      return;
    }
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, values.map((value) => JSON.stringify(value)).join("\n") + (values.length ? "\n" : ""), "utf8");
  }

  #readJsonLines(filePath) {
    if (!existsSync(filePath)) {
      return [];
    }
    return readFileSync(filePath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }

  #appendJsonLine(filePath, value) {
    mkdirSync(dirname(filePath), { recursive: true });
    appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
  }

  #listProjectContexts(projectId) {
    const contextsDir = join(this.#projectDir(projectId), "contexts");
    if (!existsSync(contextsDir)) {
      return [];
    }

    return readdirSync(contextsDir)
      .filter((fileName) => fileName.endsWith(".json"))
      .map((fileName) => this.#readJsonFile(join(contextsDir, fileName), null))
      .filter(Boolean);
  }

  #listProjectIssues(projectId) {
    const issuesDir = join(this.#projectDir(projectId), "issues");
    if (!existsSync(issuesDir)) {
      return [];
    }

    return readdirSync(issuesDir)
      .filter((fileName) => fileName.endsWith(".json"))
      .map((fileName) => this.#readJsonFile(join(issuesDir, fileName), null))
      .filter(Boolean);
  }

  #learningFeedbackSummary(projectId, learningId) {
    const summary = {
      confirm_count: 0,
      did_not_work_count: 0,
      comment_count: 0,
      last_feedback_at: null
    };

    for (const feedback of this.#readJsonLines(this.#learningFeedbackFile(projectId))) {
      if (feedback.learning_id !== learningId) {
        continue;
      }
      if (feedback.feedback_type === "confirm") {
        summary.confirm_count += 1;
      } else if (feedback.feedback_type === "did_not_work") {
        summary.did_not_work_count += 1;
      } else if (feedback.feedback_type === "comment") {
        summary.comment_count += 1;
      }
      if (!summary.last_feedback_at || feedback.created_at > summary.last_feedback_at) {
        summary.last_feedback_at = feedback.created_at;
      }
    }

    return summary;
  }

  #withLearningFeedbackSummary(projectId, learning) {
    return {
      ...learning,
      feedback_summary: this.#learningFeedbackSummary(projectId, learning.learning_id)
    };
  }

  #featureUsageSummary(projectId, feature) {
    const contexts = this.#listProjectContexts(projectId).filter((context) => context.feature === feature).length;
    const entries = this.#readJsonLines(this.#entriesFile(projectId)).filter((entry) => entry.feature === feature).length;
    const learnings = this.#readJsonLines(this.#learningsFile(projectId)).filter(
      (learning) => learning.context?.feature === feature
    ).length;
    const issues = this.#listProjectIssues(projectId).filter((issue) => issue.context?.feature === feature).length;

    return {
      contexts,
      entries,
      learnings,
      issues,
      total: contexts + entries + learnings + issues
    };
  }

  #selectRecallEntries(entries, { branch, entryTypes, lifecycleState, limit, openFirst = false }) {
    return entries
      .filter((entry) => entryTypes.includes(entry.entry_type))
      .filter((entry) => (lifecycleState ? entry.lifecycle_state === lifecycleState : true))
      .sort((left, right) => {
        const byBranch = compareBranchMatch(left, right, branch);
        if (byBranch !== 0) {
          return byBranch;
        }

        if (openFirst) {
          const byOpenState = compareBoolean(right.lifecycle_state === "open", left.lifecycle_state === "open");
          if (byOpenState !== 0) {
            return byOpenState;
          }
        }

        const byImportance = IMPORTANCE_WEIGHT[right.importance] - IMPORTANCE_WEIGHT[left.importance];
        if (byImportance !== 0) {
          return byImportance;
        }

        return right.timestamp.localeCompare(left.timestamp);
      })
      .slice(0, limit)
      .map((entry) => toRecallEntrySummary(entry));
  }

  #selectOpenThreads({ branch, entries, ruleChecks, issues, ruleset, projectId, limit }) {
    const entryThreads = this.#selectRecallEntries(entries, {
      branch,
      entryTypes: ["risk", "feedback"],
      lifecycleState: "open",
      limit
    }).map((entry) => ({
      kind: "entry",
      summary: entry.summary,
      session_id: entry.session_id,
      branch: entry.branch,
      importance: entry.importance,
      timestamp: entry.timestamp,
      entry_id: entry.entry_id,
      entry_type: entry.entry_type,
      lifecycle_state: entry.lifecycle_state
    }));

    const blockedRuleThreads = this.#blockedRuleCheckThreads({
      projectId,
      branch,
      ruleChecks,
      ruleset
    });
    const issueThreads = this.#activeIssueThreads({
      branch,
      issues
    });

    return [...entryThreads, ...blockedRuleThreads, ...issueThreads]
      .sort((left, right) => {
        const byBranch = compareBranchMatch(left, right, branch);
        if (byBranch !== 0) {
          return byBranch;
        }

        const byImportance = IMPORTANCE_WEIGHT[right.importance] - IMPORTANCE_WEIGHT[left.importance];
        if (byImportance !== 0) {
          return byImportance;
        }

        return right.timestamp.localeCompare(left.timestamp);
      })
      .slice(0, limit);
  }

  #activeIssueThreads({ branch, issues }) {
    return this.#sortIssues(
      issues.filter((issue) => isActiveIssueStatus(issue.status)),
      "severity",
      { branch }
    ).map((issue) => ({
      kind: "issue",
      summary: `${issue.title}: ${issue.summary}`,
      session_id: undefined,
      branch: issue.context.branch,
      importance: issueSeverityToImportance(issue.severity),
      timestamp: issue.updated_at,
      issue_id: issue.issue_id,
      issue_status: issue.status,
      severity: issue.severity
    }));
  }

  #blockedRuleCheckThreads({ projectId, branch, ruleChecks, ruleset }) {
    const rulesById = new Map((ruleset?.rules ?? []).map((rule) => [rule.rule_id, rule]));
    const sessionsById = new Map(this.#listProjectSessions(projectId).map((session) => [session.session_id, session]));

    return ruleChecks
      .filter((ruleCheck) => ruleCheck.status === "blocked")
      .map((ruleCheck) => {
        const session = sessionsById.get(ruleCheck.session_id);
        if (!session) {
          return null;
        }

        const rule = rulesById.get(ruleCheck.rule_id);
        const baseSummary = rule ? `Blocked rule: ${rule.label}` : `Blocked rule: ${ruleCheck.rule_id}`;
        return {
          kind: "rule_check",
          summary: ruleCheck.note ? `${baseSummary}. ${ruleCheck.note}` : baseSummary,
          session_id: ruleCheck.session_id,
          branch: session.branch,
          importance: rule?.severity === "required" ? "high" : "normal",
          timestamp: ruleCheck.timestamp,
          rule_check_id: ruleCheck.rule_check_id,
          rule_id: ruleCheck.rule_id,
          status: ruleCheck.status
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        const byBranch = compareBranchMatch(left, right, branch);
        if (byBranch !== 0) {
          return byBranch;
        }
        return right.timestamp.localeCompare(left.timestamp);
      });
  }

  #listProjectSessions(projectId) {
    const sessionsDir = join(this.#projectDir(projectId), "sessions");
    if (!existsSync(sessionsDir)) {
      return [];
    }

    return readdirSync(sessionsDir)
      .filter((fileName) => fileName.endsWith(".json"))
      .map((fileName) => this.#readJsonFile(join(sessionsDir, fileName), null))
      .filter(Boolean);
  }

  #withSessionActivity(session, entries, ruleChecks) {
    const observedAt = [session.updated_at, session.started_at];
    let entryCount = 0;
    for (const entry of entries) {
      if (entry.session_id === session.session_id) {
        entryCount += 1;
        observedAt.push(entry.timestamp);
      }
    }
    let ruleCheckCount = 0;
    for (const ruleCheck of ruleChecks) {
      if (ruleCheck.session_id === session.session_id) {
        ruleCheckCount += 1;
        observedAt.push(ruleCheck.timestamp);
      }
    }
    return {
      ...session,
      last_seen_at: observedAt.sort().at(-1),
      activity_counts: {
        entries: entryCount,
        rule_checks: ruleCheckCount
      }
    };
  }

  async #buildContextBrief({ projectId, branch, includeBranch = false }) {
    const project = await this.getProject(projectId);
    ensure(project, 404, "PROJECT_NOT_FOUND", `No project exists with id '${projectId}'.`, {
      project_id: projectId
    });

    const ruleset = await this.getRuleset(projectId);
    const entries = this.#readJsonLines(this.#entriesFile(projectId));
    const learnings = this.#readJsonLines(this.#learningsFile(projectId));
    const ruleChecks = this.#readJsonLines(this.#ruleChecksFile(projectId));
    const issues = this.#listProjectIssues(projectId);

    return {
      project,
      ...(includeBranch ? { branch } : {}),
      rules: ruleset?.rules ?? [],
      latest_plan_ref: this.#selectLatestPlanRef(projectId, branch),
      recent_decisions: this.#selectRecallEntries(entries, {
        branch,
        entryTypes: ["decision"],
        limit: SESSION_START_LIMITS.recent_decisions
      }),
      recent_risks: this.#selectRecallEntries(entries, {
        branch,
        entryTypes: ["risk"],
        limit: SESSION_START_LIMITS.recent_risks,
        openFirst: true
      }),
      recent_learnings: this.#selectRecentLearnings(projectId, learnings, {
        branch,
        limit: SESSION_START_LIMITS.recent_learnings
      }),
      active_issues: this.#sortIssues(
        issues.filter((issue) => isActiveIssueStatus(issue.status)),
        "severity",
        { branch }
      ).slice(0, SESSION_START_LIMITS.active_issues),
      open_threads: this.#selectOpenThreads({
        branch,
        entries,
        ruleChecks,
        issues,
        ruleset,
        projectId,
        limit: SESSION_START_LIMITS.open_threads
      })
    };
  }

  #selectLatestPlanRef(projectId, branch) {
    const sessions = this.#listProjectSessions(projectId).filter((session) => Boolean(session.plan_ref));
    if (sessions.length === 0) {
      return null;
    }

    return [...sessions]
      .sort((left, right) => {
        const byBranch = compareBranchMatch(left, right, branch);
        if (byBranch !== 0) {
          return byBranch;
        }
        return right.updated_at.localeCompare(left.updated_at);
      })
      .at(0)?.plan_ref ?? null;
  }

  async #buildStartupSummary({ projectId, branch, feature }) {
    const ruleset = await this.getRuleset(projectId);
    const learnings = this.#readJsonLines(this.#learningsFile(projectId));
    const issues = this.#listProjectIssues(projectId);
    const entries = this.#readJsonLines(this.#entriesFile(projectId));
    const ruleChecks = this.#readJsonLines(this.#ruleChecksFile(projectId));

    const activeLearnings = this.#sortLearnings(
      learnings.filter((learning) => learning.status === "active" && learning.context.branch === branch),
      "importance",
      { branch }
    );
    const activeIssues = this.#sortIssues(
      issues.filter((issue) => isActiveIssueStatus(issue.status) && issue.context.branch === branch),
      "severity",
      { branch }
    );
    const openThreads = this.#selectOpenThreads({
      branch,
      entries,
      ruleChecks,
      issues,
      ruleset,
      projectId,
      limit: Number.MAX_SAFE_INTEGER
    });

    const counts = {
      rules: ruleset?.rules?.length ?? 0,
      active_learnings: activeLearnings.length,
      active_issues: activeIssues.length,
      open_threads: openThreads.length
    };

    return {
      project_id: projectId,
      branch,
      feature,
      counts,
      highlights: {
        learnings: activeLearnings.slice(0, STARTUP_SUMMARY_LIMITS.learnings).map((learning) => ({
          learning_id: learning.learning_id,
          summary: learning.summary,
          importance: learning.importance,
          status: learning.status
        })),
        issues: activeIssues.slice(0, STARTUP_SUMMARY_LIMITS.issues).map((issue) => ({
          issue_id: issue.issue_id,
          title: issue.title,
          status: issue.status,
          severity: issue.severity
        })),
        open_threads: openThreads.slice(0, STARTUP_SUMMARY_LIMITS.open_threads)
      },
      hint: "Use context.get_project_brief, context.get_open_threads, learning.get_recent, or issue.list for details.",
      summary: `HiveMind sees ${counts.active_learnings} active learning${counts.active_learnings === 1 ? "" : "s"}, ${counts.active_issues} active issue${counts.active_issues === 1 ? "" : "s"}, and ${counts.open_threads} open thread${counts.open_threads === 1 ? "" : "s"} on branch '${branch}'.`
    };
  }
}

function digest(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function isoNow() {
  return new Date().toISOString();
}

function toCountFacet(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })
    .map(([value, count]) => ({ value, count }));
}

function groupBy(values, keyFn) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFn(value);
    const group = groups.get(key) ?? [];
    group.push(value);
    groups.set(key, group);
  }
  return groups;
}

function compareBranchMatch(left, right, branch) {
  if (!branch) {
    return 0;
  }
  return compareBoolean(right.branch === branch, left.branch === branch);
}

function compareIssueBranchMatch(left, right, branch) {
  if (!branch) {
    return 0;
  }
  return compareBoolean(right.context.branch === branch, left.context.branch === branch);
}

function compareBoolean(left, right) {
  return Number(left) - Number(right);
}

function isActiveIssueStatus(status) {
  return status === "open" || status === "fixed_pending_verification";
}

function issueSeverityToImportance(severity) {
  if (severity === "critical" || severity === "high") {
    return "high";
  }
  if (severity === "normal") {
    return "normal";
  }
  return "low";
}

function toRecallEntrySummary(entry) {
  return {
    entry_id: entry.entry_id,
    session_id: entry.session_id,
    branch: entry.branch,
    entry_type: entry.entry_type,
    summary: entry.summary,
    category: entry.category,
    tags: entry.tags ?? [],
    lifecycle_state: entry.lifecycle_state ?? null,
    importance: entry.importance,
    timestamp: entry.timestamp
  };
}
