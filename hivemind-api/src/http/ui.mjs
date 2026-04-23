export function renderHumanUi() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HiveMind Sessions</title>
  <link rel="icon" href="/assets/hivemind-radial-grid-mark.svg" type="image/svg+xml">
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f8;
      --panel: #ffffff;
      --line: #d7dde2;
      --line-strong: #aeb8c2;
      --text: #172026;
      --muted: #5a6872;
      --accent: #0f766e;
      --accent-dark: #0b5f59;
      --danger: #b42318;
      --warning-bg: #fff7df;
      --warning-line: #e7c565;
      --ok-bg: #e9f7f3;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      line-height: 1.45;
    }

    header {
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }

    .wrap {
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 64px;
    }

    h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0;
    }

    .brand-lockup {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .brand-mark {
      width: 42px;
      height: 42px;
      border-radius: 6px;
      background: #12151b;
      padding: 5px;
      flex: 0 0 auto;
    }

    main {
      padding: 20px 0 32px;
    }

    .toolbar {
      display: grid;
      grid-template-columns: minmax(140px, 1fr) minmax(120px, 160px) minmax(120px, 160px) minmax(120px, 160px) auto auto;
      gap: 10px;
      align-items: end;
      margin-bottom: 16px;
    }

    label {
      display: grid;
      gap: 5px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
    }

    input,
    select {
      width: 100%;
      min-height: 36px;
      border: 1px solid var(--line-strong);
      border-radius: 6px;
      background: #fff;
      color: var(--text);
      padding: 7px 9px;
      font: inherit;
    }

    button {
      min-height: 36px;
      border: 1px solid var(--accent);
      border-radius: 6px;
      background: var(--accent);
      color: #fff;
      padding: 7px 12px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }

    button.secondary {
      background: #fff;
      color: var(--accent-dark);
    }

    button.danger {
      border-color: var(--danger);
      background: var(--danger);
    }

    button:disabled {
      cursor: not-allowed;
      opacity: .55;
    }

    .status-line {
      min-height: 34px;
      margin-bottom: 12px;
      padding: 8px 10px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--panel);
      color: var(--muted);
    }

    .status-line.error {
      border-color: #f1a7a1;
      color: var(--danger);
      background: #fff0ee;
    }

    .status-line.ok {
      border-color: #9bd5c4;
      color: #0f5f51;
      background: var(--ok-bg);
    }

    .table-shell {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 960px;
    }

    th,
    td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }

    th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #eef2f4;
      color: #31404b;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0;
    }

    tr:last-child td {
      border-bottom: 0;
    }

    .goal {
      max-width: 360px;
      overflow-wrap: anywhere;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 2px 8px;
      background: #f8fafb;
      font-size: 12px;
      font-weight: 700;
    }

    .pill.active {
      border-color: #82c8bb;
      background: var(--ok-bg);
      color: #0f5f51;
    }

    .pill.abandoned {
      border-color: #f1a7a1;
      background: #fff0ee;
      color: var(--danger);
    }

    .pill.completed {
      border-color: var(--line-strong);
      background: #eef2f4;
      color: #45535e;
    }

    @media (max-width: 900px) {
      .toolbar {
        grid-template-columns: 1fr 1fr;
      }

      .toolbar button {
        width: 100%;
      }
    }

    @media (max-width: 560px) {
      .wrap {
        width: min(100vw - 20px, 1180px);
      }

      .topbar {
        align-items: flex-start;
        flex-direction: column;
        padding: 14px 0;
      }

      .toolbar {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="wrap topbar">
      <div class="brand-lockup">
        <img class="brand-mark" src="/assets/hivemind-radial-grid-mark.svg" alt="" aria-hidden="true">
        <h1>HiveMind Sessions</h1>
      </div>
      <button id="refresh" class="secondary" type="button" title="Refresh sessions">Refresh</button>
    </div>
  </header>
  <main class="wrap">
    <section class="toolbar" aria-label="Session controls">
      <label>
        Project ID
        <input id="projectId" value="hivemind" autocomplete="off">
      </label>
      <label>
        Status
        <select id="status">
          <option value="">All</option>
          <option value="active" selected>Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="abandoned">Abandoned</option>
        </select>
      </label>
      <label>
        Branch
        <input id="branch" placeholder="Any branch" autocomplete="off">
      </label>
      <label>
        Older Than
        <input id="olderThan" type="number" min="0.1" step="0.1" value="24">
      </label>
      <button id="closeOld" class="danger" type="button" title="Close stale active or paused sessions as abandoned">Close Older</button>
      <button id="showAll" class="secondary" type="button" title="Show sessions across all statuses">Show All</button>
    </section>
    <div id="statusLine" class="status-line">Loading sessions...</div>
    <section class="table-shell" aria-label="Sessions">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Last Seen</th>
            <th>Started</th>
            <th>Branch</th>
            <th>Author</th>
            <th>Goal</th>
            <th>Session ID</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="sessionsBody"></tbody>
      </table>
    </section>
  </main>
  <script>
    const el = {
      projectId: document.querySelector("#projectId"),
      status: document.querySelector("#status"),
      branch: document.querySelector("#branch"),
      olderThan: document.querySelector("#olderThan"),
      closeOld: document.querySelector("#closeOld"),
      refresh: document.querySelector("#refresh"),
      showAll: document.querySelector("#showAll"),
      statusLine: document.querySelector("#statusLine"),
      sessionsBody: document.querySelector("#sessionsBody")
    };

    function setStatus(message, mode = "") {
      el.statusLine.textContent = message;
      el.statusLine.className = "status-line" + (mode ? " " + mode : "");
    }

    function projectId() {
      const value = el.projectId.value.trim();
      if (!value) {
        throw new Error("Project ID is required.");
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
      const response = await fetch(path, {
        ...options,
        headers: {
          ...(options.body ? { "content-type": "application/json" } : {}),
          ...(options.headers || {})
        }
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        const code = payload && payload.error ? payload.error.code : "REQUEST_FAILED";
        const message = payload && payload.error ? payload.error.message : "Request failed.";
        throw new Error(code + ": " + message);
      }
      return payload.data;
    }

    function renderSessions(sessions) {
      el.sessionsBody.replaceChildren();
      for (const session of sessions) {
        const row = document.createElement("tr");
        row.innerHTML = "<td><span class=\\"pill " + session.status + "\\">" + session.status + "</span></td>"
          + "<td>" + formatDate(session.last_seen_at) + "<br><span class=\\"mono\\">" + ageLabel(session.last_seen_at) + "</span></td>"
          + "<td>" + formatDate(session.started_at) + "</td>"
          + "<td class=\\"mono\\"></td>"
          + "<td></td>"
          + "<td class=\\"goal\\"></td>"
          + "<td class=\\"mono\\"></td>"
          + "<td></td>";
        row.children[3].textContent = session.branch;
        row.children[4].textContent = session.author_id;
        row.children[5].textContent = session.goal;
        row.children[6].textContent = session.session_id;
        const actionCell = row.children[7];
        if (session.status === "active" || session.status === "paused") {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "secondary";
          button.textContent = "Close";
          button.title = "Close this session as abandoned";
          button.addEventListener("click", () => closeOne(session.session_id));
          actionCell.append(button);
        }
        el.sessionsBody.append(row);
      }
    }

    async function loadSessions() {
      try {
        setStatus("Loading sessions...");
        const params = new URLSearchParams();
        if (el.status.value) {
          params.set("status", el.status.value);
        }
        if (el.branch.value.trim()) {
          params.set("branch", el.branch.value.trim());
        }
        params.set("limit", "100");
        const data = await api("/v1/projects/" + encodeURIComponent(projectId()) + "/sessions?" + params.toString());
        renderSessions(data.sessions);
        setStatus(data.summary, "ok");
      } catch (error) {
        renderSessions([]);
        setStatus(error.message, "error");
      }
    }

    async function closeOne(sessionId) {
      try {
        setStatus("Closing session " + sessionId + "...");
        await api("/v1/sessions/" + encodeURIComponent(sessionId) + "/end", {
          method: "POST",
          body: JSON.stringify({ status: "abandoned" })
        });
        await loadSessions();
      } catch (error) {
        setStatus(error.message, "error");
      }
    }

    async function closeOlder() {
      try {
        const olderThan = Number.parseFloat(el.olderThan.value);
        if (!Number.isFinite(olderThan) || olderThan <= 0) {
          throw new Error("Older Than must be a positive number of hours.");
        }
        const body = {
          older_than_hours: olderThan,
          status: "abandoned"
        };
        if (el.branch.value.trim()) {
          body.branch = el.branch.value.trim();
        }
        setStatus("Closing stale sessions...");
        const data = await api("/v1/projects/" + encodeURIComponent(projectId()) + "/sessions/close-older-than", {
          method: "POST",
          body: JSON.stringify(body)
        });
        await loadSessions();
        setStatus(data.summary + " Cutoff: " + formatDate(data.cutoff_at), "ok");
      } catch (error) {
        setStatus(error.message, "error");
      }
    }

    el.refresh.addEventListener("click", loadSessions);
    el.closeOld.addEventListener("click", closeOlder);
    el.showAll.addEventListener("click", () => {
      el.status.value = "";
      loadSessions();
    });
    el.projectId.addEventListener("change", loadSessions);
    el.status.addEventListener("change", loadSessions);
    el.branch.addEventListener("change", loadSessions);

    loadSessions();
  </script>
</body>
</html>`;
}
