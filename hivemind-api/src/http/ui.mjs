export function renderHumanUi() {
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HiveMind Work Units</title>
  <link rel="icon" href="/assets/hivemind-radial-grid-mark.svg" type="image/svg+xml">
  <style>
    :root {
      color-scheme: dark;
      --bg: #05070b;
      --text: rgba(255, 255, 255, 0.94);
      --muted: rgba(255, 255, 255, 0.65);
      --muted2: rgba(255, 255, 255, 0.52);
      --panel: rgba(255, 255, 255, 0.04);
      --panel2: rgba(255, 255, 255, 0.03);
      --panel3: rgba(255, 255, 255, 0.07);
      --border: rgba(255, 255, 255, 0.12);
      --border2: rgba(255, 255, 255, 0.08);
      --accent: rgba(51, 225, 255, 0.75);
      --accent-strong: #33e1ff;
      --ok: #56d391;
      --danger: #ff7575;
      --shadow: rgba(0, 0, 0, 0.32);
    }

    :root[data-theme="light"] {
      color-scheme: light;
      --bg: #f5f7fb;
      --text: rgba(10, 20, 30, 0.92);
      --muted: rgba(10, 20, 30, 0.68);
      --muted2: rgba(10, 20, 30, 0.55);
      --panel: rgba(255, 255, 255, 0.92);
      --panel2: rgba(255, 255, 255, 0.86);
      --panel3: rgba(10, 20, 30, 0.04);
      --border: rgba(10, 20, 30, 0.12);
      --border2: rgba(10, 20, 30, 0.09);
      --accent: rgba(20, 120, 210, 0.85);
      --accent-strong: #1478d2;
      --ok: #197d50;
      --danger: #c43838;
      --shadow: rgba(20, 30, 45, 0.11);
    }

    * {
      box-sizing: border-box;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at top left, rgba(51, 225, 255, 0.12), transparent 34rem),
        linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 18rem),
        var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      line-height: 1.45;
      cursor: default;
    }

    button,
    input,
    select {
      font: inherit;
    }

    header {
      position: sticky;
      top: 0;
      z-index: 10;
      border-bottom: 1px solid var(--border2);
      background: rgba(8, 10, 14, 0.78);
      backdrop-filter: blur(8px);
    }

    :root[data-theme="light"] header {
      background: rgba(255, 255, 255, 0.9);
    }

    .wrap {
      width: min(1240px, calc(100vw - 32px));
      margin: 0 auto;
    }

    .topbar {
      min-height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .brand-lockup {
      display: flex;
      align-items: center;
      min-width: 0;
      gap: 10px;
    }

    .brand-mark {
      width: 36px;
      height: 36px;
      flex: 0 0 auto;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #080b10;
      padding: 4px;
      box-shadow: 0 8px 24px var(--shadow);
    }

    h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 750;
      letter-spacing: 0;
      white-space: nowrap;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    main {
      padding: 18px 0 32px;
    }

    .toolbar {
      display: grid;
      grid-template-columns: minmax(220px, 1.1fr) minmax(180px, .8fr) auto;
      align-items: end;
      gap: 10px;
      margin-bottom: 12px;
    }

    .memory-toolbar {
      display: grid;
      grid-template-columns: minmax(150px, .75fr) minmax(150px, .75fr) minmax(140px, .7fr) minmax(220px, 1.2fr) auto;
      align-items: end;
      gap: 10px;
      margin-bottom: 12px;
    }

    label {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 650;
    }

    input,
    select {
      width: 100%;
      min-height: 34px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--panel);
      color: var(--text);
      padding: 6px 10px;
      outline: none;
    }

    input:focus,
    select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 24%, transparent);
    }

    button {
      min-height: 34px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--panel);
      color: var(--text);
      padding: 6px 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }

    button:hover {
      border-color: var(--accent);
      background: var(--panel3);
    }

    button.primary {
      border-color: color-mix(in srgb, var(--accent) 72%, var(--border));
      color: var(--accent-strong);
    }

    .summary-strip {
      min-height: 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
      padding: 8px 10px;
      border: 1px solid var(--border2);
      border-radius: 10px;
      background: var(--panel2);
      color: var(--muted);
    }

    .summary-strip.error {
      border-color: color-mix(in srgb, var(--danger) 62%, var(--border));
      color: var(--danger);
      background: color-mix(in srgb, var(--danger) 10%, var(--panel));
    }

    .summary-strip.ok {
      border-color: color-mix(in srgb, var(--ok) 45%, var(--border));
      color: var(--text);
    }

    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .tab-button {
      min-height: 34px;
    }

    .tab-button.active {
      border-color: color-mix(in srgb, var(--accent) 72%, var(--border));
      color: var(--accent-strong);
      background: var(--panel3);
    }

    .tab-panel[hidden] {
      display: none;
    }

    .table-shell {
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--panel);
      box-shadow: 0 16px 40px var(--shadow);
    }

    table {
      width: 100%;
      min-width: 920px;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border2);
      text-align: left;
      vertical-align: top;
    }

    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: color-mix(in srgb, var(--bg) 82%, var(--panel));
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.025);
    }

    tbody tr[data-session-id] {
      cursor: pointer;
    }

    tbody tr.selected td {
      background: color-mix(in srgb, var(--accent) 10%, transparent);
    }

    tr:last-child td {
      border-bottom: 0;
    }

    .goal {
      max-width: 380px;
      overflow-wrap: anywhere;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      color: var(--muted);
    }

    .state {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 2px 9px;
      background: var(--panel2);
      font-size: 12px;
      font-weight: 750;
    }

    .state.open {
      border-color: color-mix(in srgb, var(--accent) 62%, var(--border));
      color: var(--accent-strong);
    }

    .state.ended {
      border-color: color-mix(in srgb, var(--ok) 56%, var(--border));
      color: var(--ok);
    }

    .empty {
      color: var(--muted2);
      text-align: center;
    }

    .details-panel {
      margin-top: 12px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--panel);
      box-shadow: 0 16px 40px var(--shadow);
      overflow: hidden;
    }

    .memory-panel {
      margin-top: 18px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--panel);
      box-shadow: 0 16px 40px var(--shadow);
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border2);
      background: var(--panel2);
    }

    .panel-title {
      margin: 0;
      font-size: 14px;
      font-weight: 760;
    }

    .panel-body {
      padding: 14px;
    }

    .details-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border2);
      background: var(--panel2);
    }

    .details-title {
      margin: 0;
      font-size: 15px;
      font-weight: 760;
      overflow-wrap: anywhere;
    }

    .details-subtitle {
      margin-top: 4px;
      color: var(--muted);
      font-size: 12px;
    }

    .details-body {
      display: grid;
      grid-template-columns: minmax(0, .95fr) minmax(280px, .8fr);
      gap: 12px;
      padding: 12px;
    }

    .detail-section {
      min-width: 0;
      border: 1px solid var(--border2);
      border-radius: 10px;
      background: var(--panel2);
      padding: 10px;
    }

    .detail-section h2 {
      margin: 0 0 10px;
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 8px;
    }

    .metric {
      border: 1px solid var(--border2);
      border-radius: 10px;
      padding: 8px;
      background: var(--panel3);
    }

    .metric-value {
      font-size: 18px;
      font-weight: 800;
      line-height: 1.1;
    }

    .metric-label {
      margin-top: 3px;
      color: var(--muted);
      font-size: 11px;
    }

    .detail-list {
      display: grid;
      gap: 8px;
    }

    .entry-results {
      display: grid;
      gap: 8px;
    }

    .entry-group {
      border: 1px solid var(--border2);
      border-radius: 10px;
      background: var(--panel2);
      overflow: hidden;
    }

    .entry-group-title {
      padding: 8px 10px;
      border-bottom: 1px solid var(--border2);
      color: var(--muted);
      font-size: 11px;
      font-weight: 780;
      text-transform: uppercase;
    }

    .entry-card {
      padding: 9px 10px;
      border-bottom: 1px solid var(--border2);
    }

    .entry-card:last-child {
      border-bottom: 0;
    }

    .entry-card-title {
      font-weight: 720;
      overflow-wrap: anywhere;
    }

    .entry-card-meta,
    .tag-row {
      margin-top: 4px;
      color: var(--muted);
      font-size: 12px;
    }

    .tag-row {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    .tag-pill {
      display: inline-flex;
      align-items: center;
      min-height: 20px;
      border: 1px solid var(--border2);
      border-radius: 999px;
      padding: 1px 7px;
      background: var(--panel3);
      color: var(--muted);
      font-size: 11px;
    }

    .detail-item {
      border: 1px solid var(--border2);
      border-radius: 10px;
      background: var(--panel3);
      padding: 9px;
      overflow-wrap: anywhere;
    }

    .detail-item-title {
      font-weight: 720;
    }

    .detail-item-meta {
      margin-top: 4px;
      color: var(--muted);
      font-size: 12px;
    }

    .details-placeholder {
      padding: 14px;
      color: var(--muted);
    }

    @media (max-width: 820px) {
      .toolbar {
        grid-template-columns: 1fr;
      }

      .memory-toolbar {
        grid-template-columns: 1fr;
      }

      .topbar {
        align-items: flex-start;
        flex-direction: column;
        padding: 12px 0;
      }

      .topbar-actions {
        width: 100%;
      }

      .topbar-actions button {
        flex: 1;
      }
    }

    @media (max-width: 560px) {
      .wrap {
        width: min(100vw - 20px, 1240px);
      }

      .summary-strip {
        align-items: flex-start;
        flex-direction: column;
      }

      .details-body {
        grid-template-columns: 1fr;
      }

      .metric-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="wrap topbar">
      <div class="brand-lockup">
        <img class="brand-mark" src="/assets/hivemind-radial-grid-mark.svg" alt="" aria-hidden="true">
        <h1>HiveMind Work Units</h1>
      </div>
      <div class="topbar-actions">
        <button id="themeToggle" type="button" title="Toggle theme">Light</button>
        <button id="refresh" class="primary" type="button" title="Refresh work units">Refresh</button>
      </div>
    </div>
  </header>
  <main class="wrap">
    <section class="toolbar" aria-label="Work unit filters">
      <label>
        Project
        <select id="projectId"></select>
      </label>
      <label>
        Branch
        <select id="branch">
          <option value="">All branches</option>
        </select>
      </label>
      <button id="clearBranch" type="button" title="Show all branches">All Branches</button>
    </section>
    <div id="statusLine" class="summary-strip">Loading projects...</div>
    <nav class="tabs" aria-label="Views">
      <button id="workUnitsTab" class="tab-button active" type="button" data-tab="workUnits">Work Units</button>
      <button id="memoryTab" class="tab-button" type="button" data-tab="memory">Project Memory</button>
    </nav>
    <section id="workUnitsPanel" class="tab-panel" aria-label="Work units view">
      <section class="table-shell" aria-label="Work units">
        <table>
          <thead>
            <tr>
              <th>State</th>
              <th>Last Seen</th>
              <th>Started</th>
              <th>Ended</th>
              <th>Branch</th>
              <th>Author</th>
              <th>Activity</th>
              <th>Goal</th>
            </tr>
          </thead>
          <tbody id="sessionsBody"></tbody>
        </table>
      </section>
      <section id="detailsPanel" class="details-panel" aria-label="Work unit details">
        <div class="details-placeholder">Select a work unit to inspect its closeout, entries, rule checks, and branch reminders.</div>
      </section>
    </section>
    <section id="memoryPanel" class="tab-panel memory-panel" aria-label="Project memory search" hidden>
      <div class="panel-header">
        <h2 class="panel-title">Project Memory</h2>
        <span id="entryStatus" class="mono">Loading entries...</span>
      </div>
      <div class="panel-body">
        <section class="memory-toolbar" aria-label="Entry filters">
          <label>
            Type
            <select id="entryType">
              <option value="">All types</option>
              <option value="decision">Decision</option>
              <option value="plan_ref">Plan Ref</option>
              <option value="progress">Progress</option>
              <option value="feedback">Feedback</option>
              <option value="artifact_ref">Artifact Ref</option>
              <option value="tooling_note">Tooling Note</option>
              <option value="risk">Risk</option>
            </select>
          </label>
          <label>
            Feature
            <select id="entryFeature">
              <option value="">All features</option>
            </select>
          </label>
          <label>
            Tag
            <input id="entryTag" list="entryTags" placeholder="Any tag" autocomplete="off">
            <datalist id="entryTags"></datalist>
          </label>
          <label>
            Search
            <input id="entryQuery" placeholder="Summary or details" autocomplete="off">
          </label>
          <button id="entrySearch" class="primary" type="button" title="Search entries">Search</button>
        </section>
        <div id="entryResults" class="entry-results"></div>
      </div>
    </section>
  </main>
  <script>
    const THEME_KEY = "HIVEMIND_UI_THEME";
    const PROJECT_KEY = "HIVEMIND_UI_PROJECT";
    const BRANCH_KEY = "HIVEMIND_UI_BRANCH";
    const ENTRY_TYPE_KEY = "HIVEMIND_UI_ENTRY_TYPE";
    const ENTRY_FEATURE_KEY = "HIVEMIND_UI_ENTRY_FEATURE";
    const ENTRY_TAG_KEY = "HIVEMIND_UI_ENTRY_TAG";
    const ENTRY_QUERY_KEY = "HIVEMIND_UI_ENTRY_QUERY";

    const el = {
      projectId: document.querySelector("#projectId"),
      branch: document.querySelector("#branch"),
      refresh: document.querySelector("#refresh"),
      clearBranch: document.querySelector("#clearBranch"),
      themeToggle: document.querySelector("#themeToggle"),
      workUnitsTab: document.querySelector("#workUnitsTab"),
      memoryTab: document.querySelector("#memoryTab"),
      workUnitsPanel: document.querySelector("#workUnitsPanel"),
      memoryPanel: document.querySelector("#memoryPanel"),
      statusLine: document.querySelector("#statusLine"),
      sessionsBody: document.querySelector("#sessionsBody"),
      detailsPanel: document.querySelector("#detailsPanel"),
      entryStatus: document.querySelector("#entryStatus"),
      entryType: document.querySelector("#entryType"),
      entryFeature: document.querySelector("#entryFeature"),
      entryTag: document.querySelector("#entryTag"),
      entryTags: document.querySelector("#entryTags"),
      entryQuery: document.querySelector("#entryQuery"),
      entrySearch: document.querySelector("#entrySearch"),
      entryResults: document.querySelector("#entryResults")
    };

    let allSessions = [];
    let selectedSessionId = "";

    function storedValue(key) {
      try {
        return window.sessionStorage.getItem(key) || "";
      } catch (error) {
        return "";
      }
    }

    function storeValue(key, value) {
      try {
        window.sessionStorage.setItem(key, value);
      } catch (error) {
        setStatus("Browser session storage is unavailable: " + error.message, "error");
      }
    }

    function setTheme(theme) {
      document.documentElement.dataset.theme = theme;
      el.themeToggle.textContent = theme === "dark" ? "Light" : "Dark";
      storeValue(THEME_KEY, theme);
    }

    function setStatus(message, mode = "") {
      el.statusLine.textContent = message;
      el.statusLine.className = "summary-strip" + (mode ? " " + mode : "");
    }

    function setTab(tab) {
      const memoryActive = tab === "memory";
      el.workUnitsTab.classList.toggle("active", !memoryActive);
      el.memoryTab.classList.toggle("active", memoryActive);
      el.workUnitsPanel.hidden = memoryActive;
      el.memoryPanel.hidden = !memoryActive;
    }

    function selectedProjectId() {
      const value = el.projectId.value.trim();
      if (!value) {
        throw new Error("Project is required.");
      }
      return value;
    }

    function formatDate(value) {
      if (!value) {
        return "";
      }
      const date = new Date(value);
      return date.toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    function ageLabel(value) {
      const hours = (Date.now() - new Date(value).getTime()) / 36e5;
      if (!Number.isFinite(hours)) {
        return "";
      }
      if (hours < 1) {
        return Math.max(0, Math.round(hours * 60)) + "m ago";
      }
      return hours.toFixed(hours < 24 ? 1 : 0) + "h ago";
    }

    async function api(path, options = {}) {
      const requestBody =
        options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body;
      const response = await fetch(path, {
        ...options,
        headers: {
          ...(options.body ? { "content-type": "application/json" } : {}),
          ...(options.headers || {})
        },
        body: requestBody
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        const code = payload && payload.error ? payload.error.code : "REQUEST_FAILED";
        const message = payload && payload.error ? payload.error.message : "Request failed.";
        throw new Error(code + ": " + message);
      }
      return payload.data;
    }

    function renderProjects(projects) {
      el.projectId.replaceChildren();
      for (const project of projects) {
        const option = document.createElement("option");
        option.value = project.project_id;
        option.textContent = project.name + " (" + project.project_id + ")";
        option.title = project.root_path;
        el.projectId.append(option);
      }

      const preferred = storedValue(PROJECT_KEY) || "hivemind";
      if (projects.some((project) => project.project_id === preferred)) {
        el.projectId.value = preferred;
      } else if (projects.length > 0) {
        el.projectId.value = projects[0].project_id;
      }
    }

    async function loadFeatures() {
      const projectId = selectedProjectId();
      const data = await api("/v1/projects/" + encodeURIComponent(projectId) + "/features");
      const previous = el.entryFeature.value || storedValue(ENTRY_FEATURE_KEY);
      el.entryFeature.replaceChildren();
      const all = document.createElement("option");
      all.value = "";
      all.textContent = "All features";
      el.entryFeature.append(all);
      for (const feature of data.features) {
        const option = document.createElement("option");
        option.value = feature;
        option.textContent = feature;
        el.entryFeature.append(option);
      }
      el.entryFeature.value = data.features.includes(previous) ? previous : "";
    }

    function renderBranches(sessions) {
      const previous = el.branch.value || storedValue(BRANCH_KEY);
      const branches = [...new Set(sessions.map((session) => session.branch).filter(Boolean))].sort();
      el.branch.replaceChildren();
      const all = document.createElement("option");
      all.value = "";
      all.textContent = "All branches";
      el.branch.append(all);

      for (const branch of branches) {
        const option = document.createElement("option");
        option.value = branch;
        option.textContent = branch;
        el.branch.append(option);
      }

      el.branch.value = branches.includes(previous) ? previous : "";
    }

    function filteredSessions() {
      const branch = el.branch.value;
      return branch ? allSessions.filter((session) => session.branch === branch) : allSessions;
    }

    function currentEntryFilters() {
      const payload = {
        project_id: selectedProjectId(),
        limit: 100,
        sort: "recent"
      };
      if (el.branch.value) {
        payload.branch = el.branch.value;
      }
      if (el.entryType.value) {
        payload.entry_type = [el.entryType.value];
      }
      if (el.entryFeature.value) {
        payload.feature = el.entryFeature.value;
      }
      if (el.entryTag.value.trim()) {
        payload.tags = [el.entryTag.value.trim()];
      }
      if (el.entryQuery.value.trim()) {
        payload.query = el.entryQuery.value.trim();
      }
      return payload;
    }

    function renderEntryFacets(facets) {
      el.entryTags.replaceChildren();
      for (const tag of facets.tags || []) {
        const option = document.createElement("option");
        option.value = tag.value;
        option.label = tag.value + " (" + tag.count + ")";
        el.entryTags.append(option);
      }
    }

    function groupEntries(entries) {
      const groups = new Map();
      for (const entry of entries) {
        const feature = entry.feature || "No feature";
        const key = feature + " / " + entry.entry_type;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key).push(entry);
      }
      return [...groups.entries()];
    }

    function renderEntries(entries, facets) {
      renderEntryFacets(facets);
      el.entryResults.replaceChildren();
      if (entries.length === 0) {
        const empty = document.createElement("div");
        empty.className = "details-placeholder";
        empty.textContent = "No entries matched the current filters.";
        el.entryResults.append(empty);
        return;
      }

      for (const [groupName, groupedEntries] of groupEntries(entries)) {
        const group = document.createElement("section");
        group.className = "entry-group";
        appendText(group, "entry-group-title", groupName + " (" + groupedEntries.length + ")");
        for (const entry of groupedEntries) {
          const card = document.createElement("article");
          card.className = "entry-card";
          appendText(card, "entry-card-title", entry.summary);
          appendText(
            card,
            "entry-card-meta",
            formatDate(entry.timestamp) + " / " + entry.branch + " / " + entry.author_id
          );
          if (entry.tags.length > 0 || entry.category) {
            const tags = document.createElement("div");
            tags.className = "tag-row";
            if (entry.category) {
              const category = document.createElement("span");
              category.className = "tag-pill";
              category.textContent = "category:" + entry.category;
              tags.append(category);
            }
            for (const tag of entry.tags) {
              const pill = document.createElement("span");
              pill.className = "tag-pill";
              pill.textContent = tag;
              tags.append(pill);
            }
            card.append(tags);
          }
          group.append(card);
        }
        el.entryResults.append(group);
      }
    }

    async function searchEntries() {
      try {
        el.entryStatus.textContent = "Loading entries...";
        storeValue(ENTRY_TYPE_KEY, el.entryType.value);
        storeValue(ENTRY_FEATURE_KEY, el.entryFeature.value);
        storeValue(ENTRY_TAG_KEY, el.entryTag.value.trim());
        storeValue(ENTRY_QUERY_KEY, el.entryQuery.value.trim());
        const data = await api("/v1/entries/search", {
          method: "POST",
          body: currentEntryFilters()
        });
        renderEntries(data.entries, data.facets);
        el.entryStatus.textContent = data.summary;
      } catch (error) {
        el.entryResults.replaceChildren();
        el.entryStatus.textContent = error.message;
      }
    }

    function renderSessions(sessions) {
      el.sessionsBody.replaceChildren();
      if (sessions.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = "<td class=\\"empty\\" colspan=\\"8\\">No work units matched the current filters.</td>";
        el.sessionsBody.append(row);
        setDetailsPlaceholder("Select a work unit to inspect its closeout, entries, rule checks, and branch reminders.");
        return;
      }

      if (!sessions.some((session) => session.session_id === selectedSessionId)) {
        selectedSessionId = sessions[0].session_id;
      }

      for (const session of sessions) {
        const state = session.ended_at ? "ended" : "open";
        const row = document.createElement("tr");
        row.dataset.sessionId = session.session_id;
        row.tabIndex = 0;
        row.title = "Inspect work unit details";
        if (session.session_id === selectedSessionId) {
          row.classList.add("selected");
        }
        row.innerHTML = "<td><span class=\\"state " + state + "\\">" + (state === "open" ? "Open" : "Ended") + "</span></td>"
          + "<td>" + formatDate(session.last_seen_at) + "<br><span class=\\"mono\\">" + ageLabel(session.last_seen_at) + "</span></td>"
          + "<td>" + formatDate(session.started_at) + "</td>"
          + "<td>" + formatDate(session.ended_at) + "</td>"
          + "<td class=\\"mono\\"></td>"
          + "<td></td>"
          + "<td class=\\"mono\\"></td>"
          + "<td class=\\"goal\\"></td>";
        row.children[4].textContent = session.branch;
        row.children[5].textContent = session.author_id;
        row.children[6].textContent = (session.activity_counts.entries || 0) + " entries / " + (session.activity_counts.rule_checks || 0) + " checks";
        row.children[7].textContent = session.goal;
        row.addEventListener("click", () => selectSession(session.session_id));
        row.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectSession(session.session_id);
          }
        });
        el.sessionsBody.append(row);
      }

      loadDetails(selectedSessionId);
    }

    function setDetailsPlaceholder(message) {
      el.detailsPanel.replaceChildren();
      const placeholder = document.createElement("div");
      placeholder.className = "details-placeholder";
      placeholder.textContent = message;
      el.detailsPanel.append(placeholder);
    }

    function selectSession(sessionId) {
      selectedSessionId = sessionId;
      for (const row of el.sessionsBody.querySelectorAll("tr[data-session-id]")) {
        row.classList.toggle("selected", row.dataset.sessionId === selectedSessionId);
      }
      loadDetails(sessionId);
    }

    async function loadDetails(sessionId) {
      if (!sessionId) {
        setDetailsPlaceholder("Select a work unit to inspect its closeout, entries, rule checks, and branch reminders.");
        return;
      }
      setDetailsPlaceholder("Loading work unit details...");
      try {
        const data = await api("/v1/sessions/" + encodeURIComponent(sessionId) + "/closeout");
        renderDetails(data.closeout);
      } catch (error) {
        setDetailsPlaceholder(error.message);
      }
    }

    function appendText(parent, className, text) {
      const node = document.createElement("div");
      node.className = className;
      node.textContent = text;
      parent.append(node);
      return node;
    }

    function metric(label, value) {
      const item = document.createElement("div");
      item.className = "metric";
      appendText(item, "metric-value", String(value));
      appendText(item, "metric-label", label);
      return item;
    }

    function detailItem(title, meta) {
      const item = document.createElement("div");
      item.className = "detail-item";
      appendText(item, "detail-item-title", title);
      if (meta) {
        appendText(item, "detail-item-meta", meta);
      }
      return item;
    }

    function detailSection(title, items, emptyText, renderItem) {
      const section = document.createElement("section");
      section.className = "detail-section";
      const heading = document.createElement("h2");
      heading.textContent = title;
      section.append(heading);
      const list = document.createElement("div");
      list.className = "detail-list";
      if (items.length === 0) {
        list.append(detailItem(emptyText, ""));
      } else {
        for (const item of items) {
          list.append(renderItem(item));
        }
      }
      section.append(list);
      return section;
    }

    function renderDetails(closeout) {
      el.detailsPanel.replaceChildren();

      const header = document.createElement("div");
      header.className = "details-header";
      const titleGroup = document.createElement("div");
      appendText(titleGroup, "details-title", closeout.goal);
      appendText(
        titleGroup,
        "details-subtitle",
        closeout.project_id + " / " + closeout.branch + " / " + closeout.session_id
      );
      header.append(titleGroup);
      const state = document.createElement("span");
      state.className = "state " + (closeout.ended_at ? "ended" : "open");
      state.textContent = closeout.ended_at ? "Ended" : "Open";
      header.append(state);
      el.detailsPanel.append(header);

      const body = document.createElement("div");
      body.className = "details-body";
      const left = document.createElement("div");
      left.className = "detail-list";
      const right = document.createElement("div");
      right.className = "detail-list";

      const summary = document.createElement("section");
      summary.className = "detail-section";
      const summaryHeading = document.createElement("h2");
      summaryHeading.textContent = "Closeout";
      summary.append(summaryHeading);
      appendText(summary, "detail-item-title", closeout.summary);
      const metrics = document.createElement("div");
      metrics.className = "metric-grid";
      metrics.append(metric("Entries", closeout.activity_counts.entries || 0));
      metrics.append(metric("Rule checks", closeout.activity_counts.rule_checks || 0));
      metrics.append(metric("Missing rules", closeout.missing_required_rules.length));
      metrics.append(metric("Active issues", closeout.active_issue_count));
      summary.append(metrics);
      left.append(summary);

      const entryItems = closeout.entry_groups.flatMap((group) =>
        group.entries.map((entry) => ({
          title: entry.summary,
          meta: group.entry_type + " / " + formatDate(entry.timestamp)
        }))
      );
      left.append(
        detailSection("Entries", entryItems, "No entries recorded for this work unit.", (entry) =>
          detailItem(entry.title, entry.meta)
        )
      );

      right.append(
        detailSection("Rule Checks", closeout.rule_checks, "No rule checks recorded for this work unit.", (ruleCheck) =>
          detailItem(ruleCheck.rule_id + ": " + ruleCheck.status, formatDate(ruleCheck.timestamp) + " / " + ruleCheck.evidence)
        )
      );
      right.append(
        detailSection("Missing Required Rules", closeout.missing_required_rules, "No required rules are missing.", (rule) =>
          detailItem(rule.rule_id, rule.description)
        )
      );
      right.append(
        detailSection("Branch Reminders", closeout.active_learning_summaries, "No active branch learnings.", (learning) =>
          detailItem(learning.summary, learning.context.branch + " / " + learning.status)
        )
      );
      right.append(
        detailSection("Active Issues", closeout.active_issue_summaries, "No active branch issues.", (issue) =>
          detailItem(issue.summary, issue.context.branch + " / " + issue.status)
        )
      );

      body.append(left, right);
      el.detailsPanel.append(body);
    }

    async function loadProjects() {
      setStatus("Loading projects...");
      const data = await api("/v1/projects");
      if (data.projects.length === 0) {
        renderProjects([]);
        renderSessions([]);
        setStatus("No HiveMind projects are registered.", "error");
        return;
      }
      renderProjects(data.projects);
      el.entryType.value = storedValue(ENTRY_TYPE_KEY);
      el.entryTag.value = storedValue(ENTRY_TAG_KEY);
      el.entryQuery.value = storedValue(ENTRY_QUERY_KEY);
      await loadFeatures();
      await loadSessions();
    }

    async function loadSessions() {
      try {
        setStatus("Loading work units...");
        const projectId = selectedProjectId();
        storeValue(PROJECT_KEY, projectId);
        const data = await api("/v1/projects/" + encodeURIComponent(projectId) + "/sessions?limit=200");
        allSessions = data.sessions;
        renderBranches(allSessions);
        storeValue(BRANCH_KEY, el.branch.value);
        const sessions = filteredSessions();
        renderSessions(sessions);
        const branchText = el.branch.value ? " on " + el.branch.value : "";
        setStatus(sessions.length + " of " + allSessions.length + " work units shown" + branchText + ".", "ok");
        await searchEntries();
      } catch (error) {
        allSessions = [];
        renderBranches([]);
        renderSessions([]);
        renderEntries([], { tags: [] });
        setStatus(error.message, "error");
      }
    }

    el.themeToggle.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
      setTheme(current === "dark" ? "light" : "dark");
    });
    el.workUnitsTab.addEventListener("click", () => setTab("workUnits"));
    el.memoryTab.addEventListener("click", () => setTab("memory"));
    el.refresh.addEventListener("click", loadSessions);
    el.clearBranch.addEventListener("click", () => {
      el.branch.value = "";
      storeValue(BRANCH_KEY, "");
      renderSessions(filteredSessions());
      setStatus(filteredSessions().length + " of " + allSessions.length + " work units shown.", "ok");
      searchEntries();
    });
    el.projectId.addEventListener("change", async () => {
      await loadFeatures();
      await loadSessions();
    });
    el.branch.addEventListener("change", () => {
      storeValue(BRANCH_KEY, el.branch.value);
      const sessions = filteredSessions();
      renderSessions(sessions);
      const branchText = el.branch.value ? " on " + el.branch.value : "";
      setStatus(sessions.length + " of " + allSessions.length + " work units shown" + branchText + ".", "ok");
      searchEntries();
    });
    el.entrySearch.addEventListener("click", searchEntries);
    el.entryType.addEventListener("change", searchEntries);
    el.entryFeature.addEventListener("change", searchEntries);
    el.entryTag.addEventListener("change", searchEntries);
    el.entryQuery.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        searchEntries();
      }
    });

    setTheme(storedValue(THEME_KEY) === "light" ? "light" : "dark");
    setTab("workUnits");
    loadProjects().catch((error) => {
      renderSessions([]);
      setStatus(error.message, "error");
    });
  </script>
</body>
</html>`;
}
