import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const SOURCE_API_BASE_URL = trimTrailingSlash(
  process.env.HIVEMIND_DEMO_SOURCE_API_URL || "http://192.168.88.54:4010"
);
const SNAPSHOT_PATH = resolve(
  process.env.HIVEMIND_DEMO_SNAPSHOT || join(repoRoot, "bootstrap", "demo-hivemind-state.tar.gz")
);
const WORK_ROOT = resolve(
  process.env.HIVEMIND_DEMO_BUILD_ROOT || (await mkdtemp(join(tmpdir(), "hivemind-demo-refresh-")))
);
const SOURCE_DAY_CUTOFF = new Date();
SOURCE_DAY_CUTOFF.setUTCHours(0, 0, 0, 0);
const SOURCE_CUTOFF_ISO = process.env.HIVEMIND_DEMO_SOURCE_CUTOFF || SOURCE_DAY_CUTOFF.toISOString();

const PROJECT_CONFIGS = [
  {
    sourceId: "hivemind",
    targetId: "hivemind",
    targetName: "HiveMind",
    targetRepoSlug: "sepa79/HiveMind",
    targetRepoUrl: "https://github.com/sepa79/HiveMind.git",
    targetRootPath: "/workspace/hivemind",
    targetDescription: "Shared project memory service for agent and team development context.",
    maxSessions: 12,
    maxEntries: 40,
    maxRuleChecks: 80,
    featureAliases: {}
  },
  {
    sourceId: "hivemap",
    targetId: "hivemap",
    targetName: "HiveMap",
    targetRepoSlug: "fredflintstone/HiveMap",
    targetRepoUrl: "https://github.com/fredflintstone/HiveMap.git",
    targetRootPath: "/workspace/HiveMap",
    targetDescription: "Structured concept-map workspace for research, graph exploration, and projection tools.",
    maxSessions: 8,
    maxEntries: 24,
    maxRuleChecks: 0,
    featureAliases: {}
  },
  {
    sourceId: "hiveforge",
    targetId: "hiveforge",
    targetName: "HiveForge",
    targetRepoSlug: "fredflintstone/HiveForge",
    targetRepoUrl: "https://github.com/fredflintstone/HiveForge.git",
    targetRootPath: "/workspace/HiveForge",
    targetDescription: "Deployment control plane for Docker and Swarm environments.",
    maxSessions: 8,
    maxEntries: 24,
    maxRuleChecks: 0,
    featureAliases: {}
  },
  {
    sourceId: "bootstrap",
    targetId: "bootstrap",
    targetName: "Bootstrap",
    targetRepoSlug: "fredflintstone/bootstrap",
    targetRepoUrl: "https://github.com/fredflintstone/bootstrap.git",
    targetRootPath: "/workspace/bootstrap",
    targetDescription: "Workshop repository for a desktop and web control surface with operator workflows.",
    maxSessions: 8,
    maxEntries: 24,
    maxRuleChecks: 120,
    featureAliases: {}
  }
];

const HUMAN_ALIASES = [
  "fred-flintstone",
  "barney-rubble",
  "wilma-flintstone",
  "betty-rubble",
  "pebbles-flintstone",
  "bam-bam-rubble",
  "mr-slate",
  "dino-handler"
];

const AGENT_ALIASES = [
  "quarry-agent",
  "bedrock-agent",
  "slate-bot",
  "fossil-bot",
  "cobble-scribe",
  "granite-reviewer"
];

const STATIC_TEXT_REPLACEMENTS = [
  ["sepa79", "fredflintstone"],
  ["Sepa", "Fred"],
  ["sepa", "fred"],
  ["instytut.kielbasaempire.com", "portal.bedrock.example"],
  ["kielbasaempire.com", "bedrock.example"]
];

