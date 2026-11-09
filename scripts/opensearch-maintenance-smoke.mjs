import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "@opensearch-project/opensearch";
import { OpenSearchStorage } from "../hivemind-api/src/storage/opensearch-storage.mjs";
import { HiveMindService } from "../hivemind-api/src/app/service.mjs";
import { createApp } from "../hivemind-api/src/http/app.mjs";

// Explicit opt-in: run only against a disposable, unauthenticated local node.
const node = process.env.HIVEMIND_TEST_OPENSEARCH_URL;
assert(node, "Set HIVEMIND_TEST_OPENSEARCH_URL to a disposable local OpenSearch node.");
const url = new URL(node);
assert(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname), "The smoke test requires a loopback node URL.");
const prefix = `hivemind-smoke-${randomUUID()}`;
const client = new Client({ node });
const storage = new OpenSearchStorage({ client, indexPrefix: prefix });
const app = createApp({ service: new HiveMindService({ storage, version: "smoke" }), adminToken: "smoke-token" });

async function request(path, payload, { method = "POST", status = 200, key = randomUUID() } = {}) {
  const response = await app.request(path, {
    method,
    headers: { "content-type": "application/json", "Idempotency-Key": key, authorization: "Bearer smoke-token" },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) })
  });
  const result = await response.json();
  assert.equal(response.status, status, JSON.stringify(result));
  assert.equal(result.ok, true);
  return result.data;
}

try {
  const info = await client.info();
  assert.equal(info.body.version.number, "3.9.0", "Validate against the repository's pinned OpenSearch version.");
  await storage.initialize();
  for (const id of ["source", "target"]) {
    await request("/v1/projects", { project_id: id, name: id, repository_slug: `example/${id}`,
      repository_url: `https://github.com/example/${id}.git`, root_path: `/repo/${id}`, default_branch: "main" }, { status: 201 });
  }
  const contextInput = { project_id: "source", branch: "main", feature: "SMOKE", workspace_path: "/repo/source",
    author_id: "smoke", author_type: "agent", source: "mcp", agent_id: "smoke" };
  const { context } = await request("/v1/contexts", contextInput, { status: 201, key: "context" });
  const { session } = await request("/v1/sessions", { ...contextInput, goal: "Maintenance smoke" }, { status: 201, key: "session" });
  const repeatedSession = await request("/v1/sessions", { ...contextInput, goal: "Maintenance smoke" }, { status: 201, key: "session" });
  assert.equal(repeatedSession.session.session_id, session.session_id);
  const applicability = { state: "current", scope: "feature", reason: "Verified smoke contract", evidence_refs: [{ kind: "repo_file", target: "README.md" }] };
  const learningInput = { applicability, context_token: context.context_token, summary: "Smoke learning", scope: "workflow", recommended_action: "Test maintenance" };
  const { learning } = await request("/v1/learnings", learningInput, { status: 201, key: "learning" });
  const repeatedLearning = await request("/v1/learnings", learningInput, { status: 201, key: "learning" });
  assert.equal(repeatedLearning.learning.learning_id, learning.learning_id);
  await request("/v1/learning-feedback", { context_token: context.context_token, learning_id: learning.learning_id,
    feedback_type: "confirm" }, { status: 201 });
  const issueInput = { context_token: context.context_token, title: "Smoke issue", summary: "Smoke issue", severity: "normal" };
  const { issue } = await request("/v1/issues", issueInput, { status: 201, key: "issue" });
  const repeatedIssue = await request("/v1/issues", issueInput, { status: 201, key: "issue" });
  assert.equal(repeatedIssue.issue.issue_id, issue.issue_id);
  const { entry } = await request("/v1/entries", { ...contextInput, session_id: session.session_id,
    entry_type: "decision", lifecycle_state: "resolved", applicability, summary: "Smoke entry" }, { status: 201 });
  // Exercise mappings installed onto already-existing indices and source roundtrip.
  await storage.initialize();
  const recalled = await request("/v1/sessions", { ...contextInput, goal: "Maintenance smoke" }, { status: 201, key: "session" });
  assert.equal(recalled.session.feature, "SMOKE");
  assert.deepEqual(recalled.recall.guidance.map((item) => item.id).sort(), [entry.entry_id, learning.learning_id].sort());
  assert.deepEqual(recalled.recall.open_threads.map((item) => item.id), [issue.issue_id]);
  assert(Buffer.byteLength(JSON.stringify(recalled), "utf8") <= 8192);
  assert.equal((await storage.getEntry("source", entry.entry_id)).applicability.state, "current");
  await request(`/v1/projects/source/entries/${entry.entry_id}/mark`, { lifecycle_state: "superseded", reason: "Smoke history filter" });
  await request("/v1/learning-feedback", { context_token: context.context_token, learning_id: learning.learning_id,
    feedback_type: "did_not_work" }, { status: 201 });
  const filtered = await request(`/v1/contexts/${context.context_token}/project-brief`, undefined, { method: "GET" });
  assert.deepEqual(filtered.guidance, []);
  assert.equal(filtered.review_required, 1);
  assert.equal((await storage.getEntry("source", entry.entry_id)).summary, "Smoke entry");
  await request("/v1/projects/source/ruleset", { rules: [{ rule_id: "smoke", label: "Smoke", description: "Smoke rule",
    severity: "required", check_mode: "manual_confirm" }] }, { method: "PUT" });
  await request("/v1/rule-checks", { project_id: "source", session_id: session.session_id,
    author_id: "smoke", author_type: "agent", source: "mcp", rule_id: "smoke", status: "applied" }, { status: 201 });

  const merged = await request("/v1/admin/projects/merge", { source_project_id: "source", target_project_id: "target" });
  assert.equal(merged.moved_counts.learnings, 1);
  assert.equal(merged.moved_counts.issues, 1);
  assert.equal(merged.moved_counts.entries, 1);
  assert.equal(await storage.getProject("source"), null);
  assert.equal((await storage.getContext(context.context_token)).project_id, "target");
  await request(`/v1/sessions/${session.session_id}/end`, { status: "completed" });

  // Real transport error: a missing collection must preserve project metadata.
  await client.indices.delete({ index: `${prefix}-learning-feedback` });
  await assert.rejects(storage.deleteProject("target"), (error) => error.meta?.statusCode === 404);
  assert(await storage.getProject("target"));
  await storage.initialize();

  const deleted = await request("/v1/admin/projects/target", undefined, { method: "DELETE" });
  assert.equal(deleted.deleted_counts.learnings, 1);
  assert.equal(deleted.deleted_counts.issues, 1);
  assert.equal(deleted.deleted_counts.rule_checks, 1);
  assert.equal((await client.count({ index: `${prefix}-*` })).body.count, 0);
  console.log("OpenSearch 3.9.0: recall mappings/filtering/budget/history, create/retry idempotency, merge, missing-index failure, delete and zero residual documents passed.");
} finally {
  await client.indices.delete({ index: `${prefix}-*` });
  await client.close();
}
