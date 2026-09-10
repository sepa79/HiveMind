import { z } from "zod";

export const RECALL_MAX_BYTES = 8192;
export const RECALL_MAX_ITEMS = 8;

const VISIBILITY_VALUES = ["project"];
const AUTHOR_TYPE_VALUES = ["human", "agent", "system"];
const SOURCE_VALUES = ["mcp", "cli", "web", "import"];
const ENTRY_TYPE_VALUES = [
  "decision",
  "plan_ref",
  "progress",
  "feedback",
  "artifact_ref",
  "tooling_note",
  "risk"
];
const LIFECYCLE_STATE_VALUES = ["open", "resolved", "superseded"];
const LINK_KIND_VALUES = ["file", "repo_file", "commit", "pr", "command", "url"];
const IMPORTANCE_VALUES = ["low", "normal", "high"];
const LEARNING_SCOPE_VALUES = ["tool", "env", "data", "workflow", "test_strategy"];
const LEARNING_STATUS_VALUES = ["active", "superseded", "resolved"];
const LEARNING_FEEDBACK_TYPE_VALUES = ["confirm", "did_not_work", "comment"];
const ISSUE_STATUS_VALUES = ["open", "fixed_pending_verification", "resolved", "closed"];
const ISSUE_SEVERITY_VALUES = ["low", "normal", "high", "critical"];
const ISSUE_EVENT_TYPE_VALUES = [
  "reported",
  "workaround_added",
  "github_issue_linked",
  "fix_linked",
  "verified_fixed",
  "reopened"
];

const NonEmptyString = z.string().trim().min(1);
const SafeProjectId = z
  .string()
  .trim()
  .refine(
    (value) =>
      /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(value) &&
      value.split("/").every((segment) => segment !== "." && segment !== ".."),
    "project_id must contain only safe repository-name segments"
  );

export const LinkSchema = z.object({
  kind: z.enum(LINK_KIND_VALUES),
  target: NonEmptyString,
  label: z.string().trim().min(1).optional()
});

export const MemoryApplicabilitySchema = z.object({
  state: z.enum(["current", "needs_review", "retired"]),
  scope: z.enum(["project", "branch", "feature"]),
  reason: NonEmptyString,
  evidence_refs: z.array(LinkSchema).min(1)
}).strict();

export const PlanRefSchema = z.object({
  kind: z.literal("file"),
  target: NonEmptyString,
  label: z.string().trim().min(1).optional(),
  source: z.enum(["agent_plan", "human_plan", "imported"]).optional(),
  digest: z.string().trim().min(1).optional()
});

export const ProjectRegisterInputSchema = z.object({
  project_id: NonEmptyString,
  name: NonEmptyString,
  repository_url: NonEmptyString,
  repository_slug: NonEmptyString,
  root_path: NonEmptyString,
  default_branch: NonEmptyString,
  description: z.string().trim().optional(),
  standard_profile_ref: z.string().trim().min(1).optional()
});

export const ProjectRecordSchema = z.object({
  project_id: NonEmptyString,
  name: NonEmptyString,
  repository_url: NonEmptyString,
  repository_slug: NonEmptyString,
  root_path: NonEmptyString,
  default_branch: NonEmptyString,
  description: z.string(),
  features: z.array(NonEmptyString),
  categories: z.array(NonEmptyString),
  ruleset_id: NonEmptyString,
  standard_profile_ref: z.string().nullable().optional(),
  created_at: NonEmptyString,
  updated_at: NonEmptyString
});

export const ProjectListResultSchema = z.object({
  projects: z.array(ProjectRecordSchema)
});

export const ProjectResolveInputSchema = z.object({
  project_id_hint: z.string().trim().min(1).optional(),
  name_hint: z.string().trim().min(1).optional(),
  repository_url: z.string().trim().min(1).optional(),
  repository_slug: z.string().trim().min(1).optional(),
  workspace_path: z.string().trim().min(1).optional()
});

export const ProjectResolveCandidateSchema = z.object({
  project: ProjectRecordSchema,
  score: z.number().int().nonnegative(),
  reasons: z.array(NonEmptyString)
});

export const ProjectResolveResultSchema = z.object({
  status: z.enum(["matched", "ambiguous", "not_found"]),
  project: ProjectRecordSchema.nullable(),
  candidates: z.array(ProjectResolveCandidateSchema),
  resolution_reason: NonEmptyString
});

