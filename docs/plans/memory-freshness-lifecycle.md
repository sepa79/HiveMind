# Aktualność pamięci i spójny stan problemów

Status: in_progress — pierwszy zakres P0 (automatyczny recall) zaimplementowany; pozostałe zakresy nadal są planem. Dostarczony kontrakt opisuje [automatic recall](../specs/api/automatic-recall.md).
Data: 2026-09-07.
Źródło: [audyt HiveMap i PocketHive](../reviews/hivemap-pockethive-memory-review-2026-09-07.md).

## Stan realizacji — 2026-09-07

Pierwszy zakres P0:

- [x] Jeden selektor w API używany przez fs-jsonl i OpenSearch: start sesji/kontekstu, briefy i otwarte wątki.
- [x] Jawna stosowalność `current` / `needs_review` / `retired`, oddzielona od lifecycle wdrożenia; podstawowy scope projektu/gałęzi/feature.
- [x] Wykluczanie zamkniętych incydentów, zastąpionych porad, nieklasyfikowanej wiedzy, negatywnie ocenionych learningów i historycznych blocked checks z automatycznych zaleceń.
- [x] Jedno `recall`, wspólny limit 8192 bajtów UTF-8 danych odpowiedzi i 8 elementów pamięci, jawne pominięcia reguł; jedna kopia treści w MCP.
- [x] Historia dostępna na żądanie, bez zmiany statusów podczas odczytu; testy domenowe, REST dla obu adapterów i MCP.

Do ukończenia P0 pozostają: lifecycle i kontrola rewizji learningów, typowane powiązania z właścicielem problemu (także deduplikacja różnych rekordów tego samego concern), stabilna paginacja oraz review wskazujące konkretne konflikty i dowody. Obecne `review_required` jest licznikiem wstrzymanych niejednoznacznych rekordów, a nie nowym workflow review. Historyczne blocked checks nie są obecnie wiązane automatycznie z problemami. P1/P2 nie rozpoczęto; dane HiveMap/PocketHive nie były porządkowane.

Walidacja pierwszego zakresu: `npm run test:hivemind` — 220/220 testów; `git diff --check` — bez błędów. `HIVEMIND_TEST_OPENSEARCH_URL=http://127.0.0.1:19200 node scripts/opensearch-maintenance-smoke.mjs` — sukces na rzeczywistym OpenSearch 2.17.1: mappingi, filtrowanie/budżet/historia, idempotencja, merge/delete, brak resztkowych dokumentów testowych. Tymczasowy serwer zatrzymano.

Po review naprawiono trzy regresje: budżet jest stosowany raz do pełnych kandydatów wraz z metadanymi sesji/kontekstu; CLI `start`/`run` przekazuje i zapisuje `--feature`; błędny typ `repository_slug` trafia do walidacji API i zwraca 400. Dodano regresje REST dla obu adapterów (w tym retry), selektora i CLI. Aktualny wynik `npm run test:hivemind`: **235/235**; `git diff --check` bez błędów. Powyższy smoke rzeczywistego OpenSearch dotyczy wcześniejszej walidacji pierwszego zakresu; po tych poprawkach nie był powtarzany.

Kolejny review: naprawiono nieaktualny feature w lokalnym stanie CLI po rename. Dodano `GET /v1/sessions/:sessionId` i MCP `session_get` (sam aktualny rekord sesji, bez historii). CLI odświeża zakres przy `--resume` i po komendzie przed zapisem progressu; nie używa cache po błędzie API ani przy nieaktywnej sesji. Testy obejmują rename przed wznowieniem i podczas rzeczywistego procesu potomnego, błędy odczytu, odczyt REST na obu adapterach i mapowanie/routing MCP. Aktualna walidacja: **245/245** testów oraz `git diff --check` bez błędów. Zmiany pozostają lokalne; rzeczywisty smoke OpenSearch nie był ponawiany dla tego odczytu metadanych.

Zmiana kształtu odpowiedzi jest jawnie niekompatybilna z dawnym startupem. Implementacja w tym repo nie oznacza wdrożenia na działający serwer.

## Goal

Zapewnić krótki, aktualny kontekst dostarczany agentowi automatycznie oraz jawne porządkowanie pamięci z zachowaniem historii i dowodów. Historia jest dostępna na żądanie; zakończone incydenty i zastąpione porady nie wracają samoczynnie na start kolejnej sesji. Wiek decyzji ani zakończenie jej wdrożenia nie przesądzają o aktualności obowiązującej zasady.

