# HiveMap i PocketHive — przegląd pamięci HiveMind, 2026-09-07

Status: raport audytu; rekomendacje nie zostały zastosowane do historycznej pamięci. Dodano do repo HiveMind 2026-09-07. Odnośniki do `/tmp`, lokalnych workspace i plików innych projektów w treści są historyczną proweniencją; aktualny task jest podlinkowany poniżej.

To jest propozycja porządkowania, nie wykonana zmiana historycznych statusów. Zakres: 107 unikalnych learnings pozyskanych z wyszukiwania projektu i gałęzi, 85 wpisów dziennika, 6 issues oraz 32 wątki w odpowiedzi context_get_open_threads. Przejrzano inwentarz i recommended_action; wpisy wskazane do korekty porównano z późniejszymi wpisami i odpowiednimi dokumentami repo. Nie jest to ponowna akceptacja całego runtime ani weryfikacja aktualnego Swarm/GHCR/HiveForge.

107/107 learnings ma active. Cztery mają did_not_work i nadal są active. Wpisy dziennika: 43 resolved, 4 superseded, 5 open, 33 bez statusu. 32 wątki to 30 historycznych rule_checks blocked, 1 risk i 1 issue. Managed features projektu jest puste, a pozyskane learnings używają 81 różnych nazw feature.

`resolved` oznacza wykonane zadanie lub zamknięty problem. `superseded` oznacza, że aktualna porada została zastąpiona; historię zachowujemy wraz z odnośnikiem do następcy. Obowiązującej decyzji nie zamyka się tylko z powodu wieku. Przy wpisach mieszanych najpierw zachować aktualną zasadę w następcy, potem wycofać starą poradę.

## Konkretne propozycje korekt

| Pełny ID | Propozycja | Powód i następca | Dowód w repo |
|---|---|---|---|
| lrn-c0f0a0985019a5fec18046b57af266d9 | superseded — po wydzieleniu aktualnej zasady | Rekomenduje migracje schematu, sprzecznie z aktualnym zakazem. Zachować regułę własności findings w lrn-708d1b79; następcą polityki storage jest ent-4388aaab. | docs/specs/storage-format.md:46 |
| lrn-8b7c8445e513437330e557599ce42769 | superseded — po wydzieleniu aktualnej zasady | Warto zachować dowód, że testy in-memory nie zastępują PostgreSQL. Usunąć aktywne zalecenie smoke migracji; zastąpić testem odrzucenia starego schematu, czystego startu i round-trip. | docs/specs/storage-format.md:46 |
| lrn-93fd40711c7b5623369293846a909b29 | superseded | Bundlowana Ollama i plugin runtime zostały wycofane. Następca: ent-3de9edc9. Negatywny feedback nie zmienił active. | docs/adr/0002-postgres-runtime-direction.md |
| lrn-de27f2b08de3d3b5da3efd907fb1e2cd | superseded | Most importu dawnych ZIP/SQLite już nie istnieje. | docs/specs/storage-format.md:57 |
| lrn-d0dbb497b8279e13018ac5c9e91b3746 | superseded | Instrukcja eksportowania/importowania skanów i verification ZIP wskazuje nieistniejące operacje. | docs/specs/repository-scan.md:233 |
| lrn-0e75b01dec093d70ffb5fd3967297e2f | superseded | Dawny kontrakt ZIP zastąpiono odroczonym kierunkiem pełnego NDJSON. Zachować wymaganie przenoszenia ukończonych indeksów, wskazać ent-20ecb999. | docs/specs/storage-format.md:703 |
| lrn-cbc12254be282a1f05b4a53f548ab0f4 | superseded | Polecenia --db i SQLite nie są aktualnym sposobem uruchamiania. | docs/ai/COMMANDS.md:51 |
| lrn-e536d0f40bbfc2e8f2e9c256aaadec6f | superseded | Aktywne zalecenia snapshot restore/compare są poza obecnym kontraktem. Zachować historię demo. | docs/specs/storage-format.md:57 |
| lrn-2f7623e3538b2b4b99a6018e1394b24a | superseded | Dawny następny krok snapshot save/load jest wycofany; historia proposal UI zostaje. | docs/specs/storage-format.md:57 |
| lrn-d859df6c51dc3e66071322d17920e812 | superseded — zachować część produktową | Opisana główna kategoryzacja i click-to-dive-in nie odpowiadają obecnym kolumnom severity i kliknięciu wybierającemu inspector. Następcy lrn-5ce79011, lrn-a2971b31 i bieżący UI spec. | docs/specs/repository-scan.md:215 |
| lrn-9820b793c962ff622a7d892e1e7679fb | superseded — problem zamknięty inną decyzją | Nowe stany cancel/supersede były propozycją, nie przyjętą polityką. Zaimplementowano drafty, jasne coverage i jawne usuwanie każdego skanu: ent-4806c480. | docs/specs/web-workspace-ui.md:22 |
| lrn-ae811f68c15b31bbe08e7a885f48a358 | superseded — po zachowaniu wspólnej walidacji URL | Wspólny parser nadal warto zachować; opis SSH i importu jest historyczny. Aktualny kierunek: lrn-7f599460 i HTTPS-only w kontrakcie. | docs/specs/repository-indexing.md:154 |
| lrn-fdf48cf8f56c05e68637ea9c4199d549 | superseded — scalić z następcą | Wskazuje dawny WorkspaceMutationCoordinator i ZIP. Aktualny OperationCoordinator opisują lrn-b62050f2 i lrn-3680ddba. | docs/architecture.md |
| lrn-86cd89ed7e424168c4de07701047f59b | resolved — historyczny etap | Błędy kalibracji mają późniejsze dowody naprawy: lrn-8f0f1067, ent-0af3a2fb, rozwiązane ent-aaf1c8e7. Nie reklamować dawnych braków jako obecnego blokera. | packages/runtime/src/repository-boundary-map.test.ts:8 |
| lrn-98f10e861b3b4164890f2ee5e7488931 | resolved — historyczny etap | Następny krok RepositoryDependency został już wykonany; zachować dowód wprowadzenia references, używać lrn-b545eca4 jako nowszego kontekstu. | docs/specs/repository-indexing.md |
| lrn-34402a19635cd6a25a4ab48cf754c431 | resolved — historyczny etap | Dawne zadanie wprowadzenia references/dependencies jest wykonane. | docs/specs/repository-indexing.md |
| lrn-3817a064d120f5855b7b64eb02a08567 | resolved — historyczny etap | Dawny następny etap recipes/workflow został pokryty kolejnymi zmianami. Wspólny wniosek można zachować w jednym learning o jawnych recipes. | docs/design/postgres-container-hiveforge-plan.md |
| lrn-feed2dc5de09807fb21863145e35c077 | resolved — historyczny etap | Jak wyżej: historia etapu, nie aktualna kolejka zadań. | docs/design/postgres-container-hiveforge-plan.md |
| lrn-0d8c9c81cdc5703f071c02d177a76856 | resolved — historyczny etap | Jak wyżej: kolejne dokumentacyjne recipes już istnieją. | docs/design/postgres-container-hiveforge-plan.md |
| lrn-91d233bef6e922713a298f83b2d95284 | resolved — historyczny etap | Dawny proponowany krok scaffoldowania overlay ma późniejszą implementację scan_profile_overlay_suggest. | docs/ai/REPOSITORY_SCAN_WORKFLOW.md |
| lrn-6785656ffe521728bfaf8fbad34a2ca3 | resolved — historyczny etap | Budowa i review boundary map nie są już przyszłym krokiem. Historyczny etap schematu 13 nie jest aktualnym storage kontraktem. | docs/specs/repository-scan.md |
| lrn-21afd0cce7eac9684ac41ff3f428f51a | resolved — historyczny etap | Plan rozpoczęcia boundary mapping po runtime został zrealizowany; nie używać jako aktualnego planu pracy. | docs/design/postgres-container-hiveforge-plan.md |
| lrn-19ddbbda1bbed90362e129971c154103 | resolved — historyczny etap | Dawny commit jest dowodem etapu, nie obecnym baseline następnych zmian. | docs/specs/repository-indexing.md |
| lrn-ba0158dcba7edf55baaa2f159bdaa1df | superseded — instrukcja operacyjna | Import/backfill providerów zostały wycofane. Materiały benchmarku zachować jako archiwum badań. | archive/deferred-ollama-embedding-provider/README.md |
| lrn-a501a79acf7ccf051512d4a2e9c3919d | superseded — instrukcja operacyjna | Dawny brak miejsca na Ollamę dotyczył wycofanego scope; nie kierować aktualnej pracy na instalację providera. | archive/deferred-ollama-embedding-provider/README.md |

## Co trzymać

- ent-4388aaabd6d5d41d9fc3b5137d06bee1 — Postgres bez migracji.
- ent-3de9edc94689c89f8dba09452c32c186 — API/web/Postgres/indexing, bez bundlowanej Ollamy/plugin runtime.
- ent-bd91f4c3f4df04439380d6162c246504 — dokładnie jedno źródło tokena, sessionStorage.
- ent-20ecb999dff2741e0a0a428c21f664b7 — odroczone NDJSON obejmujące ukończone indeksy, repo pozostaje Git-owned.
- ent-4806c480f392df99d76214957342711b — jawne usuwanie każdego skanu. Obecne resolved dotyczy domknięcia decyzji, nie jej unieważnienia.
- lrn-708d1b79, lrn-960a6df3, lrn-8f0f1067 — własność findings, kodowanie identyfikatorów REST, kalibracja co-located tests/placeholders.
- lrn-cf3364a3, lrn-3680ddba, lrn-b62050f2 — budżet indeksowania i jawna granica jednego procesu/replica.
- lrn-b02ee5a4, lrn-9357ba2a, lrn-c388f7a8, lrn-e2cc07cd — konkretne pułapki testowania i dopasowana akceptacja.
- lrn-608cda6e, lrn-6f5b4e05 — immutable image identity i push z lease.
- POC learnings o grafie jako SSOT, feedback/intents, emergency-only manual editing i oddzielnych kategoriach: zachować uzasadnienie produktowe, bez dawnych instrukcji graph.json czy snapshot runtime.

## Pozostałe wpisy

- ent-982237af8fc285fbc681b8ec4f9171ae: zastąpić aktualnym, rozdzielonym ryzykiem release. Podpunkty dependencies i scans split mają dowody naprawy ent-c06b2aa8, ent-7cf948a2 i ent-5b514174. PR/CI/tag i produkcyjne sekrety wymagają oddzielnej aktualnej weryfikacji. Nie zamykać całego release risk na podstawie lokalnego diffu.
- 43 resolved i 4 superseded entries: zachować historię, ograniczyć obecność w domyślnym briefie. 33 wpisy bez lifecycle nie są automatycznie aktywnymi problemami: w większości to postęp, decyzje lub odnośniki do commitów.
- Historyczne blocked rule_checks zachować jako wynik danej sesji; nie przepisywać ich na applied. Bieżący widok powinien łączyć je z konkretnym issue/fix/verifikacją i nie liczyć jako wieczne otwarte zadania.
- iss-f9b4bb773ad60849379435536d65fee5: pozostawić do weryfikacji naprawy w HiveForge. Udany późniejszy deploy nie dowodzi naprawy konkretnego refresh_environment. Nie sprawdzano bieżącego statusu GitHub.
- lrn-3a725523 / lrn-154dadef: scalić historyczny incydent GHCR; zachować zasadę sprawdzenia dokładnego obrazu. Nie uznawać dostępności GHCR za naprawioną na podstawie deployu z Forgejo.
- lrn-f1dd0ad4 / lrn-b115fcb2 / lrn-322d4709: datowane fakty o środowisku i dawnych bindach; przenieść poza domyślny brief, odsyłać do COMMANDS i live deployment config. Nie kopiować dawnych ścieżek jako obecnych ustawień.
- lrn-ab2fd8f3 / lrn-ce3c756f / lrn-6a03dea5: benchmarki zachować w kontekście odroczonych embeddings. Nie reklamować modelu jako aktualnego domyślnego runtime.

## Wartość i ryzyka workflow

HiveMind pomógł w poprzednim review: odtworzył uzasadnienie aktualizacji lockfile, zakres wcześniejszego blokera modułowego i dowody akceptacji. Największą wartość mają przyczyny decyzji, konkretne awarie, odrzucone założenia, ograniczenia topologii i linki do dowodów. Dane środowiskowe oraz wyniki testów pozostają dowodami na datę i rewizję, a nie bieżącą gwarancją.

Potwierdzone problemy:

1. Sprzeczna porada o migracjach wraca w startup highlights mimo did_not_work oraz nowszej decyzji.
2. project_review zaproponował mark_resolved dla trzech nadal obowiązujących decyzji jedynie dlatego, że mają >=7 dni.
3. learning_get_recent dla nowej feature zwrócił zero, choć projekt ma istotne learnings; managed features jest puste. Zbyt wąski filtr może ukrywać wiedzę.
4. Startup summary zgłasza 0 active issues w bieżącej gałęzi, project brief zawiera issue z main; zakres liczników powinien być jawny.
5. Powtarzane rules i te same highlights w rules_get/session_start/context_open/brief zwiększają koszt kontekstu. Poprzednie review użyło 18 wywołań HiveMind, w tym 8 oddzielnych rule_check_submit.
6. Statusy żyją równolegle w entries, learnings, issues i rule_checks. Rozwiązane issue nie dezaktywuje sprzecznego learning ani historycznego blocked.
7. Opis zarejestrowanego projektu nadal mówi Throwaway POC, podczas gdy PROJECT_CONTEXT opisuje bieżący runtime 1.0/alpha.

Proponowane usprawnienia (nie wdrożone):

- Najpierw powyższe korekty pamięci i aktualny opis projektu. Nie dodawać kolejnego active learning jako jedynego sposobu korekty starego.
- Wprowadzić atomowe learning_supersede(id, replacementId, reason) oraz osobną operację rozwiązania istniejącego learning. Obecny zestaw MCP udostępnia capture nowego wpisu i feedback; nie widzę operacji zmiany lifecycle istniejącego learning. Pole status w capture nie dowodzi możliwości aktualizacji starego.
- Powiązać blocker z jednym issue id. Risk i rule_check powinny do niego odsyłać; aktualna otwartość wynika z issue, historia testu pozostaje niezmienna.
- Nie wygaszać decyzji po wieku. Dla dowodów środowiskowych stosować observedAt, revision/image digest i warunek ponownej weryfikacji. Dla porad: owning doc, scope i zastępujący wpis.
- Zamiast 81 nazw feature porządkujących pojedyncze sesje używać małego słownika obszarów: storage, runtime, scans, UI, deployment, governance. Szczegół zadania trzymać w sesji/tagach.
- Wyszukiwanie warstwowe: zgodność tematyczna + aktywne reguły projektu, następnie gałąź/feature jako ranking. Poszerzenie zakresu powinno być jawne i opisane, nie ukrytym fallbackiem.
- Domyślny brief ograniczyć do aktualnych decyzji, rzeczywiście otwartych blockerów i kilku dopasowanych learnings, z pobieraniem szczegółów na żądanie.
- Po zmianie repo workflow/kontraktu HiveMind skonsolidować bootstrap i closeout; bootstrap ma nadal rozwiązać projekt, odczytać reguły, otworzyć sesję/kontekst, a closeout zapisać tylko istotny wynik i zamknąć kontekst. Batch rule checks i automatyczne dowody wykonanych wywołań usuną ręczne potwierdzanie każdego kroku.
- Oddzielać progress i plan od learning: opis zakończonego etapu i jego dawny next step nie powinny wiecznie konkurować z aktualną poradą.

Ocena Jester: Yellow — przydatna pamięć uzasadnień, ale wymaga weryfikacji względem repo. Ryzyko: ponowne wdrażanie odrzuconych pomysłów i fałszywe blokady. Testy usprawnień powinny dowieść, że no-migration wygrywa z dawnym learning, zamknięty blocker znika z aktualnych wątków bez zmiany historii, aktualna stara decyzja nie jest proponowana do rozwiązania z powodu wieku, a nowa feature otrzymuje istotną wiedzę projektową.

## Inwentarz learnings

Pełne identyfikatory dla nawigacji. Pozycje bez propozycji w tabeli korekt nie zostały zatwierdzone jako aktualna instrukcja operacyjna; zachować je, a szczegóły środowiskowe/next steps sprawdzać przy pracy w danym obszarze.