const ProjectAdminCountsSchema = z.object({
  contexts: z.number().int().nonnegative(),
  entries: z.number().int().nonnegative(),
  sessions: z.number().int().nonnegative(),
  issues: z.number().int().nonnegative(),
  issue_events: z.number().int().nonnegative(),
  learnings: z.number().int().nonnegative(),
  learning_feedback: z.number().int().nonnegative(),
  rule_checks: z.number().int().nonnegative(),
  idempotency_records: z.number().int().nonnegative(),
  rules: z.number().int().nonnegative()
});

export const ProjectDeleteInputSchema = z.object({
  project_id: SafeProjectId,
  reason: z.string().trim().min(1).optional()
});

export const ProjectDeleteResultSchema = z.object({
  deleted_project_id: NonEmptyString,
  deleted_project: ProjectRecordSchema,
  deleted_counts: ProjectAdminCountsSchema,
  reason: z.string().nullable(),
  summary: NonEmptyString
});

export const ProjectMergeInputSchema = z.object({
  source_project_id: SafeProjectId,
  target_project_id: SafeProjectId,
  standard_profile_resolution: z
    .discriminatedUnion("strategy", [
      z.object({ strategy: z.literal("prefer_source") }),
      z.object({ strategy: z.literal("prefer_target") }),
      z.object({
        strategy: z.literal("set"),
        standard_profile_ref: NonEmptyString
      })
    ])
    .optional(),
  reason: z.string().trim().min(1).optional()
});

export const ProjectMergeStandardProfileResolutionSchema = z.object({
  source_profile_ref: z.string().nullable(),
  target_profile_ref: z.string().nullable(),
  strategy: z.enum(["automatic", "prefer_source", "prefer_target", "set"]),
  result_profile_ref: z.string().nullable()
});

export const ProjectMergeResultSchema = z.object({
  source_project_id: NonEmptyString,
  target_project_id: NonEmptyString,
  target_project: ProjectRecordSchema,
  standard_profile_resolution: ProjectMergeStandardProfileResolutionSchema,
  moved_counts: ProjectAdminCountsSchema,
  reason: z.string().nullable(),
  summary: NonEmptyString
});

export const FeatureListResultSchema = z.object({
  project_id: NonEmptyString,
  features: z.array(NonEmptyString)
});

export const FeatureAddInputSchema = z.object({
  project_id: NonEmptyString,
  feature: NonEmptyString
});

export const FeatureRemoveInputSchema = z.object({
  project_id: NonEmptyString,
  feature: NonEmptyString
});

export const FeatureRenameInputSchema = z.object({
  project_id: NonEmptyString,
  feature: NonEmptyString,
  new_feature: NonEmptyString
});

export const ContextOpenInputSchema = z.object({
  project_id: NonEmptyString,
  branch: NonEmptyString,
  workspace_path: NonEmptyString,
  feature: z.string().trim().min(1).optional(),
  source_tool: z.string().trim().min(1).optional(),
  tool_version: z.string().trim().min(1).optional(),
  environment: z.string().trim().min(1).optional(),
  dataset_version: z.string().trim().min(1).optional(),
  author_id: NonEmptyString,
  author_type: z.enum(AUTHOR_TYPE_VALUES),
  source: z.enum(SOURCE_VALUES),
  agent_id: z.string().trim().min(1).optional()
});

export const ContextRecordSchema = z.object({
  context_id: NonEmptyString,
  context_token: NonEmptyString,
  project_id: NonEmptyString,
  branch: NonEmptyString,
  workspace_path: NonEmptyString,
  feature: z.string().optional(),
  source_tool: z.string().optional(),
  tool_version: z.string().optional(),
  environment: z.string().optional(),
  dataset_version: z.string().optional(),
  author_id: NonEmptyString,
  author_type: z.enum(AUTHOR_TYPE_VALUES),
  source: z.enum(SOURCE_VALUES),
  agent_id: z.string().nullable(),
  status: z.enum(["active", "closed"]),
  closed_at: NonEmptyString.nullable(),
  created_at: NonEmptyString,
  updated_at: NonEmptyString
});

export const ContextUpdateInputSchema = z.object({
  context_token: NonEmptyString,
  branch: z.string().trim().min(1).optional(),
  workspace_path: z.string().trim().min(1).optional(),
  feature: z.string().trim().min(1).optional(),
  source_tool: z.string().trim().min(1).optional(),
  tool_version: z.string().trim().min(1).optional(),
  environment: z.string().trim().min(1).optional(),
  dataset_version: z.string().trim().min(1).optional(),
  agent_id: z.string().trim().min(1).optional()
});

export const ContextCloseInputSchema = z.object({
  context_token: NonEmptyString
});

export const ContextOpenResultSchema = z.object({
  context: ContextRecordSchema,
  recall: z.lazy(() => AutomaticRecallSchema)
});

