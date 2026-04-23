export class StorageAdapter {
  async createProject(_projectInput) {
    throw new Error("Not implemented");
  }

  async getProject(_projectId) {
    throw new Error("Not implemented");
  }

  async listFeatures(_projectId) {
    throw new Error("Not implemented");
  }

  async addFeature(_projectId, _feature) {
    throw new Error("Not implemented");
  }

  async removeFeature(_projectId, _feature) {
    throw new Error("Not implemented");
  }

  async renameFeature(_projectId, _feature, _newFeature) {
    throw new Error("Not implemented");
  }

  async openContext(_contextInput, _options) {
    throw new Error("Not implemented");
  }

  async getContext(_contextToken) {
    throw new Error("Not implemented");
  }

  async updateContext(_contextToken, _patch) {
    throw new Error("Not implemented");
  }

  async closeContext(_contextToken) {
    throw new Error("Not implemented");
  }

  async captureLearning(_learningInput, _options) {
    throw new Error("Not implemented");
  }

  async appendLearningFeedback(_feedbackInput, _options) {
    throw new Error("Not implemented");
  }

  async getRecentLearnings(_query) {
    throw new Error("Not implemented");
  }

  async searchLearnings(_query) {
    throw new Error("Not implemented");
  }

  async listActiveBranchLearnings(_projectId, _branch, _limit) {
    throw new Error("Not implemented");
  }

  async createIssue(_issueInput, _options) {
    throw new Error("Not implemented");
  }

  async getIssue(_contextToken, _issueId) {
    throw new Error("Not implemented");
  }

  async appendIssueEvent(_eventInput, _options) {
    throw new Error("Not implemented");
  }

  async listIssues(_query) {
    throw new Error("Not implemented");
  }

  async listActiveIssues(_projectId, _branch, _limit) {
    throw new Error("Not implemented");
  }

  async getProjectBrief(_contextToken) {
    throw new Error("Not implemented");
  }

  async getBranchBrief(_contextToken, _branch) {
    throw new Error("Not implemented");
  }

  async getOpenThreadsReadModel(_contextToken, _branch, _limit) {
    throw new Error("Not implemented");
  }

  async getStartupSummary(_projectId, _branch, _feature) {
    throw new Error("Not implemented");
  }

  async getRuleset(_projectId) {
    throw new Error("Not implemented");
  }

  async upsertRuleset(_projectId, _rulesetInput) {
    throw new Error("Not implemented");
  }

  async createSession(_sessionInput, _options) {
    throw new Error("Not implemented");
  }

  async endSession(_sessionId, _status) {
    throw new Error("Not implemented");
  }

  async listSessions(_query) {
    throw new Error("Not implemented");
  }

  async closeSessionsOlderThan(_query) {
    throw new Error("Not implemented");
  }

  async getSession(_sessionId) {
    throw new Error("Not implemented");
  }

  async getSessionStartContext(_query) {
    throw new Error("Not implemented");
  }

  async appendEntry(_entryInput, _options) {
    throw new Error("Not implemented");
  }

  async appendRuleCheck(_ruleCheckInput, _options) {
    throw new Error("Not implemented");
  }

  async listRuleChecks(_query) {
    throw new Error("Not implemented");
  }

  async searchEntries(_query) {
    throw new Error("Not implemented");
  }
}