| ID | Obecny status | Tytuł |
|---|---|---|
| lrn-c14e264d03aa9bc81c050e90b5cd0246 | active | HiveMap now exposes an explicit scan_boundary_map_build workflow that derives a candidate generic boundary-map artifact from current scan coverage plus persisted repository facts before scan_complete submission. |
| lrn-365692ec261159cdc737d2021967e9e8 | active | Single-image HiveMap verification against the tracked PocketHive Forgejo branch now works after fixing three concrete blockers: the Docker build needed Python/toolchain for tree-sitter, the runtime image needed git for safe-mode repository indexing, and Postgres init needed schema-order/index compatibility fixes so both clean and legacy binds can start. |
| lrn-9d18bdff28c3c78109cd6c7bbb3af38e | active | HiveMap scan tools now self-describe repository-local scan-profile overlays through MCP, and scan_start/evidence-candidate responses expose effective-profile and coverage metadata instead of forcing agents to infer repo layout from external docs. |
| lrn-e9d29447188e3a7f49ab8889bfae2371 | active | The first duplicate-responsibility probe on PocketHive returned zero candidates under the current code-quality profile because the profile coverage globs barely match PocketHive’s repository layout, not because the repository lacks repeated top-level symbols. |
| lrn-d32080ed186fbf0810dafaebfa37b275 | active | Repository evidence candidates now have a first coverage-aware structural slice for code-quality review by consuming persisted repository_symbols. |
| lrn-4670fd0b4c33dbec5cb52a0075f16928 | active | Initial real-repo tree-sitter probes show strong safe-mode structural value on PocketHive and usable but noisier results on HiveMap, with tests/archive filtering as the next quality lever. |
| lrn-294f2b4e9daa6b385b73d391aee3d44c | active | Phase 4A now persists first tree-sitter RepositorySymbol facts for completed repository indexes, giving HiveMap a safe-mode structural inventory for TypeScript/TSX/JavaScript-JSX and Java without build execution. |
| lrn-4461f3601190a0f5e37d420a41867246 | active | Repository evidence candidate heuristics were tightened so broken-reference and duplicate-authority self-scan false positives dropped to zero on HiveMap, while missing-owner narrowed to a small residual set. |
| lrn-11f0d1d9a055f78d387ac1c4f7ea5f2b | active | Repository-backed scans now have a first repository_evidence_candidates slice that bounds documentation/SSOT review to criterion-scoped evidence packets instead of raw repository discovery. |
| lrn-93c023871a41d074b875c2d74044f702 | active | HiveMap trackers now prioritize product-agnostic scan value and structural code facts ahead of completed-index portability work. |
| lrn-ee0a38257546be750c6a9b2690440b6f | active | HiveMap scan/index priorities are now anchored to two primary use cases: PocketHive SSOT governance and large-scale Java/Cucumber monolith rewrite understanding. |
| lrn-bbbd6301f6278b938ae0990c152d1e6e | active | HiveMap now treats full HiveMind bootstrap and context hygiene as part of the repository workflow contract, not optional habit. |
| lrn-dac9bf9109d60c08b8a3d5d2591e6cd7 | active | Repository-index-backed scan execution now stays consistent through runtime instructions, profile guidance, and repeat-scan export artifacts. |
| lrn-9979419df4c41348032e2ef680262acb | active | scan_start now requires a completed repository index and derives scan coverage from indexed files instead of caller-supplied repository metadata. |
| lrn-88a0d0a18268f99231fcd4b6c6022544 | active | Repository index reruns now work for completed and failed jobs, and the initial safe-mode slice no longer drops markdown preambles or misses stats constraints on upgraded Postgres schemas. |
| lrn-e2cc07cd864ea80f0a2c94e2d31da4c7 | active | Repository-indexing changes need root npm run verify because cross-package barrel exports can fail after targeted package tests pass. |
| lrn-6fc91985dff99f56358c96c48042dad0 | active | HiveMap now has a minimal safe-mode repository-index execution/search slice backed by Postgres repository_files and repository_chunks. |
| lrn-f9c14bb653cdc1e29afb323d6da7bbe0 | active | Completed repository index data should live inside the normal full-project export/import flow, not in a separate artifact. |
| lrn-0e75b01dec093d70ffb5fd3967297e2f | active | Completed repository indexes must become portable across environments; only job/execution state stays out of the current ZIP contract. |
| lrn-44cd05b4b06b4717d15e4872e0b6c374 | active | Repository indexing now uses the existing spec as the only tracker, with safe mode in the main runtime and deep mode deferred to a separate executor. |
| lrn-ab2fd8f38926a614cd9d8c8a66812c35 | active | A reusable multi-probe embedding benchmark set now exists for CaravanWorld and PocketHive, and the first full run currently ranks mxbai-embed-large highest overall. |
| lrn-6a03dea52d744338c5e0bc91a6b6e7c2 | active | PocketHive and CaravanWorld do not produce the same encoder winner; current evidence suggests dataset-sensitive quality rather than one universal best local model. |
| lrn-ba0158dcba7edf55baaa2f159bdaa1df | active | PocketHive embedding test-set expansion now uses a reusable scan-bundle generator plus live import to the .50 HiveMap runtime. |
| lrn-ce3c756ff4978d104a330835d2c093ee | active | CaravanWorld embedding smoke on 2026-08-20 found mxbai-embed-large to be the strongest current Ollama candidate among nomic-embed-text, mxbai-embed-large, and qwen3-embedding:0.6b for HiveMap concept similarity. |
| lrn-a501a79acf7ccf051512d4a2e9c3919d | active | External provider-backed vector smoke on the shared swarm is currently blocked on 192.168.88.50 because the live runtime only wires Ollama from HIVEMAP_OLLAMA_BASE_URL and the official ollama/ollama image cannot be unpacked there with only about 3.3G free in /var/lib/docker. |
| lrn-f1dd0ad4f64acc47e30c8f00255597a2 | active | HiveMap development on the shared swarm is now live on dev-latest with a node-local Postgres bind source pinned to docker-swarm-mgr-1; the swarm environment allow-list includes /opt/pockethive-data/hivemap/data and CaravanWorld was re-imported after switching to the new local state path. |
| lrn-b115fcb29697f151d3a3fde2290b8de9 | active | HiveMap docker-swarm deployments now require an explicit placement constraint whenever Postgres uses a node-local bind source; the temporary shared-swarm dev setup is pinned to docker-swarm-mgr-1 via node.hostname while reusing /opt/pockethive-data/hivemap/data on 192.168.88.50. |
| lrn-322d4709ab8bf37da14284c9cf066eb4 | active | HiveForge runtime env for hivemap-development on the swarm environment now pins HIVEMAP_DATA_BIND_SOURCE to /opt/pockethive-data/hivemap/data as the intended non-NFS local persistence path on 192.168.88.50, but the current environment metadata does not yet advertise that path in the bind-source allow-list. |
| lrn-de27f2b08de3d3b5da3efd907fb1e2cd | active | Legacy CaravanWorld HiveMap bundles with formatVersion 1 and storageSchemaVersion 2 remain semantically importable; the blocker was the strict legacy schema gate, and a schema-2 compatibility bridge plus temporary manifest rewrite allowed direct import into the current Postgres runtime. |
| lrn-a2971b3182d496dd4b17bc41aab9ae15 | active | Finding cards need typographic hierarchy instead of concatenated labels |
| lrn-5ce790111148666d7e8e033549ccaf18 | active | Scan categories must render as explicit priority columns inside the canvas |
| lrn-239ac18b09c90bc45d218dbbe7cf2044 | active | Projection navigation must be URL-addressable and self-orienting |
| lrn-d859df6c51dc3e66071322d17920e812 | active | Finding categories explain scan meaning better than severity-only columns |
| lrn-dc6f4c2cdb4925cf6b1af1a9fa56dbe5 | active | Repository scan maps need findings-first overview and finding-aware deep dives |
| lrn-d0dbb497b8279e13018ac5c9e91b3746 | active | HiveMap repository scan MVP makes agent scans portable and machine-verifiable |
| lrn-f44e00e5d40bbcb5b4513bfffe2db02b | active | HiveMap adopts the shared HiveForge/HiveMind dark visual system without runtime coupling |
| lrn-a31775273dd2380781a3da079a3783e8 | active | Knowledge-map refresh needs anchor-scoped freshness; whole-file revisions are useful only as candidate signals |
| lrn-d1f73575b473b0f56661d4a028f8f26f | active | HiveMap now defines a repeatable Project Knowledge Map workflow for agent handoff and federated project SSOT. |
| lrn-b549ad35215bbc97cb42aa03a805857f | active | A 31-node external architecture map confirms that one unfiltered project-map becomes edge-dense. |
| lrn-a6280a110ed8f5bf416f1131a561f068 | active | Replacing a category catalog must delete existing assignments before deleting referenced categories. |
| lrn-b8da21f08fe4922f2a3ec418fdf162a0 | active | HiveMap now supports curated project-map projections and contains a self-architecture map. |
| lrn-e536d0f40bbfc2e8f2e9c256aaadec6f | active | HiveMap MVP demo flow now includes snapshots, category display, proposal details, and run instructions. |
| lrn-2f7623e3538b2b4b99a6018e1394b24a | active | HiveMap web now supports edge creation and proposal review over explicit REST/runtime operations. |
| lrn-7821b0f46e752e25632db14741dff53f | active | HiveMap now has a first React web UI over the REST API using React Flow as the map surface. |
| lrn-cbc12254be282a1f05b4a53f548ab0f4 | active | HiveMap MCP now has real SDK stdio transport and API has a runnable CLI entrypoint. |
| lrn-2f271b606019a6f27f6e72ead908c8b1 | active | HiveMap now has a shared runtime used by REST and MCP tool adapters. |
| lrn-58173c212aa66c3575d60812b26b2aa0 | active | HiveMap apps/api is a thin HTTP boundary over shared contracts and storage. |
| lrn-524349d0b3c6b69d5f49bf71cc9ebd9c | active | HiveMap REST and MCP now share API contract types through @hivemap/api-contracts. |
| lrn-37ac550482423ce8d24a4d83a0a27f38 | active | HiveMap MVP slice now has pure core packages plus SQLite storage behind an explicit adapter. |
| lrn-07f740715c15e687e5e326fbbfe5be60 | active | HiveMap categories are implemented as a separate overlay package, not graph-core state. |
| lrn-95e77bbb2a05169bd8b57e811204a8d5 | active | HiveMap 1.0 implementation starts with graph-core and graph commands as the mutation boundary. |
| lrn-f678245b4d87c49cb000129d54c54d22 | active | Debugged intermittent HiveMind MCP fetch failed errors. |
| lrn-7474b9ffd1def767d21d0e944b676a49 | active | First-pass HiveMap design turns POC learnings into product, interaction, technical, and MVP docs. |
| lrn-324d67dc739929ca0940cd6918e9e059 | active | HiveMap root rulesets now define final-project guardrails separate from the POC. |
| lrn-ccac1dc27f4ea0e581d31bdb81ea0fb2 | active | HiveMap needs a category overlay separate from core node type. |
| lrn-e007a67685f0cbb11b12422d00a15025 | active | Conversation Map needs overview concepts with dive-in views, not a flat node field. |
| lrn-afdc2e360b6848cf055946c8ed552a20 | active | Manual graph editing should be emergency-only in HiveMap. |
| lrn-bd7cb9db7c75336938d22c61241fa37d | active | HiveMap POC initialized as a throwaway React Flow + local JSON API experiment. |
| lrn-ed6e2c51e5368bbda606dae0da88e411 | active | HiveMap POC should treat React Flow gestures as feedback events, not direct graph mutations. |
| lrn-960a6df3c6048c1dbc3d9d875de6af54 | active | REST identifiers remain opaque only when clients encode and servers decode each path segment exactly once |
| lrn-c0f0a0985019a5fec18046b57af266d9 | active | Schema 17 makes scan finding ownership and affected-node references durable graph invariants |
| lrn-708d1b798a287911d723948ee30326e4 | active | Scan-owned findings require exact bidirectional ownership and a dedicated runtime command policy |
| lrn-76e38e72c4a1b1dc2c0f479fda40ff90 | active | Review fixes require distinct loaded-workspace authority, root-aware projection cascades, and bounded saved-view presentation |
| lrn-9820b793c962ff622a7d892e1e7679fb | active | The current scan lifecycle leaves superseded calibration runs permanently marked in_progress, while the UI presents coverage scope as if it were execution progress. |
| lrn-d13de9304820d8883381e30de3f15359 | active | Dark-themed native select options require an explicit dark color scheme and option foreground/background colors for consistent Firefox and Chromium contrast. |
| lrn-ae9f0d27ca68759814d68bb740b45ab1 | active | Repository boundary review works best as a fixed four-surface workspace instead of a single scrolling sidebar. |
| lrn-8f0f1067d3f3585c1b1e3e0e9b833b46 | active | Repository boundary calibration must treat placeholders and co-located tests as evidence, not standalone boundaries. |
| lrn-86cd89ed7e424168c4de07701047f59b | active | A real remote HiveMap scan proved MCP persistence and correctly stopped at calibration, but overlay guidance cannot yet remediate the detected profile gaps |
| lrn-e0d09f2a69b352d98e5c2edca420e085 | active | The shared HiveMap test Swarm now uses an explicit public bearer token and has fresh authenticated acceptance evidence |
| lrn-c388f7a87fd7fde264125b385aa8e39f | active | HiveMap has one no-argument full local acceptance gate that exercises real runtime boundaries |
| lrn-7f599460b62d29cbb811150b73b08eff | active | HiveMap repository acquisition now supports HTTPS as its only remote transport |
| lrn-473f3ffc14200a1faf35455d916b17d4 | active | Unused REST endpoint-name catalogs must not duplicate the canonical request and transport contracts |
| lrn-cf3364a368dd01c876c08756ba8927ce | active | Repository indexing now consumes one explicit fact budget incrementally across chunks, symbols, references, and dependencies |
| lrn-54f562ea4409d45f2456601fabc79493 | active | HiveMap removed all current ZIP and workspace/project import-export surfaces; full-project portability is deferred to streaming NDJSON. |
| lrn-ae811f68c15b31bbe08e7a885f48a358 | active | Repository locations now have one canonical invariant across API, scan imports, storage, and runtime acquisition |
| lrn-3680ddba3aadd3bb5e001be45cc5649d | active | Supported HiveMap runtime bounds repository indexing with a parameter-free source identifier and one process-global execution slot |
| lrn-b62050f2d0eeca0b740ce8a6e1cf9b92 | active | Security closeout requires one workspace-keyed coordinator plus acquisition and transport boundaries |
| lrn-fdf48cf8f56c05e68637ea9c4199d549 | active | Minimal security hardening is best expressed at existing trust boundaries plus one workspace mutation coordinator |
| lrn-608cda6e26960616a287a8b93e44cdff | active | Portainer/Swarm deployment updates must use an immutable image tag |
| lrn-6f5b4e0518da012f735d901eda59a21f | active | HiveMap HiveForge dev pushes need an explicit remote-SHA lease |
| lrn-d0447c67fe2188a4768dab1a6256bf18 | active | Scan-specific graph metadata should be refined at the consuming boundary instead of widening the graph-core node contract. |
| lrn-b02ee5a44bb918c8bc301beeabbad60f | active | A Postgres-aware health route is insufficient unless the pg Pool idle-client error event is handled explicitly. |
| lrn-9357ba2a7d6ce8b4fc5950cc2c22645b | active | Built-image smoke must exercise image-default environment values together with entrypoint flags. |
| lrn-305aa5b5822282f52e9055f9b6eb58c3 | active | Security/runtime closeout needs both transport-level tests and a real built-image smoke; unit tests alone do not prove public-route, bearer, CA, or entrypoint behavior. |
| lrn-8b7c8445e513437330e557599ce42769 | active | A real container mutation smoke is required because non-Postgres verify can miss Postgres round-trip loss in scan profiles. |
| lrn-fa3b2576fac20df64fbe8918c92c6442 | active | Scan profile evidence-selection heuristics are now explicit profile or overlay recipe fields, and the remaining fixture drift is closed. |
| lrn-93fd40711c7b5623369293846a909b29 | active | Local one-container runtime now bundles optional Ollama with explicit enablement and a shared HiveMap state root. |
| lrn-a595409e097aab49537c552a79b77ed5 | active | scan_profile_overlay_suggest domyka calibration loop przez zwracanie symptom-scoped, repo-aware scaffoldu overlay YAML dla in-progress scanu. |
| lrn-91d233bef6e922713a298f83b2d95284 | active | scan_profile_overlay_help zwraca teraz powtarzalny workflow budowy overlay i symptom-to-field hints po pierwszym calibration pass. |
| lrn-3817a064d120f5855b7b64eb02a08567 | active | Kolejny slice Phase C/D wyniósł duplicate-authority heuristics do jawnych pól scan profile/overlay. |
| lrn-feed2dc5de09807fb21863145e35c077 | active | Kolejny slice Phase C/D wyniósł dokumentacyjne evidence recipes do jawnych pól scan profile/overlay dla missing-owner i stale-documentation. |
| lrn-0d8c9c81cdc5703f071c02d177a76856 | active | Pierwszy criterion-oriented evidence recipe został wyniesiony do scan profile/overlay dla duplicate-responsibility. |
| lrn-81eb00ecc6ac41a2ee0d0122a948d167 | active | Dodano jawny etap scan_finding_validate oraz domknięto poprawki boundary-map po review. |
| lrn-81e502c25a27cd3314caeb433b1db079 | active | Phase B boundary-map heuristics are now explicitly proven for custom test families and repository-local contract markers, not just for default roots. |
| lrn-a442c9645a942b7c56862233c412628d | active | Repository scans now record one explicit post-calibration decision before boundary mapping, coverage correction, findings, or findings-bearing completion. |
| lrn-63958c7f3312e8ef5fdfe8842fead4c2 | active | Findings-bearing scan completion now requires an explicit override when calibration is still not ready, instead of silently letting an ambiguous provisional pass harden into durable evidence. |
| lrn-62478b3b64883e1ebf0d11149c0c49b3 | active | On PocketHive revision 0cfcf0d4f348b85af86fa7e4680e036b33c55b06, HiveMap's `documentation-conflicts@1` profile yields actionable evidence packets, while `code-quality-review@1` currently returns no candidate packets. |
| lrn-a9fa4beb139a5bcb0f042d5b367ee118 | active | Explicit local Postgres verification for HiveMap should use live pgvector-backed tests because schema assertions can diverge from assumptions baked into in-memory or handwritten checks. |
| lrn-2028d94dcdc35c715ac11bbdeecba684 | active | The repository dependency slice on commit 9661e24 passes local E2E verification against a fresh pgvector container and the host-built API on August 24, 2026. |
| lrn-19ddbbda1bbed90362e129971c154103 | active | Commit 9661e24 finalizes the repository dependency slice and duplicate-responsibility topology ranking on postgres-container-indexing-closeout. |
| lrn-b545eca4a360e8f3692f62a41e3ae3de | active | RepositoryDependency is now persisted from deterministic syntax references, and duplicate-responsibility ranking uses shared dependency topology instead of symbol-name count alone. |
| lrn-98f10e861b3b4164890f2ee5e7488931 | active | HiveMap repository indexing now persists minimal RepositoryReference facts for TypeScript/JavaScript and Java through both storage backends. |
| lrn-34402a19635cd6a25a4ab48cf754c431 | active | Duplicate-responsibility candidates now ignore clearly non-current and supporting code paths before grouping repeated top-level symbols. |
| lrn-3a725523cf4776bd698dc20f3d63f8bb | active | Both suggested GHCR tags for HiveMap failed on August 21, 2026; neither ghcr.io/sepa79/hivemap:latest nor ghcr.io/sepa79/hivemap-api:latest is pullable on the swarm, so the cutover must wait for the exact published image reference. |
| lrn-154dadeff40250d2fbabacb554a28b98 | active | HiveMap prod-like cutover on August 21, 2026 needs an explicit valid GHCR tag before removing the dev path for good; ghcr.io/sepa79/hivemap:latest is not pullable on the swarm and leaves the official deployment unhealthy. |
| lrn-6785656ffe521728bfaf8fbad34a2ca3 | active | HiveMap now supports a first typed `boundary-map` scan artifact carried by `scan_complete`, validated in the scans domain, and persisted in Postgres/in-memory scan runs. |
| lrn-21afd0cce7eac9684ac41ff3f428f51a | active | After the remaining base runtime/container/HiveForge work is closed, HiveMap's next deliberate feature track is generic repository boundary mapping for scans, ahead of hosted MCP follow-up work. |