## Context

Audyt wykazał 107/107 active learnings w HiveMap i 23/23 w PocketHive, w tym porady zastąpione późniejszymi decyzjami lub poprawkami. Snapshot PocketHive obejmuje 351 pozyskanych wpisów; brak paginacji nie pozwala zagwarantować kompletności. Pełne ID, rekomendacje i ograniczenia dowodów znajdują się w raporcie; pozostają historycznym snapshotem.

Przegląd przed implementacją potwierdził dodatkowo, że `recent_decisions`, `recent_risks` i `recent_tooling_notes` nie wykluczają `resolved`/`superseded`; `openFirst` tylko zmienia kolejność ryzyk. Limity osobnych sekcji nie zapewniają poprawnej aktualności ani niewielkiego rozmiaru całej odpowiedzi. Naprawa domyślnego odczytu jest wymaganiem P0, niezależnym od późniejszego porządkowania danych obu projektów.

Istniejące powierzchnie, od których należy zacząć:

- [REST memory review](../specs/api/memory-review.md): entry mark, entry corrections, project/admin review.
- [MCP memory review](../specs/mcp/memory-review-tools.md): entry_mark, entry_correct, project_review i narzędzia administracyjne.
- [Model użytkowy](../user-guide.md) i [semantyka sesji](session-semantics-slice.md): trwała pamięć pozostaje dostępna po zakończeniu sesji.
- [Context, learning, issue slice](context-learning-issue-slice.md): dotychczasowy zakres tych obiektów.

## Scope

P0: aktualny i ograniczony kontekst automatyczny, rozdzielenie stosowalności decyzji od wykonania zadania, lifecycle learnings, korelacja stanu problemu z dowodami, paginacja oraz review oparte na dowodach.
P1: rozszerzona stosowalność do rewizji/środowiska, feature aliases i koszt obsługi sesji. Podstawowe filtrowanie kontekstu i historycznych rule checks musi działać już w P0.
P2: jawny plan porządkowania danych HiveMap/PocketHive, po dostarczeniu i sprawdzeniu P0.

## Non-scope

- Implementacja zmian produktowych w HiveMap lub PocketHive.
- Masowe zmiany pamięci na podstawie samego wieku lub podobieństwa tytułów.
- Usuwanie historii, wykonywanie dawnych instrukcji administracyjnych lub rozszerzanie uprawnień z pamięci.
- Nowy system zarządzania zadaniami albo alternatywna baza w MCP.
- Deploy, commit lub push w ramach samego przygotowania dokumentacji.

## Constraints

Obowiązuje [AGENTS.md](../../AGENTS.md): NFF, jeden kontrakt REST/MCP, idempotencja create/append oraz granica MCP → REST → API → storage adapter. Nowe pola i operacje muszą być opisane w owning specs przed lub wraz z implementacją. Zachowanie fs-jsonl i OpenSearch musi być jawnie określone i zweryfikowane; nie zakładać transakcji obejmującej wiele rekordów bez dowodu obsługi przez adapter.

## Affected areas

- `hivemind-api/src/domain/`: kanoniczne schematy żądań, wyników, referencji i lifecycle.
- `hivemind-api/src/app/service.mjs`: bieżące mark/correct/review i orkiestracja odczytu.
- `hivemind-api/src/http/app.mjs`: istniejące oraz nowe trasy /v1.
- `hivemind-api/src/storage/`: trwałość, idempotencja, kontrola rewizji i paginacja.
- `hivemind-mcp/src/api-client.mjs`, `runtime.mjs`, `server.mjs`: cienkie mapowanie REST i rejestracja narzędzi.
- `docs/specs/api/memory-review.md`, `docs/specs/mcp/memory-review-tools.md`, `docs/user-guide.md`: właściciele dokumentacji zachowania.

Lista wskazuje obecnych właścicieli, nie zaleca dalszego powiększania dużych modułów. Podział odpowiedzialności ustalić przed dodaniem nowych przepływów.

## Proposed delivery

**Problem:** HiveMind przechowuje historię, ale aktualne zalecenia, statusy problemów i zakres dowodu mogą się rozchodzić. Przykłady: HiveMap nadal otrzymuje aktywne rady o wycofanych migracjach/Ollama/ZIP; PocketHive dostaje CP-N01 jako blocker mimo lokalnej naprawy, zalecenia utrzymania usuniętego audytu E2E i decyzje sugerowane do zamknięcia tylko przez wiek.