const EXACT_TEXT_TRANSLATIONS = new Map([
  [
    "Naprawić wszystkie findings z pełnego review zmian admin/canonical ID",
    "Fix all findings from the full review of the admin/canonical ID changes"
  ],
  [
    "Ustalić architekturę rozdzielenia ról user/admin dla zdalnego HTTP MCP",
    "Define the user/admin role split architecture for remote HTTP MCP"
  ],
  [
    "Zweryfikować uproszczony model uwierzytelnienia tylko dla operacji admin MCP",
    "Validate the simplified authentication model only for admin MCP operations"
  ],
  [
    "Zaimplementować Bearer auth wyłącznie dla admin_* na zdalnym HTTP MCP",
    "Implement Bearer auth only for admin_* on remote HTTP MCP"
  ],
  [
    "Review całego aktualnego diffu po naprawach admin delete/merge, canonical ID, auth i HiveForge",
    "Review the entire current diff after the admin delete/merge, canonical ID, auth, and HiveForge fixes"
  ],
  [
    "Pełny review wszystkich lokalnych zmian względem HEAD",
    "Full review of all local changes against HEAD"
  ],
  [
    "Ustalić prostą strategię naprawy współbieżności i atomowości admin merge/delete bez distributed locków",
    "Define a simple strategy to fix admin merge/delete concurrency and atomicity without distributed locks"
  ],
  [
    "Naprawić case-insensitive obsługę schematu Bearer w autoryzacji admin API",
    "Fix case-insensitive handling of the Bearer scheme in admin API authorization"
  ],
  [
    "Doprecyzować bezpieczny zdalny dostęp do administracyjnych API i narzędzi MCP",
    "Clarify safe remote access to administrative APIs and MCP tools"
  ],
  [
    "Zaimplementować P1: konflikt przy kolizji canonical project ID oraz wyłączyć automatyczne retry delete/merge",
    "Implement P1: reject canonical project ID collisions and disable automatic delete/merge retries"
  ],
  [
    "Rekomendacja napraw trzech P1: odciąć admin tools od publicznego HTTP MCP, odrzucać kolizje canonical project ID i wyłączyć retry destrukcyjnych operacji",
    "Recommendation for three P1 fixes: remove admin tools from the public HTTP MCP, reject canonical project ID collisions, and disable retries for destructive operations"
  ],
  [
    "1) Publiczna instancja HTTP MCP nie powinna rejestrować admin_memory_review/admin_project_delete/admin_project_merge ani otrzymywać HIVEMIND_ADMIN_TOKEN; admin pozostaje przez REST z Bearer lub lokalny stdio. Osobny admin MCP wymagałby własnego uwierzytelnienia/RBAC. 2) registerProject przed upsert sprawdza istniejący canonical ID: ten sam znormalizowany repository_slug może aktualizować metadata, inny zwraca 409 PROJECT_ID_REPOSITORY_CONFLICT bez mutacji. Bez automatycznych suffix/hash fallbacków. 3) deleteProject i mergeProjects ustawiają maxAttempts=1; pełna idempotencja wymaga później globalnego journalu admin operations poza danymi projektu, bo obecne rekordy giną przy delete/merge.",
    "1) The public HTTP MCP instance should not register admin_memory_review/admin_project_delete/admin_project_merge or receive HIVEMIND_ADMIN_TOKEN; admin access should remain via REST with Bearer auth or local stdio. A separate admin MCP would require its own authentication/RBAC. 2) Before upsert, registerProject should check the existing canonical ID: the same normalized repository_slug may update metadata, while a different one returns 409 PROJECT_ID_REPOSITORY_CONFLICT without mutation. No automatic suffix/hash fallbacks. 3) deleteProject and mergeProjects should use maxAttempts=1; full idempotency would later require a global admin-operations journal outside project data, because the current records disappear during delete/merge."
  ],
  [
    "Naprawiono kolizje canonical project ID i automatyczne retry destrukcyjnych operacji MCP",
    "Fixed canonical project ID collisions and automatic retries for destructive MCP operations"
  ],
  [
    "registerProject pobiera istniejący canonical project i zwraca 409 PROJECT_ID_REPOSITORY_CONFLICT przed upsertem, gdy znormalizowany repository_slug różni się od istniejącego. Ponowna rejestracja tego samego znormalizowanego sluga nadal aktualizuje metadata. MCP deleteProject i mergeProjects ustawiają maxAttempts=1 dla błędów transportowych oraz HTTP 502/503/504. Dodano testy regresyjne i dokumentację. npm test: 12 plików, 142 testy zaliczone; dodatkowy końcowy test API: 40/40; git diff --check bez błędów. P1 dotyczący publicznego HTTP MCP admin proxy pozostaje celowo poza tym zakresem.",
    "registerProject now loads the existing canonical project and returns 409 PROJECT_ID_REPOSITORY_CONFLICT before upsert when the normalized repository_slug differs from the existing one. Re-registering the same normalized slug still updates metadata. MCP deleteProject and mergeProjects now use maxAttempts=1 for transport errors and HTTP 502/503/504. Added regression tests and documentation. npm test: 12 files, 142 tests passed; additional final API test: 40/40; git diff --check clean. The P1 issue around a public HTTP MCP admin proxy intentionally remains out of scope."
  ],
  [
    "Zdalna topologia wymaga uwierzytelnionego admin MCP zamiast całkowitego usunięcia administracji z HTTP",
    "The remote topology requires an authenticated admin MCP instead of removing administration from HTTP entirely"
  ],
  [
    "Minimalny wariant dla jednego poziomu zaufania: zabezpieczyć cały HTTP MCP osobnym przychodzącym Bearer tokenem; uwierzytelnieni klienci zachowują admin_* tools. HIVEMIND_MCP_ACCESS_TOKEN powinien być oddzielny od wychodzącego HIVEMIND_ADMIN_TOKEN używanego MCP->API. Jeśli zwykli użytkownicy MCP nie mogą być adminami, uruchomić jawnie dwie instancje/role: standard MCP bez admin_* oraz admin MCP z incoming auth i tokenem API. Samo wyłączenie admin_* na jedynym zdalnym MCP nie spełnia potrzeb operacyjnych.",
    "The minimum option for a single trust level is to secure the entire HTTP MCP with a separate incoming Bearer token; authenticated clients keep admin_* tools. HIVEMIND_MCP_ACCESS_TOKEN should be separate from the outgoing HIVEMIND_ADMIN_TOKEN used for MCP->API calls. If regular MCP users cannot be admins, explicitly run two instances/roles: a standard MCP without admin_* and an admin MCP with incoming auth and the API token. Simply disabling admin_* on the only remote MCP does not satisfy operational needs."
  ],
  [
    "Zdalny HTTP MCP musi rozróżniać role user i admin",
    "Remote HTTP MCP must distinguish between user and admin roles"
  ],
  [
    "Rekomendowana granica bezpieczeństwa to dwie jawne instancje MCP. User MCP rejestruje wyłącznie zwykłe narzędzia, uwierzytelnia klientów tokenem user i nie otrzymuje HIVEMIND_ADMIN_TOKEN. Admin MCP uwierzytelnia klientów osobnym tokenem admin, rejestruje admin_* (oraz opcjonalnie zwykłe tools) i jako jedyny otrzymuje HIVEMIND_ADMIN_TOKEN do API. Oddzielne procesy/kontenery zapobiegają użyciu sekretu API przez publiczną ścieżkę user nawet przy błędzie routingu. Rola user oznacza normalną pracę projektową, nie read-only.",
    "The recommended security boundary is two explicit MCP instances. User MCP registers only standard tools, authenticates clients with a user token, and does not receive HIVEMIND_ADMIN_TOKEN. Admin MCP authenticates clients with a separate admin token, registers admin_* (and optionally standard tools), and is the only instance that receives HIVEMIND_ADMIN_TOKEN for the API. Separate processes/containers prevent the API secret from being usable through the public user path even if routing is misconfigured. The user role means normal project work, not read-only."
  ],
  [
    "HTTP MCP pozostaje publiczny dla user tools, a Bearer auth obowiązuje wyłącznie admin_*",
    "HTTP MCP remains public for user tools, and Bearer auth applies only to admin_*"
  ],
  [
    "Nie wprowadzamy HIVEMIND_MCP_USER_TOKEN. HTTP odczytuje opcjonalny Authorization Bearer i po poprawnym sprawdzeniu osobnego HIVEMIND_MCP_ADMIN_TOKEN ustawia authInfo ze scope admin. Callbacki admin_memory_review, admin_project_delete i admin_project_merge wymagają scope admin; pozostałe tools działają bez tokenu. Token nie jest argumentem narzędzia ani częścią logów. Wychodzący HIVEMIND_ADMIN_TOKEN MCP->API pozostaje osobnym sekretem. Nieautoryzowani użytkownicy mogą widzieć nazwy admin tools w tools/list, ale ich wywołania są odrzucane.",
    "We are not introducing HIVEMIND_MCP_USER_TOKEN. HTTP reads an optional Authorization Bearer token and, after validating a separate HIVEMIND_MCP_ADMIN_TOKEN, sets authInfo with admin scope. The admin_memory_review, admin_project_delete, and admin_project_merge callbacks require admin scope; all other tools work without a token. The token is not a tool argument or part of logs. The outgoing HIVEMIND_ADMIN_TOKEN for MCP->API remains a separate secret. Unauthorized users may see admin tool names in tools/list, but their calls are rejected."
  ],
  [
    "Zabezpieczono admin_* na Streamable HTTP MCP osobnym Bearer tokenem",
    "Secured admin_* on Streamable HTTP MCP with a separate Bearer token"
  ],
  [
    "HTTP MCP pozostawia zwykłe tools bez uwierzytelnienia. Opcjonalny nagłówek Authorization jest porównywany stałoczasowo z osobnym HIVEMIND_MCP_ADMIN_TOKEN; tylko poprawny token nadaje scope admin. Callbacki admin_memory_review, admin_project_delete i admin_project_merge wymagają tego scope i bez niego zwracają MCP UNAUTHORIZED przed wywołaniem API. Stdio pozostaje zaufanym transportem i zachowuje dotychczasowe zachowanie. Nie ma fallbacku między HIVEMIND_MCP_ADMIN_TOKEN i wychodzącym HIVEMIND_ADMIN_TOKEN. Dodano moduł/testy auth, Compose, dokumentację i plik do paczki npm. npm test: 13 plików, 148 testów zaliczonych; npm pack --dry-run zawiera admin-auth.mjs; docker compose config --quiet i git diff --check przechodzą.",
    "HTTP MCP leaves standard tools unauthenticated. The optional Authorization header is compared in constant time with a separate HIVEMIND_MCP_ADMIN_TOKEN; only the correct token grants admin scope. The admin_memory_review, admin_project_delete, and admin_project_merge callbacks require that scope and return MCP UNAUTHORIZED before any API call when it is missing. Stdio remains a trusted transport and keeps the existing behavior. There is no fallback between HIVEMIND_MCP_ADMIN_TOKEN and the outgoing HIVEMIND_ADMIN_TOKEN. Added the auth module/tests, Compose wiring, documentation, and the file to the npm package. npm test: 13 files, 148 tests passed; npm pack --dry-run includes admin-auth.mjs; docker compose config --quiet and git diff --check pass."
  ],
  [
    "Pełny review wykrył cztery blokujące problemy integralności/deploymentu i błąd normalizacji sluga",
    "The full review found four blocking integrity/deployment issues and a slug-normalization bug"
  ],
  [
    "P1: FS delete/merge używa surowych slashowych project_id jako zagnieżdżonych katalogów i rmSync recursive; delete org usuwa też org/legacy, a merge org -> org/repo zwraca sukces, ale usuwa target. P1: delete/merge nie blokują równoległych zapisów; potwierdzono append zakończony po delete, który odtworzył orphan entries.jsonl bez project.json; merge analogicznie może zgubić wpis po fazie kopiowania. P1: guard canonical ID jest TOCTOU (service getProject, potem osobny upsert); Promise.all rejestracji one/shared i two/shared zakończył oba sukcesem i pozostawił dane drugiego. P1: HiveForge renderowany Compose nie przekazuje HIVEMIND_ADMIN_TOKEN ani HIVEMIND_MCP_ADMIN_TOKEN i nie utrwala data root; admin MCP w docelowym deploymencie jest niedostępny, a auto-token API zmienia się wraz z kontenerem. P2: normalizeRepositorySlug usuwa .git przed końcowym slash, więc org/shared.git/ daje shared.git, a org/shared daje shared i tworzy duplikaty. Test suite nadal przechodzi 148/148; auth HTTP sprawdzony ręcznie: bez tokenu UNAUTHORIZED, z tokenem dochodzi do API.",
    "P1: FS delete/merge uses raw slash-based project_id values as nested directories and rmSync recursive; deleting org also removes org/legacy, and merging org -> org/repo reports success but deletes the target. P1: delete/merge do not block concurrent writes; we confirmed an append completing after delete that recreated an orphan entries.jsonl without project.json, and merge can analogously lose an entry after the copy phase. P1: the canonical ID guard is TOCTOU (service getProject, then a separate upsert); Promise.all registration of one/shared and two/shared succeeded for both and left the second project's data behind. P1: the rendered HiveForge Compose file does not pass HIVEMIND_ADMIN_TOKEN or HIVEMIND_MCP_ADMIN_TOKEN and does not persist the data root; admin MCP is unavailable in the target deployment, and the auto-generated API token changes with each container. P2: normalizeRepositorySlug strips .git before the trailing slash, so org/shared.git/ yields shared.git while org/shared yields shared, creating duplicates. The test suite still passes 148/148; HTTP auth was verified manually: without a token it returns UNAUTHORIZED, with a token it reaches the API."
  ],
  [
    "Domknięto wszystkie ustalenia z review dotyczące admin delete/merge, kanonizacji i wdrożeń.",
    "Closed all review findings for admin delete/merge, canonicalization, and deployments."
  ],
  [
    "Wprowadzono SSOT normalizacji repository_slug oraz atomowy konflikt canonical project id; ochronę legacy zagnieżdżonych projektów FS; fair shared/exclusive gate dla destrukcyjnych operacji; brak retry delete/merge; jawne rozstrzyganie standard_profile_ref; osobny token admin dla HTTP MCP i token API; obsługę plików sekretów oraz wiring HiveForge. Weryfikacja: 15 plików testowych, 163 testy zielone; git diff --check; Ansible syntax-check deploy/update/upgrade; docker compose config; npm pack --dry-run.",
    "Implemented an SSOT for repository_slug normalization and an atomic canonical project ID conflict; protection for legacy nested FS projects; a fair shared/exclusive gate for destructive operations; no delete/merge retries; explicit standard_profile_ref resolution; a separate admin token for HTTP MCP and the API token; support for secret files; and HiveForge wiring. Verification: 15 test files, 163 tests passing; git diff --check; Ansible syntax-check for deploy/update/upgrade; docker compose config; npm pack --dry-run."
  ],
  [
    "Review wykrył resztkowe problemy z globalną współbieżnością, atomowością admin mutations i parsowaniem Bearer.",
    "The review found residual issues with global concurrency, admin-mutation atomicity, and Bearer parsing."
  ],
  [
    "RequestOperationGate jest per createApp, więc druga instancja API omija blokadę; reprodukcja na wspólnym FS: delete=200 i równoległy append=201, po czym katalog projektu został odtworzony bez project.json. Merge/delete mutują wiele rekordów bez transakcji lub trwałego stanu operacji, więc błąd po zapisaniu target metadata pozostawia częściowo scalony projekt; retry prefer_source może następnie zostać odrzucony jako resolution_not_required. API sprawdza auth scheme przez case-sensitive startsWith('Bearer '), mimo że schemat HTTP jest case-insensitive i MCP używa regex /i.",
    "RequestOperationGate is scoped per createApp, so a second API instance bypasses the gate; reproduced on a shared FS with delete=200 and a concurrent append=201, after which the project directory was recreated without project.json. Merge/delete mutate multiple records without a transaction or durable operation state, so an error after writing target metadata leaves a partially merged project; a retry with prefer_source may then be rejected as resolution_not_required. The API checks the auth scheme with case-sensitive startsWith('Bearer '), even though the HTTP scheme is case-insensitive and MCP uses a /i regex."
  ],
  [
    "KISS: wspieramy jeden proces API na data root/index prefix, a merge/delete robimy monotoniczne i wznawialne zamiast transakcyjne.",
    "KISS: support one API process per data root/index prefix, and make merge/delete monotonic and resumable rather than transactional."
  ],
  [
    "Bez koordynacji storage nie da się zapewnić bezpieczeństwa wielu writerów. Wspierana topologia powinna jawnie wymuszać replicas=1 i stop-first; istniejący RequestOperationGate chroni wtedy wszystkie żądania. Merge powinien najpierw walidować, następnie kopiować/upsertować rekordy idempotentnie, dopiero na końcu publikować metadata/ruleset targetu i usuwać source. Ponowienie tego samego merge musi akceptować redundantne standard_profile_resolution i identyczne już skopiowane rekordy. Delete/OpenSearch zachowuje project document do końca, dzięki czemu częściowe sprzątanie można jawnie ponowić. Prawdziwe HA/multi-writer pozostaje osobnym przyszłym zakresem wymagającym CAS/lease/lock.",
    "Without storage-level coordination, multi-writer safety cannot be guaranteed. The supported topology should explicitly enforce replicas=1 and stop-first; the existing RequestOperationGate then protects all requests. Merge should validate first, then copy/upsert records idempotently, and only publish target metadata/ruleset and delete the source at the end. Retrying the same merge must accept redundant standard_profile_resolution values and records that were already copied identically. Delete/OpenSearch keeps the project document until the end so partial cleanup can be retried explicitly. True HA/multi-writer support remains a separate future scope that would require CAS/lease/lock."
  ],
  [
    "Wdrożono single-writer deployment oraz monotoniczne, wznawialne admin merge/delete.",
    "Implemented single-writer deployment and monotonic, resumable admin merge/delete."
  ],
  [
    "Bazowy Compose i HiveForge ustawiają hivemind-api replicas=1; Swarm używa update_config order=stop-first. FS i OpenSearch przenoszą dane przed publikacją rulesetu/metadanych targetu, a source jest usuwany na końcu. Redundantne standard_profile_resolution jest akceptowane, jeśli daje już opublikowany profil. Dodano testy przerwanego merge i delete OpenSearch, retry profilu, kolejności publikacji FS oraz deployment contract. Weryfikacja: 15 plików testowych, 168 testów zielonych; docker compose config; render docker-single i swarm; docker stack config; trzy Ansible syntax-check; git diff --check.",
    "The base Compose file and HiveForge set hivemind-api replicas=1; Swarm uses update_config order=stop-first. FS and OpenSearch move data before publishing the target ruleset/metadata, and the source is removed at the end. Redundant standard_profile_resolution is accepted if it produces the already published profile. Added tests for interrupted merge and OpenSearch delete, profile retry, FS publication order, and the deployment contract. Verification: 15 test files, 168 tests passing; docker compose config; rendered docker-single and swarm configs; docker stack config; three Ansible syntax-checks; git diff --check."
  ],
  [
    "Naprawiono case-insensitive parsowanie schematu Bearer w admin API.",
    "Fixed case-insensitive parsing of the Bearer scheme in the admin API."
  ],
  [
    "adminAuthorizationMatches używa teraz kotwiczonego regexu z flagą i, spójnego z MCP. Testy potwierdzają Bearer, bearer i BEARER oraz zachowują odrzucanie brakujących/błędnych danych. Pełny zestaw: 15 plików, 168 testów zielonych; git diff --check.",
    "adminAuthorizationMatches now uses an anchored regex with the i flag, consistent with MCP. Tests confirm Bearer, bearer, and BEARER while preserving rejection of missing or invalid data. Full suite: 15 files, 168 tests passing; git diff --check."
  ]
]);