## Inwentarz entries

| ID | Typ | Obecny status | Tytuł |
|---|---|---|
| ent-5b514174541156bd566b71331a107c85 | progress | resolved | Working-tree scans extraction passes bounded project-rules review; no blocking findings |
| ent-7cf948a21a64532f42c3542def979543 | progress | resolved | Resolved the scans kitchen-sink module release blocker without changing the public package contract |
| ent-c06b2aa8a9b7af1862484b256926abe3 | progress | resolved | Release audit dependency blocker is fixed with an audit-clean lockfile |
| ent-982237af8fc285fbc681b8ec4f9171ae | risk | open | Release audit is no-go despite green acceptance and stable deployment |
| ent-d9e9db9ad577fd981ba5613fe985c6cc | progress | resolved | Schema-16 database was permanently reset and the schema-17 HiveMap image is healthy with an empty database |
| ent-033f7a988bb82d172cdd6625cc943f81 | risk | resolved | New image is published but schema-17 deployment requires an explicit database reset |
| ent-fed90a7a92149972ceaaac4489c781e9 | progress | resolved | Browser acceptance evidence now proves toolbar overflow and rendered surface visibility |
| ent-f4d7283f036af71101ac6ccf23628703 | progress | resolved | Viewport-reset and keyboard-focus P2 review findings are fixed and verified |
| ent-cefb556997f62291d5f5ecbc3b7e533c | risk | resolved | Review found scan module-boundary, viewport-reset, keyboard-focus, and acceptance-evidence gaps |
| ent-5bcc452aef9704cd8d5b817f6cd139c7 | progress | resolved | Final rereview findings fixed and full local acceptance is green |
| ent-4388aaabd6d5d41d9fc3b5137d06bee1 | decision | open | HiveMap never migrates Postgres runtime schemas; incompatible versions require a clean database and new scans |
| ent-7195f321656a3242c9f7c2120adcf303 | risk | resolved | Rereview found v16 upgrade, affected-node integrity, proposal final-graph, and destructive UI confirmation gaps |
| ent-b054b16cd99ec8674974b0685c545538 | risk | resolved | Rereview found scan finding-ownership drift and UI state races before release |
| ent-33205ef77cfcfdafe7bd68a1232ff210 | progress | resolved | Resolved all three review findings and updated the shared HiveForge test deployment |
| ent-18ff1b3f9bd906c0bb04197aecb2aeb0 | risk | resolved | Review found a cross-workspace destructive target bug and incomplete projection cleanup |
| ent-4806c480f392df99d76214957342711b | decision | resolved | Every repository scan can be explicitly hard-deleted |
| ent-0af3a2fb8224a0c79b983278bc3a7c98 | progress | resolved | Real HiveForge scan now persists and renders a non-empty repository boundary map. |
| ent-aaf1c8e7e4c24a7b8ed1e8e5c7213453 | risk | resolved | Remote repository scans cannot proceed to trustworthy findings until overlay suggestions produce actual fixes for detected calibration gaps |
| ent-2d97c6faa57e3b7db9163614db4fa138 | progress | resolved | Fresh authenticated HiveForge Swarm acceptance is complete with a known public test token |
| ent-e798d0ca5bcb4a10d213500a72fbd5c7 | risk | resolved | September 1 Swarm rerun could not repeat the authenticated subcase without the existing external test-secret value |
| ent-449caa7ba8637c34c9aa26704bb8285a | artifact_ref | resolved | Committed HTTPS-only repository capability contract closeout |
| ent-588f16c45142e2e0ef25c9474007ce7b | progress | resolved | REST contract cleanup reviewed clean; SSH operability and schema-doc mismatch remain |
| ent-c29a62f93c35598e7bb543698ca008d1 | artifact_ref | brak | Committed the reviewed Postgres/container/indexing hardening slice as ec86d56 |
| ent-261fa1265caf2e7d472dfd0682c2cc5a | progress | brak | Closed the eager repository-fact allocation P1 with one incremental execution budget |
| ent-524bbe14292a9f0cc51c7451967fd3f7 | risk | resolved | Rereview remains blocked by eager repository-fact allocation and stale public capability contracts |
| ent-20ecb999dff2741e0a0a428c21f664b7 | decision | open | Portable scan handoff requires completed retrieval index data while repository source remains Git-owned |
| ent-b1701f28328536dce7d0530961893f27 | progress | superseded | ZIP bundle analysis separates canonical workspace portability from generated scan reports |
| ent-ead93020b016410f4cb31f47b97aa777 | risk | resolved | Review blocked by late repository chunk budgeting and unsafe generated ZIP paths |
| ent-d7d1e2a1059bd498a19c6ccd9e4ece0f | risk | resolved | Final rereview blocks release because the parameter-free repository URL invariant is bypassable through workspace import and is not canonicalized before persistence |
| ent-6efca728d5570066bad45e9ed29056dd | risk | resolved | Full rereview found three release-blocking security/operability gaps and two P2 correctness/architecture gaps |
| ent-d93bfeab5f33d33c5189b389f0aef233 | progress | resolved | Security re-review fixes implemented and fully verified |
| ent-2509dc1bd3d47e04f4ddf144a8f186c4 | risk | resolved | Re-review blocks the security hardening slice on repository-index races, URL validation bypass, non-roundtrippable exports, and pre-limit clone resource use |
| ent-7db4b54d4ba070c5b5eb4bd84bb77566 | risk | resolved | Whole-slice review found release blockers in safe-mode isolation, remote MCP filesystem authority, and concurrent workspace mutation |
| ent-96f27648c3077bf4051a01c3489acebe | progress | resolved | Phase 6 real HiveForge build-deploy-e2e loop completed on the test swarm |
| ent-6047216f1874c2b86b4d06c21e478a76 | risk | resolved | HiveForge update is blocked by missing external Docker secret |
| ent-d8352b2de67211c2d0ef632d42381ec5 | progress | resolved | Postgres/container module-contract closeout passed final review and the complete verification matrix. |
| ent-bd91f4c3f4df04439380d6162c246504 | decision | open | HiveMap HTTP runtime accepts exactly one direct or file-backed shared bearer token; the UI keeps it only in tab-scoped sessionStorage. |
| ent-5b50fd05ababcbcc373ced8c61784793 | progress | resolved | Module and canonical-contract closeout is implemented and the initial full verification matrix is green. |
| ent-756dace9471d582ba20a7eb44529daf5 | progress | resolved | Postgres-aware readiness and protected UI token-clear findings are fixed and verified; the broader independent-review risk remains open for its other findings. |
| ent-edd4085508c4982e361a217852ea9a77 | progress | resolved | Continuation audit confirms the uncommitted closeout is verify-green but still blocked by the existing health, token-clear, module/contract, and documentation findings. |
| ent-79ab5358da96e957fd8bfabc7b81cf36 | risk | resolved | Independent post-fix review remains blocking: container health ignores Postgres, token clear leaves protected UI state visible, and strict module/contract separation is incomplete. |
| ent-aba5965849b755782d1b38597cec5f40 | progress | resolved | Ruleset-v2 review findings are fixed and verified across HiveForge secrets, embedded-Postgres shutdown, module separation, safe logging, browser token lifecycle, MCP shared state, and UI evidence. |
| ent-a6e267459abc6ac871fe376a96abaf19 | risk | resolved | Ruleset-v2 review blocks the current slice on HiveForge secret handling, embedded-Postgres shutdown, and mandatory module separation/responsibility headers. |
| ent-80632077a035d0eff58625ef18b0051c | decision | resolved | HiveMap now has project-specific engineering rules and HiveMind ruleset v2 derived from the reusable parts of OfWasteOfSpaceAndTime governance. |
| ent-63a7d6c21733c2963a1cacd7855b8f33 | progress | resolved | Transitive production dependency advisories discovered during security closeout were removed without force or public package-range changes. |
| ent-adad6ac30e8f29c37e4c876f4744c826 | decision | superseded | HiveMap installed runtime uses one required HIVEMAP_AUTH_TOKEN for REST and stateless Streamable HTTP MCP at /mcp in the same HTTP process; UI assets and /health remain public. |
| ent-1e170b610218f9588fcc4d257bfb3d83 | risk | resolved | Corrected pre-deploy review: the real blockers were missing CA trust, unauthenticated network API, missing installed MCP transport, and unsafe profile_recipe hydration; the previously cited test-path migration risk was invalid. |
| ent-ca97f77ddd68d56803ea059905e91f0c | risk | superseded | Pre-deploy review found blockers: HTTPS repository indexing lacks CA certificates, the unauthenticated API is published on all interfaces, the shared-state-to-Postgres bind remap hides existing data, and the installed stack exposes no MCP transport. |
| ent-3de9edc94689c89f8dba09452c32c186 | decision | open | Base HiveMap runtime is API/web + Postgres + built-in repository index/scan handlers; bundled model serving, provider-generated embeddings, and a general plugin runtime are deferred and archived. |
| ent-3bed3029b14cf6c095b88e58ba3d0cb5 | progress | resolved | The previously open verify blocker from the unstaged scan-stack change is resolved. |
| ent-08740643d2c6bf582bd8b6d8fb279b46 | risk | resolved | Repo-wide verify is currently blocked by an unstaged scan-stack contract change, not by the container runtime slice. |
| ent-ac29a5ef94b831d8c70767bfbe93d825 | progress | brak | Phase B repository-understanding artifacts were closed by adding regression proof for custom test-family fail-fast and overlay-based recovery, then marking the plan checkpoints complete. |
| ent-1ffb545da185f282e77a01f438d09a37 | progress | brak | Self-scan proved the docs/SSOT candidate layer is partially useful, but .50 is missing repository-index routes and the current evidence heuristics still overfire. |
| ent-a18330e048f42088fd454ed995f422ef | artifact_ref | brak | Committed broader review hardening package as 486452d after green verify. |
| ent-d972a7a86dd56f9aa7ee38c9d30b0a1d | progress | brak | Broader review hardened repository-index ownership checks and REST route/JSON boundaries before the next scan package. |
| ent-4bdebce75e00fb20c1163960e9b29a66 | artifact_ref | brak | Committed the repository evidence candidate review fixes as c03d34a. |
| ent-5f9a2bba9cfa23f03d5acf321db9c56f | progress | brak | Fixed the review findings in repository evidence candidate heuristics and validated the bounded patch set. |
| ent-21e90894dabdd598ef8e9c9a8b52e65d | plan_ref | brak | Recorded the concrete Phase 4A safe syntax package for repository indexing: tree-sitter first, ast-grep second, compiler-backed adapters later. |
| ent-0b001f54b9a43b24df53951d48106b31 | progress | brak | Added a selective stale-documentation evidence builder for repository-backed documentation/SSOT scans. |
| ent-9f9d88182a7a357cbc838da32c61d832 | progress | brak | Added a selective contradictory-claims evidence builder for documentation/SSOT scans on top of completed repository indexes. |
| ent-e3c22f00bbd93085965153ec90f66248 | progress | brak | Tightened the first repository_evidence_candidates slice to reduce documentation-scan noise before Phase 4 structural facts. |
| ent-44097b1971a5e41b7814b5a4f21cbabf | progress | brak | HiveMap now has an initial HiveForge deployment scaffold with a docker-single profile, and the local adapter smoke is green. |
| ent-2d2dfd1bfc117e10ed7c1c038b757bcf | progress | brak | SQLite store was removed from the repo; fast tests now use an explicit in-memory HiveMapStore instead of node:sqlite. |
| ent-6d0761ddf84c5112c88450a2d93fe3fd | progress | brak | Local Docker runtime now passes end-to-end smoke on Postgres + pgvector, and the main runtime no longer loads SQLite on startup. |
| ent-d7b97a0dd6df6938cc493896b7d80cce | tooling_note | brak | API Vitest hang was caused by transport-dependent test harness; direct handler tests now avoid server/socket lifecycle issues. |
| ent-5807d3d3b5ca0dd51dd453d85e29480a | progress | brak | Removed the remaining SQLite application runtime path and added focused Postgres integration coverage across storage, runtime, API, and MCP boundaries. |
| ent-1e4eb58ad243bcde76790feaceda321c | progress | brak | Closed the remaining ZIP contract and Postgres timestamp follow-up from the single-image container milestone. |
| ent-5374b1860176170a3e09ee66a91ce168 | progress | brak | Single-image Docker runtime now passes the internal workspace and ZIP smoke flow |
| ent-521c8cdc4c32c3da9e1e80f9b184c91a | progress | brak | Single-image Docker runtime scaffold added and first container smoke loop exposed/fixed Postgres adapter issues |
| ent-652339366664e2c29fec87eee9b98495 | risk | resolved | API Vitest still hangs after runner startup in local environment |
| ent-3c3fdff18a9a238750e09e36aaa447c0 | progress | brak | Postgres store implemented and wired into API/MCP runtime configuration |
| ent-ae545858015c29cd72d52b3b5721071f | progress | brak | Corrected medium review gaps in storage SSOT: ZIP compatibility no longer overclaims backend-independence in the current alpha, and Postgres proposal DDL no longer requires non-empty source_feedback_ids. |
| ent-697e208a3fe9df0c4c2de347b7bc4b2c | progress | brak | Removed snapshots from the active HiveMap contract and implementation; plans now defer read-only workspace clones instead of carrying snapshots into Postgres. |
| ent-7139096303bfe5e551b982e156c5fefd | decision | brak | HiveMap removes snapshots from the current product/runtime contract now; read-only workspace clones become deferred follow-up work only and are not implemented in this phase. |
| ent-365d3e47116fd830e5a25e84c93ee638 | progress | brak | Completed the Phase 2 storage design milestone by turning docs/specs/storage-format.md into the concrete Postgres schema source of truth, including DDL, indexes, finding/comparison storage rules, transaction model, and deferred pgvector scope. |
| ent-98bc9119c1037ad0dc8e1dc96c969b2b | decision | superseded | HiveMap local runtime target is one self-contained container bundling HiveMap, Postgres, plugins, and local model-serving dependencies; it should not require local stdio MCP or user-managed DB URLs/file paths. |
| ent-2f6f61ffa506adca1b8b5fb7670a345d | decision | brak | docs/specs/storage-format.md will become the concrete Postgres schema source of truth rather than delegating final DDL ownership to a separate design-only document. |
| ent-31ebe026395ffefa6920359ec6b2b268 | progress | brak | Corrected the Postgres transition docs so storage-format is now explicitly logical-contract-first and the runtime plan no longer overstates SQLite boundary cleanup. |
| ent-9685355820405b73704ca59b08e8562f | risk | resolved | The @hivemap/api test suite currently times out in its beforeEach server startup hook inside this environment, even though api build/typecheck and runtime/storage tests pass. |
| ent-9a30fc0c2a746edba9401866b5b251a3 | progress | brak | Completed the first executable slice of the Postgres/container plan: updated SSOT docs and introduced a HiveMapStore interface so runtime and API no longer depend on SqliteHiveMapStore directly. |
| ent-80fee8a45fc11b420956c2d61cfa0bde | decision | brak | HiveMap Phase 1 now locks Postgres as the only supported runtime backend and defers embeddings from the base Postgres/container/HiveForge execution track. |
| ent-9efda19d799c10d99aa305a7bbc07494 | progress | brak | Tightened HiveMap development rules around HiveMind usage and near-term delivery direction. |
| ent-6263efdf8e82adc6f9237c4dc65e826b | decision | brak | HiveMap repository rules now require HiveMind for meaningful development work when available. |
| ent-864c3ba1bc1679da3ced5c5744bcc28f | progress | brak | Applied HiveMind base@v1 profile to HiveMap, created missing starter files, and customized the new bootstrap docs for the repo's real SSOT and runtime shape. |
| ent-2f21a2f9a4087ce06349284ffdd91e89 | decision | brak | HiveMap development now uses HiveMind as the default durable memory layer for decisions, feedback, risks, and workflow learnings. |