**Oczekiwany efekt:** Agent widzi krótką, uzasadnioną listę nadal stosowalnych zasad i otwartych problemów. Może dojść do historii oraz wykonać precyzyjną korektę pamięci, bez kasowania dowodów i bez automatycznego zamykania problemów.

Nazwy nowych endpointów i MCP poniżej są propozycjami do uzgodnienia w kanonicznych specs przed implementacją. Podczas dodawania taska potwierdzono istniejące entry_mark, entry_correct i project_review w specs, API service/HTTP oraz MCP client/runtime. Rozszerzyć te powierzchnie zamiast tworzyć równoległe odpowiedniki. Zachować jeden właściciel kontraktu i stanu w API; MCP pozostaje cienkim klientem REST.

### Zakres P0 — aktualny kontekst automatyczny

To warunek przyjęcia pierwszego dostarczonego zakresu, nie opcjonalne usprawnienie P1. Wspólna polityka doboru w API obejmuje `session_start` i `context_open` (dawne sekcje `context` / `startup_summary` zostały zastąpione pojedynczym `recall`), brief projektu/gałęzi oraz `context_get_open_threads`. Adaptery fs-jsonl i OpenSearch oraz odpowiedzi REST/MCP mają dawać zgodny wynik.

1. **Bieżąca pamięć domyślnie, historia na żądanie.** Automatyczny kontekst zawiera tylko stosowalne zasady, aktualne learningi i nadal nierozwiązane problemy pasujące do zakresu. Historyczne wpisy pozostają dostępne przez jawny odczyt historii lub wskazanie ID; taki odczyt nie przywraca ich do automatycznych rekomendacji.
2. **Jawne wykluczenia we wszystkich sekcjach.** Zastąpione (`superseded`) porady, zamknięte (`resolved`/`closed`) incydenty, zakończone raporty postępu i nieaktualne notatki nie trafiają do startupu także przez `recent_*`, highlights, podsumowanie czy linki z dołączoną historyczną treścią. Samo sortowanie „open najpierw” nie spełnia tego wymagania.
3. **Osobno stosowalność i wykonanie.** Model i projekcja odróżniają aktualność twierdzenia, status realizacji zadania oraz zakres dowodu. Dawna decyzja z zakończonym wdrożeniem może nadal być pokazywana jako obowiązująca zasada, jeśli jej stosowalność jest jawnie potwierdzona. Nie dołącza się przy tym historycznego raportu wdrożenia jako nowego zadania. Sam wiek albo `resolved` nie wystarcza do wycofania zasady; samo `active` lub brak lifecycle nie dowodzi jej aktualności. Niejednoznaczne rekordy trafiają do jawnego review, bez automatycznego uznania za bieżącą instrukcję lub za rozwiązany problem.
4. **Scope jest filtrem, nie tylko rankingiem.** Już P0 określa zakres projektu/gałęzi/feature dla dostępnych metadanych oraz osobną sekcję jawnie projektowych zasad. Rekord z innego zakresu nie staje się dopasowany dlatego, że brakuje trafień. Nieznany zakres jest ujawniany; puste wyniki pozostają puste, z odnośnikiem do jawnego wyszukiwania historii lub szerszego zakresu.
5. **Jeden budżet całej odpowiedzi.** Startup ma niewielki, liczbowo określony limit całej odpowiedzi, obejmujący wszystkie sekcje pamięci, reguły i podsumowania. Owning specs muszą ustalić miarę, domyślną wartość i deterministyczne priorytety w P0 przed implementacją; same limity liczby wpisów w osobnych sekcjach nie wystarczą. Nadmiar jest oznaczony jako `truncated` z możliwością jawnego pobrania szczegółów. Pominięcie wymaganych reguł musi być widoczne jako niekompletny kontekst wymagający ich pobrania, nigdy jako brak reguł.
6. **Bez duplikatów i dopełniania historią.** Jeden wpis lub jawnie powiązany problem jest streszczany raz w całej odpowiedzi; pozostałe sekcje mogą podać jego ID bez powtarzania treści. Deduplikacja opiera się na tożsamości lub jawnych powiązaniach, nie podobieństwie tytułów. Nie wypełniać wolnego budżetu rekordami zamkniętymi, zastąpionymi ani z obcego zakresu.
7. **Historyczne blokady nie są automatycznie bieżącymi problemami.** Dawny `blocked` rule check pozostaje w historii. W bieżących wątkach pojawia się stan powiązanego, nadal nierozwiązanego problemu; potwierdzone rozwiązanie usuwa go z tej projekcji bez przepisywania checka. Nowe applied dla tego samego rule_id nie rozwiązuje automatycznie dawnych naruszeń. Brak powiązania oznacza potrzebę review, nie automatyczne resolved ani bezterminowy blocker. `deferred` i `fixed_pending_verification` pozostają nierozwiązane, z jawnym statusem i zakresem.
8. **Dawna zgoda nie daje nowych uprawnień.** Historyczne wyjątki, pozwolenia i administracyjne `recommended_action` nie wracają jako bieżące upoważnienie do mutacji. Odczyt historii zachowuje ich pierwotny zakres.