export const LearningContextSnapshotSchema = z.object({
  branch: NonEmptyString,
  workspace_path: NonEmptyString,
  feature: z.string().optional(),
  source_tool: z.string().optional(),
  tool_version: z.string().optional(),
  environment: z.string().optional(),
  dataset_version: z.string().optional(),
  author_id: NonEmptyString,
  author_type: z.enum(AUTHOR_TYPE_VALUES),
  source: z.enum(SOURCE_VALUES),
  agent_id: z.string().nullable()
});

export const LearningCaptureInputSchema = z.object({
  applicability: MemoryApplicabilitySchema.optional(),
  context_token: NonEmptyString,
  summary: NonEmptyString,
  details: z.string().trim().optional(),
  scope: z.enum(LEARNING_SCOPE_VALUES),
  recommended_action: NonEmptyString,
  status: z.enum(LEARNING_STATUS_VALUES).optional(),
  importance: z.enum(IMPORTANCE_VALUES).optional(),
  tags: z.array(NonEmptyString).optional(),
  links: z.array(LinkSchema).optional(),
  artifacts: z.array(LinkSchema).optional(),
  related_issue_ids: z.array(NonEmptyString).optional()
});

export const LearningFeedbackSummarySchema = z.object({
  confirm_count: z.number().int().nonnegative(),
  did_not_work_count: z.number().int().nonnegative(),
  comment_count: z.number().int().nonnegative(),
  last_feedback_at: NonEmptyString.nullable()
});

export const LearningResolutionSchema = z.object({
  reason: NonEmptyString,
  evidence_refs: z.array(LinkSchema).min(1),
  resolution_scope: z.enum(["project", "branch", "feature"]),
  context_token: NonEmptyString,
  context: LearningContextSnapshotSchema,
  resolved_at: NonEmptyString
});

export const LearningRecordSchema = z.object({
  applicability: MemoryApplicabilitySchema.optional(),
  learning_id: NonEmptyString,
  context_token: NonEmptyString,
  context: LearningContextSnapshotSchema,
  summary: NonEmptyString,
  details: z.string().optional(),
  scope: z.enum(LEARNING_SCOPE_VALUES),
  recommended_action: NonEmptyString,
  status: z.enum(LEARNING_STATUS_VALUES),
  importance: z.enum(IMPORTANCE_VALUES),
  tags: z.array(NonEmptyString),
  links: z.array(LinkSchema),
  artifacts: z.array(LinkSchema),
  related_issue_ids: z.array(NonEmptyString),
  feedback_summary: LearningFeedbackSummarySchema,
  revision: z.number().int().nonnegative().default(0),
  resolution: LearningResolutionSchema.nullable().default(null),
  created_at: NonEmptyString,
  updated_at: NonEmptyString
});

export const LearningResolveInputSchema = z.object({
  project_id: NonEmptyString,
  learning_id: NonEmptyString,
  context_token: NonEmptyString,
  expected_revision: z.number().int().nonnegative(),
  reason: NonEmptyString,
  evidence_refs: z.array(LinkSchema).min(1),
  resolution_scope: z.enum(["project", "branch", "feature"])
});

export const LearningResolveResultSchema = z.object({
  learning: LearningRecordSchema,
  action: z.object({
    learning_id: NonEmptyString,
    previous_status: z.enum(LEARNING_STATUS_VALUES),
    status: z.literal("resolved"),
    previous_revision: z.number().int().nonnegative(),
    revision: z.number().int().positive(),
    reason: NonEmptyString,
    evidence_refs: z.array(LinkSchema).min(1),
    resolution_scope: z.enum(["project", "branch", "feature"]),
    context_token: NonEmptyString,
    resolved_at: NonEmptyString
  })
});

export const LearningFeedbackCreateInputSchema = z.object({
  context_token: NonEmptyString,
  learning_id: NonEmptyString,
  feedback_type: z.enum(LEARNING_FEEDBACK_TYPE_VALUES),
  comment: z.string().trim().optional()
});

export const LearningFeedbackRecordSchema = z.object({
  feedback_id: NonEmptyString,
  learning_id: NonEmptyString,
  context_token: NonEmptyString,
  context: LearningContextSnapshotSchema,
  feedback_type: z.enum(LEARNING_FEEDBACK_TYPE_VALUES),
  comment: z.string().optional(),
  created_at: NonEmptyString
});