## PocketHive — rozszerzenie audytu z 2026-09-07

Wynik audytu zapisano w HiveMind jako resolved tooling_note `ent-804f5e023da6cb57ba3dcfb7e3d43014`. Context i sesję zamknięto; closeout nie zgłosił brakujących required rule checks. Nie zmieniano historycznych statusów. Zweryfikowano liczebność i ID inwentarzy raportu; `git diff --check` przeszedł w obu repozytoriach.

### Zakres i jakość dowodu

Projekt potwierdzono przez project_resolve: `pockethive`, repo `/home/sepa/PocketHive`, ruleset `pockethive:5`. Przeczytano reguły, otwarto sesję i feature-scoped context, pobrano brief, recent learnings, search, issues, open threads i project_review. Sesja audytu: `sess-cc575fa6db74f7b523831866c00da591`; feature: `global-hivemind-workflow`.

Porównanie z repo dotyczy gałęzi `refactor/control-plane-critical-restart`, HEAD `5e68eec4b10d1d942a6deb7ac90274b208eb3a34` oraz istniejących niezacommitowanych zmian. W szczególności CP-N01 jest poprawiony w working tree. Nie oznacza to poprawki w tym commicie ani na dowolnym wdrożeniu. Dowody runtime cytowane poniżej pochodzą z historycznych wpisów; w tym audycie nie wykonano deployu, operacji administracyjnych ani ponownych E2E.

Pozyskano 23 learnings, 351 unikalnych wpisów dziennika i 9 issues. Przejrzano cały pozyskany inwentarz; szczegółową korelację z następcami i repo wykonano dla pozycji wskazanych poniżej. To nie jest ponowny przegląd wszystkich zmian kodu opisanych przez 351 wpisów.

Wyszukiwanie dziennika wymagało rozbicia według siedmiu typów i następnie 15 znalezionych gałęzi dla progress (łącznie 23 zapytania entry_search z zapytaniem początkowym). API nie dostarczyło kursora ani dowodu kompletności całego projektu. Nie można wykluczyć starszych progress z gałęzi nieobecnej w pobranych wynikach. Inwentarz 351 jest dolną granicą pozyskanych danych, nie gwarantowanym globalnym total.

Startup zgłosił 92 open threads. Osobny odczyt zwrócił maksymalnie 50: 42 rule_checks i 8 entries. Limit 100 został odrzucony przez walidację. Nie oceniono wszystkich 92 wątków; limit i scope utrudniają uzgodnienie liczb. Snapshot powstawał przez serię wywołań i nie jest transakcyjnym asOf.

### Wyniki liczbowe i porównanie

| Miara | HiveMap — wcześniejszy snapshot | PocketHive — pozyskany snapshot |
|---|---|---|
| Learnings | 107, wszystkie active | 23, wszystkie active |
| Negatywny feedback learningów | 4 rekordy did_not_work nadal active | 0 w pozyskanych 23 |
| Dziennik | 85: 43 resolved, 4 superseded, 5 open, 33 bez statusu | 351: 172 resolved, 13 superseded, 107 open, 59 bez statusu |
| Typy dziennika PocketHive | — | 216 progress, 62 risk, 28 decision, 13 plan_ref, 12 tooling_note, 12 artifact_ref, 8 feedback |
| Issues | 6 pozyskanych | 9, wszystkie resolved; nie oznacza to braku otwartych risks |
| Open threads | 32 zwrócone, w tym 30 blocked rule_checks | Startup 92; zwrócone 50, w tym 42 blocked rule_checks |
| Słownik features | 0 managed; 81 nazw w learnings | 10 managed; 23 wartości feature w entries, licząc brak wartości |
| Recent dla użytego contextu | Zależny od kontekstu | Pusty dla global-hivemind-workflow, mimo 23 learnings projektu |

W PocketHive dziennik pokazuje faktyczne używanie resolved/superseded, ale learnings nadal pozostają wyłącznie active. Najmocniejszy przykład: wpisy ryzyka CP-N01 są już resolved/superseded, podczas gdy learning nadal poleca utrzymywanie CP-N01 jako blockera. Samo dopisywanie kolejnych rekordów nie zapewnia aktualności briefu.

### Learnings — co trzymać i co skorygować

„Częściowo superseded” jest propozycją operacji rozdzielenia treści, nie deklaracją istniejącego statusu API. Najpierw utworzyć precyzyjnego następcę z zachowaną aktualną zasadą, a dopiero potem wycofać starą poradę. Resolved przy learningu incydentowym nie powinno usuwać użytecznej lekcji z historii.

Ścieżki w tej części należą do PocketHive, chyba że jawnie podano HiveMap.

| Learning ID | Proponowana kwalifikacja | Uzasadnienie i następca | Dowód / właściciel |
|---|---|---|---|
| lrn-49902c6cfd500bdbddd26ae257af69c2 | Częściowo superseded; zachować obserwację dla commitu | CP-N01 rozwiązano później w working tree (ent-d31bcdf8bba252d103ea5296d2dc50fb; review ent-c7a3448a92841187fefd89226bb42a29). CP-N02..09 pozostają; CP-N09 obejmuje również cofnięcie lokalnego zegara. Następca musi rozróżniać commit, lokalną poprawkę i wdrożenie. | docs/todo/control-plane-post-simplification-review.md:35,150,164 |
| lrn-9f163bbd254551bc2a82d3017f69e101 | Trzymać zasadę; szczegóły ograniczyć rewizją | Migracja brokera obejmuje kontrakty, control plane, administrację i deployment, nie tylko dwa adaptery. Historyczna lista narzędzi Node wymaga aktualizacji po ich usunięciu. | docs/todo/work-plane-artemis.md; ent-907f130c253fe4c74f1ca9aac494dc14 |
| lrn-eb109fcade7b3076787bd204fcf3f973 | Trzymać | Brak findings nie dowodzi jakości przy wąskim profilu. Wyniki 3→996 plików są historycznym pomiarem konkretnego indeksu; porada o commicie nie stanowi zgody na commit. | .hivemap/scan-profiles/code-quality.yaml; AGENTS.md |
| lrn-eafc6da1092caee88b82ef815178974d | Trzymać | Przy NFS zapis konfiguracji wymaga obserwacji treści i potwierdzenia dokładnego applied digest. Jest następcą starej diagnozy niedziałającego reloadu. | network-proxy-haproxy/docker-entrypoint.sh; network-proxy-manager-service/src/main/java/io/pockethive/networkproxy/infra/haproxy/HaproxyConfigClient.java |
| lrn-0e9a3f4f352a621bc8f8cf4f2cadd29f | Trzymać | Delta nie zastępuje świeżej pełnej projekcji przy sprawdzaniu postcondition. Nie kopiować dawnych implementacji walidacji E2E. | docs/RELEASE_VERIFICATION_MATRIX.md — historyczny dowód; aktualne kontrakty projekcji |
| lrn-8921840239f8f5560a1831c2c6a8095b | Częściowo superseded | Zachować fixture z rzeczywistego producenta i walidację canonical codec/schema. Wycofać zalecenia utrzymywania osobnego capture/parser/audit E2E: subsystem został usunięty. | docs/archive/control-plane-simplification-plan.md; docs/RELEASE_VERIFICATION_MATRIX.md:8; ent-293a2de610b3182c3ea9dbbfcddbc71d |
| lrn-8a78a6352fedb840ea8bdf50b0b82fc4 | Trzymać | HTTP 202 oznacza przyjęcie; zakończenie wymaga wyniku operacji i właściwego stanu rejestru. Zachować jako zasadę, nie otwarty incydent. | docs/ORCHESTRATOR-REST.md; docs/RELEASE_VERIFICATION_MATRIX.md |
| lrn-e83d717898c55179d8f972e62688a23a | Trzymać | Klucz mapy endpoints jest właścicielem identity; migracja poprzedza późniejszy branch i była już w v0.15.35. | ent-c40dad69eb974db1cce8e94136eb011c; kanoniczne kontrakty SUT |
| lrn-8b284f065c0171d42019d6cf349774bd | Historyczny baseline; superseded dla instrukcji importu | Zachować dowód driftu dokumentacji. Dawne instrukcje eksportu/importu baseline HiveMap wymagają aktualizacji do aktualnego kontraktu HiveMap; NIE dotyczy to ZIP scenariuszy PocketHive. | HiveMap: docs/specs/storage-format.md; PocketHive: historyczny baseline dokumentacji |
| lrn-e95bfd4cbdddda34efa72504aa25bae4 | Scalić przez następcę | Duplikuje lrn-167a22ae2d6c0887b3b6fc5ef4b0fa0a. Jedna porada o odkrywaniu dostępnych narzędzi, jawnie ograniczona do klienta/narzędzi; brak lokalnego fallbacku. | docs/ai/HIVEMIND_WORKFLOW.md |
| lrn-f5e533da438730a0070c626a28ad72ac | Częściowo superseded | Nieaktualny zakaz zmiany każdej listy. inputs.redis.listName można zmienić dla wyłączonego workera w istniejącym single-source; UI wymaga STOPPED. Destination, sources[], połączenie i przełączenie trybu pozostają poza zakresem. | docs/archive/redis-stopped-source-list-selector-plan.md; LiveIoConfigUpdateGuard.java; ent-583c449c35ae52214352c6871a2b476b |
| lrn-a16cc7698fdda30134e8abf15d7bbff3 | Częściowo superseded | Zachować wnioski o ownerze observability i ograniczeniach dowodu. Dawny metrics_query nie jest aktualnym narzędziem Java MCP: brak owner API; nie proponować starego dostępu bezpośredniego. | docs/observability.md:64; docs/mcp/NODE_TOOL_MIGRATION_LEDGER.md:134 |
| lrn-07f784906e0676065741ac109f5b565e | Trzymać; poprawić odnośnik | logRef=null i 30-dniowy retention metrics to wdrożone decyzje, nie kolejny plan do wykonania. Linkować aktualne observability, nie tylko archiwalny plan. | docs/observability.md:35,48 |
| lrn-d4b8e5d0d60dea8ac04b281b485ed060 | Resolved jako etap planu | Phase 1 nie czeka na rozpoczęcie; Phase 1/2 zakończono. Zachować historię dostarczenia. | docs/archive/observability-decommission-plan.md:1 |
| lrn-78db7555991edd716d4126c32d23acec | Superseded jako kandydat kierunku | Usunięcie Loki/Prometheus oraz ClickHouse metrics jest już zrealizowane; aktualny dokument zastępuje dawną alternatywę i polecenie napisania planu. | docs/archive/observability-decommission-plan.md; docs/observability.md |
| lrn-c323ce2c365452cb7fe3c32fd5f0de24 | Resolved dla incydentu; zachować mechanizm w następcy | Późniejsze potwierdzenie poprawki reload/applied digest: ent-9f698b17ef70b116c22f9476b216c714, commit 9148c94b. Zasada pozostaje w lrn-eafc6da1092caee88b82ef815178974d. Nie jest to nowy test aktualnego deploymentu. | network-proxy-haproxy/docker-entrypoint.sh; network-proxy-manager-service — HaproxyConfigClient |
| lrn-ca0d2232b5ffbace538cb6301de3001e | Resolved dla incydentu | Późniejszy wpis ent-f31dc586da28b9722adfab855f687df1 potwierdza wdrożenie poprawki; aktualny agregator zachowuje i serializuje worker config. | swarm-controller-service/src/main/java/io/pockethive/swarmcontroller/SwarmWorkersAggregator.java:53,96,128 |
| lrn-f988f478d487ab347d0b7dc87ed06252 | Trzymać diagnozę; wydzielić czynności operacyjne | Mały wolumen ClickHouse jest użyteczną lekcją. Historyczna rekomendacja usuwania logów nie może być bieżącą instrukcją wykonania ani autoryzacją; wymaga aktualnego rozpoznania i zakresu zadania. | AGENTS.md; historyczny incydent środowiska .50 |
| lrn-eb4f268ca217fe7a9428309155bc8be3 | Trzymać z zakresem deploymentu | Tożsamość POCKETHIVE_VERSION musi odpowiadać publikowanemu obrazowi i konfiguracji HiveForge. Konkretne tagi/adresy nie są wiecznymi ustawieniami ani zgodą na push. | deploy/proxmox.env.example; AGENTS.md |
| lrn-76478303a7cfcdb2c9d79add8015f428 | Trzymać | Escaping szablonów aplikacyjnych na granicy adaptera Docker Swarm jest trwałym mechanizmem, nie jednorazowym TODO. | Granica adaptera Swarm; dowód w learningu |
| lrn-8d6eade97d72a2865f92becd6f6620df | Historyczny incydent; kandydat resolved | Opisuje pierwszy konkretny przebieg i dawną obserwację E2E. Późniejsze udane lifecycle runs i zmiana modelu audytu nie uzasadniają trzymania tego jako uniwersalnego aktualnego blockera. Nie zamyka to CP-N09. | ent-e82545d6c343f1e76e74161e4a860bcd; docs/archive/control-plane-simplification-plan.md |
| lrn-167a22ae2d6c0887b3b6fc5ef4b0fa0a | Scalić z lrn-e95bfd4cbdddda34efa72504aa25bae4 | Zachować jedno aktualne zalecenie odkrywania narzędzi; obu starych rekordów nie usuwać, tylko wskazać wspólnego następcę. | docs/ai/HIVEMIND_WORKFLOW.md |
| lrn-aa22202b6b5c0ad851f4ae2f4e11a4f2 | Trzymać jako ograniczoną lekcję konfiguracji klienta | Konfiguracja jednego klienta MCP nie dowodzi dostępności w drugim. Historyczne ustawienie Codex/VS Code nie powinno zajmować startupu każdej pracy produktowej. | docs/ai/HIVEMIND_WORKFLOW.md; ent-5b76fe327821d66c875baca7cd2b5927 |

### Wpisy dziennika — konkretna lista porządkowania

To propozycje, bez wykonanych zmian statusu. Nie wszystkie 107 open oznaczają porzucone zadania: część to nadal obowiązujące decyzje albo celowo odłożony zakres.

| Entry ID | Proponowana kwalifikacja | Dowód i granica wniosku |
|---|---|---|
| ent-17f3608020ef08108ed0eb5867bedd21 | Trzymać resolved | CP-N01; skorelować z następcą ent-d31bcdf8bba252d103ea5296d2dc50fb i learningiem lrn-49902c6cfd500bdbddd26ae257af69c2. Już zamknięty wpis nie powinien wracać jako bieżący blocker przez learning. |
| ent-dff44f695394e4286e39177e089bd361 | Trzymać superseded | Zduplikowane wcześniejsze CP-N01; zachować łańcuch korekty, nie wyświetlać jako drugi otwarty problem. |
| ent-9c833ba9403adf22332515c2ede64d5f | Trzymać open | Świeży audyt innych właścicieli SSOT; naprawa CP-N01 nie rozwiązuje ośmiu kolejnych grup. docs/architecture/ssot-ownership-audit-2026-09-07.md. |
| ent-14b6407de01635861fd5c21cc79ca706 | Trzymać open | Świeży szerszy audyt RabbitMQ, poza naprawionym CP-N01. docs/architecture/rabbitmq-ownership-audit-2026-09-07.md. |
| ent-52e7e2d473e17bb057404b027a46387e | Trzymać open | CP-N09 nadal jest w aktualnej kolejce; udany E2E nie obala problemu zegarów. |
| ent-907f130c253fe4c74f1ca9aac494dc14 | Trzymać jako przyszły plan | Artemis/Work Plane; nie traktować jako wykonane ani jako bieżąca awaria. |
| ent-632545b2f0af0901cf7d2d35266dfffe | Superseded | Dawna propozycja Redis discovery/component action została zastąpiona prostym polem w istniejącym edytorze: ent-4325767aa145893e481623f8d03cafef. |
| ent-6b40057d087a571f121680301bdd88c7 | Resolved | Etap feasibility poprzedzający implementację ent-583c449c35ae52214352c6871a2b476b. |
| ent-4325767aa145893e481623f8d03cafef | Trzymać decyzję | Obowiązujący zakres: bez nowego endpointu, discovery Redis i nowego formularza. Zakończenie implementacji nie unieważnia decyzji. |
| ent-8b3a294f4fff8694b51b4bc42d3afcf5 | Podzielić; bez zbiorczego resolved | STOPPED guard i magic strings mają późniejszą poprawkę ent-eda57b023a5f5d0ccfe8c62c05f1342b. Pełny dowód stop-config-start-pop i outcome UX wymagają osobnej oceny; archived plan deklaruje targeted verification. |
| ent-95f643593cd579810b45af498608bb42 | Resolved przez usunięcie ownera | Redundantny parser/audit E2E został usunięty: ent-293a2de610b3182c3ea9dbbfcddbc71d. Zachować zasadę jednego właściciela walidacji. |
| ent-a1d9f9697e6b4a95ce47e32b8c5b32c8 | Superseded | Nie realizować starego next step E2E-03 w wycofanym subsystemie. Następca: docs/archive/control-plane-simplification-plan.md. |
| ent-f0086c80ab1fbc4b336c8f213e76d191 | Superseded | Starą kolejkę findings-first zastąpiła simplification i nowy post-simplification review; nie odtwarzać porzuconego planu. |
| ent-fb6a844924ef68c0b699cea3a6354b51 | Rozdzielić i powiązać z aktualną kolejką | Opis starego zestawu monolitów/rewizji wymaga porównania per concern. Nie oznaczać całego SRP jako naprawionego; CP-N02..08 i odłożony SwarmLifecycleSteps nadal istotne. |
| ent-2c9717919177ea260b6a0e37104f9a3b | Trzymać decyzję o zakresie | Odłożenie SwarmLifecycleSteps potwierdza ent-4f34e0baa87650c7477da0ae268a2599. Deferred nie znaczy fixed; nie zamykać wyłącznie przez wiek. |
| ent-8c190b7c50f112348db8eb073ddbd638 | Trzymać obowiązującą decyzję | Wymóg implementation-unit separation jest w AGENTS.md i docs/ENGINEERING_RULES.md. Sugerowane przez project_review mark_resolved po 7 dniach nie dowodzi dezaktualizacji. |
| ent-36720e15cc4428938aad8409c9a856e3 | Historia zgody; ograniczyć stosowalność | Zachować dowód dawnej zgody na testowy Git, ale usunąć interpretację jako bezterminowe upoważnienie. Aktualne AGENTS.md i bieżący zakres zadania rozstrzygają operacje Git; pamięć nie rozszerza zgody. |
| ent-797909047538a0b51a5c76f07209a807 | Superseded dla implementacji Node | Canonical MCP to Java21 Streamable HTTP, dawny Node/stdin usunięto (docs/mcp/README.md, NODE_TOOL_MIGRATION_LEDGER.md). Mechanizmy błędów zachować do rewalidacji nowego ownera; nie twierdzić, że nowa implementacja została tu przetestowana. |
| ent-59179b6a8c58ee91378f8773242429e2 | Kandydat resolved w repo | W aktualnym network-proxy-manager-service i root pom.xml brak logstash/LogstashEncoder. To sprawdzenie źródeł, bez potwierdzania aktualnych obrazów na serwerze. |
| ent-91343323201af8f5974fbfe4f9edc666 | Resolved dla konkretnego incydentu | Późniejsze ent-b8a9e2116f05a103e167b3b32631cc08 opisuje udany rerun po usunięciu blokady; Prometheus potem wycofano. Nie zamykać wszystkich ryzyk NFS. |
| ent-00a0e5189af752ca71beba949b11b398 | Resolved dla konkretnego incydentu | Następca ent-ebca3fdb36f70a2c02e716ffa5692832 dokumentuje poprawione dyski i udane wdrożenie. |
| ent-c40dad69eb974db1cce8e94136eb011c | Resolved jako obsłużona korekta; zachować fakt | Korekta chronologii SUT endpoint migration nie musi pozostać otwartym zadaniem; aktualna zasada pozostaje w lrn-e83d717898c55179d8f972e62688a23a. |
| ent-8eb9ecb306faff15852e630ef936413b | Pozostawić do weryfikacji | Zdrowy startup nie dowodzi działania protected-resource metadata. Nie rozwiązywać ze względu na wiek lub inny udany smoke. |