const projectRecords = await fetchJson("/v1/projects").then((data) => data.projects);
const projectById = new Map(projectRecords.map((project) => [project.project_id, project]));

const idMaps = {
  sessions: new Map(),
  entries: new Map(),
  ruleChecks: new Map()
};
const authorAliases = new Map();
const agentAliases = new Map();

const snapshotRoot = join(WORK_ROOT, "snapshot-root");
await rm(snapshotRoot, { recursive: true, force: true });
await mkdir(snapshotRoot, { recursive: true });

for (const config of PROJECT_CONFIGS) {
  const sourceProject = projectById.get(config.sourceId);
  if (!sourceProject) {
    throw new Error(`Source project '${config.sourceId}' was not found at ${SOURCE_API_BASE_URL}.`);
  }

  const [rulesetData, sessionsData, entriesData, ruleChecksData] = await Promise.all([
    fetchJson(`/v1/projects/${encodeURIComponent(config.sourceId)}/ruleset`),
    fetchJson(`/v1/projects/${encodeURIComponent(config.sourceId)}/sessions?limit=80`),
    fetchJson("/v1/entries/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project_id: config.sourceId,
        limit: 200,
        sort: "recent"
      })
    }),
    fetchJson(`/v1/projects/${encodeURIComponent(config.sourceId)}/rule-checks`)
  ]);

  const sessionsById = new Map(
    sessionsData.sessions
      .filter((session) => session.started_at < SOURCE_CUTOFF_ISO)
      .map((session) => [session.session_id, session])
  );

  const eligibleEntries = entriesData.entries
    .filter((entry) => entry.timestamp < SOURCE_CUTOFF_ISO)
    .slice(0, config.maxEntries)
    .sort(compareByTimestampAscending);
  const entrySessionIds = uniqueValues(eligibleEntries.map((entry) => entry.session_id));

  const recentRuleChecks = ruleChecksData.rule_checks
    .filter((ruleCheck) => ruleCheck.timestamp < SOURCE_CUTOFF_ISO)
    .sort(compareByTimestampAscending)
    .slice(-Math.max(config.maxRuleChecks, 0));
  const ruleCheckSessionIds = uniqueValues(recentRuleChecks.map((ruleCheck) => ruleCheck.session_id));

  const eligibleSessions = [];
  for (const sessionId of [...entrySessionIds, ...ruleCheckSessionIds]) {
    const session = sessionsById.get(sessionId);
    if (session && eligibleSessions.length < config.maxSessions) {
      eligibleSessions.push(session);
      sessionsById.delete(sessionId);
    }
  }
  for (const session of sessionsData.sessions) {
    if (eligibleSessions.length >= config.maxSessions) {
      break;
    }
    if (session.started_at >= SOURCE_CUTOFF_ISO) {
      continue;
    }
    if (!sessionsById.has(session.session_id)) {
      continue;
    }
    eligibleSessions.push(session);
    sessionsById.delete(session.session_id);
  }
  const sessionIds = new Set(eligibleSessions.map((session) => session.session_id));
  const filteredEntries = eligibleEntries.filter((entry) => sessionIds.has(entry.session_id));
  const entryIds = new Set(filteredEntries.map((entry) => entry.entry_id));
  const eligibleRuleChecks = recentRuleChecks.filter((ruleCheck) => sessionIds.has(ruleCheck.session_id));

  const sanitizedProject = sanitizeProjectRecord(sourceProject, rulesetData.ruleset, config);
  const sanitizedRuleset = sanitizeRuleset(rulesetData.ruleset, config);
  const sanitizedSessions = eligibleSessions.map((session) => sanitizeSession(session, config));
  const sanitizedEntries = filteredEntries.map((entry) => sanitizeEntry(entry, config, entryIds));
  const sanitizedRuleChecks = eligibleRuleChecks.map((ruleCheck) => sanitizeRuleCheck(ruleCheck, config));

  await writeProjectDataset({
    root: snapshotRoot,
    project: sanitizedProject,
    ruleset: sanitizedRuleset,
    sessions: sanitizedSessions,
    entries: sanitizedEntries,
    ruleChecks: sanitizedRuleChecks
  });
}