export const LearningGetRecentInputSchema = z.object({
  context_token: NonEmptyString,
  feature: z.string().trim().min(1).optional(),
  source_tool: z.string().trim().min(1).optional(),
  scope: z.enum(LEARNING_SCOPE_VALUES).optional(),
  status: z.enum(LEARNING_STATUS_VALUES).optional(),
  limit: z.number().int().positive().max(50).optional()
});

export const LearningSearchInputSchema = z.object({
  context_token: NonEmptyString,
  branch: z.string().trim().min(1).optional(),
  feature: z.string().trim().min(1).optional(),
  source_tool: z.string().trim().min(1).optional(),
  scope: z.enum(LEARNING_SCOPE_VALUES).optional(),
  status: z.enum(LEARNING_STATUS_VALUES).optional(),
  tags: z.array(NonEmptyString).optional(),
  query: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(200).optional(),
  sort: z.enum(["recent", "importance"]).optional()
});

export const LearningListResultSchema = z.object({
  learnings: z.array(LearningRecordSchema),
  summary: NonEmptyString
});

export const IssueReportInputSchema = z.object({
  context_token: NonEmptyString,
  title: NonEmptyString,
  summary: NonEmptyString,
  details: z.string().trim().optional(),
  severity: z.enum(ISSUE_SEVERITY_VALUES),
  tags: z.array(NonEmptyString).optional(),
  github_issue_url: z.string().trim().min(1).optional()
});

export const IssueRecordSchema = z.object({
  issue_id: NonEmptyString,
  context_token: NonEmptyString,
  context: LearningContextSnapshotSchema,
  title: NonEmptyString,
  summary: NonEmptyString,
  details: z.string().optional(),
  status: z.enum(ISSUE_STATUS_VALUES),
  severity: z.enum(ISSUE_SEVERITY_VALUES),
  tags: z.array(NonEmptyString),
  github_issue_url: z.string().nullable(),
  created_at: NonEmptyString,
  updated_at: NonEmptyString
});

export const IssueEventCreateInputSchema = z.object({
  context_token: NonEmptyString,
  issue_id: NonEmptyString,
  event_type: z.enum(ISSUE_EVENT_TYPE_VALUES),
  summary: NonEmptyString,
  details: z.string().trim().optional(),
  version: z.string().trim().min(1).optional(),
  branch: z.string().trim().min(1).optional(),
  github_issue_url: z.string().trim().min(1).optional(),
  links: z.array(LinkSchema).optional(),
  artifacts: z.array(LinkSchema).optional()
});

export const IssueEventRecordSchema = z.object({
  issue_event_id: NonEmptyString,
  issue_id: NonEmptyString,
  context_token: NonEmptyString,
  context: LearningContextSnapshotSchema,
  event_type: z.enum(ISSUE_EVENT_TYPE_VALUES),
  summary: NonEmptyString,
  details: z.string().optional(),
  version: z.string().optional(),
  branch: z.string().optional(),
  github_issue_url: z.string().nullable(),
  links: z.array(LinkSchema),
  artifacts: z.array(LinkSchema),
  created_at: NonEmptyString
});

export const IssueGetInputSchema = z.object({
  context_token: NonEmptyString,
  issue_id: NonEmptyString
});

export const IssueGetResultSchema = z.object({
  issue: IssueRecordSchema,
  events: z.array(IssueEventRecordSchema)
});

export const IssueListInputSchema = z.object({
  context_token: NonEmptyString,
  branch: z.string().trim().min(1).optional(),
  feature: z.string().trim().min(1).optional(),
  source_tool: z.string().trim().min(1).optional(),
  status: z.enum([...ISSUE_STATUS_VALUES, "active", "all"]).optional(),
  tags: z.array(NonEmptyString).optional(),
  query: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(200).optional(),
  sort: z.enum(["recent", "severity"]).optional()
});

export const IssueListResultSchema = z.object({
  issues: z.array(IssueRecordSchema),
  summary: NonEmptyString
});

export const ContextProjectBriefInputSchema = z.object({
  context_token: NonEmptyString
});

export const ContextBranchBriefInputSchema = z.object({
  context_token: NonEmptyString,
  branch: z.string().trim().min(1).optional()
});

export const ContextOpenThreadsInputSchema = z.object({
  context_token: NonEmptyString,
  branch: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(50).optional()
});

export const SessionStartInputSchema = z.object({
  feature: NonEmptyString.optional(),
  project_id: NonEmptyString,
  branch: NonEmptyString,
  workspace_path: NonEmptyString,
  author_id: NonEmptyString,
  author_type: z.enum(AUTHOR_TYPE_VALUES),
  source: z.enum(SOURCE_VALUES),
  agent_id: NonEmptyString,
  goal: NonEmptyString,
  plan_ref: PlanRefSchema.optional()
});

