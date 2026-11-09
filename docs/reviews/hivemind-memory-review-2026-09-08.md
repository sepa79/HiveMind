# Pamięć projektu HiveMind — audyt po wdrożeniu 0.5.5

Publication note (9 November 2026): historical lab addresses and host names below use documentation-only replacements; they are not connection instructions.

Data: 2026-09-08. Status: propozycja porządkowania; historyczne wpisy nie zostały zmienione.
Źródło: MCP 0.5.5 na `192.0.2.54:4011`, projekt `hivemind`, kod `9a9412c`.
Sesja audytu: `sess-ce6c5803ba5f06a9100c3a73ac5e36dc`.

## Inwentarz i zachowanie nowego startupu

- 220 wpisów przed zapisaniem wyniku audytu: 139 progress, 34 decision, 32 feedback, 5 tooling_note, 5 artifact_ref, 4 risk, 1 plan_ref.
- Lifecycle: 139 bez oznaczenia, 16 open, 62 resolved, 3 superseded. Żaden wpis nie ma applicability.
- 219 wpisów na main, 1 na unknown. Odczyt osobno dla każdego typu z limitem 200; żadna grupa nie osiągnęła limitu.
- Wyszukiwanie learningów i wszystkich issues w projekcie: po 0 rekordów.
- Startup main bez feature: 8 open_threads, 0 guidance, 0 rules, review_required=45, truncated=false.
- Te 45 rekordów to 33 decyzje i 3 tooling notes bez klasyfikacji stosowalności oraz 9 risk/feedback bez lifecycle. Licznik nie oznacza 45 potwierdzonych błędów.
- project_review zwrócił 23 rekomendacje dotyczące 16 różnych wpisów; część zaleca zamknięcie tylko na podstawie wieku.

Nowy filtr działa, ale nie odgaduje, że zapisany jako open problem został już naprawiony. Trzy z ośmiu wątków startupu mają dziś potwierdzone rozwiązania: blocker deployu, logowanie błędów startupu i wymaganie ograniczonego recall.

## Pierwsza partia: 12 wpisów do oznaczenia resolved

Każda operacja powinna zawierać konkretny powód i odnośnik do dowodu. Zachować treść historyczną.

