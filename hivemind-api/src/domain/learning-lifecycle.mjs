export function validateLearningResolution(learning, context, input, ensure) {
  ensure(learning, 404, "LEARNING_NOT_FOUND", `No learning exists with id '${input.learning_id}' in project '${input.project_id}'.`, {
    project_id: input.project_id,
    learning_id: input.learning_id
  });
  ensure(context, 404, "CONTEXT_NOT_FOUND", `No context exists with token '${input.context_token}'.`, {
    context_token: input.context_token
  });
  ensure(context.status === "active", 409, "CONTEXT_CLOSED", `Context '${input.context_token}' is already closed and cannot resolve learnings.`, {
    context_token: input.context_token
  });
  ensure(context.project_id === input.project_id, 409, "CONTEXT_PROJECT_MISMATCH", `Context '${input.context_token}' does not belong to project '${input.project_id}'.`, {
    context_token: input.context_token,
    project_id: input.project_id,
    context_project_id: context.project_id
  });

  const revision = learning.revision ?? 0;
  ensure(learning.status === "active", 409, "LEARNING_NOT_ACTIVE", `Learning '${learning.learning_id}' has status '${learning.status}' and cannot be resolved.`, {
    learning_id: learning.learning_id,
    status: learning.status
  });
  ensure(revision === input.expected_revision, 409, "LEARNING_REVISION_CONFLICT", `Learning '${learning.learning_id}' is at revision ${revision}, not ${input.expected_revision}.`, {
    learning_id: learning.learning_id,
    expected_revision: input.expected_revision,
    actual_revision: revision
  });
}

export function buildResolvedLearning({ learning, context, input, idempotencyKey, requestHash, resolvedAt, contextSnapshot }) {
  const revision = learning.revision ?? 0;
  return {
    ...learning,
    status: "resolved",
    revision: revision + 1,
    resolution: {
      reason: input.reason,
      evidence_refs: input.evidence_refs,
      resolution_scope: input.resolution_scope,
      context_token: input.context_token,
      context: contextSnapshot(context),
      resolved_at: resolvedAt,
      idempotency_key: idempotencyKey,
      request_hash: requestHash
    },
    updated_at: resolvedAt
  };
}

export function isLearningResolutionRetry(learning, idempotencyKey) {
  return learning?.resolution?.idempotency_key === idempotencyKey;
}

export function learningResolveAction(learning, ensure) {
  const resolution = learning.resolution;
  ensure(resolution, 500, "LEARNING_RESOLUTION_MISSING", `Resolved learning '${learning.learning_id}' has no resolution record.`, {
    learning_id: learning.learning_id
  });
  return {
    learning_id: learning.learning_id,
    previous_status: "active",
    status: "resolved",
    previous_revision: learning.revision - 1,
    revision: learning.revision,
    reason: resolution.reason,
    evidence_refs: resolution.evidence_refs,
    resolution_scope: resolution.resolution_scope,
    context_token: resolution.context_token,
    resolved_at: resolution.resolved_at
  };
}

export function learningResolutionIdempotencyRecord(idempotencyKey, requestHash, learning) {
  return {
    key: idempotencyKey,
    operation: "learning.resolve",
    request_hash: requestHash,
    resource_type: "learning",
    resource_id: learning.learning_id,
    timestamp: learning.resolution.resolved_at
  };
}
