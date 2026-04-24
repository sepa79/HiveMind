import { z } from "zod";

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

export const LinkSchema = z.object({
  kind: z.enum(LINK_KIND_VALUES),
  target: NonEmptyString,
  label: z.string().trim().min(1).optional()
});

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
  root_path: NonEmptyString,
  default_branch: NonEmptyString,
  description: z.string().trim().optional()
});

export const ProjectRecordSchema = z.object({
  project_id: NonEmptyString,
  name: NonEmptyString,
  root_path: NonEmptyString,
  default_branch: NonEmptyString,
  description: z.string(),
  features: z.array(NonEmptyString),
  categories: z.array(NonEmptyString),
  ruleset_id: NonEmptyString,
  created_at: NonEmptyString,
  updated_at: NonEmptyString
});

export const ProjectListResultSchema = z.object({
  projects: z.array(ProjectRecordSchema)
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

export const StartupSummaryLearningSchema = z.object({
  learning_id: NonEmptyString,
  summary: NonEmptyString,
  importance: z.enum(IMPORTANCE_VALUES),
  status: z.enum(LEARNING_STATUS_VALUES)
});

export const StartupSummaryIssueSchema = z.object({
  issue_id: NonEmptyString,
  title: NonEmptyString,
  status: z.enum(ISSUE_STATUS_VALUES),
  severity: z.enum(ISSUE_SEVERITY_VALUES)
});

export const StartupSummarySchema = z.object({
  project_id: NonEmptyString,
  branch: NonEmptyString,
  feature: z.string().optional(),
  counts: z.object({
    rules: z.number().int().nonnegative(),
    active_learnings: z.number().int().nonnegative(),
    active_issues: z.number().int().nonnegative(),
    open_threads: z.number().int().nonnegative()
  }),
  highlights: z.object({
    learnings: z.array(StartupSummaryLearningSchema),
    issues: z.array(StartupSummaryIssueSchema),
    open_threads: z.array(z.lazy(() => OpenThreadSummarySchema))
  }),
  hint: NonEmptyString,
  summary: NonEmptyString
});

export const ContextOpenResultSchema = z.object({
  context: ContextRecordSchema,
  startup_summary: StartupSummarySchema
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

export const LearningRecordSchema = z.object({
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
  created_at: NonEmptyString,
  updated_at: NonEmptyString
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

export const SessionRecordSchema = z.object({
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
  context: z.lazy(() => SessionStartContextSchema),
  startup_summary: StartupSummarySchema
});

export const EntryCreateInputSchema = z.object({
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
  lifecycle_state: z.enum(LIFECYCLE_STATE_VALUES).optional(),
  importance: z.enum(IMPORTANCE_VALUES).optional()
});

export const EntryRecordSchema = z.object({
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

export const RecallEntrySummarySchema = z.object({
  entry_id: NonEmptyString,
  session_id: NonEmptyString,
  branch: NonEmptyString,
  entry_type: z.enum(ENTRY_TYPE_VALUES),
  summary: NonEmptyString,
  category: z.string().optional(),
  tags: z.array(NonEmptyString),
  lifecycle_state: z.enum(LIFECYCLE_STATE_VALUES).nullable(),
  importance: z.enum(IMPORTANCE_VALUES),
  timestamp: NonEmptyString
});

export const OpenThreadSummarySchema = z.object({
  kind: z.enum(["entry", "rule_check", "issue"]),
  summary: NonEmptyString,
  session_id: NonEmptyString.optional(),
  branch: NonEmptyString,
  importance: z.enum(IMPORTANCE_VALUES),
  timestamp: NonEmptyString,
  entry_id: z.string().trim().min(1).optional(),
  entry_type: z.enum(ENTRY_TYPE_VALUES).optional(),
  lifecycle_state: z.enum(LIFECYCLE_STATE_VALUES).nullable().optional(),
  rule_check_id: z.string().trim().min(1).optional(),
  rule_id: z.string().trim().min(1).optional(),
  status: z.enum(["applied", "not_applicable", "blocked", "skipped"]).optional(),
  issue_id: z.string().trim().min(1).optional(),
  issue_status: z.enum(ISSUE_STATUS_VALUES).optional(),
  severity: z.enum(ISSUE_SEVERITY_VALUES).optional()
});

export const SessionStartContextSchema = z.object({
  rules: z.array(RuleSchema),
  features: z.array(NonEmptyString),
  recent_decisions: z.array(RecallEntrySummarySchema),
  recent_risks: z.array(RecallEntrySummarySchema),
  recent_tooling_notes: z.array(RecallEntrySummarySchema),
  recent_learnings: z.array(LearningRecordSchema),
  open_threads: z.array(OpenThreadSummarySchema)
});

export const ContextProjectBriefResultSchema = z.object({
  project: ProjectRecordSchema,
  rules: z.array(RuleSchema),
  latest_plan_ref: PlanRefSchema.nullable(),
  recent_decisions: z.array(RecallEntrySummarySchema),
  recent_risks: z.array(RecallEntrySummarySchema),
  recent_learnings: z.array(LearningRecordSchema),
  active_issues: z.array(IssueRecordSchema),
  open_threads: z.array(OpenThreadSummarySchema)
});

export const ContextBranchBriefResultSchema = z.object({
  project: ProjectRecordSchema,
  branch: NonEmptyString,
  rules: z.array(RuleSchema),
  latest_plan_ref: PlanRefSchema.nullable(),
  recent_decisions: z.array(RecallEntrySummarySchema),
  recent_risks: z.array(RecallEntrySummarySchema),
  recent_learnings: z.array(LearningRecordSchema),
  active_issues: z.array(IssueRecordSchema),
  open_threads: z.array(OpenThreadSummarySchema)
});

export const ContextOpenThreadsResultSchema = z.object({
  branch: NonEmptyString,
  open_threads: z.array(OpenThreadSummarySchema)
});

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