export const SessionEndInputSchema = z.object({
  session_id: NonEmptyString,
  status: z.enum(["completed", "abandoned"]).optional()
});

export const SessionCloseoutInputSchema = z.object({
  session_id: NonEmptyString
});

export const SessionGetInputSchema = SessionCloseoutInputSchema;

export const SessionRecordSchema = z.object({
  feature: NonEmptyString.optional(),
  session_id: NonEmptyString,
  project_id: NonEmptyString,
  branch: NonEmptyString,
  workspace_path: NonEmptyString,
  author_id: NonEmptyString,
  author_type: z.enum(AUTHOR_TYPE_VALUES),
  source: z.enum(SOURCE_VALUES),
  agent_id: NonEmptyString,
  started_at: NonEmptyString,
  ended_at: NonEmptyString.nullable(),
  status: z.enum(["active", "paused", "completed", "abandoned"]),
  goal: NonEmptyString,
  plan_ref: PlanRefSchema.nullable(),
  ruleset_version: z.number().int().nonnegative(),
  visibility: z.enum(VISIBILITY_VALUES),
  created_at: NonEmptyString,
  updated_at: NonEmptyString
});

export const SessionGetResultSchema = z.object({ session: SessionRecordSchema });

export const SessionActivityCountsSchema = z.object({
  entries: z.number().int().nonnegative(),
  rule_checks: z.number().int().nonnegative()
});

export const SessionCloseoutEntryGroupSchema = z.object({
  entry_type: z.enum(ENTRY_TYPE_VALUES),
  count: z.number().int().nonnegative(),
  entries: z.array(z.lazy(() => EntryRecordSchema))
});

export const SessionCloseoutReportSchema = z.object({
  session_id: NonEmptyString,
  project_id: NonEmptyString,
  branch: NonEmptyString,
  goal: NonEmptyString,
  plan_ref: PlanRefSchema.nullable(),
  status: z.enum(["active", "paused", "completed", "abandoned"]),
  started_at: NonEmptyString,
  ended_at: NonEmptyString.nullable(),
  last_seen_at: NonEmptyString,
  activity_counts: SessionActivityCountsSchema,
  entry_groups: z.array(SessionCloseoutEntryGroupSchema),
  rule_checks: z.array(z.lazy(() => RuleCheckSchema)),
  missing_required_rules: z.array(z.lazy(() => RuleSchema)),
  active_learning_count: z.number().int().nonnegative(),
  active_learning_summaries: z.array(LearningRecordSchema),
  active_issue_count: z.number().int().nonnegative(),
  active_issue_summaries: z.array(IssueRecordSchema),
  summary: NonEmptyString
});

export const SessionEndResultSchema = z.object({
  session: SessionRecordSchema,
  closeout: SessionCloseoutReportSchema
});

export const SessionCloseoutResultSchema = z.object({
  closeout: SessionCloseoutReportSchema
});

export const SessionSummarySchema = SessionRecordSchema.extend({
  last_seen_at: NonEmptyString,
  activity_counts: SessionActivityCountsSchema
});

export const SessionListInputSchema = z.object({
  project_id: NonEmptyString,
  status: z.enum(["active", "paused", "completed", "abandoned"]).optional(),
  branch: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(200).optional()
});

export const SessionListResultSchema = z.object({
  sessions: z.array(SessionSummarySchema),
  summary: NonEmptyString
});

export const SessionStartResultSchema = z.object({
  session: SessionRecordSchema,
  recall: z.lazy(() => AutomaticRecallSchema)
});

export const EntryCreateInputSchema = z.object({
  applicability: MemoryApplicabilitySchema.optional(),
  project_id: NonEmptyString,
  session_id: NonEmptyString,
  branch: NonEmptyString,
  author_id: NonEmptyString,
  author_type: z.enum(AUTHOR_TYPE_VALUES),
  source: z.enum(SOURCE_VALUES),
  entry_type: z.enum(ENTRY_TYPE_VALUES),
  summary: NonEmptyString,
  details: z.string().trim().optional(),
  feature: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  tags: z.array(NonEmptyString).optional(),
  links: z.array(LinkSchema).optional(),
  artifacts: z.array(LinkSchema).optional(),
  related_entry_ids: z.array(NonEmptyString).optional(),
  lifecycle_state: z.enum(LIFECYCLE_STATE_VALUES).optional(),
  importance: z.enum(IMPORTANCE_VALUES).optional()
});