await createSnapshotArchive(snapshotRoot, SNAPSHOT_PATH);

console.log(
  JSON.stringify(
    {
      ok: true,
      source_api_base_url: SOURCE_API_BASE_URL,
      source_cutoff_iso: SOURCE_CUTOFF_ISO,
      snapshot_path: SNAPSHOT_PATH,
      work_root: WORK_ROOT,
      projects: PROJECT_CONFIGS.map(({ sourceId, targetId }) => ({ source_id: sourceId, target_id: targetId }))
    },
    null,
    2
  )
);

async function writeProjectDataset({ root, project, ruleset, sessions, entries, ruleChecks }) {
  const projectRoot = join(root, "projects", project.project_id);
  await mkdir(join(projectRoot, "contexts"), { recursive: true });
  await mkdir(join(projectRoot, "issues"), { recursive: true });
  await mkdir(join(projectRoot, "indexes"), { recursive: true });
  await mkdir(join(projectRoot, "sessions"), { recursive: true });

  await writeJson(join(projectRoot, "project.json"), project);
  await writeJson(join(projectRoot, "ruleset.json"), ruleset);
  await writeJsonLines(join(projectRoot, "entries.jsonl"), entries);
  await writeJsonLines(join(projectRoot, "rule-checks.jsonl"), ruleChecks);
  await writeFile(join(projectRoot, "idempotency.jsonl"), "", "utf8");

  for (const session of sessions) {
    await writeJson(join(projectRoot, "sessions", `${session.session_id}.json`), session);
  }
}