### Gdzie HiveMind pomaga w zwykłej pracy PocketHive

- Zachowuje uzasadnienia trudne do odtworzenia z diffu: odłożenie SwarmLifecycleSteps, granice ownerów, powód uproszczenia Redis oraz kolejność prac nad Work Plane.
- Przechowuje operacyjne mechanizmy awarii: NFS i applied digest, status-full względem delta, HTTP 202 względem końca operacji, escaping szablonów Swarm. Te lekcje oszczędzają ponownej diagnozy.
- Łączy dokumenty, konkretne obserwacje i kolejne poprawki. Historia HAProxy i worker config pozwala rozpoznać dawny incydent jako naprawiony.
- Ujawnia luki procesu. Zestawienie zakończonych issues z otwartymi risks i blocked checks pokazuje, że „0 active issues” nie jest wiarygodnym skrótem kondycji projektu.

Nie zmierzono oszczędności czasu ani wpływu na liczbę błędów; ocena jest jakościowa, oparta na treści wpisów i zachowaniu odczytów. Wartość archiwum jest wysoka. Wiarygodność bieżącej listy „co robić dalej” jest ograniczona i wymaga sprawdzenia właściciela w repo.

### Gdzie przeszkadza i jak poprawić workflow

| Zaobserwowany problem | Ryzyko w codziennej pracy | Zmiana |
|---|---|---|
| Aktualny kod, working tree i deployment nie mają odrębnej stosowalności | Powrót do naprawionego CP-N01 albo deklaracja naprawy na serwerze na podstawie lokalnego diffu | Przechowywać i wyświetlać rewizję, lokalny snapshot oraz zakres środowiska dowodu |
| Rekomendacja pozostaje aktywna po wycofaniu subsystemu | Odtwarzanie osobnego parsera E2E, Node MCP lub starego metrics_query | Jawny następca i unieważnienie instrukcji dla usuniętego ownera; zachować zasadę |
| project_review proponuje mark_resolved za brak aktualizacji przez 7 dni | Zniknięcie obowiązującej reguły SRP, zamknięcie deferred lub niezweryfikowanego timeoutu | Wiek wyzwala review, nigdy nie stanowi dowodu rozwiązania |
| Stan jest osobno w issue, risk, learning i rule_check | Niespójne liczniki, powtarzające się stare blokery i sprzeczne briefy | Powiązać evidence z jednym ownerem stanu problemu; odczyty są projekcjami |
| Dawna zgoda na test Git trafia do startupu bez ograniczenia czasu/zakresu | Agent może potraktować historyczny wyjątek jako aktualne pozwolenie | Zgody jako dowód historyczny z zakresem; uprawnienia wynikają z aktualnych reguł i autoryzacji zadania |
| Porada operacyjna łączy diagnozę z usuwaniem danych | Odtworzenie starej czynności administracyjnej w innym stanie środowiska | Oddzielić diagnozę od mutacji, określić wymagany zakres autoryzacji; pamięć nie przyznaje uprawnień |
| Puste recent z kontekstu i jednocześnie dużo pamięci projektu | Fałszywy wniosek, że nie ma wcześniejszych ustaleń | Jawny effectiveScope i osobne sekcje projekt/feature; bez ukrytego fallbacku |
| Limity i brak paginacji | Audyt wygląda na kompletny mimo pominiętej historii; wiele zapytań i deduplikacja po stronie agenta | Stabilna paginacja snapshotu, hasMore/nextCursor oraz informacja o ograniczeniu wyników |
| Wiele historycznych blocked checks | Nowa sesja zaczyna od starej kolejki niezwiązanej z zakresem | Check pozostaje historią sesji; bieżący problem znika dopiero po powiązanym dowodzie rozwiązania |
| Duplikaty oraz niestabilne feature labels | Użyteczne lekcje giną, context feature nie trafia we wcześniejsze nazwy | Zarządzany słownik z jawnymi aliasami i scaleniem do następcy |

## Work task w repozytorium HiveMind

Propozycję implementacji wydzielono do [planu aktualności pamięci](../plans/memory-freshness-lifecycle.md). Plan jest właścicielem bieżącego zakresu przyszłych prac; ten raport zachowuje ustalenia audytu i historyczny inwentarz. Oryginalny audyt nie obejmował przeglądu implementacji serwera HiveMind.

## PocketHive — inwentarz pozyskanej pamięci

Inwentarz odzwierciedla stan odczytany przed dodaniem wpisu zamykającego ten audyt. Statusy poniżej są stanem zastanym, a nie wykonaniem rekomendacji. Pełne ID umożliwiają przygotowanie review planu w przyszłym tasku.

### Learnings — 23 rekordy

| ID | Zastany status | Summary |
|---|---|---|
| lrn-49902c6cfd500bdbddd26ae257af69c2 | active | Post-simplification repair queue CP-N01..CP-N09 remains supported by current source at 5e68eec4 |
| lrn-9f163bbd254551bc2a82d3017f69e101 | active | PocketHive RabbitMQ integration is broader than the shared worker input/output adapters |
| lrn-eb109fcade7b3076787bd204fcf3f973 | active | PocketHive now has a first HiveMap code-quality overlay, but repository indexing only sees it once the file exists in the indexed Git revision; with that committed overlay, HiveMap coverage jumps from 3 to 996 PocketHive code files while duplicate-responsibility stays at zero under the current exported/public heuristic. |
| lrn-eafc6da1092caee88b82ef815178974d | active | NFS-visible configuration apply requires content polling plus an exact applied-digest acknowledgement |
| lrn-0e9a3f4f352a621bc8f8cf4f2cadd29f | active | Compact deltas require a fresh full projection for operation postconditions |
| lrn-8921840239f8f5560a1831c2c6a8095b | active | Contract rewrites require producer-derived wire fixtures and complete routing-family coverage |
| lrn-8a78a6352fedb840ea8bdf50b0b82fc4 | active | HTTP 202 remove acceptance must wait for operation and registry postconditions |
| lrn-e83d717898c55179d8f972e62688a23a | active | SUT endpoint identity is canonical only in the endpoints map key |
| lrn-8b284f065c0171d42019d6cf349774bd | active | PocketHive documentation baseline exposes material SSOT and implementation drift |
| lrn-e95bfd4cbdddda34efa72504aa25bae4 | active | HiveMind tools may be available as deferred tools even when absent from the initial visible tool list |
| lrn-f5e533da438730a0070c626a28ad72ac | active | Redis source and destination list wiring is not live-editable in the PocketHive UI |
| lrn-a16cc7698fdda30134e8abf15d7bbff3 | active | Post-merge observability feedback clarified docs and degraded metrics proof gaps |
| lrn-07f784906e0676065741ac109f5b565e | active | Resolved observability plan defaults for alert logRef and ClickHouse metrics retention |
| lrn-d4b8e5d0d60dea8ac04b281b485ed060 | active | Observability decommission plan created with Loki/Log Aggregator removal as Phase 1 |
| lrn-78db7555991edd716d4126c32d23acec | active | Candidate observability direction: remove Loki/log-aggregator and evaluate ClickHouse-backed metrics as Prometheus replacement |
| lrn-c323ce2c365452cb7fe3c32fd5f0de24 | active | .50 managed proxy E2E failures are caused by HAProxy not reloading NFS-written runtime config. |
| lrn-ca0d2232b5ffbace538cb6301de3001e | active | .50 status-full evidence: worker data.config exists, but Swarm Controller aggregate drops per-worker config in context.workers[]. |
| lrn-f988f478d487ab347d0b7dc87ed06252 | active | .50 ClickHouse can block tx-outcome E2E when system logs fill the small data volume |
| lrn-eb4f268ca217fe7a9428309155bc8be3 | active | pockethive-development test deploy must update POCKETHIVE_VERSION runtime env before HiveForge update. |
| lrn-76478303a7cfcdb2c9d79add8015f428 | active | Docker Swarm expands {{ ... }} in service env values; app templates must be escaped at the Swarm adapter boundary. |
| lrn-8d6eade97d72a2865f92becd6f6620df | active | First Proxmox SWARM_STACK lifecycle group fails at E2E outcome observation, not at dynamic service launch. |
| lrn-167a22ae2d6c0887b3b6fc5ef4b0fa0a | active | HiveMind write tools may be hidden until Codex tool discovery is queried in-session. |
| lrn-aa22202b6b5c0ad851f4ae2f4e11a4f2 | active | HiveMind MCP must be registered with Codex MCP, not only VS Code MCP, for Codex sessions to see it. |

### Dziennik — 351 pozyskanych unikalnych rekordów