Polityka musi działać od razu dla istniejących oznaczeń lifecycle, bez oczekiwania na P2. Dla niejednoznacznych danych historycznych trzeba opisać w P0 jawną ścieżkę review; nie wolno ukrywać braku wiedzy pod założeniem „stare = nieaktualne” albo „active = nadal prawdziwe”.

### Zakres P0 — korekta pamięci i kompletny odczyt

| Zdolność | Proponowana powierzchnia HTTP / MCP | Wymagany kontrakt |
|---|---|---|
| Zakończenie learningu opisującego incydent | POST /v1/projects/{projectId}/learnings/{id}/resolve; learning_resolve | expectedRevision, reason, typed evidenceRefs, zakres rozwiązania, actor/context, idempotencyKey; historia pozostaje |
| Zastąpienie learningu, również częściowej treści | POST /v1/projects/{projectId}/learnings/{id}/supersede; learning_supersede | Następca/następcy z aktualną treścią, replaces refs, uzasadnienie; stworzenie następcy i zmiana starego rekordu atomowo |
| Jednoznaczne połączenie stanu problemu z dowodami | Rozszerzenie istniejącego issue/entry lifecycle oraz osobne polecenie wiązania evidence | Jeden owner bieżącego stanu concern; entries, learnings i rule_checks wskazują ownera; problem może być unresolved, deferred albo fixed_pending_verification bez udawania resolved |
| Paginacja historii | Rozszerzenie istniejących search/list, w tym entry_search, learning_search, issue_list, context_get_open_threads | Stabilny porządek i kursor, snapshot/asOf, hasMore/nextCursor, effectiveScope; licznik tylko z jasno określonego zakresu; jawny limit/truncated |
| Wiarygodne review | Rozszerzenie project_review | Kandydat zawiera dowód, powód i proponowaną operację; wiek lub negatywny feedback oznacza needs_review, nie automatyczne resolved/superseded |

Typed reference musi identyfikować co najmniej projekt, rodzaj i ID obiektu. Link do zwykłego pliku jest dowodem, a nie ownerem lifecycle. Nie wolno automatycznie łączyć rekordów tylko po podobnym tytule: dawne i nowe CP mogą mieć ten sam numer, a ZIP HiveMap i ZIP scenariuszy PocketHive to różne kontrakty.

Dla zmian lifecycle wymagane są walidacja odnośników i własności projektu, brak self-reference i cykli supersession, kontrola expectedRevision (409 przy konflikcie), atomowość oraz idempotencja. Referencje między projektami mają jawny typ dependency i kontrolę dostępu; nie mogą ukradkiem przenosić uprawnień ani zmieniać obcego projektu.

### Zakres P1 — adekwatny kontekst i koszt obsługi

1. **Rozszerzyć metadane dowodu odpowiednie do typu:** observedAt, sourceRevision, opcjonalny worktreeDigest, environmentId/imageDigest dla obserwacji wdrożenia oraz ownerRef. Nie wymagać kompletu danych runtime od zwykłej decyzji projektowej. Ten etap rozwija filtrowanie rewizji i środowiska; nie odracza podstawowej polityki aktualności z P0.
2. **Zmniejszyć koszt minimum workflow:** jedna operacja bootstrap i jedna closeout mogą składać istniejące jawne kroki. Odpowiedź ujawnia wykonane kroki, błędy i tokeny; retry nie tworzy zdublowanych sesji. Nie ukrywać fallbacku i nie zamykać cudzych aktywnych contextów. Obowiązuje budżet odpowiedzi i deduplikacja z P0.
3. **Uporządkować features:** zarządzane nazwy i jawne aliasy; działają także dla historycznej pamięci. Brak dopasowania lub nieznana nazwa muszą być widoczne, bez zgadywania intencji.