function sanitizeProjectRecord(sourceProject, sourceRuleset, config) {
  const featureMap = getFeatureMap(config, sourceProject.features ?? []);
  const now = sourceProject.updated_at;
  return {
    project_id: config.targetId,
    name: config.targetName,
    repository_url: config.targetRepoUrl,
    repository_slug: config.targetRepoSlug,
    root_path: config.targetRootPath,
    default_branch: normalizeBranch(sourceProject.default_branch, config),
    description: sanitizeScalar(config.targetDescription, config),
    features: (sourceProject.features ?? []).map((feature) => featureMap.get(feature) ?? feature),
    categories: (sourceProject.categories ?? []).map((category) => sanitizeScalar(category, config)),
    ruleset_id: `${config.targetId}:${sourceRuleset.version}`,
    standard_profile_ref: sourceProject.standard_profile_ref ?? null,
    created_at: sourceProject.created_at,
    updated_at: now
  };
}

function sanitizeRuleset(sourceRuleset, config) {
  return {
    project_id: config.targetId,
    ruleset_id: `${config.targetId}:${sourceRuleset.version}`,
    version: sourceRuleset.version,
    rules: (sourceRuleset.rules ?? []).map((rule) => ({
      ...rule,
      rule_id: sanitizeScalar(rule.rule_id, config),
      label: sanitizeScalar(rule.label, config),
      description: sanitizeScalar(rule.description, config),
      evidence_hint: rule.evidence_hint ? sanitizeScalar(rule.evidence_hint, config) : undefined,
      tags: (rule.tags ?? []).map((tag) => sanitizeScalar(tag, config))
    })),
    created_at: sourceRuleset.created_at,
    updated_at: sourceRuleset.updated_at
  };
}