| ID | Typ | Zastany lifecycle | Summary |
|---|---|---|---|
| ent-4f34e0baa87650c7477da0ae268a2599 | decision | resolved | SwarmLifecycleSteps is explicitly excluded from the current simplification closeout |
| ent-16a7bab671c05aba5065e1b438b7750e | decision | resolved | Simplify control-plane sinks before reassessing CP findings |
| ent-94258256c9df2f1b9c34366728f3a437 | decision | resolved | E2E-04: canonical JSON Schema exclusively owns Controller bindings.work validation |
| ent-2c9717919177ea260b6a0e37104f9a3b | decision | open | SwarmLifecycleSteps implementation-unit separation deferred |
| ent-8c190b7c50f112348db8eb073ddbd638 | decision | open | PocketHive adopts mandatory implementation-unit separation before control-plane fixes |
| ent-c3f18f6eb140201e9b9923ff77a3075c | decision | open | Future black-box functional-test DSL should reuse PocketHive request generation by profile: SOAP and JSON are HTTP templates; ISO8583 and TCP are explicit template protocols. A DSL needs a single typed request/reply ingress that can execute locally or enqueue work for a compatible running swarm, rather than per-pack AMQP construction. |
| ent-49d3e4522642c6f2a064e4c8766ae1f4 | decision | open | REMOVE must clear and then observe network-binding absence through Network Proxy Manager before Controller/runtime-directory/registry teardown can proceed. |
| ent-e47e76272ee72969851304684c25eca3 | decision | resolved | History-policy E2E observes workload publications through an exchange tap and derives expected policy from the returned scenario template. |
| ent-a7d72d235f670e5f27d0c60d520e1947 | decision | resolved | START and STOP are idempotent state-convergence commands once the ready Controller already observes their target workload state. |
| ent-76412ffc1843c6693dea5993ccd45e88 | decision | resolved | Final proxy acknowledgement and lifecycle error-precedence contract |
| ent-c0f7e98e1de194bdfbb8c7ed0e221e78 | decision | superseded | Canonical proxy apply acknowledgement and lifecycle error precedence are now explicit |
| ent-2f322457851ae12975a46e9f2dc2e1cb | decision | resolved | PocketHive SSOT rule now covers authority for contracts, state, configuration, transformations, and success postconditions |
| ent-4dbc56215be1c0fda681de6e9acc76d7 | decision | resolved | Today’s SUT endpoint and documentation cleanup is PR-ready; broader SUT redesign deferred |
| ent-2a4af215b3453198c32adfcaae000d0a | decision | resolved | Archived obsolete scenario concepts and resolved eleven documentation findings |
| ent-fc524119402f785bbf7c72450398d17c | decision | resolved | Removed unimplemented signed capability catalogue from canonical contract |
| ent-4325767aa145893e481623f8d03cafef | decision | open | Redis source-list plan simplified to manual existing config editing |
| ent-4f395035d7bf987e6cc25b89cb4b804c | decision | resolved | Lifecycle state changes removed from CQT-5822 branch and deferred to separate PR |
| ent-ea559e243f793b061991ce26984c5e88 | decision | brak | Architecture now requires explicit runtimePath for UI runtime config editing. |
| ent-5b5c222ed30e1fde14f857734e206fe4 | decision | open | UI v2 live config edit must be documented and implemented as a sparse Orchestrator config-update flow. |
| ent-5b4e835e68a4a784a23806ff70895eef | decision | brak | Make ui-v2 the primary UI image and keep legacy UI archived |
| ent-7fa1b21c1384687ad8fe30d29617451a | decision | open | DB-query MVP contract decisions finalized for connection, result mode, retry, and validation operators. |
| ent-0bcf3ff4fb3fe16ad847b910e00667ec | decision | open | DB-only load worker MVP scope agreed: single query per message for Postgres and Oracle with configurable retry and pool. |
| ent-0b31bdc07578132a02274f35814f9a59 | decision | brak | Dynamic SWARM_STACK services must attach overlay networks through TaskSpec, not only ServiceSpec. |
| ent-089455455bf952e7e982c9fb0eccdbf6 | decision | brak | Dynamic Docker Swarm service names are physical runtime names; logical ids stay in labels and adapter maps. |
| ent-8bbe5eac693d2e311d89c73c6a993405 | decision | open | Capability lookup will use image name without version tag |
| ent-9913383bd00d6a28820cf9e763c40dba | decision | open | Split HiveMind and PocketHive single-node testing onto separate Proxmox Docker nodes. |
| ent-fc612f7690a9c716c7309951f5d107da | decision | brak | PocketHive remote image tooling now uses one SSOT image manifest. |
| ent-d34f82e23e396ecf4ad0c5592a8238b1 | decision | brak | Use Swarm leader 192.168.88.50, not Proxmox host 192.168.88.12, for PocketHive runtime and E2E access. |
| ent-9c833ba9403adf22332515c2ede64d5f | risk | open | Repository SSOT audit: eight additional critical ownership groups beyond RabbitMQ; five behavioral contradictions reproduced offline |
| ent-14b6407de01635861fd5c21cc79ca706 | risk | open | Repository-wide RabbitMQ audit finds remaining SSOT violations beyond repaired CP-N01 |
| ent-52e7e2d473e17bb057404b027a46387e | risk | open | HIGH: executor timestamps can invalidate otherwise successful lifecycle results |
| ent-17f3608020ef08108ed0eb5867bedd21 | risk | resolved | CRITICAL: Orchestrator control topology still has two active owners |
| ent-dff44f695394e4286e39177e089bd361 | risk | superseded | CRITICAL: Orchestrator control topology still has two active owners |
| ent-c904c083ac8aff4ed3b5229734812812 | risk | resolved | Full baseline/refactor A/B passes; earlier STOP convergence failure remains non-reproduced |
| ent-8c3b1641097da46055b6a07742842d02 | risk | resolved | Orchestrator SwarmSignalListener refactor passed reactor and stack rebuild, but complete local-swarm E2E gate remains open |
| ent-3a236240c203d9cf60131f4e47293754 | risk | resolved | E2E stabilization blocked by missing public swarm-start outcome after successful executor result |
| ent-2b47695d3100d5fe7b6b832717ddbc28 | risk | resolved | HIGH: forbidden REMOVE AMQP result can evade E2E-03 through mutated target/runtime identity |
| ent-caa33ab2ae72846c4f4aa1ee6477b332 | risk | resolved | HIGH: E2E identity matcher introduces a test-only target/runtime wire mapper |
| ent-823c2c2a91994c411f7f304b7f72af7a | risk | resolved | HIGH: SwarmSignalListener responsibility header contradicts changed terminalization behavior |
| ent-ab347d479a6808c7fb9d8abffc47ad3e | risk | resolved | CRITICAL: outcome owner role still has two active SSOT authorities |
| ent-f2f3ccad7f821c510f4c14d94d1a2daf | risk | open | HIGH: E2E-02 expands the existing SwarmLifecycleSteps kitchen sink |
| ent-293770e4041511f68d9caa44dd300136 | risk | resolved | CRITICAL: E2E-02 expectations remain self-referential and conflict with canonical outcome-target contract |
| ent-90ada1e0b25e52a68f3bb220de40deff | risk | resolved | Runtime gate blocked by host bridge filtering of container-to-PostgreSQL traffic |
| ent-6ad9bff81e434ac527e9268b7fa24b19 | risk | resolved | E2E-02 runtime gate blocked after third consecutive canonical rebuild cycle. |
| ent-ea5070b4633bbdb59b821fed769edbdf | risk | resolved | E2E-02 runtime verification remains blocked by a third canonical rebuild attempt. |
| ent-5508996a827770d9800113e33a06b256 | risk | resolved | HIGH: E2E-01 expands lifecycle convergence behavior inside the SwarmSignalListener kitchen sink |
| ent-aab4d5b251949cca3d3e09260e1446fc | risk | resolved | MEDIUM: E2E-01 has no focused STOP regression for the convergence refresh defect |
| ent-6272e0175c82681141b04f0b33921c47 | risk | resolved | CRITICAL review blocker: raw envelope JSON guard has active accessor/alias false negatives |
| ent-d2da3f0ccdaf8140fb0b26ae32eb9daf | risk | resolved | CRITICAL: E2E-01 architecture guard leaves active alternate test JSON boundaries |
| ent-c47f4bd47f0b3ce544d2ffab39d9367e | risk | resolved | E2E-01 final review found incomplete boundary enforcement and an unextracted public nested type |
| ent-324e199efea6d15643bb47c0dd0dba15 | risk | superseded | Control-plane E2E audit still permits false-positive operation coverage |
| ent-8eb9ecb306faff15852e630ef936413b | risk | open | MCP protected-resource metadata endpoint times out after healthy startup |
| ent-fb6a844924ef68c0b699cea3a6354b51 | risk | open | Control-plane rewrite retains several large kitchen-sink classes despite one top-level type per Java file |
| ent-cfa3b8a81fcafcda1b14a681fc813f90 | risk | open | Control-plane lifecycle rewrite remains blocked by duplicate authorities and identity/idempotency correctness gaps |
| ent-95f643593cd579810b45af498608bb42 | risk | open | HiveMap full code-quality scan at 2707cd78 found a High duplicate authority in the E2E control-plane audit. |
| ent-01f7ddd4214832b92ee873f9c91af22e | risk | resolved | HiveMap full-branch scan found a blocking High gap in E2E control-plane family observation. |
| ent-efe2ec36697940df3a0fea2327643758 | risk | resolved | HiveForge local Git source .54 is four commits behind the required final HEAD. |
| ent-6380101e042103ddbba202a07796354d | risk | open | Final boundary audit blocked only by forbidden status-envelope semantic redesign |
| ent-07b6fb253343b5a78747d56232de3ffa | risk | open | Lifecycle goal post-mortem found three critical contract-gate clusters |
| ent-7357f3d45f3ed8cd28984e7f2139fa21 | risk | open | Controller status contract has five concrete shape conflicts and a missing unit-level contract gate |
| ent-c3b4a58777e7a7879bc2b518ec1e97e6 | risk | resolved | Finalny gate .54 zablokowany na autoryzacji commitu i publikacji refu |
| ent-6bba215d053e2189b919dc45b078d42b | risk | resolved | Startup E2E fixture omitted required networkMode |
| ent-598cb6973bc8e95f313db6747399a62b | risk | resolved | HiveMap review found five critical authority and lifecycle-truth violations |
| ent-d508738a3fddc4b15ae5c8ae9feffba1 | risk | open | HiveMap SUT-focused audit found four additional contract and SSOT risks |
| ent-797909047538a0b51a5c76f07209a807 | risk | open | Workflow MCP review found symlink path escapes and stale validation deploy gate |
| ent-59179b6a8c58ee91378f8773242429e2 | risk | open | network-proxy-manager LogstashEncoder is orphaned observability configuration |
| ent-15273cf78c5e737564a6ea3c5501fd44 | risk | open | Scenario MCP validation can miss invalid inline Pebble, and observed PASS does not match current validator contract |
| ent-22f92f2aafeaef3d3bb4ebd7eac203fe | risk | open | UI v2 config editor still renders wrong current config values for several scenario fields. |
| ent-4eb0d3fc269ddc8b5040eb0c1647e3bc | risk | open | Two stale auth swarms stayed registered after governed cleanup reported lifecycle removal success. |
| ent-8d43816dba3a6546535f942bddde2053 | risk | open | UI v2 config modal still does not bind current field values because capability paths and runtime config paths differ. |
| ent-1039cd5c29fe85a89cd5ec1567518e52 | risk | open | Local single-scenario E2E rerun narrows the failure set to TCP bundle validation; HTTP/HTTPS proxy and ClickHouse pass locally. |
| ent-2135342d4d873945958a84146ebd54ee | risk | open | large-swarm E2E against .50 failed after the fresh dev-20260623 image deploy: 5 scenarios failed, 30 passed. |
| ent-91343323201af8f5974fbfe4f9edc666 | risk | open | HiveForge .50 update from new test branch is blocked by EBUSY on NFS-managed Prometheus artifact. |
| ent-3eddb0b01d1ad265e54c34543fddfdfd | risk | open | After journal schema fix, pockethive-development deploy reaches Docker executor but is blocked by deployment slot naming state. |
| ent-e87d9ef5dc131c489998fe7096c1716e | risk | open | Retry confirmed lifecycle uses pockethive-development but still fails contract validation before deploy. |
| ent-73ed6fa9c1a806713b409241db76f416 | risk | open | HiveForge development registration can start lifecycle but fails contract validation for PocketHive local HTTP ref. |
| ent-78fb1f33d21d9c1802723d2d4bac9b7f | risk | open | HiveForge deploy from local HTTP Git ref is blocked by registered project repository/ref approval state. |
| ent-00a0e5189af752ca71beba949b11b398 | risk | open | PocketHive swarm-full deploy is blocked by HomeLab/Proxmox infra using stale NFS mounts instead of per-VM block devices |
| ent-07da0a716aeac116c6181d92d9ff6bdf | risk | open | PocketHive v0.15.26 clean purge/redeploy failed before manual state-directory workaround |
| ent-80fb1c1611e9bc697b4c600900569571 | risk | open | Postgres healthcheck in Swarm can corrupt first init on slow NFS if start_period is too short |
| ent-88f345a63ee3400d33affa22f8d03029 | risk | open | Auth E2E cleanup can pass while leaving dynamic swarms because lifecycle requests are accepted but not awaited to outcome/removal. |
| ent-7f123234ef059aeef63ff76efafbb093 | risk | open | Large Swarm nodes .51-.53 have containerd on nearly-full rootfs, causing image pull failures despite separate Docker data disk |
| ent-d0376bcece53352d59f43af4746705a5 | risk | open | mcp-orchestrator-debug worker-configs still hits AMQP PRECONDITION_FAILED unknown delivery tag during runtime smoke. |
| ent-1d2a76b378e7e64d8a68557e36ccf8c4 | risk | open | Local registry on CT 254 is blocked by full root filesystem during PocketHive image push. |
| ent-acb95a8c9a9727b19b12e290e93e18a8 | risk | open | Large Swarm HF UAT exposed managed-root mismatch: environment declared shared root but bind-mounted HiveForge data existed only on manager .50. |
| ent-438db024a4f2647ef212bee84a238bab | risk | open | HiveForge MCP UAT still needs the changed PocketHive repo reachable from the target HiveForge instance. |
| ent-4219cb3acd5a8d5a60ca9c5f917773d7 | risk | open | Post-hardening smoke fails one auth/debug-tap scenario with 500 from POST /api/debug/taps. |
| ent-5532454ec81d683fdabb72e403bc2cd5 | risk | open | Swarm can report orchestrator 1/1 while Tomcat is dead after early tasks.postgres DNS failure. |
| ent-cd9416b2a523aaeec8e08503b9236771 | risk | open | RabbitMQ persisted test data can corrupt local Swarm redeploys; clean nodes should not need this reset. |
| ent-342959092253f33c650ffb9cac24416e | risk | open | Full PocketHive compose profile is too heavy for docker-swarm-mgr-1 while HiveMind/OpenSearch also runs there. |
| ent-0e88306ca369b9c62f85df9eb501b47f | feedback | resolved | SwarmSignalListener jest efektywnym wieloźródłowym sinkiem decyzyjnym, nie adapterem persistence |
| ent-f2d75e6acfce55a365b86208f0352611 | feedback | superseded | Ponowny review: duplikacja roli ownera usunięta; pozostają dwa blokery HIGH |
| ent-c40dad69eb974db1cce8e94136eb011c | feedback | open | Correction: the nested SUT endpoint id migration predates the lifecycle-control-plane branch and is already included in v0.15.35. |
| ent-8b3a294f4fff8694b51b4bc42d3afcf5 | feedback | open | Review: Redis listName implementation has no blocking code defect, but outcome UX and end-to-end verification remain incomplete |
| ent-c67d74e7ee8863f91698932887225579 | feedback | open | Review: broad RuntimeException catch hides genuine outcome-finalization failures |
| ent-4a22aa498e3fa408e4744eb24b2a5fb8 | feedback | resolved | Main hides lifecycle finalization race; branch turns it into a false user-visible stop failure |
| ent-660ce90480cd488b71423615825246eb | feedback | open | Final review: P2/P3 fixed, CQT branch must follow lifecycle SSOT PR |
| ent-618c30b787b5f45b0d910f2fa3d4c81f | feedback | open | Review of 8d5fd2aa found remaining concurrent start-finalization race |
| ent-907f130c253fe4c74f1ca9aac494dc14 | plan_ref | open | Artemis Work Plane and 3DS scheduled-delivery direction recorded as a future plan |
| ent-a1d9f9697e6b4a95ce47e32b8c5b32c8 | plan_ref | open | Następny krok: E2E-03 typed evidence-flow policy dla REMOVE |
| ent-f0086c80ab1fbc4b336c8f213e76d191 | plan_ref | open | Findings-first control-plane remediation plan created |
| ent-c88321d742a344c7b10fb42129c7f4d2 | plan_ref | superseded | Tracked control-plane stabilization and remediation plan created |
| ent-fb715bcdd31669873568fd91d57936d6 | plan_ref | open | Human-approved Swarm-Only Functional DSL POC is mapped and ready for a separate implementation chat; no PocketHive branch or code change was made. |
| ent-26d6f3fc303e481ff0c1f119fb93a833 | plan_ref | open | Resume from exact final HEAD 1c9f1b0d59179928b8802fabffad3a563a5a4d20; deploy/E2E pending |
| ent-82f226bfcfbebb4cc06f7474829766b8 | plan_ref | superseded | Resume from final HEAD 1c9f1b0d; publish/deploy and production-like E2E remain pending |
| ent-e9c3672605ec6f5c9694507cf081e998 | plan_ref | superseded | Resume from commit 9148c94b with publish/deploy and production-like E2E still pending |
| ent-a66d347c3c173b63f31432a85541dd96 | plan_ref | open | Control-plane contract enforcement boundary goal started TDD-first |
| ent-ac8fb51a48a125b9b4370bbf0c2d6329 | plan_ref | open | Lifecycle/control-plane single-authority rewrite goal started from cb7dc470 baseline |
| ent-632545b2f0af0901cf7d2d35266dfffe | plan_ref | open | Designed and reviewed stopped-only Redis source-list selector |
| ent-709d8bcd3aa7b0a5c7530c8f3eec7d18 | plan_ref | brak | Bee config SSOT staged migration was added to the scenario bundle validation refactor plan. |
| ent-28faaeec6a57b5ee729121282c14bd60 | plan_ref | open | Next UI v2 Arborist work should be a vertical bundle workspace slice |
| ent-65def33d870ef41cee45f29b436db096 | tooling_note | open | HiveMap repeat scan was available through ~/HiveMap/apps/mcp and has completed successfully. |
| ent-d04c12fada36502db9b1c0e03d74906c | tooling_note | superseded | Requested HiveMap rescan cannot run from the current client because no HiveMap scan MCP tool or local CLI is installed. |
| ent-4d98cab8d946f613220e08b61bcefe78 | tooling_note | open | Prometheus removal audit found stale Amazon Q tool/rule references |
| ent-36720e15cc4428938aad8409c9a856e3 | tooling_note | open | Test Git push exception for HiveForge deployments is explicitly approved by the human. |
| ent-1f16ab16462b5ee8836ccd70bd9cd14e | tooling_note | open | PocketHive .50 test deploy uses the pockethive-development HiveForge project and writable HTTP test Git repo. |
| ent-5ab994f4bdacf9261128bc92930cd57b | tooling_note | open | Repeatable .54 local-registry PocketHive smoke flow uses remote-images.sh, HiveForge runtime env, then large-swarm E2E target. |
| ent-baa5dd6a4dd5e1ad6606132827443fc9 | tooling_note | resolved | HiveForge MCP remove+deploy of PocketHive on swarm succeeded from gitRef main with POCKETHIVE_VERSION=latest. |
| ent-6b536ac606b25ad034d2323f468a6a55 | tooling_note | resolved | Large-swarm full E2E completed with green Maven build; ClickHouse scenario skipped once, then passed in isolated rerun. |
| ent-2799fb07b18354cde5f1ae1a76966c8f | tooling_note | resolved | Large Swarm containerd storage moved to /var/lib/docker/containerd on CT240-243 |
| ent-0a4747ce0c4964740f0f8a16c45dc50d | tooling_note | resolved | CT254 local registry moved from rootfs to dedicated 100G mount and old PocketHive tags pruned. |
| ent-5fc742831f534abd27142ee17d2f575c | tooling_note | brak | Local Proxmox config now drives repeatable Swarm stack deploys without repo-local secrets. |
| ent-5b76fe327821d66c875baca7cd2b5927 | tooling_note | resolved | HiveMind MCP is now available in Codex after moving config from VS Code-only registration. |
| ent-22601116a6717123fb688229b9dd868d | artifact_ref | resolved | E2E-02 committed as 36dd88fd |
| ent-7131084881b787b91a6d4cf4c845660b | artifact_ref | resolved | Final .54 E2E artifacts are absent after terminal remove |
| ent-2c16ca6aa7a82b7eafb8f2016d920576 | artifact_ref | resolved | Lifecycle ownership architecture contract passed documentation-conflicts HiveMap gate |
| ent-010e1a6600994cb8a804f3c2d185851b | artifact_ref | resolved | Created portable HiveMap SSOT and code-quality review for PocketHive revision cb7dc470 |
| ent-ba96874807f074fbfaa864173e02ed82 | artifact_ref | resolved | HiveMap release map refreshed and portability-verified for 0.15.35 |
| ent-04b32cb0b36c7427f67323d650d8bd4b | artifact_ref | resolved | Committed lifecycle follow-up and Amazon Q metrics documentation |
| ent-f52e089fd7fc59150d2e05e44f38139b | artifact_ref | resolved | Updated Unreleased changelog for stopped-only Redis listName runtime editing |
| ent-3e0ec63aabd267f286f08defd57c9882 | artifact_ref | resolved | Committed CQT-5822 lifecycle error surfacing and stop concurrency fix |
| ent-b4a36f2eca03ac4096239a4b953ba71a | artifact_ref | resolved | Fixed regression where Swarm Controller status-full aggregate dropped worker status-full data.config from context.workers[]. |
| ent-984169e80fc8dfadb228a8c69fcacf81 | artifact_ref | open | Recorded large-swarm auth E2E rerun that reproduces known remove/cleanup timing issue; target-profile PR changes stayed limited to e2e wrapper docs/config. |
| ent-ce39f24bd2feddf0e1222279c7302346 | artifact_ref | resolved | Built and pushed PocketHive dev images to the local registry for reduced UAT. |
| ent-6c160f7099940dabe7b093ae48f546b8 | artifact_ref | brak | Verified scenario workspace actions on Proxmox single-node runtime via official ingress. |
| ent-c7a3448a92841187fefd89226bb42a29 | progress | resolved | CP-N01 working-tree review: no new findings; accept within the reviewed scope |
| ent-d31bcdf8bba252d103ea5296d2dc50fb | progress | resolved | CP-N01 fixed in working tree: single Orchestrator topology owner, regression guards, verified official-ingress lifecycle |
| ent-720661ef3e62798855c93f402840dfe6 | progress | resolved | Control-plane simplification plan completed and archived |
| ent-87ae473a9ad7361dc56f570455247597 | progress | resolved | Fresh post-simplification review replaces stale CP findings |
| ent-c497044f69bc3272e1e1ada88adb826b | progress | superseded | Control-plane simplification production sinks nearly complete; final gates and E2E sink remain |
| ent-55d09fd01991baddbd58ed1125e99b48 | progress | superseded | Artemis Work Plane scope crosses SDK adapters and operational resource ownership |
| ent-ebfb013efee087a6140e45aedfda20b4 | progress | resolved | Narrowed Swarm Controller status publication after review |
| ent-dacc53d495e934017ec4e4f8b2b9ea4b | progress | resolved | Extracted Swarm Controller status publication from SwarmSignalListener |
| ent-24d6841449de101cb5be00f25173f868 | progress | resolved | Extracted Swarm Controller health-transition journaling from the listener |
| ent-97178209393f260a16f06b9f22a0017c | progress | resolved | Moved accepted worker status application and projection ownership out of SwarmSignalListener |
| ent-5e1f0f16ce6dae000547789db6c1266c | progress | resolved | Extracted worker error journaling and worker alert handling from Swarm Controller listener |
| ent-863a148723c4863377ea4797ac681d97 | progress | resolved | Swarm Controller REMOVE workflow extracted and component-tested |
| ent-56f7af7d8ae62f327e5e4a1ba3dd3f24 | progress | resolved | Orchestrator REMOVE convergence extracted from SwarmSignalListener |
| ent-a1d14a86c6892f2f46ebf193d629be01 | progress | resolved | Extracted CREATE and config observation convergence from Orchestrator listener |
| ent-293a2de610b3182c3ea9dbbfcddbc71d | progress | resolved | Removed E2E audit subsystem and began Orchestrator sink extraction |
| ent-47804869e2961bb97784cedb16d3773f | progress | resolved | E2E-05 whole-exchange audit implementation completed and focused/build verification passed |
| ent-5ebea7c1ada987aaa32bd2892fde9c6d | progress | resolved | E2E-05 focused red/green and affected reactor passed |
| ent-5d2fb2b0d4d8cf94c766e0a2a8fe340c | progress | resolved | E2E-04 final review: no unresolved findings |
| ent-08c12b0f7d58e8695f0341021a1168a2 | progress | resolved | E2E-04 implementation and full official-ingress gate passed |
| ent-cae28f35953db3734ac643d92bcde540 | progress | resolved | E2E-03 forbidden REMOVE result false-negative fixed |
| ent-e8d8c067e2de217636204e5f994e8cb1 | progress | resolved | E2E-03 explicit operation evidence-flow policy completed and reviewed |
| ent-2ac9452110f7502557e8e73bed900b60 | progress | resolved | ControlPlaneOperationCoverage używa canonical Target/runtime wire representations |
| ent-a491dc1f06d3a4bce761a2d835b19616 | progress | resolved | Listener header oznacza osobny refactor; prosty matcher E2E ma użyć canonical wire representations |
| ent-f86899b334dd40a412d0956551d751c5 | progress | resolved | Outcome owner role consolidated under ControlPlaneRoles in topology-core |
| ent-616647ec5326d02dc9422628eff69097 | progress | resolved | E2E-02 exact operation identity repaired and verified |
| ent-6032b96e555f54dc2e2ae3a1eb065ab3 | progress | resolved | E2E-02 review gap closed with parameterized identity mutation coverage. |
| ent-332e82998347257c4ab637e163658d58 | progress | resolved | E2E-02 exact operation identity gate passed. |
| ent-6c74be332bf6925dc9f5c8dcb33cf304 | progress | resolved | E2E-02 identity coverage implemented; runtime gate blocked by Docker Hub TLS. |
| ent-ee13f521e73bcc8a433bfc99f3059991 | progress | resolved | Resolved E2E-01 lifecycle convergence review blockers. |
| ent-cb9b5d6a991309e2d4436335521c3933 | progress | resolved | Replaced monolithic control-plane architecture guard with focused typed AST suite |
| ent-75247d34f5ad8ad3fdfe742b08f27db0 | progress | resolved | Raw Jackson canonical-envelope boundary removed and guarded by RED/GREEN TDD |
| ent-8f921b4f40aa19da3903a5720c3e0a36 | progress | resolved | E2E-01 repository-wide test JSON boundary completed with RED/GREEN evidence |
| ent-004b7fb61cc85cfd6a26bec70105ce2f | progress | resolved | E2E-01 review blockers fixed and all gates passed |
| ent-96df058351d9c0b3136b9e2789214dd6 | progress | superseded | Current refactor fixes the reported E2E codec duplication, not the other production findings |
| ent-7cf8eceed6651902283cb0d6ee1fcf32 | progress | resolved | Closed Critical item: E2E control-plane audit now uses canonical codec and separated owners |
| ent-0b88107a886498022def36b62cb5ac27 | progress | resolved | Full E2E 500s traced to a local Docker bridge endpoint failure for Toxiproxy; no repository workaround applied. |
| ent-7d74e6b5f086c66119dbefaa50cda35d | progress | resolved | Fixed build-hive test fixture and verified local smoke E2E |
| ent-c397cd502dbebfd80c99dbd81badf5a8 | progress | resolved | Critical 1 completed: E2E contract audit now delegates schema and routing validation to ControlPlaneCodec |
| ent-660189d23e4e32eebaa590cf09284dc0 | progress | open | Read-only audit: PocketHive already has shared on-disk templates and mature builder → processor → postprocessor pipeline, but no standalone transaction DSL boundary or test-facing request/reply contract. |
| ent-3658f4eafa34a20fe815e11a58e33669 | progress | resolved | Corrected upgrade version attribution for the SUT endpoint identity migration. |
| ent-f672da8f09bbe3b233b8170958fad182 | progress | superseded | Repository scenario bundles are already upgraded for the strict SUT/control-plane contracts. |
| ent-a04abee07182c7701b45b56142feea98 | progress | resolved | Commit 195c8480 was built, deployed through HiveForge swarm-full, and verified by the full saved large-swarm E2E pack. |
| ent-ba1349f14962d5779f6574f7f543cfcc | progress | resolved | Test Git source .54 now exposes commit 195c8480 on rewrite-lifecycle-control-plane; immutable image build/push is in progress before HiveForge swarm-full update. |
| ent-c5d76ad1ea9d43b2a423f7e4a601c222 | progress | resolved | HiveMap repeat code-quality scan passed against the final release-evidence baseline. |
| ent-8617fc087e1e273374440752c2b1e9ef | progress | resolved | Aligned the SwarmController create Javadoc with the canonical required-field request contract. |
| ent-bae6420f75045ba9526ae94e28915e3a | progress | resolved | Large-swarm release evidence is complete for the current lifecycle-control-plane worktree. |
| ent-01e9db12e500a21dd999d414fa54a04a | progress | resolved | Gałąź została zaktualizowana, wdrożona na large swarm i zweryfikowana pełnym E2E. |
| ent-b10e9bc3a1d1e0ccb60ff8023b91079c | progress | brak | Lifecycle cleanup and convergence changes committed and published for large-swarm verification. |
| ent-9b9319c9563245f729342633fdb8e42a | progress | resolved | Implemented Network Proxy Manager clear-and-observe postcondition for REMOVE. |
| ent-e19eaa1c9c3d12a56ea5ab5b605b3fb0 | progress | open | Large-swarm pre-deploy audit found a healthy but stale deployment and three removable stopped test swarms. |
| ent-801e12fc49a72831acdd45bce1daca19 | progress | resolved | SSOT gate removed independent applied-digest path derivation at exact commit 1c9f1b0d59179928b8802fabffad3a563a5a4d20 |
| ent-5ed36397c68747f802bc43fea267ba56 | progress | superseded | SSOT gate removed independent applied-digest path derivation |
| ent-9f698b17ef70b116c22f9476b216c714 | progress | resolved | Committed NFS-safe proxy apply, lifecycle failure semantics, and large-swarm E2E corrections |
| ent-1c89c5a5fccd61331651bceb35acd370 | progress | resolved | Canonical control-plane branch passed production-like large-swarm lifecycle E2E |
| ent-3993b8c3e590e5abf72a2a4f379efad6 | progress | resolved | Strict SSOT control-plane codec boundary implemented and verified |
| ent-3e07b5f83939743d13d9d82238fc18bb | progress | open | Control-plane SSOT boundary hardened with sealed DTO hierarchy and repository-wide architecture gates |
| ent-ee71805d4fba847929db7a86651e93bf | progress | open | Canonical ControlPlaneCodec enforcement boundary implemented; runtime verification blocked by existing status contract conflict |
| ent-e572b92cd763d1db440f3aed28fcc299 | progress | resolved | Capabilities/UI history exonerates architecture; status-delta workers are a July schema/emitter regression |
| ent-6344090ae6b558af8dbb9d176f1cc7ef | progress | brak | Authorized destructive wipe, fresh HiveForge redeploy, and full lifecycle E2E completed |
| ent-30b86b034c22983853f86c65f8143f1d | progress | resolved | Large-swarm lifecycle E2E executed; current-run lifecycle passed but gate exposed old orphan runtime and one WIP tap failure |
| ent-4655268fd3b416269f27cf8de1cf48fd | progress | resolved | Lifecycle control-plane rewrite implemented and verified through local and .54 workflow gates |
| ent-34dd4f249f27441b47c5f7388584023b | progress | open | Pre-commit audit confirms clean intended scope and no newly added secrets |
| ent-8a7dc061e467270baec273fe62624434 | progress | open | Lokalne i HiveMap final gates zielone; dokładny gate .54 oczekuje publikacji bieżącego refu |
| ent-a2cc838462851086502172bc077d8583 | progress | resolved | Phase 8 failure semantics and E2E isolation gate passed |
| ent-ac0b9bcde00a1a636970bee1b714c776 | progress | resolved | Critical duplicate SUT contract authority removed and verified. |
| ent-189ef8b6835c2c59ace80b822a8351cd | progress | resolved | Control-plane contract phase completed with SSOT, explicit network configuration, generated TypeScript lifecycle contract, and green verification gates. |
| ent-111ae181598934da3798f37b35f90d7a | progress | resolved | Controller and scenario runtime now share one workload/readiness authority |
| ent-5bdcfa85626e5b3990560f2e768706ef | progress | resolved | Verified remove slice completed with passing HiveMap gate |
| ent-29a5c2016b3bfa6dde5b3df314eb20e4 | progress | open | Verified remove slice implemented contract-first and passed full module test gate |
| ent-ceb673200a1b51ee7eddaf732efe7c22 | progress | resolved | Runtime filesystem authority consolidated and passed comparative HiveMap gate |
| ent-6852db59713695411c5ae971535e771b | progress | open | Started runtime filesystem SSOT slice with shared infrastructure module |
| ent-c300aa63265d270047faeb37ac3cd158 | progress | open | PocketHive base@v2 application awaits catalog deployment and documented authority migration |
| ent-2fcf02fa82f5fe3b4b929709e8e91c3b | progress | resolved | Filesystem remove handshake centralized and verified live |
| ent-64ebb6e18cd5d9213bec2b399c310337 | progress | resolved | Closed resolved SUT endpoint NPE issue #509 |
| ent-e1b2a973cfd3695b61ed456e4d3941a7 | progress | resolved | Prepared v0.15.35 CI release tag |
| ent-5cadb5507dd5c1fb48aa508850c8ed69 | progress | resolved | Fixed Docusaurus Docker build image resolution |
| ent-8c7a52aab9a2fc348b1fd0478e0a2446 | progress | resolved | Completed strict SUT endpoint identity repair and final review |
| ent-1b906545b6f9d21e2eb5a243ca1b0e14 | progress | resolved | SUT endpoint SSOT review findings fixed and verified |
| ent-6861ba18de82187a6dcad557357d1b59 | progress | resolved | Amazon Q Prometheus guidance replaced with ClickHouse metrics_query |
| ent-eda57b023a5f5d0ccfe8c62c05f1342b | progress | resolved | Resolved Redis listName review findings with UI stopped-state gate and explicit MCP instructions |
| ent-583c449c35ae52214352c6871a2b476b | progress | resolved | Implemented manual Redis dataset listName change for disabled single-source workers |
| ent-6b40057d087a571f121680301bdd88c7 | progress | open | Stopped-only Redis list selector is feasible but not as a UI-only change |
| ent-58859846457bcdbf43e9a9f8dac32cdc | progress | resolved | Known stop finalization race is narrowly suppressed; follow-up review found no remaining issues |
| ent-38ae0ccc75fa23176d950dc4b26f9e72 | progress | resolved | Outcome finalization race no longer becomes a user-visible lifecycle failure |
| ent-44f7d5ce423b7dc2f0f7a3eb6b442b4d | progress | resolved | Fixed correlation-blind E2E alert checks and duplicate Orchestrator failure logs |
| ent-eb02751e029ad4344642be8b385595da | progress | resolved | Documented CQT-5822 lifecycle error surfacing and logging cleanup in release 0.15.35 |
| ent-61d04aff8aaf33b4a705bfd4ea610323 | progress | resolved | Fixed false swarm-stop finalization alert caused by concurrent STOPPING transitions |
| ent-0a61f7971c0c4de95072d74e24639303 | progress | resolved | Implemented human-readable swarm start/stop failure surfacing and structured failure observability |
| ent-e8210673db206aa519a7e35974c5f578 | progress | resolved | CQT-5822 infrastructure exists; missing UI correlation and complete failure logging |
| ent-a3882ed844d8591a44833a2e4a552106 | progress | resolved | Removed orphaned network-proxy-manager Logstash logging configuration |
| ent-a5e8f855fda3b75e27f2bbc2d3cf9046 | progress | resolved | Audited CQT-5822 and CQT-5823 acceptance criteria against current PocketHive repo |
| ent-16d52097e1504dcfb3999c85f49fce7e | progress | resolved | Completed PocketHive documentation lifecycle cleanup and SSOT consolidation. |
| ent-384d8b24a67586d595b618cdfea00c26 | progress | resolved | Documentation audit found multiple completed plans still marked todo/in-progress and stale duplicate/status documents. |
| ent-011d224c880b622999b2810ba7d2da82 | progress | resolved | Canonical templating SSOT and legacy scenario MCP regression staging implemented |
| ent-3fef7d8743d812fb795e8237b3baa078 | progress | resolved | Scenario protocol gate and versioned validation evidence implemented |
| ent-beb4980078b0ffb5ddbcc7a226a99786 | progress | brak | Created fix/observability-review-followups branch and committed versioned observability review follow-ups |
| ent-b3220441d5fc209c9ee675ff984b8fe3 | progress | brak | Addressed observability decommission review feedback with docs, degraded metrics tests, and debug CLI ergonomics |
| ent-7df19bbda00c435a5fd28d326d6391cb | progress | brak | Ported Grafana pipeline dashboards from Prometheus targets to ClickHouse SQL targets. |
| ent-b46f1334fa13770bec5dba4a49b0c5cf | progress | brak | Committed ClickHouse metrics sink work before starting Grafana dashboard migration. |
| ent-2e3ea11dde1d7668a1f6ef16d098475f | progress | brak | Prepared 0.15.31 changelog and version bump on runtime-bee-identity-followup. |
| ent-c428134864209df699c588ad65ac4f06 | progress | resolved | Updated follow-up plan with focused gate results. |
| ent-52c587be272f08a39ea36036b5915926 | progress | resolved | Focused gates passed after Friday runtime bee identity work. |
| ent-68fef38cb1b6ea2b276587634a138291 | progress | resolved | Completed UI capability controls runtime test and wrote per-control report |
| ent-0112e7ffa8cdea5e8a296c990b5a9ec3 | progress | resolved | Diagnosed UI WebSocket TPS visibility for generator rate updates |
| ent-935c624dcc4ca65d25e7aae31adf4176 | progress | open | UI-originated generator rate update was visible through PocketHive MCP/status-full. |
| ent-b052eb6d61df8e1f09bbe4aa40767317 | progress | open | MCP smoke verified generator IO config visibility through status-full and documented underscore MCP tool names. |
| ent-7d82afe84bab6068ebb88acf4c399710 | progress | open | Hive UI now composes runtime config fields from worker and IO capability manifests using explicit runtime IO selectors. |
| ent-c520cc1ce7d7c57c6e27a3a08d68a743 | progress | open | Fixed one simple local-rest bundle to be mock-backed and diagnosed why e2e missed missing SUT descriptors. |
| ent-491e9cb70be13e53a392aee53520ec4a | progress | resolved | Scenario bundle validator now continues independent bundle checks when scenario id is missing. |
| ent-b2a423011ee52b67a681783b08c38ec9 | progress | resolved | Restored Portainer environment visibility after fresh DB initialization |
| ent-805ae1de3154e11ce5b9703eb8f97ee0 | progress | resolved | Moved Swarm shared Portainer backing store from backup HDD path to NVMe and restored Portainer |
| ent-ebca3fdb36f70a2c02e716ffa5692832 | progress | resolved | Replaced PocketHive swarm-full state NFS with local block-device-backed disks and redeployed successfully |
| ent-c325b040ffa0ac22cd7141614a578165 | progress | open | Checked Proxmox storage for existing 1G PocketHive block devices |
| ent-b200746fe19aeed6c5f8940d48941764 | progress | open | Clean HiveForge deploy of PocketHive v0.15.26 reached HF deployed state but runtime remained unhealthy without workarounds |
| ent-e49ec270755b3a6b136455bae255633a | progress | open | Completed actual PocketHive directory purge after Docker-only cleanup was insufficient |
| ent-09a20df9007fdd429c7a696e293de58b | progress | open | Purged Docker runtime on .50 preserving only HiveForge and Portainer |
| ent-ed393786b55d1bf16eb63ecfbdcec2a2 | progress | open | Documented exact HiveForge path contract and added Ansible action-root constant |
| ent-a049250689f695d69fd31ce0603c4ea9 | progress | open | Fixed PocketHive action-root state directory contract locally |
| ent-8f3f0e54edc7a4587c8953b3534062e5 | progress | open | PocketHive v0.15.26 GHCR build verified and redeployed on homelab after full Docker purge |
| ent-95b8ac9bd060a58fb68e3046fe1098a5 | progress | brak | Prepared PocketHive HiveForge actions for 0.5.2 action-root style |
| ent-411b6c047d1af8822954146a7c20dc88 | progress | brak | Diagnosed HiveForge bind-source validation gap blocking PocketHive swarm-full deployment. |
| ent-c0d4fb86c708c1e30ffbb8e598391975 | progress | brak | PocketHive v0.15.25 Docker image workflow completed successfully and HiveForge MCP action is starting. |
| ent-734bbff002a2b2c29d38ac55295f44eb | progress | brak | Preparing HiveForge MCP deployment for PocketHive v0.15.25 while Docker image workflow finishes. |
| ent-a7a0625ba3b2b60c09aab7cfab00ef6f | progress | resolved | Postgres Swarm healthcheck startup grace added to PocketHive HiveForge swarm profiles |
| ent-05e99e6a9785d82cb708e067b7bb5a53 | progress | resolved | PocketHive deployed through HiveForge 0.5 on Marax .50 with 21/21 Swarm services running |
| ent-ce006971642ca1b5d5d5d25b15daa135 | progress | resolved | PocketHive v0.15.24 deployed to HiveForge swarm environment via MCP-only swarm-full update. |
| ent-9e49a56ce90f5dd42c350cae6237120e | progress | resolved | End-of-day state: large Swarm UAT passed, PocketHive removed, HiveForge and PocketHive release tags prepared locally. |
| ent-5ae4b26916e99bd8e38616b2691bd1be | progress | resolved | Removed PocketHive from large Swarm and prepared local PocketHive/HiveForge release tags. |
| ent-934e6ce8792eb66f9ac95986f64fb967 | progress | resolved | Repeated clean HF remove/deploy on large Swarm after shared root setup succeeded. |
| ent-3040e23f1be7d994fa5b95add4145d54 | progress | resolved | Configured large Proxmox Swarm shared HiveForge root and redeployed PocketHive through HF successfully. |
| ent-36f315bcf2713b73cb2f9b7d8d981941 | progress | resolved | Committed PocketHive 0.15.21 HiveForge swarm-reduced release bump. |
| ent-fff81631ce609bd766b2e8292d501ffd | progress | resolved | Implemented first swarm-reduced HiveForge action path using prebuilt registry images. |
| ent-3a53b92094b8e0a3a76bd9acf623259d | progress | brak | Orchestrator startup hardening implemented and deployed with bounded Flyway retry plus healthcheck. |
| ent-fd535ac253f18bec41cf60a13b9d546e | progress | brak | Local PocketHive release tag deployed successfully to small host and large swarm. |
| ent-a95d1dc83764a1b12f9a9899e2e61f38 | progress | brak | PocketHive now declares HiveForge managed runtime files and a release artifact template for checkout-backed deploy_release. |
| ent-285e9a2e07cb98798dfcfb9844213b0b | progress | brak | Rolled b6c433f9 SSOT follow-up build to .50 pockethive-development via HiveForge and verified smoke swarm. |
| ent-0fa4ade470485bb9ef1e8d2494db0447 | progress | brak | .50 full large-swarm E2E after dev-20260624-1403-g3f3c5622-uihealth-local redeploy failed only the 3 managed-proxy scenarios. |
| ent-6e26159b6afb8446e73fa57a6850de42 | progress | brak | Assessed distance to Scenario YAML bee config matching status-full.data.config as SSOT. |
| ent-b3cfb2180467d1a2ebb31b62b9670661 | progress | brak | Cleaned old swarms through official Orchestrator/HiveForge paths and started three fresh UI config verification swarms on .50. |
| ent-f31dc586da28b9722adfab855f687df1 | progress | open | Deployed 9fec169d to .50 with tag dev-20260624-1126-g9fec169d-ui-config-local and verified status-full carries worker config. |
| ent-c33fb5f773d9135c168c71ff03f7ca1b | progress | brak | Expanded Docker Swarm small VM disks from 1G to 5G on .50-.53 |
| ent-af31264c8cc1f75318de8cf1b67881ab | progress | brak | .50 Loki restart loop is WAL corruption, not current Loki data volume exhaustion |
| ent-6627c73de6a1b4a3ae00e8caf274ca16 | progress | brak | Deployed current local UI/config fixes to .50 through HiveForge MCP |
| ent-6a00487c5dbbbf09b30a48a3d358a3e5 | progress | brak | Implemented UI v2 live config edit from Hive Scenario selected bee after docs-first contract update. |
| ent-98ea7edfb0d9d1f4e6f3ddaa1316a03f | progress | resolved | fa1fc35d deployed to .50 and large-swarm E2E passed including WIP group |
| ent-0b992d7f5198ed8ae99a1fa44b42ec30 | progress | resolved | Cleaned .50 PocketHive runtime through PocketHive MCP and HiveForge MCP. |
| ent-6fdd874fb8079ada3dbe9ea74e025af3 | progress | resolved | Orchestrator static validation preflight removed; Scenario Manager runtime preparation now validates current bundle before touching runtime dirs. |
| ent-e5f9ea00c7c497e551ab9ba2f26243ad | progress | resolved | Medium SSOT finding fixed: validation response contract moved to shared module and Orchestrator now deserializes BundleValidationResult. |
| ent-9879a38699c7cdef6c7d30cdfa78ad29 | progress | open | Published pockethive-debug-mcp to local HTTP Git repo and verified HiveForge inspect_repository succeeds. |
| ent-d380d0eff1e6fd3b4e60dd2e398c3820 | progress | brak | HiveForge .50 now accepts .54 HTTP Git URL, but PocketHive HTTP repo has no refs |
| ent-5c46bad95c38d643e1b6b7f91dae69bb | progress | brak | .54 HTTP Git service exists, but HiveForge currently rejects arbitrary http:// repository URLs |
| ent-eb9c07d20a78173701367ee4cc429ec6 | progress | brak | Checked .54 for HTTP Git source for PocketHive; none is currently exposed |
| ent-6ded17b0d726c861d2465fa2a7c1ec42 | progress | brak | Deployed local repo build to large HiveForge swarm using saved .54 registry flow |
| ent-e5b2040cd0a0d5f6b85d89b69cf75ea4 | progress | brak | Rule audit for Hive runtime inspector UI work |
| ent-9500accb5792e5c17bd677b3e7796d6a | progress | brak | Added Hive runtime inspector UI and made ui-v2 the primary ui image |
| ent-95cd55bb7f2e9605a8a8df0691e81fea | progress | resolved | Removed public computeAdapter control from runtime debug/cleanup contracts. |
| ent-2373e2173a87e15a62ae3af653e363da | progress | open | Diagnosed debug tap E2E failure and UI new-window auth behavior |
| ent-cfb11828d7a77b0c49f3e989a6b0b62f | progress | open | Full large-swarm E2E run after .54 deploy completed with one auth debug tap failure |
| ent-c2f6f5f3c5f9293db2fa5abd55b73408 | progress | resolved | Deployed local PR/debug MCP workspace build to PocketHive swarm-full via .54 registry and smoke passed. |
| ent-ed012e177409749bf619a848e274d946 | progress | resolved | DB query worker MVP implemented and smoke-tested on large HiveForge swarm |
| ent-2ed8a6a5c933b9863ccde1bb7ca9932c | progress | open | Implemented DB query worker MVP skeleton and verified Postgres execution path. |
| ent-085624fca903be8f56c66a2831240d97 | progress | brak | Created feature/db-query-worker branch and started DB-only load worker requirements discussion. |
| ent-d79e1a26a74160b724a0de50e0fb3c23 | progress | brak | Compacted Scenarios workspace rename/delete controls into contextual icon buttons. |
| ent-d4b73a739e4186454acd602b54dba481 | progress | brak | Restricted UI v2 scenario workspace rename to basename-only semantics. |
| ent-e07fecca9cacbecd295d311626f9ca19 | progress | brak | Implemented scenario workspace file actions for UI v2 Arborist tree. |
| ent-e09d182a96f9eec3c300de5499289822 | progress | brak | Added Scenario Manager permission regression coverage for bundle workspace endpoints |
| ent-a1d6f219f9bdfa2371131bd47a0ec287 | progress | brak | Fixed Scenario workspace tree arrow behavior and defunct badge visibility |
| ent-fb3fd62129482dd53bcc5000efc4358a | progress | brak | Scenarios page simplified into a single Arborist workspace tree |
| ent-fdcfdc89d54026923409e91c80e01849 | progress | resolved | Scenarios page left panel changed into bundle file browser. |
| ent-91f5c3f2144dc3fd080c3f57f9e1ecda | progress | resolved | Scenarios page now shows bundle file tree and read-only Monaco preview. |
| ent-5ce061932b0f56d76b3b079a8df4e53a | progress | resolved | New Swarm modal split changed to 1/3 bundle picker and 2/3 detail panel. |
| ent-8654f1152635e25731517f32aac3f3f0 | progress | resolved | New Swarm bundle file preview editor enlarged and redeployed to Proxmox single-node. |
| ent-206eab7c7ff9f3699c367dea8cbf34b8 | progress | resolved | UI v2 arborist work deployed to Proxmox single-node Docker runtime. |
| ent-2065c0144c05aca8b52b41f0b1e60803 | progress | open | Fixed UI v2 local dev login by adding explicit Vite backend proxy |
| ent-0ae4d22497eb19a5dc454736851c9d4e | progress | open | Implemented New Swarm read-only bundle file preview slice |
| ent-11183f35e8717e78a74cf9163ee33b0e | progress | resolved | Committed Proxmox review fixes and archived completed auth/users rollout plan |
| ent-c580d1d414ea25ac546f781eab9befc2 | progress | resolved | Fixed review findings for Proxmox Swarm docs and registry smoke scenario |
| ent-d9faa75c237eb040585812044de4c6e5 | progress | brak | Committed remote Swarm work and added Proxmox Swarm runtime guide. |
| ent-098b3979111f274b27b6a66137c02f4a | progress | brak | Worktree cleanup pass completed. |
| ent-0620a0753f0ea3317a5edf6252b366f9 | progress | brak | UI v2 Proxmox runtime backend errors fixed and verified. |
| ent-48ea4a58a785d7a0e39ff36b50351f1f | progress | resolved | Phase 8 full Docker Swarm E2E groups are green on .50. |
| ent-b1edb69c0da865d2e218a0d60ac801e2 | progress | resolved | Full Docker Swarm lifecycle E2E is green after shared runtime mount and DNSRR SUT/proxy fixes. |
| ent-5cbe44e4f93b7f4b3f8f9e36c15edec0 | progress | brak | Root cause found for full Swarm lifecycle E2E missing swarm-template outcome. |
| ent-0d0ad1adff1a3ecb0882649cd1d9c1b5 | progress | brak | Next Swarm work is lifecycle coverage beyond auth smoke. |
| ent-d7824ecfd7129709c743e097e3839f21 | progress | brak | First constrained Proxmox SWARM_STACK deployment on .50 passed smoke end to end. |
| ent-177e64fd24329a9390487c41eb40fb7b | progress | open | Prepared initial .50 Swarm mount root and labels for Phase 6 placement hardening. |
| ent-85443352db6a5b400b0c4e7787f8cf4d | progress | open | Rebuilt, redeployed, and retested .55 reduced runtime after image-name-only capability lookup changes. |
| ent-46a9b4c09e05b0706a6d745d8e57fc37 | progress | open | Started Phase 6 Swarm hardening with read-only inventory |
| ent-32c664ec878d64cf450f7d196d97456c | progress | resolved | Implemented capability lookup by canonical image name |
| ent-7b858af746f4b867e3ff3685e25e9586 | progress | resolved | Broadened .55 lifecycle coverage with scenario variables and workitem headers |
| ent-789bfb7124fdb9f5de869b8a2eb8bdd3 | progress | resolved | Added repeatable reduced runtime deploy helper for .55 |
| ent-bb7f228f3f8a2a526a278eeeea85474a | progress | resolved | Remote .55 lifecycle subset passed after adding explicit WireMock SUT runtime |
| ent-20018e58b91a0241a999c3ace660a612 | progress | open | Remote E2E smoke passes against pockethive-single-1 through .55 ingress |
| ent-db35fda41cbb2d8727fa3692a1792d10 | progress | open | Deployed reduced PocketHive runtime on pockethive-single-1 and passed ingress lifecycle smoke |
| ent-da35db15f0d3b0b8293247d9204dbdf8 | progress | open | Moved PocketHive Docker registry from Swarm manager .50 to docker-infra-1 .54 |
| ent-6db760b7b3edbc1c611e464dd7ecada6 | progress | open | Moved HiveMind API and OpenSearch to docker-infra-1 |
| ent-c9788b274f33ae90732321200b84166e | progress | open | Starting HiveMind migration from Swarm manager .50 to docker-infra-1 .54 |
| ent-810c75d55b347250b650da026b0f3c6c | progress | open | Prepared dedicated Proxmox Docker nodes for infra and single-node PocketHive tests |
| ent-7cd6616d0b3964cbff494be3a9662b1c | progress | open | Phase 4 partial: registry-backed single-node compose reached healthy ingress, but full profile overloaded docker-swarm-mgr-1. |
| ent-b55a249dc2687f2487dc6e74860480f5 | progress | resolved | Phase 3 complete: full PocketHive image set pushed to remote registry and representative remote pulls passed. |
| ent-1ab34933695e5152a59c17e156fbcf9f | progress | open | Remote Swarm plan is staged through registry, full image push, single-node runtime, then Swarm hardening. |
| ent-79a0fc8160bf58663472662be2a2babc | progress | brak | Phase 2 registry is deployed and verified at 192.168.88.50:5000. |
| ent-b6ecf8a997453ca52e8a2f4ab5111696 | progress | brak | Continued auth rollout stabilization on current PocketHive branch |
| ent-fee67163ba12996d6983f87a459cc9de | progress | brak | Initialized PocketHive in the global HiveMind service. |
| ent-f16368a9d9b7b35a2ac559f1f304e1a5 | progress | resolved | pockethive-development deployed from test branch with fresh d7928b38 images and runtime is running. |
| ent-b8a9e2116f05a103e167b3b32631cc08 | progress | resolved | HiveForge .50 update from mcp-bundle-validation-evidence-fix succeeded after clearing Prometheus NFS bind-mount artifact. |
| ent-154a7ce54897bc3d84fb415018319250 | progress | resolved | Reviewed merged MCP workflow branch and closed the main code-review finding before PR prep. |
| ent-8eeff041a9f08f5bf8e95b0a11b5dbdc | progress | brak | Large Proxmox Docker Swarm @webauth-loop E2E passed after target host correction |
| ent-0f38cb23671f72c275f4a00f154046e1 | progress | resolved | Added start-e2e-tests.sh target profiles and validated local-swarm with the WebAuth loop E2E. |
| ent-627da868959d8984c4539ed0fd00614c | progress | resolved | Merged and validated pockethive-agent-workflow-mcp on ClickHouse dashboard branch with local image tag dev-20260603-1520-g9bbbab8f. |
| ent-e82545d6c343f1e76e74161e4a860bcd | progress | brak | Deployed runtime-bee-identity-followup to .50 via HiveForge and full large-swarm E2E passed. |
| ent-288a166cdf8e2c5d64653ae9425d337b | progress | brak | Published runtime-bee-identity-followup to PocketHive HTTP test Git repo. |
| ent-2ec7797fa79a6e8a41d2db2544f702f5 | progress | brak | Completed fix 2: clearing-export now rejects unknown mode values before mode branching. |
| ent-7a48a81c98f66f9eae0bcbf212c73a78 | progress | brak | Completed fix 1: DB Query credentials can be required yet explicitly blank via manifest allowBlank. |
| ent-0bfe25ac3c6b5799021e68658e3592c5 | progress | resolved | Local build and targeted E2E completed after explicit local-rest-defaults config fix. |
| ent-4766bd895ea26bcf6b9f4cc053305ddc | progress | brak | Removed runtime worker config defaults and committed the change |