### Zakres P2 — zastosowanie porządkowania do obu projektów

Przygotować review plan z konkretnymi ID z tego raportu i oczekiwanymi rewizjami. Plan pokazuje: zachować, rozwiązać, zastąpić, podzielić, wymaga rewalidacji. Wykonanie zapisuje autora, uzasadnienie, następców i wynik każdej operacji.

Najpierw zastosować lifecycle i odczyty, dopiero potem porządkować dane. Nie dopisywać teraz dziesiątek „poprawek learningów” jako kolejnych active obok starych active — to zwiększyłoby problem. Masowe operacje muszą być jawne, ograniczone listą ID i kontrolowane wersją, bez automatycznej oceny „stare = rozwiązane”.

### Kryteria akceptacji i scenariusze regresyjne

| Przypadek | Oczekiwany wynik |
|---|---|
| Startup/brief z mieszanką bieżących zasad, resolved incydentów i superseded porad o wysokiej importance | Historyczne incydenty i porady nie pojawiają się w żadnej automatycznej sekcji; wysoka importance i świeży timestamp nie omijają filtra |
| Dawna decyzja nadal obowiązuje, ale zadanie jej wdrożenia jest resolved | Aktualna zasada pozostaje dostępna w odpowiednim zakresie; zakończone wdrożenie nie jest przedstawiane jako otwarta praca |
| Lifecycle jest pusty albo active learning ma dowód sprzeczności | Jawne needs_review; brak bezwarunkowej rekomendacji i brak automatycznego rozwiązania problemu |
| Wszystkie pasujące incydenty są resolved, a porady superseded | Pusta lista bieżącej pamięci, bez dopełniania historią; jawny odczyt historyczny nadal zwraca te rekordy ze statusami |
| Jawne pobranie historii, potem kolejny session_start | Historyczny odczyt nie powoduje ponownego automatycznego dołączenia starych porad |
| Dużo długich wpisów; ten sam problem w risk, issue, context i startup_summary | Cała odpowiedź mieści się w jednym budżecie; problem streszczony raz; pominięcia jawne i szczegóły dostępne na żądanie |
| Wymagane reguły przekraczają budżet startupu | Jawnie niekompletny kontekst i wskazanie pobrania pozostałych reguł; brak cichego pominięcia lub deklaracji, że reguł nie ma |
| Brak trafień dla gałęzi/feature, ale wiele wpisów w innych zakresach | Brak automatycznego rozszerzenia zakresu; jawnie projektowe zasady pozostają oddzielone od pustej listy dopasowanych wpisów |
| Historyczny blocked bez powiązania albo z rozwiązanym ownerem | Nie pojawia się automatycznie jako bieżący blocker; przypadek niepowiązany wymaga review, a check zachowuje historyczny status |
| HiveMap: learning o migracjach z negatywnym feedbackiem i późniejszą zmianą polityki | Review wskazuje konflikt oraz canonical owner; po supersede stara porada jest dostępna historycznie, lecz nie jako bieżąca instrukcja |
| HiveMap: wycofane Ollama i import ZIP | Brief nie proponuje ich odtworzenia; pokazuje aktualny kierunek i zachowuje historyczną decyzję |
| PocketHive: CP-N01 naprawiony tylko w working tree | Brief lokalnego snapshotu wskazuje naprawę; zapytanie o stary commit zachowuje wcześniejszy finding; brak twierdzenia o deployu; CP-N02..09 nadal widoczne |
| PocketHive: częściowo aktualny learning o Redis | Następca pozwala na listName tylko w potwierdzonym zakresie; nie rozszerza edycji na destination/multi-source/connection |
| PocketHive: dawny osobny audit E2E i metrics_query | Stare instrukcje wycofane dla usuniętych ownerów; zasada walidacji producenta zachowana; nie dodaje się obejścia brakującego owner API |
| Obowiązująca decyzja starsza niż 7 dni | Brak automatycznej sugestii resolved wyłącznie przez wiek; reguła pozostaje stosowalna |
| Deferred SwarmLifecycleSteps | Nie jest przedstawiany jako naprawiony ani jako obowiązek wykonania w wyłączającym go zakresie |
| Resolved issue i nierozwiązany risk dotyczące różnych concerns | Liczniki/brief pokazują oba znaczenia; „0 active issues” nie staje się „brak problemów” |
| Powiązany risk, learning i historyczny blocked check | Rozwiązanie ownera concern aktualizuje bieżącą projekcję; historia checka i dowody nie są przepisywane |
| Stara zgoda na test Git lub administracyjna porada ClickHouse | Odczyt nie przyznaje uprawnień i nie tworzy bieżącej instrukcji mutacji |
| Ponad 100 entries i ponad 50 threads, równoległe dopisywanie | Pełne przejście stabilnego snapshotu bez luk/duplikatów, jawne scope i hasMore, uzgadnialne liczniki |
| Konflikt rewizji, cykl, błędny projekt i retry | Jawny błąd bez częściowego zapisu; poprawny retry idempotentny; brak nadpisania cudzej korekty |
| Puste recent feature | Odpowiedź ujawnia zakres; polityka projektowej sekcji briefu jest jawna i deterministyczna |