function sanitizeSession(sourceSession, config) {
  return {
    session_id: mapId("sessions", sourceSession.session_id),
    project_id: config.targetId,
    branch: normalizeBranch(sourceSession.branch, config),
    workspace_path: config.targetRootPath,
    author_id: mapAuthorId(sourceSession.author_id, sourceSession.author_type),
    author_type: sourceSession.author_type,
    source: sourceSession.source,
    agent_id: sourceSession.agent_id ? mapAgentId(sourceSession.agent_id) : undefined,
    started_at: sourceSession.started_at,
    ended_at: sourceSession.ended_at,
    status: sourceSession.status,
    goal: sanitizeScalar(sourceSession.goal, config),
    plan_ref: sourceSession.plan_ref ? sanitizeStructured(sourceSession.plan_ref, config) : null,
    ruleset_version: sourceSession.ruleset_version,
    visibility: sourceSession.visibility ?? "project",
    created_at: sourceSession.created_at,
    updated_at: sourceSession.updated_at
  };
}

function sanitizeEntry(sourceEntry, config, keptEntryIds) {
  return {
    entry_id: mapId("entries", sourceEntry.entry_id),
    project_id: config.targetId,
    session_id: mapId("sessions", sourceEntry.session_id),
    branch: normalizeBranch(sourceEntry.branch, config),
    author_id: mapAuthorId(sourceEntry.author_id, sourceEntry.author_type),
    author_type: sourceEntry.author_type,
    source: sourceEntry.source,
    entry_type: sourceEntry.entry_type,
    timestamp: sourceEntry.timestamp,
    summary: sanitizeScalar(sourceEntry.summary, config),
    details: sourceEntry.details ? sanitizeScalar(sourceEntry.details, config) : undefined,
    feature: sourceEntry.feature ? mapFeature(config, sourceEntry.feature) : undefined,
    category: sourceEntry.category ? sanitizeScalar(sourceEntry.category, config) : undefined,
    tags: (sourceEntry.tags ?? []).map((tag) => sanitizeScalar(tag, config)),
    links: (sourceEntry.links ?? []).map((link) => sanitizeLinkLike(link, config)),
    artifacts: (sourceEntry.artifacts ?? []).map((artifact) => sanitizeLinkLike(artifact, config)),
    related_rule_ids: (sourceEntry.related_rule_ids ?? []).map((ruleId) => sanitizeScalar(ruleId, config)),
    related_entry_ids: (sourceEntry.related_entry_ids ?? [])
      .filter((entryId) => keptEntryIds.has(entryId))
      .map((entryId) => mapId("entries", entryId)),
    lifecycle_state: sourceEntry.lifecycle_state ?? null,
    importance: sourceEntry.importance ?? "normal",
    visibility: sourceEntry.visibility ?? "project",
    created_at: sourceEntry.created_at,
    updated_at: sourceEntry.updated_at
  };
}