### Issues — 9 pozyskanych rekordów

Zachować historyczne resolved. Ich treść i dawne recommended fixes nie są automatycznie obowiązującą architekturą. Nie wykonywano ponownej weryfikacji wszystkich dziewięciu dawnych napraw.

| ID | Zastany status | Tytuł |
|---|---|---|
| iss-baad020dbb3977fd5d6f4b85e8b7509b | resolved | Large-swarm control-plane audit can pass without every used message family |
| iss-4c362733e6b031160e1784f9bf04acad | resolved | Large-swarm E2E target disagrees with authoritative service placement |
| iss-7d209b57252ce2160c829cc5a4289fdc | resolved | REMOVE omits network-binding cleanup and can succeed with proxy routes left active |
| iss-ff2fe00ed6591b10cb1bf7fbe65f0895 | resolved | History-policy lifecycle E2E misses final tap message on large swarm |
| iss-5a110ebc1bbdc121bf38e6371330f830 | resolved | HomeLab PocketHive cleanup playbook targets stale project directory |
| iss-eb8fe3217e357c2ed14cb89b22d30d92 | resolved | Control-plane v2 release gate omits new result/journal families and retains stale semantics |
| iss-2edf496be7b642e274d0696152a0e3ec | resolved | Control-plane v2 consumers and DTOs do not enforce version/runtime invariants |
| iss-10e120bdb2d21a676f74f484eebd7875 | resolved | Swarm Controller status events violate canonical control-event schema |
| iss-2186a707d9f7c33bb745bba099870cf5 | resolved | Large Swarm has 30 running orphan services absent from registry |