Testy powinny weryfikować kontrakty domenowe, rzeczywistą persystencję i zgodność REST/MCP oraz projekcji briefu. Dane przykładowe powyżej nadają się na fixture regresyjne po ograniczeniu do potrzebnych pól. Ten raport nie stanowi implementacji ani testu takich endpointów.

### Bezpośrednia rekomendacja

Zachować HiveMind w workflow obu projektów jako pamięć uzasadnień i dowodów. Poprawić najpierw aktualność odczytów i możliwość jawnej korekty, zanim zwiększymy liczbę obowiązkowych zapisów. W PocketHive bardziej niż brak pamięci szkodzi mieszanie dawnej instrukcji, obowiązującej decyzji i aktualnego zadania. Priorytet P0: krótki kontekst automatyczny z jawną polityką aktualności i scope, lifecycle learnings, powiązany stan problemów oraz paginacja historii. Rozszerzona obsługa rewizji/środowiska i automatyzacja sesji następują później.


## Risks

Jester verdict: **Yellow** dla proponowanej implementacji. Najważniejsze ryzyka wymagające dowodu:

- Częściowy zapis następcy i starego statusu po awarii lub retry; osobna weryfikacja fs-jsonl i OpenSearch.
- Niespójne strony wyszukiwania przy równoległych zapisach i zmienionych filtrach.
- Rozwiązanie zbyt szerokiego problemu po naprawie tylko jednego środowiska, rewizji lub fragmentu learningu.
- Przypadkowe potraktowanie historii uprawnień jako aktualnej autoryzacji.
- Powstanie drugiego ownera stanu przy łączeniu issue, entry, learning i rule_check.
- Wycięcie nadal obowiązującej decyzji przez utożsamienie resolved wdrożenia z nieaktualną zasadą albo odwrotne przywrócenie zamkniętego incydentu przez recent/highlights.
- Ciche przekroczenie budżetu przez powielone sekcje lub ciche pominięcie wymaganych reguł.

## Required hats

- Reviewer: zakres, pojedynczy owner kontraktu/stanu, zgodność REST/MCP, aktualność dokumentacji.
- Jester: awaria pomiędzy zapisami, konflikt rewizji, idempotentny retry, równoległe odczyty/zapisy, restart i granice projektu/backendu.

## Evidence required

- Testy domeny, API/storage oraz MCP mapping dla scenariuszy akceptacyjnych powyżej.
- Dowód zachowania po częściowej awarii i ponowieniu operacji na każdym wspieranym backendzie.
- Wyniki właściwych testów z [COMMANDS.md](../ai/COMMANDS.md), w tym `npm run test:hivemind` i `git diff --check` dla realizacji taska.
- Porównanie briefu i pełnego paginowanego odczytu przed/po na kontrolowanych fixtures z obu projektów.
- Testy całych odpowiedzi startup/brief, obejmujące wszystkie sekcje, filtr lifecycle/stosowalności, zakres, deduplikację i liczbowy budżet; zgodność obu adapterów oraz REST/MCP. P0 nie jest ukończone bez tych testów i zdefiniowanego limitu całej odpowiedzi.
- Repo-relative evidence i zapis wyniku realizacji w dedykowanej sesji HiveMind.
- Przed P2: lista konkretnych ID, oczekiwanych rewizji i proponowanych zmian; dowód zapisu następcy bez utraty historycznej treści.

Dodanie tego planu i raportu nie oznacza wykonania powyższych prac ani zmiany historycznych statusów.