function sanitizeRuleCheck(sourceRuleCheck, config) {
  return {
    rule_check_id: mapId("ruleChecks", sourceRuleCheck.rule_check_id),
    project_id: config.targetId,
    session_id: mapId("sessions", sourceRuleCheck.session_id),
    rule_id: sanitizeScalar(sourceRuleCheck.rule_id, config),
    author_id: mapAuthorId(sourceRuleCheck.author_id, sourceRuleCheck.author_type),
    author_type: sourceRuleCheck.author_type,
    source: sourceRuleCheck.source,
    timestamp: sourceRuleCheck.timestamp,
    status: sourceRuleCheck.status,
    evidence: sourceRuleCheck.evidence ? sanitizeScalar(sourceRuleCheck.evidence, config) : undefined,
    note: sourceRuleCheck.note ? sanitizeScalar(sourceRuleCheck.note, config) : undefined,
    links: (sourceRuleCheck.links ?? []).map((link) => sanitizeLinkLike(link, config)),
    visibility: sourceRuleCheck.visibility ?? "project"
  };
}

function sanitizeLinkLike(value, config) {
  const sanitized = sanitizeStructured(value, config);
  if (sanitized?.kind === "commit") {
    sanitized.target = `demo-commit-${createStableSuffix(String(value.target))}`;
  }
  return sanitized;
}

function sanitizeStructured(value, config) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeStructured(item, config));
  }
  if (!value || typeof value !== "object") {
    return typeof value === "string" ? sanitizeScalar(value, config) : value;
  }
  const result = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (entryValue === undefined) {
      continue;
    }
    result[key] = sanitizeStructured(entryValue, config);
  }
  return result;
}