export const EntryRecordSchema = z.object({
  applicability: MemoryApplicabilitySchema.optional(),
  entry_id: NonEmptyString,
  project_id: NonEmptyString,
  session_id: NonEmptyString,
  branch: NonEmptyString,
  author_id: NonEmptyString,
  author_type: z.enum(AUTHOR_TYPE_VALUES),
  source: z.enum(SOURCE_VALUES),
  entry_type: z.enum(ENTRY_TYPE_VALUES),
  timestamp: NonEmptyString,
  summary: NonEmptyString,
  details: z.string().optional(),
  feature: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(NonEmptyString),
  links: z.array(LinkSchema),
  artifacts: z.array(LinkSchema),
  related_rule_ids: z.array(NonEmptyString),
  related_entry_ids: z.array(NonEmptyString),
  lifecycle_state: z.enum(LIFECYCLE_STATE_VALUES).nullable(),
  importance: z.enum(IMPORTANCE_VALUES),
  visibility: z.enum(VISIBILITY_VALUES),
  created_at: NonEmptyString,
  updated_at: NonEmptyString
});

export const EntrySearchInputSchema = z.object({
  project_id: NonEmptyString,
  branch: z.string().trim().min(1).optional(),
  session_id: z.string().trim().min(1).optional(),
  entry_type: z.array(z.enum(ENTRY_TYPE_VALUES)).optional(),
  feature: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  tags: z.array(NonEmptyString).optional(),
  lifecycle_state: z.enum(LIFECYCLE_STATE_VALUES).optional(),
  query: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(200).optional(),
  sort: z.enum(["recent", "importance"]).optional()
});

export const SearchResultSchema = z.object({
  entries: z.array(EntryRecordSchema),
  facets: z.object({
    entry_types: z.array(z.object({ value: NonEmptyString, count: z.number().int().nonnegative() })),
    categories: z.array(z.object({ value: NonEmptyString, count: z.number().int().nonnegative() })),
    tags: z.array(z.object({ value: NonEmptyString, count: z.number().int().nonnegative() }))
  }),
  summary: NonEmptyString
});

export const EntryMarkInputSchema = z.object({
  project_id: NonEmptyString,
  entry_id: NonEmptyString,
  lifecycle_state: z.enum(LIFECYCLE_STATE_VALUES),
  reason: NonEmptyString,
  replacement_entry_id: z.string().trim().min(1).optional()
});

export const EntryMarkResultSchema = z.object({
  entry: EntryRecordSchema,
  action: z.object({
    entry_id: NonEmptyString,
    previous_lifecycle_state: z.enum(LIFECYCLE_STATE_VALUES).nullable(),
    lifecycle_state: z.enum(LIFECYCLE_STATE_VALUES),
    reason: NonEmptyString,
    replacement_entry_id: z.string().nullable()
  })
});

export const EntryCorrectInputSchema = EntryCreateInputSchema.omit({
  project_id: true,
  lifecycle_state: true,
  related_entry_ids: true
}).extend({
  project_id: NonEmptyString,
  entry_id: NonEmptyString,
  entry_type: z.enum(ENTRY_TYPE_VALUES).optional(),
  reason: z.string().trim().min(1).optional()
});

export const EntryCorrectResultSchema = z.object({
  original_entry: EntryRecordSchema,
  correction_entry: EntryRecordSchema,
  action: z.object({
    entry_id: NonEmptyString,
    correction_entry_id: NonEmptyString,
    lifecycle_state: z.literal("superseded"),
    reason: z.string().nullable()
  })
});

const ReviewActionSchema = z.object({
  action_type: z.enum(["mark_superseded", "mark_resolved", "create_issue", "update_docs", "verify_state", "review"]),
  target_kind: z.enum(["entry", "project", "docs", "deployment"]),
  target_id: z.string().nullable(),
  summary: NonEmptyString,
  reason: NonEmptyString,
  priority: z.enum(["low", "normal", "high"])
});

const ProjectReviewSignalsSchema = z.object({
  review_queue: z.array(EntryRecordSchema),
  recent_decisions: z.array(EntryRecordSchema),
  open_feedback: z.array(EntryRecordSchema),
  open_risks: z.array(EntryRecordSchema),
  stale_open_entries: z.array(EntryRecordSchema),
  tooling_notes: z.array(EntryRecordSchema)
});

export const ProjectReviewInputSchema = z.object({
  project_id: NonEmptyString,
  branch: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(50).optional()
});

export const ProjectReviewResultSchema = z.object({
  project: ProjectRecordSchema,
  branch: z.string().nullable(),
  generated_at: NonEmptyString,
  signals: ProjectReviewSignalsSchema,
  recommended_actions: z.array(ReviewActionSchema),
  summary: NonEmptyString
});