| ID | Wpis | Dowód rozwiązania |
|---|---|---|
| ent-cb2714a127f6302cef8666be136ec519 | Blokada wdrożenia 0.5.4 przez HF .54 | Naprawa już w ent-f5522943cab33a142d2901b1e0b0f848; ponowne potwierdzenie: udany deploy 0.5.5, ent-883061a4b05d638c48073147884ed9d7. |
| ent-0d515c1e374b8ff1a6dbfd925c9fb9f2 | Diagnoza brakującego bindSourceRoot | Te same dowody. Zamknąć incydent; historycznej diagnozy nie promować jako bieżącej instrukcji wdrożeniowej. |
| ent-de13ebf2779ea92ffd23d55862b897dd | Wyciekanie nagłówków w błędach startupu API | [safe-error-log.mjs](../../hivemind-api/src/app/safe-error-log.mjs), jego testy oraz użycie logFatalError w [server.mjs](../../hivemind-api/src/server.mjs). Kod jest w wdrożonym 0.5.5. Zamknięcie dotyczy tego konkretnego miejsca logowania. |
| ent-c10b0e43c326ccaa4c98a2b6311f8ff1 | Brak wymogu current-only i budżetu startupu w planie | ent-b07b18c4803d6f62428753c28ac7a666; [plan](../plans/memory-freshness-lifecycle.md), [kontrakt recall](../specs/api/automatic-recall.md) i obserwowany startup 0.5.5. Nie oznacza ukończenia całego P0. |
| ent-d03ed33c954cc9341deaa8feed0d557f | Mapa gate records rośnie bez końca | #releaseGate usuwa rekord przy zerowym refCount; [test zwalniania gate](../../hivemind-api/src/http/request-operation-gate.test.mjs); ent-2a7bc894f59942201d4ec52021f502e4. |
| ent-bf8697c677fcc8f6facdcfd94b8c1b9e | Trasy po opaque ID omijają blokadę projektu | [project-concurrency.test.mjs](../../hivemind-api/src/http/project-concurrency.test.mjs), rewalidacja właściciela w app.mjs; ent-8b51ea45aebb79c1ee71fa11406b3420. |
| ent-47cc1c7e707af8e929d39834c0d83a2d | Stary marker po merge, niepełna walidacja i błędny flow docs | ent-54deec6581b1f3b381176cc22a2327c5; testy markerów w [app.test.mjs](../../hivemind-api/src/http/app.test.mjs) i [opensearch-storage.test.mjs](../../hivemind-api/src/storage/opensearch-storage.test.mjs). |
| ent-7caeba11b7b40eddc5629ccd318e3cff | Dawny review admin merge/token/reason i brak testów OS | ent-b393f6fd3289322b746fe061a100e8ed oraz późniejsze hardeningi i testy admin-token/storage. Obowiązuje udokumentowany single-writer i wznawialne operacje; nie przypisywać implementacji atomowości transakcyjnej. |
| ent-04fd5ae694bceb4dc2e27a57f93560f8 | Naprawa logowania czeka na commit/deploy | Opublikowane 0.5.2 i aktualnie wdrożone 0.5.5 zawierają naprawę. |
| ent-ab14520e290be4794d936978a55335e6 | Przygotowanie changelogu 0.5.2 nadal open | [Release 0.5.2](https://github.com/sepa79/HiveMind/releases/tag/v0.5.2), opublikowany 2026-07-22; changelog w repo. |
| ent-4625d10326351a9e6942f76650cc8928 | Commit 0.5.2 nadal open | Ten sam opublikowany release i historia repo. |
| ent-9618b3b70574738ef50a413fa44bf783 | Tag 0.5.2 nadal czeka na push | Release v0.5.2 istnieje na GitHub; odczyt gh release view wykonany podczas audytu. |

Samo resolved nie wycofuje decyzji z puli review wiedzy: lifecycle i applicability są niezależne. Dla historycznej diagnozy ent-0d515c1... trzeba również wyraźnie zakończyć klasyfikację stosowalności, np. przez korektę z applicability=retired. Nie ustawiać jej na current tylko dlatego, że diagnoza była kiedyś trafna.

## Trzy zastąpienia nieaktualnych informacji

| ID | Działanie | Dowód / następca |
|---|---|---|
| ent-1cb0c386dbae62278adb1650604d499a | superseded: proponowane wydanie 0.6.0 | Zastąpione jawną decyzją użytkownika ent-1229b3486afed926b7f97c573e0aaa5a: 0.5.5; VERSION i wydany tag. |
| ent-5c81bd84b5153658984303e9e5f993bd | superseded: lokalny Codex używa tarballa 0.1.5 | Konfiguracja z ostatniego deployu wskazuje HTTP MCP .54:4011, zweryfikowane 0.5.5; ent-883061a4b05d638c48073147884ed9d7. Nie rozszerzać tej obserwacji na inne klienty/komputery. |
| ent-eba5a170c99f3db5e4738fd9098247af | Zastąpić nieprawdziwy opis publikowania własnego obrazu OpenSearch | [Template](../../deploy/hiveforge/templates/docker-compose.yml.j2) używa opensearchproject/opensearch:2.17.1; CI publikuje obraz API. Obecny wariant swarm zawiera shell wrapper. To opis stanu kodu, nie zatwierdzenie tego rozwiązania — konflikt z ent-2a79ee4d... wymaga osobnego review. |

## Zachować obowiązującą wiedzę i nadać jej applicability

Nie ustawiać current zbiorczo na wszystkich 36 nieklasyfikowanych rekordach wiedzy. Przygotować krótkich, potwierdzonych następców z applicability.state=current, scope=project i evidence_refs; starsze wersje powiązać i zastąpić.

- Polityka recall: ent-7577129105c2c9af2403660b59c27619, dowód w automatic-recall.md.
- Blokady projektu i rewalidacja właściciela: ent-84578c044ef619eefd0de3d65b620ed9. Starsze ent-f4d6db6... i ent-fc2242b... można powiązać z jednym aktualnym opisem.
- Single-writer: zachować zasadę z ent-e445ff667cedccc5eaf47f3100a89f18; odświeżyć fragment o blokadach zgodnie z obecnym per-project gate. Nie usuwać zasady z powodu wieku.
- Kanoniczny standard marker: ent-b7b8618b5c076ff2ca43b4ce720b66f9 i ent-b8fc9c2221791b309e638942e1b147f1 — jedna bieżąca instrukcja z testami i docs jako dowodami.
- Instalacja pakowanego klienta i kolizja publicznej nazwy npm: ent-f03395e81b285d34825a5ecb8cc0ad9b, ent-3c7dc818fd0f173592a11ac67964ccbb, ent-fdf8ad5f1b4f0c59a91222d0d5b4bce8 — scalić zakres porady i wskazać repo docs; nie powielać trzech instrukcji.

Jednorazowa instrukcja resetowania dawnego commita ent-265a52c49c70eaa0b2b8df65fcc5dac1 ma pozostać historyczna/retired. Nie stanowi bieżącej zgody na operacje Git. Tak samo dawna obserwacja wielu procesów MCP ent-272a7172166562ba2b19aadd4e63edfa nie jest dowodem bieżącej awarii.

## Wpisy mieszane i cudzy zakres

- ent-f5522943cab33a142d2901b1e0b0f848 łączy zakończoną naprawę deployu z testowym wyjątkiem przechowywania sekretów w HF runtime-env. Oddzielić zakończony incydent od kwestii konfiguracji sekretów i jej właściciela w HiveForge. Działający deploy nie dowodzi zamknięcia tej drugiej kwestii; dawnej zgody nie promować jako stałej polityki.
- ent-2a79ee4d5803afee309bbe0724554e19 zawiera wymóg użytkownika zakazujący własnych obrazów i shell wrappers. Aktualny template swarm zawiera wrapper. Oznaczyć do wyjaśnienia konfliktu; nie zamykać według heurystyki wieku ani promować całej treści jako zgodnej z implementacją.
- ent-01161dae1b38bcd09a860809839dce90 łączy obowiązującą granicę thin MCP z propozycją przechowywania kryteriów i dowodów. Wydzielić potwierdzoną decyzję od zakresu funkcjonalności; nie zamykać całości jako ukończonej implementacji.
- ent-ec6132634abd4b2e4a6be860ac6ed18d i ent-23f470dd1a0e2438f27ff9e73c06ad0f opisują ten sam kierunek export/replace HiveMap; drugi jest dodatkowym dowodem. Ustalić jeden wpis właścicielski w HiveMap i powiązać oba raporty, bez zgadywania obecnego statusu implementacji.
- ent-4fd6d4d2656b05d2246ae657e1b8ea4e dotyczy UI HiveMap. Ustalić aktualny status i właściciela w tym projekcie zamiast trzymać to jako bieżący blocker HiveMind.
- ent-3989c40fad85f2eae27c5641af70239c i ent-0e922bb760ab2cc420fe3f42fb730b7c dotyczą HiveForge/Portainer na swarm .50. Nie uznawać ich za naprawione na podstawie udanego deployu docker-single na .54.
- Metadane projektu opisują pamięć jako działającą na Proxmox Docker Swarm. Uaktualnić opis do potwierdzonej instancji .54/docker-single albo nadać mu neutralny opis produktu.

## Potwierdzone ograniczenia review w 0.5.5

1. ent-3dc130b75eab9b0827e064d2bdc71b05 pozostaje aktualny: project_review zwrócił superseded decyzję ent-2082292cfa8f0c55656291ad892af0fa w signals.recent_decisions. Automatyczny recall jest naprawiony; historyczna powierzchnia review nie została jeszcze zmieniona.
2. project_review generuje mark_resolved po 7 dniach bez dowodu rozwiązania, także dla obowiązującej zasady single-writer. To kandydat do ręcznego przeglądu, nie podstawa wykonania operacji. Właściciel logiki: [service.mjs](../../hivemind-api/src/app/service.mjs), budowanie staleOpenEntries i recommendedActions.
3. Brakuje deduplikacji różnych wpisów o jednym problemie i kontroli rewizji przy korekcie. Przed wykonaniem listy ponownie odczytać wskazane ID, porównać treść/status i zapisać wynik każdej jawnej operacji.

Te ograniczenia są objęte pozostałym zakresem [planu aktualności pamięci](../plans/memory-freshness-lifecycle.md). Audyt nie zmienia kodu ani nie deklaruje ukończenia pozostałego P0.

## Kolejność wykonania

1. Ponownie zweryfikować i wykonać 12 wskazanych zamknięć oraz 3 zastąpienia; bez usuwania historii.
2. Rozdzielić wpisy mieszane, potwierdzić właścicieli spraw HiveMap/HiveForge i zaktualizować opis projektu.
3. Przygotować mały zestaw current guidance z dowodami; nie przenosić dawnych pozwoleń operacyjnych.
4. Powtórzyć session_start/context brief i sprawdzić zawartość, licznik review i budżet. Spadek samego licznika nie jest celem kosztem utraty obowiązującej wiedzy.

62 resolved i 3 superseded zachować jako historię. Historyczne progress/test/deploy nie wymagają masowego usuwania ani ponownego oznaczania wyłącznie z powodu wieku.