function sanitizeScalar(value, config) {
  if (typeof value !== "string") {
    return value;
  }
  let output = value;
  if (EXACT_TEXT_TRANSLATIONS.has(output)) {
    output = EXACT_TEXT_TRANSLATIONS.get(output);
  }
  for (const [source, target] of buildReplacements(config)) {
    output = output.split(source).join(target);
  }

  output = output.replace(/\b192\.168\.88\.(\d{1,3})\b/g, "198.51.100.$1");
  output = output.replace(/\b81\.77\.254\.104\b/g, "198.51.100.104");
  output = output.replace(/\/home\/sepa\/[^\s"'`)]+/g, (match) => sanitizePath(match, config));
  output = output.replace(/[A-Z]:[\\/][^\s"'`)]+/g, () => "D:/Workspace/demo-artifact");
  output = output.replace(/https?:\/\/[^\s"'`)\]]+/g, (match) => sanitizeUrlToken(match, config));

  return output;
}

function sanitizePath(pathValue, config) {
  const normalized = pathValue.replace(/\\/g, "/");
  for (const candidate of PROJECT_CONFIGS) {
    if (normalized.startsWith(candidate.targetRootPath)) {
      return normalized;
    }
    const sourceProject = projectById.get(candidate.sourceId);
    if (sourceProject?.root_path && normalized.startsWith(sourceProject.root_path.replace(/\\/g, "/"))) {
      return normalized.replace(sourceProject.root_path.replace(/\\/g, "/"), candidate.targetRootPath);
    }
  }
  return normalized.startsWith("/home/sepa/") ? "/workspace/shared" : normalized;
}

function sanitizeUrlToken(token, config) {
  const punctuation = token.match(/[),.;]+$/)?.[0] ?? "";
  const bareToken = punctuation ? token.slice(0, -punctuation.length) : token;
  try {
    const url = new URL(bareToken);
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
      return `${url.toString()}${punctuation}`;
    }
    if (url.hostname === "github.com") {
      for (const candidate of PROJECT_CONFIGS) {
        const sourceProject = projectById.get(candidate.sourceId);
        if (!sourceProject) {
          continue;
        }
        if (url.pathname.includes(sourceProject.repository_slug.replace(/^\w+\//, "/"))) {
          return `${candidate.targetRepoUrl.replace(/\.git$/i, "")}${punctuation}`;
        }
      }
      url.pathname = url.pathname.replace(/\/sepa79\//g, "/fredflintstone/");
      return `${url.toString()}${punctuation}`;
    }
    if (url.hostname === "instytut.kielbasaempire.com") {
      url.hostname = "portal.bedrock.example";
      return `${url.toString()}${punctuation}`;
    }
    url.hostname = "example.invalid";
    return `${url.toString()}${punctuation}`;
  } catch {
    return `${bareToken}${punctuation}`;
  }
}

function buildReplacements(config) {
  const sourceProject = projectById.get(config.sourceId);
  const featureMap = getFeatureMap(config, sourceProject.features ?? []);
  const replacements = [
    [sourceProject.name, config.targetName],
    [sourceProject.project_id, config.targetId],
    [sourceProject.repository_slug, config.targetRepoSlug],
    [sourceProject.repository_url, config.targetRepoUrl],
    [String(sourceProject.root_path), config.targetRootPath],
    ...STATIC_TEXT_REPLACEMENTS
  ];

  for (const [sourceFeature, targetFeature] of featureMap.entries()) {
    replacements.push([sourceFeature, targetFeature]);
  }

  for (const [rawAuthor, alias] of authorAliases.entries()) {
    replacements.push([rawAuthor, alias]);
  }
  for (const [rawAgent, alias] of agentAliases.entries()) {
    replacements.push([rawAgent, alias]);
  }

  return replacements.sort((left, right) => right[0].length - left[0].length);
}

function getFeatureMap(config, sourceFeatures) {
  if (!config._featureMap) {
    config._featureMap = new Map();
    for (const feature of sourceFeatures) {
      const alias = config.featureAliases[feature] ?? feature;
      config._featureMap.set(feature, alias);
    }
  }
  return config._featureMap;
}

function mapFeature(config, feature) {
  const featureMap = getFeatureMap(config, [feature]);
  if (!featureMap.has(feature)) {
    featureMap.set(feature, config.featureAliases[feature] ?? feature);
  }
  return featureMap.get(feature);
}

function normalizeBranch(branch, config) {
  if (!branch || branch === "main" || branch === "master") {
    return "main";
  }
  if (!config._branchMap) {
    config._branchMap = new Map();
  }
  if (!config._branchMap.has(branch)) {
    config._branchMap.set(branch, `feature/demo-${config._branchMap.size + 1}`);
  }
  return config._branchMap.get(branch);
}

function mapAuthorId(rawAuthorId, authorType) {
  if (!rawAuthorId) {
    return rawAuthorId;
  }
  if (!authorAliases.has(rawAuthorId)) {
    const pool = authorType === "human" ? HUMAN_ALIASES : HUMAN_ALIASES;
    authorAliases.set(rawAuthorId, pool[authorAliases.size % pool.length]);
  }
  return authorAliases.get(rawAuthorId);
}

function mapAgentId(rawAgentId) {
  if (!rawAgentId) {
    return rawAgentId;
  }
  if (!agentAliases.has(rawAgentId)) {
    agentAliases.set(rawAgentId, AGENT_ALIASES[agentAliases.size % AGENT_ALIASES.length]);
  }
  return agentAliases.get(rawAgentId);
}

function mapId(type, sourceId) {
  const map = idMaps[type];
  if (!map.has(sourceId)) {
    const prefix = type === "sessions" ? "sess" : type === "entries" ? "ent" : "rc";
    map.set(sourceId, `${prefix}-${createStableSuffix(`${type}:${sourceId}`)}`);
  }
  return map.get(sourceId);
}

function createStableSuffix(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

async function createSnapshotArchive(sourceRoot, targetPath) {
  await mkdir(dirname(targetPath), { recursive: true });
  await execFile("tar", ["-czf", targetPath, "-C", sourceRoot, "."], { cwd: repoRoot });
}

async function fetchJson(pathOrUrl, init = undefined) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${SOURCE_API_BASE_URL}${pathOrUrl}`;
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed for ${url}: ${response.status} ${body}`);
  }
  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(`HiveMind API returned an error for ${url}: ${JSON.stringify(payload.error)}`);
  }
  return payload.data;
}

function compareByTimestampAscending(left, right) {
  const leftTimestamp = left.timestamp ?? left.started_at ?? "";
  const rightTimestamp = right.timestamp ?? right.started_at ?? "";
  return leftTimestamp.localeCompare(rightTimestamp);
}

function uniqueValues(values) {
  return [...new Set(values)];
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeJsonLines(filePath, values) {
  const body = values.map((value) => JSON.stringify(value)).join("\n");
  await writeFile(filePath, body ? `${body}\n` : "", "utf8");
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/u, "");
}