export const AdminMemoryReviewInputSchema = z.object({
  project_ids: z.array(NonEmptyString).optional(),
  branch: z.string().trim().min(1).optional(),
  query: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(20).optional()
});

export const AdminMemoryReviewResultSchema = z.object({
  generated_at: NonEmptyString,
  project_reviews: z.array(ProjectReviewResultSchema),
  recommended_actions: z.array(ReviewActionSchema),
  summary: NonEmptyString
});

export const RuleSchema = z.object({
  rule_id: NonEmptyString,
  label: NonEmptyString,
  description: NonEmptyString,
  severity: z.enum(["required", "advisory"]),
  check_mode: z.enum(["manual_confirm", "artifact_required", "file_reference_required", "command_reference_required"]),
  evidence_hint: z.string().trim().optional(),
  applies_to: z.array(NonEmptyString).optional(),
  tags: z.array(NonEmptyString).optional()
});

export const RulesetDefineInputSchema = z.object({
  project_id: NonEmptyString,
  rules: z.array(RuleSchema)
});

export const RulesetRecordSchema = z.object({
  project_id: NonEmptyString,
  ruleset_id: NonEmptyString,
  version: z.number().int().nonnegative(),
  rules: z.array(RuleSchema),
  created_at: NonEmptyString,
  updated_at: NonEmptyString
});

export const RulesetCatalogFileSchema = z.object({
  source: NonEmptyString,
  target: NonEmptyString,
  required: z.boolean().default(true)
});

export const RulesetCatalogManifestSchema = z.object({
  profile_id: NonEmptyString,
  version: NonEmptyString,
  profile_ref: NonEmptyString,
  label: NonEmptyString,
  description: NonEmptyString,
  extends: z.string().trim().min(1).optional(),
  template_variables: z.array(NonEmptyString),
  files: z.array(RulesetCatalogFileSchema),
  rules: z.array(RuleSchema)
});

export const RulesetCatalogProfileSummarySchema = z.object({
  profile_id: NonEmptyString,
  version: NonEmptyString,
  profile_ref: NonEmptyString,
  label: NonEmptyString,
  description: NonEmptyString,
  extends: z.string().optional(),
  file_count: z.number().int().nonnegative(),
  rule_count: z.number().int().nonnegative()
});

export const RulesetCatalogListResultSchema = z.object({
  catalog_path: NonEmptyString,
  catalog_source_url: z.string().nullable(),
  profiles: z.array(RulesetCatalogProfileSummarySchema)
});

export const RulesetCatalogProfileResultSchema = z.object({
  catalog_path: NonEmptyString,
  catalog_source_url: z.string().nullable(),
  manifest: RulesetCatalogManifestSchema
});

export const RulesetCatalogBundleFileSchema = z.object({
  source: NonEmptyString,
  target: NonEmptyString,
  required: z.boolean(),
  content: z.string(),
  sha256: NonEmptyString
});

export const RulesetCatalogBundleResultSchema = z.object({
  catalog_path: NonEmptyString,
  catalog_source_url: z.string().nullable(),
  manifest: RulesetCatalogManifestSchema,
  files: z.array(RulesetCatalogBundleFileSchema)
});

export const ProjectStandardProfileDefineInputSchema = z.object({
  project_id: NonEmptyString,
  standard_profile_ref: NonEmptyString
});

export const ProjectStandardProfileDefineResultSchema = z.object({
  project: ProjectRecordSchema
});

export const StandardFileMarkerSchema = z.object({
  target: NonEmptyString,
  sha256: NonEmptyString
});

export const StandardMarkerSchema = z.object({
  project_id: NonEmptyString,
  profile_ref: NonEmptyString,
  catalog_source_url: z.string().nullable().optional(),
  applied_at: NonEmptyString.optional(),
  files: z.array(StandardFileMarkerSchema).optional()
});

export const PersistedStandardMarkerSchema = StandardMarkerSchema.extend({
  applied_at: NonEmptyString,
  files: z.array(StandardFileMarkerSchema)
});

export const ProjectStandardMarkerUpdateInputSchema = z.object({
  project_id: NonEmptyString,
  standard_marker: PersistedStandardMarkerSchema
});

export const ProjectStandardMarkerUpdateResultSchema = z.object({
  project: ProjectRecordSchema,
  standard_marker: PersistedStandardMarkerSchema,
  summary: NonEmptyString
});

export const GuidanceCheckInputSchema = z.object({
  project_id: NonEmptyString
});

