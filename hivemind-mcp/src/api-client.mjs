export class HiveMindApiClientError extends Error {
  constructor({ status, code, message, details, meta, cause }) {
    super(message, cause ? { cause } : undefined);
    this.name = "HiveMindApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.meta = meta;
  }
}

export class HiveMindApiClient {
  constructor({ baseUrl, fetchImpl = fetch }) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetchImpl = fetchImpl;
  }

  async registerProject(input) {
    return this.#request({
      method: "POST",
      path: "/v1/projects",
      body: input
    });
  }

  async listFeatures(projectId) {
    return this.#request({
      method: "GET",
      path: `/v1/projects/${encodeURIComponent(projectId)}/features`
    });
  }

  async addFeature(input) {
    return this.#request({
      method: "POST",
      path: `/v1/projects/${encodeURIComponent(input.project_id)}/features`,
      body: {
        feature: input.feature
      }
    });
  }

  async removeFeature(projectId, feature) {
    return this.#request({
      method: "DELETE",
      path: `/v1/projects/${encodeURIComponent(projectId)}/features/${encodeURIComponent(feature)}`
    });
  }

  async renameFeature(input) {
    return this.#request({
      method: "POST",
      path: `/v1/projects/${encodeURIComponent(input.project_id)}/features/${encodeURIComponent(input.feature)}/rename`,
      body: {
        new_feature: input.new_feature
      }
    });
  }

  async openContext(input, { idempotencyKey }) {
    return this.#request({
      method: "POST",
      path: "/v1/contexts",
      body: input,
      idempotencyKey
    });
  }

  async getContext(contextToken) {
    return this.#request({
      method: "GET",
      path: `/v1/contexts/${encodeURIComponent(contextToken)}`
    });
  }

  async updateContext(input) {
    const { context_token, ...patch } = input;
    return this.#request({
      method: "PATCH",
      path: `/v1/contexts/${encodeURIComponent(context_token)}`,
      body: patch
    });
  }

  async closeContext(contextToken) {
    return this.#request({
      method: "POST",
      path: `/v1/contexts/${encodeURIComponent(contextToken)}/close`
    });
  }

  async getProjectBrief(contextToken) {
    return this.#request({
      method: "GET",
      path: `/v1/contexts/${encodeURIComponent(contextToken)}/project-brief`
    });
  }

  async getBranchBrief(input) {
    return this.#request({
      method: "GET",
      path: `/v1/contexts/${encodeURIComponent(input.context_token)}/branch-brief`,
      query: {
        branch: input.branch
      }
    });
  }

  async getOpenThreads(input) {
    return this.#request({
      method: "GET",
      path: `/v1/contexts/${encodeURIComponent(input.context_token)}/open-threads`,
      query: {
        branch: input.branch,
        limit: input.limit
      }
    });
  }

  async captureLearning(input, { idempotencyKey }) {
    return this.#request({
      method: "POST",
      path: "/v1/learnings",
      body: input,
      idempotencyKey
    });
  }

  async appendLearningFeedback(input, { idempotencyKey }) {
    return this.#request({
      method: "POST",
      path: "/v1/learning-feedback",
      body: input,
      idempotencyKey
    });
  }

  async getRecentLearnings(input) {
    return this.#request({
      method: "POST",
      path: "/v1/learnings/recent",
      body: input
    });
  }

  async searchLearnings(input) {
    return this.#request({
      method: "POST",
      path: "/v1/learnings/search",
      body: input
    });
  }

  async reportIssue(input, { idempotencyKey }) {
    return this.#request({
      method: "POST",
      path: "/v1/issues",
      body: input,
      idempotencyKey
    });
  }

  async getIssue(input) {
    return this.#request({
      method: "GET",
      path: `/v1/issues/${encodeURIComponent(input.issue_id)}`,
      query: {
        context_token: input.context_token
      }
    });
  }

  async addIssueEvent(input, { idempotencyKey }) {
    return this.#request({
      method: "POST",
      path: `/v1/issues/${encodeURIComponent(input.issue_id)}/events`,
      body: input,
      idempotencyKey
    });
  }

  async listIssues(input) {
    return this.#request({
      method: "GET",
      path: "/v1/issues",
      query: input
    });
  }

  async defineRules(input) {
    return this.#request({
      method: "PUT",
      path: `/v1/projects/${encodeURIComponent(input.project_id)}/ruleset`,
      body: {
        rules: input.rules
      }
    });
  }

  async getRules(projectId) {
    return this.#request({
      method: "GET",
      path: `/v1/projects/${encodeURIComponent(projectId)}/ruleset`
    });
  }

  async startSession(input, { idempotencyKey }) {
    return this.#request({
      method: "POST",
      path: "/v1/sessions",
      body: input,
      idempotencyKey
    });
  }

  async endSession(input) {
    const { session_id, ...body } = input;
    return this.#request({
      method: "POST",
      path: `/v1/sessions/${encodeURIComponent(session_id)}/end`,
      body
    });
  }

  async appendEntry(input, { idempotencyKey }) {
    return this.#request({
      method: "POST",
      path: "/v1/entries",
      body: input,
      idempotencyKey
    });
  }

  async submitRuleCheck(input, { idempotencyKey }) {
    return this.#request({
      method: "POST",
      path: "/v1/rule-checks",
      body: input,
      idempotencyKey
    });
  }

  async listRuleChecks({ project_id, session_id, rule_id, status }) {
    return this.#request({
      method: "GET",
      path: `/v1/projects/${encodeURIComponent(project_id)}/rule-checks`,
      query: {
        session_id,
        rule_id,
        status
      }
    });
  }

  async searchEntries(input) {
    return this.#request({
      method: "POST",
      path: "/v1/entries/search",
      body: input
    });
  }

  async #request({ method, path, body, query, idempotencyKey }) {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    }

    let response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers: {
          ...(body ? { "content-type": "application/json" } : {}),
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
    } catch (error) {
      throw new HiveMindApiClientError({
        status: 0,
        code: "API_TRANSPORT_FAILED",
        message: error instanceof Error ? error.message : String(error),
        details: {
          method,
          url: url.toString(),
          cause: serializeErrorCause(error?.cause)
        },
        meta: {},
        cause: error
      });
    }

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new HiveMindApiClientError({
        status: response.status,
        code: payload?.error?.code ?? "API_REQUEST_FAILED",
        message: payload?.error?.message ?? `Request failed with status ${response.status}.`,
        details: payload?.error?.details ?? {},
        meta: payload?.meta ?? {}
      });
    }

    return payload.data;
  }
}

function serializeErrorCause(cause) {
  if (!cause) {
    return null;
  }
  if (!(cause instanceof Error)) {
    return { value: String(cause) };
  }

  return {
    name: cause.name,
    message: cause.message,
    ...(cause.code ? { code: cause.code } : {}),
    ...(cause.errno ? { errno: cause.errno } : {}),
    ...(cause.syscall ? { syscall: cause.syscall } : {}),
    ...(cause.address ? { address: cause.address } : {}),
    ...(cause.port ? { port: cause.port } : {})
  };
}
