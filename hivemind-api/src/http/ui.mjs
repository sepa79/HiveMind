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
      --nav-header-height: 40px;
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
      background: var(--bg);
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

    [hidden] {
      display: none !important;
    }

    .appShell {
      height: 100vh;
      display: grid;
      grid-template-columns: 220px 1fr;
      grid-template-rows: 52px 1fr;
    }

    .topBar {
      grid-row: 1;
      grid-column: 1 / span 2;
      border-bottom: 1px solid var(--border2);
      background: rgba(8, 10, 14, 0.78);
      backdrop-filter: blur(6px);
      position: relative;
      z-index: 300;
    }

    :root[data-theme="light"] .topBar {
      background: rgba(255, 255, 255, 0.9);
    }

    .topBarInner {
      height: 52px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 10px;
    }

    .topBarLeft {
      display: flex;
      align-items: center;
      min-width: 0;
      gap: 10px;
    }

    .topBarCenter {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
    }

    .topBarRight {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
    }

    .logoLink {
      display: inline-flex;
      align-items: center;
      height: 44px;
      gap: 10px;
      padding: 0 8px;
      color: inherit;
      text-decoration: none;
    }

    .brand-mark {
      width: 28px;
      height: 28px;
      flex: 0 0 auto;
    }

    .brandWordmark {
      font-size: 22px;
      font-weight: 900;
      line-height: 1;
      letter-spacing: 0.2px;
      white-space: nowrap;
      position: relative;
      top: -1px;
    }

    .brandWordHive {
      color: rgba(255, 255, 255, 0.95);
    }

    .brandWordMind {
      color: #ffc107;
    }

    :root[data-theme="light"] .brandWordHive {
      color: rgba(10, 20, 30, 0.92);
    }

    .sideNav {
      grid-row: 2;
      grid-column: 1;
      border-right: 1px solid var(--border2);
      background: rgba(8, 10, 14, 0.88);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: start;
      padding: 8px 0;
    }

    :root[data-theme="light"] .sideNav {
      background: rgba(255, 255, 255, 0.92);
    }

    .navIconStack {
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 6px;
      padding: 4px 0;
    }

    .navHeader {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 10px 6px;
      min-height: var(--nav-header-height);
    }

    .navHeaderTitle {
      color: rgba(255, 255, 255, 0.7);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    :root[data-theme="light"] .navHeaderTitle {
      color: rgba(10, 20, 30, 0.6);
    }

    .navItem {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 40px;
      margin: 0 8px;
      padding: 0 12px;
      border-radius: 12px;
      color: #0ff;
      border: 1px solid rgba(51, 225, 255, 0.35);
      background: radial-gradient(120% 120% at 10% 10%, rgba(51, 225, 255, 0.25), rgba(51, 225, 255, 0.06) 40%, rgba(255, 255, 255, 0.05) 70%, rgba(0, 0, 0, 0) 100%);
      box-shadow: 0 0 20px rgba(51, 225, 255, 0.15) inset, 0 0 16px rgba(51, 225, 255, 0.18);
      text-decoration: none;
    }

    .navItem:hover {
      box-shadow: 0 0 26px rgba(51, 225, 255, 0.22) inset, 0 0 20px rgba(51, 225, 255, 0.28);
      background: radial-gradient(120% 120% at 10% 10%, rgba(51, 225, 255, 0.35), rgba(51, 225, 255, 0.1) 50%, rgba(255, 255, 255, 0.07) 75%, rgba(0, 0, 0, 0) 100%);
    }

    .navItem.active {
      background: #33e1ff !important;
      color: #111 !important;
      font-weight: 800;
      border-color: transparent !important;
      box-shadow: none;
    }

    .navGlyph {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      font-weight: 900;
    }

    .navLabel {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.1px;
    }

    :root[data-theme="light"] .navItem {
      color: rgba(10, 20, 30, 0.82);
      border-color: rgba(10, 20, 30, 0.12);
      background: rgba(10, 20, 30, 0.03);
      box-shadow: none;
    }

    :root[data-theme="light"] .navItem:hover {
      background: rgba(10, 20, 30, 0.05);
      border-color: rgba(10, 20, 30, 0.16);
    }

    :root[data-theme="light"] .navItem.active {
      background: rgba(20, 120, 210, 0.18) !important;
      color: rgba(10, 20, 30, 0.92) !important;
      border-color: rgba(20, 120, 210, 0.22) !important;
    }

    .appContent {
      grid-row: 2;
      grid-column: 2;
      min-width: 0;
      min-height: 0;
      overflow: auto;
    }

    .pageContent {
      width: min(1240px, calc(100vw - 276px));
      margin: 0 auto;
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

    .topBarStatus {
      min-height: 30px;
      display: flex;
      align-items: center;
      min-width: 0;
      max-width: 640px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0 10px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--muted);
      font-size: 12px;
    }

    .topBarStatus.error {
      border-color: color-mix(in srgb, var(--danger) 62%, var(--border));
      color: var(--danger);
      background: color-mix(in srgb, var(--danger) 10%, var(--panel));
    }

    .topBarStatus.ok {
      border-color: color-mix(in srgb, var(--ok) 45%, var(--border));
      color: var(--text);
    }

    .tab-panel[hidden] {
      display: none;
    }

    .home-hero {
      margin-bottom: 14px;
    }

    .home-hero-main {
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--panel);
      box-shadow: 0 16px 40px var(--shadow);
      padding: 28px;
    }

    .home-brand-row {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 22px;
    }

    .home-brand-logo {
      width: min(780px, 100%);
      max-height: 240px;
      object-fit: contain;
      object-position: center;
      display: block;
      transform: translateX(5%);
    }

    .home-kicker {
      color: var(--accent-strong);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      text-align: center;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .home-copy {
      max-width: 980px;
      margin: 10px auto 0;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.6;
      text-align: center;
    }

    .home-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .home-card {
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--panel);
      padding: 14px;
    }

    .home-card h2 {
      margin: 0 0 8px;
      font-size: 14px;
    }

    .home-card p {
      margin: 0;
      color: var(--muted);
      line-height: 1.55;
    }

    .price-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border2);
    }

    .price-row:last-child {
      border-bottom: 0;
    }

    .price-row strong {
      color: var(--text);
    }

    .standards-grid {
      display: grid;
      grid-template-columns: minmax(280px, .85fr) minmax(0, 1.15fr);
      gap: 12px;
      margin-top: 12px;
    }

    .standards-actions {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 8px;
      align-items: end;
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
      cursor: pointer;
    }

    .entry-card:last-child {
      border-bottom: 0;
    }

    .entry-card:hover,
    .detail-item.clickable:hover {
      border-color: color-mix(in srgb, var(--accent) 48%, var(--border2));
      background: color-mix(in srgb, var(--accent) 8%, var(--panel3));
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

    .detail-item.clickable {
      cursor: pointer;
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

    .entry-detail-overlay[hidden] {
      display: none;
    }

    .entry-detail-overlay {
      position: fixed;
      inset: 0;
      z-index: 500;
      display: grid;
      place-items: center;
      padding: 18px;
      background: rgba(0, 0, 0, 0.58);
      backdrop-filter: blur(4px);
    }

    .entry-detail-dialog {
      display: flex;
      flex-direction: column;
      width: min(860px, calc(100vw - 36px));
      max-height: min(820px, calc(100vh - 36px));
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: color-mix(in srgb, var(--bg) 82%, #111827);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
    }

    .entry-detail-dialog .panel-header {
      flex: 0 0 auto;
      align-items: flex-start;
    }

    .entry-detail-dialog .panel-header > div {
      min-width: 0;
    }

    .entry-detail-body {
      flex: 1 1 auto;
      min-height: 0;
      display: grid;
      align-content: start;
      gap: 12px;
      overflow: auto;
      padding: 14px;
    }

    .entry-detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .entry-detail-text {
      margin: 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      color: var(--text);
      font-family: inherit;
      font-size: 13px;
      line-height: 1.5;
    }

    @media (max-width: 820px) {
      .appShell {
        grid-template-columns: 56px 1fr;
      }

      .pageContent {
        width: min(100vw - 88px, 1240px);
      }

      .navHeaderTitle,
      .navLabel {
        display: none;
      }

      .navItem {
        justify-content: center;
        padding: 0;
      }

      .topBarCenter {
        display: none;
      }

      .toolbar {
        grid-template-columns: 1fr;
      }

      .memory-toolbar {
        grid-template-columns: 1fr;
      }

      .standards-grid,
      .standards-actions {
        grid-template-columns: 1fr;
      }

      .home-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 560px) {
      .pageContent {
        width: min(100vw - 76px, 1240px);
      }

      .brandWordmark {
        display: none;
      }

      .details-body {
        grid-template-columns: 1fr;
      }

      .metric-grid {
        grid-template-columns: 1fr 1fr;
      }

      .entry-detail-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="appShell">
    <header class="topBar">
      <div class="topBarInner">
        <div class="topBarLeft">
          <a class="logoLink" href="/" aria-label="HiveMind home" title="Home">
            <img class="brand-mark" src="/assets/hivemind-radial-grid-mark.svg" alt="" aria-hidden="true">
            <span class="brandWordmark" aria-hidden="true"><span class="brandWordHive">Hive</span><span class="brandWordMind">Mind</span></span>
          </a>
        </div>
        <div class="topBarCenter">
          <div id="statusLine" class="topBarStatus">Loading projects...</div>
        </div>
        <div class="topBarRight">
          <button id="themeToggle" type="button" title="Toggle theme">Light</button>
          <button id="refresh" class="primary" type="button" title="Refresh work units">Refresh</button>
        </div>
      </div>
    </header>
    <aside class="sideNav">
      <div class="navIconStack">
        <div class="navHeader">
          <div class="navHeaderTitle">Navigation</div>
        </div>
        <button id="homeTab" class="navItem active" type="button" data-tab="home" title="Home">
          <span class="navGlyph" aria-hidden="true">H</span><span class="navLabel">Home</span>
        </button>
        <button id="workUnitsTab" class="navItem" type="button" data-tab="workUnits" title="Work Units">
          <span class="navGlyph" aria-hidden="true">W</span><span class="navLabel">Work Units</span>
        </button>
        <button id="memoryTab" class="navItem" type="button" data-tab="memory" title="Project Memory">
          <span class="navGlyph" aria-hidden="true">M</span><span class="navLabel">Memory</span>
        </button>
        <button id="standardsTab" class="navItem" type="button" data-tab="standards" title="Standards">
          <span class="navGlyph" aria-hidden="true">S</span><span class="navLabel">Standards</span>
        </button>
      </div>
    </aside>
    <main class="appContent">
      <div class="pageContent">
        <section id="homePanel" class="tab-panel" aria-label="HiveMind home">
          <section class="home-hero">
            <div class="home-hero-main">
              <div class="home-brand-row">
                <img class="home-brand-logo" src="/assets/hivemind-radial-grid-logo.svg" alt="HiveMind">
              </div>
              <div class="home-kicker">Shared engineering memory for AI-assisted teams</div>
              <h1 class="sr-only">HiveMind</h1>
              <p class="home-copy">
                HiveMind gives teams one place for work-unit history, project memory, engineering rules, onboarding guidance,
                and AI client configuration. It is built for companies that want Copilot, Codex, MCP clients, and internal
                agents to start with the same context instead of rediscovering tribal knowledge in every repository.
              </p>
            </div>
          </section>
          <section class="home-grid" aria-label="HiveMind value areas">
            <article class="home-card">
              <h2>What it is</h2>
              <p>A lightweight governance and memory layer for engineering teams, exposed through REST, MCP, CLI helpers, and this web console.</p>
            </article>
            <article class="home-card">
              <h2>Why it exists</h2>
              <p>To make onboarding repeatable, keep AI agents aligned with company standards, and preserve decisions without dumping raw transcripts.</p>
            </article>
            <article class="home-card">
              <h2>How teams use it</h2>
              <p>Register projects, assign standard profiles, review work units, search memory, and apply rulesets such as AGENTS.md templates.</p>
            </article>
            <article class="home-card">
              <h2>What it costs</h2>
              <div class="price-row"><strong>Software</strong><span>0 for the internal/self-hosted build</span></div>
              <div class="price-row"><strong>Infra</strong><span>one API service plus fs-jsonl or OpenSearch</span></div>
              <div class="price-row"><strong>Rollout</strong><span>catalog, MCP config, and repo standards per team</span></div>
            </article>
          </section>
        </section>
        <section id="workToolbar" class="toolbar" aria-label="Work unit filters" hidden>
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
        <section id="workUnitsPanel" class="tab-panel" aria-label="Work units view" hidden>
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
        <section id="standardsPanel" class="tab-panel memory-panel" aria-label="Project standards" hidden>
          <div class="panel-header">
            <h2 class="panel-title">Standards</h2>
            <span id="standardStatus" class="mono">Loading catalog...</span>
          </div>
          <div class="panel-body">
            <section class="standards-actions" aria-label="Standard profile assignment">
              <label>
                Standard Profile
                <select id="standardProfile"></select>
              </label>
              <button id="standardApply" class="primary" type="button" title="Assign selected profile">Assign</button>
              <button id="standardRefresh" type="button" title="Refresh guidance">Check</button>
            </section>
            <div class="standards-grid">
              <section class="detail-section">
                <h2>Guidance</h2>
                <div id="standardSummary" class="detail-list"></div>
              </section>
              <section class="detail-section">
                <h2>Catalog</h2>
                <div id="catalogList" class="detail-list"></div>
              </section>
              <section class="detail-section">
                <h2>Required Files</h2>
                <div id="requiredFiles" class="detail-list"></div>
              </section>
              <section class="detail-section">
                <h2>Drift</h2>
                <div id="driftFiles" class="detail-list"></div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
  <section id="entryDetailOverlay" class="entry-detail-overlay" aria-label="Entry details" hidden>
    <article class="entry-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="entryDetailTitle">
      <div class="panel-header">
        <div>
          <h2 id="entryDetailTitle" class="panel-title">Entry Details</h2>
          <div id="entryDetailSubtitle" class="details-subtitle"></div>
        </div>
        <button id="entryDetailClose" type="button" title="Close entry details">Close</button>
      </div>
      <div id="entryDetailBody" class="entry-detail-body"></div>
    </article>
  </section>
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
      homeTab: document.querySelector("#homeTab"),
      workUnitsTab: document.querySelector("#workUnitsTab"),
      memoryTab: document.querySelector("#memoryTab"),
      standardsTab: document.querySelector("#standardsTab"),
      homePanel: document.querySelector("#homePanel"),
      workToolbar: document.querySelector("#workToolbar"),
      workUnitsPanel: document.querySelector("#workUnitsPanel"),
      memoryPanel: document.querySelector("#memoryPanel"),
      standardsPanel: document.querySelector("#standardsPanel"),
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
      entryResults: document.querySelector("#entryResults"),
      standardStatus: document.querySelector("#standardStatus"),
      standardProfile: document.querySelector("#standardProfile"),
      standardApply: document.querySelector("#standardApply"),
      standardRefresh: document.querySelector("#standardRefresh"),
      standardSummary: document.querySelector("#standardSummary"),
      catalogList: document.querySelector("#catalogList"),
      requiredFiles: document.querySelector("#requiredFiles"),
      driftFiles: document.querySelector("#driftFiles"),
      entryDetailOverlay: document.querySelector("#entryDetailOverlay"),
      entryDetailTitle: document.querySelector("#entryDetailTitle"),
      entryDetailSubtitle: document.querySelector("#entryDetailSubtitle"),
      entryDetailBody: document.querySelector("#entryDetailBody"),
      entryDetailClose: document.querySelector("#entryDetailClose")
    };

    let allSessions = [];
    let allProjects = [];
    let catalogProfiles = [];
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
      el.statusLine.className = "topBarStatus" + (mode ? " " + mode : "");
    }

    function setTab(tab) {
      const homeActive = tab === "home";
      const memoryActive = tab === "memory";
      const standardsActive = tab === "standards";
      el.homeTab.classList.toggle("active", homeActive);
      el.workUnitsTab.classList.toggle("active", !homeActive && !memoryActive && !standardsActive);
      el.memoryTab.classList.toggle("active", memoryActive);
      el.standardsTab.classList.toggle("active", standardsActive);
      el.homePanel.hidden = !homeActive;
      el.workToolbar.hidden = homeActive;
      el.workUnitsPanel.hidden = homeActive || memoryActive || standardsActive;
      el.memoryPanel.hidden = !memoryActive;
      el.standardsPanel.hidden = !standardsActive;
      if (standardsActive) {
        loadGuidance();
      }
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
      allProjects = projects;
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

    function selectedProject() {
      const projectId = el.projectId.value.trim();
      return allProjects.find((project) => project.project_id === projectId) || null;
    }

    function replaceList(target, items, emptyText, renderItem) {
      target.replaceChildren();
      if (items.length === 0) {
        target.append(detailItem(emptyText, ""));
        return;
      }
      for (const item of items) {
        target.append(renderItem(item));
      }
    }

    function renderCatalogProfiles() {
      el.standardProfile.replaceChildren();
      replaceList(
        el.catalogList,
        catalogProfiles,
        "No catalog profiles are available.",
        (profile) =>
          detailItem(
            profile.profile_ref,
            profile.label + " / " + profile.description + " / " + profile.file_count + " files / " + profile.rule_count + " rules"
          )
      );
      for (const profile of catalogProfiles) {
        const option = document.createElement("option");
        option.value = profile.profile_ref;
        option.textContent = profile.label + " (" + profile.profile_ref + ")";
        el.standardProfile.append(option);
      }
      refreshStandardProfileSelection();
    }

    function refreshStandardProfileSelection() {
      const project = selectedProject();
      const profileRef = project?.standard_profile_ref || "";
      if (profileRef && catalogProfiles.some((profile) => profile.profile_ref === profileRef)) {
        el.standardProfile.value = profileRef;
      } else if (catalogProfiles.length > 0) {
        el.standardProfile.value = catalogProfiles[0].profile_ref;
      }
    }

    async function loadCatalog() {
      try {
        el.standardStatus.textContent = "Loading catalog...";
        const data = await api("/v1/ruleset-catalog/profiles");
        catalogProfiles = data.profiles;
        renderCatalogProfiles();
        el.standardStatus.textContent = catalogProfiles.length + " profiles available";
      } catch (error) {
        catalogProfiles = [];
        renderCatalogProfiles();
        el.standardStatus.textContent = error.message;
      }
    }

    function renderGuidance(guidance) {
      replaceList(
        el.standardSummary,
        [
          {
            title: guidance.summary,
            meta:
              "action:" + guidance.recommended_action
              + " / profile:" + (guidance.selected_profile_ref || "none")
              + " / source:" + (guidance.guidance_version.catalog_source_url || "local catalog")
          }
        ],
        "No guidance available.",
        (item) => detailItem(item.title, item.meta)
      );
      replaceList(
        el.requiredFiles,
        [...guidance.required_files, ...guidance.recommended_files],
        "No files are defined for this profile yet.",
        (file) => detailItem(file.target, (file.required ? "required" : "recommended") + " / source:" + file.source)
      );
      replaceList(
        el.driftFiles,
        guidance.drift,
        "No drift data. Assign a standard profile or run the client check.",
        (file) => detailItem(file.target + ": " + file.status, "expected:" + file.expected_sha256 + " / actual:" + (file.actual_sha256 || "none"))
      );
      el.standardStatus.textContent = guidance.recommended_action + " / " + (guidance.selected_profile_ref || "no profile");
      refreshStandardProfileSelection();
    }

    async function loadGuidance() {
      if (!el.projectId.value) {
        return;
      }
      try {
        el.standardStatus.textContent = "Checking guidance...";
        const guidance = await api("/v1/guidance/check", {
          method: "POST",
          body: { project_id: selectedProjectId() }
        });
        renderGuidance(guidance);
      } catch (error) {
        el.standardStatus.textContent = error.message;
      }
    }

    async function assignStandardProfile() {
      const profileRef = el.standardProfile.value;
      if (!profileRef) {
        el.standardStatus.textContent = "Select a profile first.";
        return;
      }
      try {
        el.standardStatus.textContent = "Assigning " + profileRef + "...";
        const data = await api("/v1/projects/" + encodeURIComponent(selectedProjectId()) + "/standard-profile", {
          method: "PUT",
          body: { standard_profile_ref: profileRef }
        });
        allProjects = allProjects.map((project) =>
          project.project_id === data.project.project_id ? data.project : project
        );
        await loadGuidance();
      } catch (error) {
        el.standardStatus.textContent = error.message;
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
          card.tabIndex = 0;
          card.title = "Open full entry details";
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
          card.addEventListener("click", () => showEntryDetail(entry, "memory search"));
          card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              showEntryDetail(entry, "memory search");
            }
          });
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

    function appendLinkList(parent, title, links) {
      const section = document.createElement("section");
      section.className = "detail-section";
      const heading = document.createElement("h2");
      heading.textContent = title;
      section.append(heading);
      const list = document.createElement("div");
      list.className = "detail-list";
      if (!links || links.length === 0) {
        list.append(detailItem("None", ""));
      } else {
        for (const link of links) {
          const isUrl = /^https?:\\/\\//.test(link.target);
          const item = document.createElement(isUrl ? "a" : "div");
          item.className = "detail-item";
          if (isUrl) {
            item.href = link.target;
            item.target = "_blank";
            item.rel = "noreferrer";
          }
          item.textContent = link.label || link.target;
          if (link.kind) {
            appendText(item, "detail-item-meta", link.kind + " / " + link.target);
          }
          list.append(item);
        }
      }
      section.append(list);
      parent.append(section);
    }

    function hideEntryDetail() {
      el.entryDetailOverlay.hidden = true;
      el.entryDetailBody.replaceChildren();
    }

    function showEntryDetail(entry, sourceLabel) {
      el.entryDetailTitle.textContent = entry.summary;
      el.entryDetailSubtitle.textContent =
        entry.entry_type + " / " + entry.project_id + " / " + entry.branch + " / " + formatDate(entry.timestamp)
        + (sourceLabel ? " / " + sourceLabel : "");
      el.entryDetailBody.replaceChildren();

      const meta = document.createElement("section");
      meta.className = "detail-section";
      const metaHeading = document.createElement("h2");
      metaHeading.textContent = "Metadata";
      meta.append(metaHeading);
      const grid = document.createElement("div");
      grid.className = "entry-detail-grid";
      grid.append(detailItem("Entry ID", entry.entry_id));
      grid.append(detailItem("Session ID", entry.session_id));
      grid.append(detailItem("Author", entry.author_id + " / " + entry.author_type + " / " + entry.source));
      grid.append(detailItem("Importance", entry.importance + " / " + entry.visibility));
      grid.append(detailItem("Feature", entry.feature || "None"));
      grid.append(detailItem("Category", entry.category || "None"));
      grid.append(detailItem("Lifecycle", entry.lifecycle_state || "None"));
      grid.append(detailItem("Updated", formatDate(entry.updated_at)));
      meta.append(grid);
      el.entryDetailBody.append(meta);

      const details = document.createElement("section");
      details.className = "detail-section";
      const detailsHeading = document.createElement("h2");
      detailsHeading.textContent = "Details";
      details.append(detailsHeading);
      const text = document.createElement("pre");
      text.className = "entry-detail-text";
      text.textContent = entry.details || entry.summary;
      details.append(text);
      el.entryDetailBody.append(details);

      const tags = document.createElement("section");
      tags.className = "detail-section";
      const tagsHeading = document.createElement("h2");
      tagsHeading.textContent = "Tags And Relations";
      tags.append(tagsHeading);
      const tagRow = document.createElement("div");
      tagRow.className = "tag-row";
      const values = [
        ...(entry.tags || []),
        ...(entry.related_rule_ids || []).map((ruleId) => "rule:" + ruleId),
        ...(entry.related_entry_ids || []).map((entryId) => "entry:" + entryId)
      ];
      if (values.length === 0) {
        tagRow.append(detailItem("None", ""));
      } else {
        for (const value of values) {
          const pill = document.createElement("span");
          pill.className = "tag-pill";
          pill.textContent = value;
          tagRow.append(pill);
        }
      }
      tags.append(tagRow);
      el.entryDetailBody.append(tags);

      appendLinkList(el.entryDetailBody, "Links", entry.links);
      appendLinkList(el.entryDetailBody, "Artifacts", entry.artifacts);
      el.entryDetailOverlay.hidden = false;
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

    function entryDetailItem(entry, sourceLabel) {
      const item = detailItem(entry.summary, entry.entry_type + " / " + formatDate(entry.timestamp));
      item.classList.add("clickable");
      item.tabIndex = 0;
      item.title = "Open full entry details";
      item.addEventListener("click", () => showEntryDetail(entry, sourceLabel));
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showEntryDetail(entry, sourceLabel);
        }
      });
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
          entry,
          sourceLabel: "work unit closeout / " + group.entry_type
        }))
      );
      left.append(
        detailSection("Entries", entryItems, "No entries recorded for this work unit.", (entry) =>
          entryDetailItem(entry.entry, entry.sourceLabel)
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
      await loadCatalog();
      el.entryType.value = storedValue(ENTRY_TYPE_KEY);
      el.entryTag.value = storedValue(ENTRY_TAG_KEY);
      el.entryQuery.value = storedValue(ENTRY_QUERY_KEY);
      await loadFeatures();
      await loadSessions();
      await loadGuidance();
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
    el.homeTab.addEventListener("click", () => setTab("home"));
    el.workUnitsTab.addEventListener("click", () => setTab("workUnits"));
    el.memoryTab.addEventListener("click", () => setTab("memory"));
    el.standardsTab.addEventListener("click", () => setTab("standards"));
    el.refresh.addEventListener("click", loadSessions);
    el.clearBranch.addEventListener("click", () => {
      el.branch.value = "";
      storeValue(BRANCH_KEY, "");
      renderSessions(filteredSessions());
      setStatus(filteredSessions().length + " of " + allSessions.length + " work units shown.", "ok");
      searchEntries();
    });
    el.projectId.addEventListener("change", async () => {
      refreshStandardProfileSelection();
      await loadFeatures();
      await loadSessions();
      await loadGuidance();
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
    el.standardApply.addEventListener("click", assignStandardProfile);
    el.standardRefresh.addEventListener("click", loadGuidance);
    el.entryDetailClose.addEventListener("click", hideEntryDetail);
    el.entryDetailOverlay.addEventListener("click", (event) => {
      if (event.target === el.entryDetailOverlay) {
        hideEntryDetail();
      }
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !el.entryDetailOverlay.hidden) {
        hideEntryDetail();
      }
    });
    el.entryType.addEventListener("change", searchEntries);
    el.entryFeature.addEventListener("change", searchEntries);
    el.entryTag.addEventListener("change", searchEntries);
    el.entryQuery.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        searchEntries();
      }
    });

    setTheme(storedValue(THEME_KEY) === "light" ? "light" : "dark");
    setTab("home");
    loadProjects().catch((error) => {
      renderSessions([]);
      setStatus(error.message, "error");
    });
  </script>
</body>
</html>`;
}