export const GuidanceFileStatusSchema = z.object({
  target: NonEmptyString,
  required: z.boolean(),
  expected_sha256: NonEmptyString,
  actual_sha256: z.string().nullable(),
  status: z.enum(["missing", "template_unmodified", "customized"])
});

export const GuidanceCheckResultSchema = z.object({
  project: ProjectRecordSchema.nullable(),
  selected_profile_ref: z.string().nullable(),
  recommended_action: z.enum(["apply", "update", "current", "unregistered"]),
  marker_source: z.enum(["stored", "none"]),
  guidance_version: z.object({
    profile_ref: z.string().nullable(),
    catalog_source_url: z.string().nullable()
  }),
  profile: RulesetCatalogProfileSummarySchema.nullable(),
  required_files: z.array(RulesetCatalogFileSchema),
  recommended_files: z.array(RulesetCatalogFileSchema),
  drift: z.array(GuidanceFileStatusSchema),
  summary: NonEmptyString
});

export const RecallItemSchema = z.object({
  kind: z.enum(["entry", "learning", "issue"]),
  id: NonEmptyString,
  summary: NonEmptyString,
  state: NonEmptyString,
  reason: NonEmptyString
});

export const AutomaticRecallSchema = z.object({
  scope: z.object({ project_id: NonEmptyString, branch: NonEmptyString, feature: NonEmptyString.nullable() }),
  view: z.enum(["all", "threads"]),
  authority: z.literal("informational"),
  rules: z.array(RuleSchema),
  project_guidance: z.array(RecallItemSchema),
  guidance: z.array(RecallItemSchema),
  open_threads: z.array(RecallItemSchema),
  counts: z.object({ rules: z.number().int().nonnegative(), guidance: z.number().int().nonnegative(), open_threads: z.number().int().nonnegative() }),
  review_required: z.number().int().nonnegative(),
  truncated: z.boolean(),
  required_rules_omitted: z.number().int().nonnegative(),
  budget: z.object({ max_bytes: z.literal(RECALL_MAX_BYTES), max_memory_items: z.literal(RECALL_MAX_ITEMS) }),
  retrieval: z.object({ rules: z.literal("rules_get"), history: z.array(NonEmptyString) })
});

export const ContextProjectBriefResultSchema = AutomaticRecallSchema;
export const ContextBranchBriefResultSchema = AutomaticRecallSchema;
export const ContextOpenThreadsResultSchema = AutomaticRecallSchema;

export const RuleCheckCreateInputSchema = z.object({
  project_id: NonEmptyString,
  session_id: NonEmptyString,
  rule_id: NonEmptyString,
  author_id: NonEmptyString,
  author_type: z.enum(AUTHOR_TYPE_VALUES),
  source: z.enum(SOURCE_VALUES),
  status: z.enum(["applied", "not_applicable", "blocked", "skipped"]),
  evidence: z.string().trim().optional(),
  note: z.string().trim().optional(),
  links: z.array(LinkSchema).optional()
});

export const RuleCheckSchema = z.object({
  rule_check_id: NonEmptyString,
  project_id: NonEmptyString,
  session_id: NonEmptyString,
  rule_id: NonEmptyString,
  author_id: NonEmptyString,
  author_type: z.enum(AUTHOR_TYPE_VALUES),
  source: z.enum(SOURCE_VALUES),
  timestamp: NonEmptyString,
  status: z.enum(["applied", "not_applicable", "blocked", "skipped"]),
  evidence: z.string().trim().optional(),
  note: z.string().trim().optional(),
  links: z.array(LinkSchema).optional(),
  visibility: z.enum(VISIBILITY_VALUES)
});

export const RuleCheckListInputSchema = z.object({
  project_id: NonEmptyString,
  session_id: z.string().trim().min(1).optional(),
  rule_id: z.string().trim().min(1).optional(),
  status: z.enum(["applied", "not_applicable", "blocked", "skipped"]).optional()
});

export const RuleCheckReminderSchema = z.object({
  missing_required_rules: z.array(RuleSchema),
  summary: NonEmptyString
}).nullable();

export const RuleCheckSubmitResultSchema = z.object({
  rule_check: RuleCheckSchema,
  reminder: RuleCheckReminderSchema
});

export const RuleCheckListResultSchema = z.object({
  rule_checks: z.array(RuleCheckSchema),
  summary: NonEmptyString
});

export {
  AUTHOR_TYPE_VALUES,
  ENTRY_TYPE_VALUES,
  IMPORTANCE_VALUES,
  LIFECYCLE_STATE_VALUES,
  LINK_KIND_VALUES,
  SOURCE_VALUES,
  VISIBILITY_VALUES
};
