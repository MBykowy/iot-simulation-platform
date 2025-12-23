

### **Dziennik Projektowy**

**2025-10-07:**

*   Założono repozytorium projektu na GitHubie.
*   Sfinalizowano wybór stosu technologicznego: Java/Spring (Backend), React/Vite (Frontend), SQLite+InfluxDB (Bazy Danych), MQTT/REST/WebSockets (Komunikacja).
*   Zdefiniowano architekturę MVP oraz docelową. Projekt będzie realizowany w oparciu o strategię dwuetapową w celu minimalizacji ryzyka.
*   Stworzono pliki z dokumentacją (`README.md`, `API.md`).
*   Zainicjowano szkielet projektu backendowego w Spring Boot z wymaganymi zależnościami (Web, JPA, WebSocket, Integration-MQTT, H2).
*   Zainicjowano szkielet projektu frontendowego w React z użyciem Vite i TypeScript + SWC.
*   Skonfigurowano główny plik `.gitignore`.
*   Dokonano pierwszego commita, zawierającego strukturę obu projektów (`backend` i `frontend`) oraz pliki konfiguracyjne.

---
**2025-10-08:**

*   **Zaimplementowano podstawową pętlę danych:** Stworzono funkcjonalność, w której symulowane zdarzenie (`POST /api/events`) jest przetwarzane przez backend, zapisywane w bazie H2 i natychmiastowo wysyłane do frontendu, gdzie aktualizuje interfejs użytkownika w czasie rzeczywistym.
*   **Rozwiązano krytyczne problemy z połączeniem WebSocket:**
    *   Zdiagnozowano i naprawiono fundamentalny problem z niekompatybilnością środowiska, aktualizując **Node.js** do wymaganej wersji.
    *   Wyeliminowano niestabilną bibliotekę **`sockjs-client`**, która powodowała błędy w połączeniu z Vite. Przejście na **czyste WebSockets** ustabilizowało komunikację.
    *   Dodano kluczowe zależności w backendzie (`spring-boot-starter-tomcat`, `jackson-databind`), aby zapewnić poprawne działanie transportu WebSocket.
    *   Zaimplementowano w Reakcie odporny na `StrictMode` wzorzec zarządzania połączeniem przy użyciu hooka **`useRef`**.
*   **Stworzono pierwszą interaktywną funkcjonalność:**
    *   **Backend:** Zaimplementowano endpoint `POST /api/devices` do tworzenia nowych urządzeń wirtualnych.
    *   **Frontend:** Zbudowano komponent formularza w Reakcie, który pozwala użytkownikowi na dodawanie urządzeń z poziomu interfejsu. Nowo dodane urządzenie pojawia się na liście natychmiast dzięki komunikacji WebSocket.


---
**2025-10-15:**

*   **Zrealizowano pełną, dwukierunkową interakcję z zarządzaniem urządzeniami:** Użytkownik może teraz nie tylko pasywnie obserwować zmiany, ale również aktywnie modyfikować stan systemu z poziomu interfejsu.
*   **Backend:**
    *   Zaimplementowano brakujący endpoint `GET /api/devices`, co rozwiązało problem z błędem 404 podczas inicjalnego ładowania danych przez frontend.
    *   Stworzono endpoint `POST /api/devices` wraz z DTO (`DeviceRequest`) do przyjmowania i przetwarzania żądań tworzenia nowych urządzeń wirtualnych.
*   **Frontend:**
    *   Zbudowano komponent `AddDeviceForm.tsx` w Reakcie, zawierający formularz do dodawania urządzeń.
    *   Zintegrowano formularz z głównym widokiem aplikacji.
*   **Zamknięto pętlę interakcji:** Dodanie urządzenia przez formularz (`Frontend -> Backend`) powoduje zapis w bazie i natychmiastową aktualizację listy urządzeń na wszystkich podłączonych klientach (`Backend -> Frontend` przez WebSocket).
*   Rozwiązano błąd `prevDevices.find is not a function` w Reakcie, wprowadzając zabezpieczenia gwarantujące, że stan listy urządzeń jest zawsze tablicą.

---
**2025-10-16:**

*   **Zintegrowano fizyczny moduł sprzętowy (ESP8266) z platformą:** Osiągnięto pełny przepływ danych `Hardware -> MQTT -> Backend -> Frontend`, co stanowi kluczowy kamień milowy projektu i realizuje jego główne założenie.
*   **Rozwiązano krytyczne problemy z zależnościami i konfiguracją sieci:**
    *   **Backend:** Zastąpiono problematyczną bazę danych w pamięci **H2** na rzecz stabilnej, plikowej bazy **SQLite**. Wyeliminowano w ten sposób fundamentalny konflikt wersji bibliotek (`NoSuchMethodError`) spowodowany przez wbudowany broker MQTT. Znaleziono i zaimplementowano poprawną, kompatybilną zależność dialektu Hibernate dla SQLite.
    *   **Backend:** Wdrożono i skonfigurowano wbudowany broker **Moquette MQTT**, który uruchamia się razem z aplikacją Spring Boot, eliminując potrzebę używania zewnętrznych narzędzi (Docker).
    *   **Sieć:** Zdiagnozowano i rozwiązano problem z połączeniem ESP8266, przechodząc z lokalnego brokera (blokowanego przez firewall) na publiczny broker `HiveMQ` w celu zapewnienia niezawodnej komunikacji.
*   **Implementacja Logiki Odbioru Danych:**
    *   **Backend:** Skonfigurowano `Spring Integration MQTT` do subskrypcji odpowiedniego tematu. Stworzono serwis `MqttMessageService`, który odbiera surowe dane z MQTT, parsuje je i aktualizuje stan odpowiedniego urządzenia w bazie danych.
    *   **Hardware:** Przygotowano i wgrano na ESP8266 firmware, który odczytuje dane z czujników (symulowane losowe i odczyt pinów), formatuje je do JSON i publikuje na brokerze MQTT.
*   **Pełna Pętla Danych z Hardware:** Aktualizacje z fizycznego czujnika są teraz widoczne w czasie rzeczywistym w interfejsie użytkownika bez potrzeby odświeżania strony.
---
* **2025-10-16:**

*   **Zaimplementowano serce aplikacji – silnik reguł (`SimulationEngine`):**
    *   **Backend:** Stworzono model danych `Rule` oraz repozytorium `RuleRepository` do przechowywania reguł w bazie danych SQLite.
    *   **Backend:** Zbudowano serwis `SimulationEngine`, który zawiera logikę do:
        *   Wyszukiwania odpowiednich reguł na podstawie ID urządzenia, które wywołało zdarzenie.
        *   Parsowania konfiguracji reguł (trigger/action) zapisanych w formacie JSON.
        *   Sprawdzania warunków z użyciem biblioteki `JsonPath` do analizy stanu urządzenia.
        *   Wykonywania akcji, czyli modyfikacji stanu urządzenia docelowego.
    *   **Backend:** Zintegrowano `SimulationEngine` z istniejącymi punktami wejścia zdarzeń (`POST /api/events` oraz `MqttMessageService`), co pozwala na przetwarzanie zarówno zdarzeń symulowanych, jak i pochodzących ze sprzętu.
*   **Stworzono interfejs użytkownika do zarządzania automatyzacją:**
    *   **Backend:** Dodano endpointy `GET /api/rules` i `POST /api/rules`.
    *   **Frontend:** Zbudowano kompleksowy widok `AutomationView`, który wyświetla listę istniejących reguł oraz zawiera formularz `AddRuleForm` do tworzenia nowych.
    *   **Frontend:** Formularz umożliwia zdefiniowanie prostej reguły "IF-THEN" poprzez wybór urządzeń i warunków z list rozwijanych.
*   **Osiągnięto pełną pętlę automatyzacji:** Użytkownik może teraz z poziomu UI stworzyć regułę, a następnie za pomocą symulatora zdarzeń wywołać warunek i zaobserwować natychmiastową, automatyczną reakcję systemu w postaci zmiany stanu innego urządzenia.
  
---
* **2025-10-16:**

*   **Zaimplementowano serce aplikacji – silnik reguł (`SimulationEngine`):**
    *   **Backend:** Stworzono model danych `Rule` oraz repozytorium `RuleRepository` do przechowywania reguł w bazie danych SQLite.
    *   **Backend:** Zbudowano serwis `SimulationEngine`, który zawiera logikę do:
        *   Wyszukiwania odpowiednich reguł na podstawie ID urządzenia, które wywołało zdarzenie.
        *   Parsowania konfiguracji reguł (trigger/action) zapisanych w formacie JSON.
        *   Sprawdzania warunków z użyciem biblioteki `JsonPath` do analizy stanu urządzenia.
        *   Wykonywania akcji, czyli modyfikacji stanu urządzenia docelowego.
    *   **Backend:** Zintegrowano `SimulationEngine` z istniejącymi punktami wejścia zdarzeń (`POST /api/events` oraz `MqttMessageService`), co pozwala na przetwarzanie zarówno zdarzeń symulowanych, jak i pochodzących ze sprzętu.
*   **Stworzono interfejs użytkownika do zarządzania automatyzacją:**
    *   **Backend:** Dodano endpointy `GET /api/rules` i `POST /api/rules`.
    *   **Frontend:** Zbudowano kompleksowy widok `AutomationView`, który wyświetla listę istniejących reguł oraz zawiera formularz `AddRuleForm` do tworzenia nowych.
    *   **Frontend:** Formularz umożliwia zdefiniowanie prostej reguły "IF-THEN" poprzez wybór urządzeń i warunków z list rozwijanych.
*   **Osiągnięto pełną pętlę automatyzacji:** Użytkownik może teraz z poziomu UI stworzyć regułę, a następnie za pomocą symulatora zdarzeń wywołać warunek i zaobserwować natychmiastową, automatyczną reakcję systemu w postaci zmiany stanu innego urządzenia.

---
**2025-10-24:**

*   **Zrealizowano konteneryzację środowiska backendowego:**
    *   Stworzono plik `docker-compose.yml`, który definiuje i zarządza usługami: **Mosquitto** (broker MQTT), **InfluxDB** (baza danych szeregów czasowych) oraz **aplikacją backendową**.
    *   Napisano `Dockerfile` dla aplikacji Spring Boot, wykorzystując wieloetapowe budowanie w celu optymalizacji finalnego obrazu.
    *   Całe środowisko serwerowe jest teraz przenośne, powtarzalne i uruchamiane jedną komendą, co znacząco usprawnia proces deweloperski.
    *   Usunięto wbudowany w aplikację broker Moquette, rozwiązując konflikt i zapewniając architektoniczną spójność.
*   **Zaimplementowano zapis i wizualizację danych historycznych:**
    *   **Backend:** Zintegrowano klienta InfluxDB z aplikacją. Stworzono `TimeSeriesService` odpowiedzialny za zapisywanie odczytów z czujników w bazie InfluxDB.
    *   **Backend:** Dodano nowy endpoint API, `GET /api/devices/{id}/history`, który odpytuje InfluxDB o dane z zadanego okresu przy użyciu języka Flux.
    *   **Frontend:** Zintegrowano bibliotekę **Recharts** do wizualizacji danych.
    *   **Frontend:** Stworzono komponent `DeviceHistoryModal`, który po kliknięciu na kartę urządzenia wyświetla okno z wykresem.
    *   **Frontend:** Zaimplementowano zaawansowany, dynamiczny wykres, który:
        *   Na starcie pobiera dane historyczne z bazy InfluxDB.
        *   W czasie rzeczywistym "dorysowuje" nowe punkty danych przychodzące przez WebSocket.
        *   Utrzymuje stałą liczbę punktów na ekranie, aby zapobiec problemom z wydajnością.
        *   Umożliwia użytkownikowi przełączanie stylu wizualizacji (linia wygładzona / punkty).
*   **Udoskonalono symulator urządzeń (Python):** Dodano nowe wzorce generowania danych (piłokształtny, prostokątny), możliwość usuwania urządzeń oraz kontrolę nad szybkością zmian sygnału.

---
**2025-10-30:**

*   **Przeprowadzono kluczową refaktoryzację architektury backendu w celu poprawy spójności i redukcji długu technicznego:**
    *   Wprowadzono **warstwę serwisową** (`DeviceService`, `RuleService`), przenosząc do niej całą logikę biznesową z kontrolerów API (`ApiController`) oraz odbiornika MQTT (`MqttMessageService`).
    *   "Odchudzono" `ApiController`, który teraz pełni wyłącznie rolę warstwy wejściowej, delegując wszystkie operacje do odpowiednich serwisów.
    *   Ujednolicono logikę przetwarzania zdarzeń. Niezależnie od źródła (HTTP REST, MQTT), każde zdarzenie jest teraz obsługiwane przez tę samą metodę `DeviceService.handleDeviceEvent`, co zapewnia spójność działania i eliminuje duplikację kodu.
*   **Uzupełniono podstawową funkcjonalność CRUD (Create, Read, Update, Delete):**
    *   **Backend:** Zaimplementowano w warstwie serwisowej i kontrolerze endpointy `DELETE` (`/api/devices/{id}` oraz `/api/rules/{id}`).
    *   **Frontend:** Dodano do interfejsu użytkownika przyciski umożliwiające usuwanie urządzeń (na `DeviceCard`) oraz reguł (na liście w `AutomationView`), zamykając podstawowy cykl zarządzania obiektami w systemie.
*   **Zrealizowano refaktoryzację architektury frontendu w celu przygotowania aplikacji do dalszej rozbudowy:**
    *   Wprowadzono bibliotekę do zarządzania stanem globalnym **Zustand**, tworząc centralny magazyn (`appStore`) dla całej aplikacji.
    *   Przeniesiono logikę zarządzania listą urządzeń (`devices`) oraz danymi do wykresów (`chartData`) z komponentów do globalnego `store`.
    *   Wyizolowano całą logikę połączenia WebSocket do dedykowanego, niestandardowego hooka (`useWebSocket`), który komunikuje się bezpośrednio z `appStore`.
    *   Podzielono główny komponent `App.tsx` na mniejsze, bardziej wyspecjalizowane części: `App.tsx` (zarządzanie motywem i globalnymi hookami) oraz `MainLayout.tsx` (odpowiedzialny za layout i renderowanie widoków).
*   **Naprawiono i usprawniono wizualizację danych historycznych:**
    *   Zdiagnozowano i naprawiono błąd, w wyniku którego wykresy dla różnych urządzeń pokazywały te same dane. Logika została przeniesiona do `appStore` i jest teraz poprawnie powiązana z aktywnie wybranym urządzeniem.
    *   Dodano do wykresu funkcjonalność "inteligentnego" wykrywania i wyboru wyświetlanych zmiennych, co pozwala na analizę danych z czujników o wielu polach.

---
**2025-11-07:**

*   **Uruchomiono zaawansowany generator danych dla urządzeń wirtualnych:**
    *   **Backend:** Powstał nowy, działający w tle serwis (`DataGeneratorService`), który cyklicznie tworzy dane dla aktywnych symulacji.
    *   **Backend:** Rozszerzono model `Device` w bazie danych o konfigurację symulacji i dodano odpowiednie endpointy API do jej kontroli.
    *   **Backend:** System pozwala teraz na symulowanie wielu parametrów (np. `temperatury` i `wilgotności`) jednocześnie dla jednego urządzenia, każdy z własnym wzorcem (sinusoida, losowy).
    *   **Frontend:** Stworzono nowy interfejs w oknie modalnym do zarządzania symulacją, w tym do dynamicznego dodawania i konfigurowania symulowanych pól.
*   **Wprowadzono kluczowe usprawnienia w silniku reguł i obsłudze urządzeń:**
    *   **Backend:** Silnik reguł obsługuje teraz **reakcje łańcuchowe**, gdzie akcja jednej reguły może wyzwolić kolejną. Zaimplementowano zabezpieczenie przed nieskończonymi pętlami.
    *   **Backend:** Urządzenia dodawane przez MQTT otrzymują teraz nazwę z payloadu wiadomości lub, w razie jej braku, nazwę domyślną. To rozwiązuje problem anonimowych urządzeń.
    *   **Frontend & Backend:** Dodano funkcjonalność zmiany nazwy istniejących urządzeń.
*   **Naprawiono krytyczne błędy:**
    *   Rozwiązano problem z awarią aplikacji spowodowaną niezgodnością schematu bazy danych po modyfikacji modelu `Device`.
    *   Naprawiono błąd logiczny, który blokował zapis danych symulacyjnych do InfluxDB. Ujednolicono format generowanych danych JSON, co przywróciło ich widoczność na wykresach.
---
**2025-11-14:**

*   **Przeprowadzono gruntowną restrukturyzację architektury frontendu:**
    *   Wdrożono bibliotekę `react-router-dom` do obsługi routingu po stronie klienta, przekształcając aplikację w pełnoprawne SPA (Single Page Application).
    *   Zastąpiono monolityczny komponent `Dashboard` modularnym podziałem na osobne widoki: `DashboardView` (panel sterowania), `DevicesView` (lista i detale urządzeń) oraz `AutomationView` (zarządzanie regułami).
    *   Zaimplementowano komponenty `MainLayout` i `Sidebar`, tworząc stałą ramę nawigacyjną dla całej aplikacji.
*   **Zoptymalizowano przepływ danych w widokach:**
    *   Zmodyfikowano widok `AutomationView` (dawniej `RulesManager`), eliminując zależność od danych przekazywanych przez komponent nadrzędny (`props`). Widok został podpięty bezpośrednio do globalnego stanu `Zustand`, co rozwiązało krytyczny błąd (`undefined devices`) występujący przy bezpośrednim wejściu na podstronę automatyzacji.
        **2025-11-20:**
---
**2025-11-20:**
*   **Uruchomiono aplikację w środowisku produkcyjnym i dopracowano jej wygląd:**
    *   **Wdrożenie:** Zastosowano **API Gateway (Nginx)**, dzięki czemu cała aplikacja (frontend i backend) jest dostępna pod jednym adresem. Całość została zamknięta w kontenerach `Docker Compose`, tworząc gotowe do uruchomienia środowisko.
    *   **Dostęp Publiczny:** Użyto `Cloudflare Tunnel` do wystawienia lokalnie działającej aplikacji do publicznego internetu, co omija blokady sieciowe np. w akademiku.
*   **Wprowadzono duże zmiany w interfejsie użytkownika (UI/UX):**
    *   **Wygląd:** Dodano przełącznik motywów **Dark/Light Mode**, zarządzany przez globalny stan w `Zustand`.
    *   **Responsywność:** Przebudowano layout, wprowadzając wysuwane menu boczne (Drawer), dzięki czemu aplikacja dobrze wygląda i działa na telefonach.
    *   **Feedback:** Wdrożono globalne powiadomienia ("snackbar"), które informują użytkownika o wyniku jego akcji (np. "Urządzenie dodane pomyślnie").
*   **Przeprowadzono refaktoryzację i poprawiono jakość kodu:**
    *   **Backend:** We wszystkich serwisach i kontrolerach zmieniono sposób wstrzykiwania zależności z pól (`@Autowired`) na zalecane **wstrzykiwanie przez konstruktor**.
    *   **Frontend:** Zaktualizowano przestarzałą składnię komponentów `Grid` (Material-UI) i naprawiono inne ostrzeżenia zgłaszane przez IDE.
---
**2025-11-28:**

*   **Zaimplementowano reguły oparte na agregacjach czasowych:**
    *   **Backend:** Rozszerzono `SimulationEngine` o zdolność do ewaluacji warunków opartych na danych historycznych. Wykorzystano do tego dedykowaną metodę w `TimeSeriesService`, która wykonuje zapytania agregujące (np. `mean`, `max`) w języku Flux do bazy InfluxDB.
    *   **Frontend:** Zaktualizowano interfejs `AddRuleForm`, dodając opcję konfiguracji warunków opartych na oknie czasowym.
*   **Wdrożono strumieniową przeglądarkę logów systemowych z persystencją:**
    *   **Backend:** Skonfigurowano niestandardowy appender Logbacka (`MultiTargetLogAppender`), który kieruje logi aplikacji do dwóch celów jednocześnie: strumieniuje je przez WebSocket na dedykowany temat oraz zapisuje w InfluxDB jako dane szeregów czasowych.
    *   **Frontend:** Stworzono nową podstronę `/logs`, która subskrybuje temat WebSocket i wyświetla logi w czasie rzeczywistym. W celu zapewnienia wysokiej wydajności, zaimplementowano wirtualizację listy (`react-virtuoso`). Interfejs wzbogacono o funkcje filtrowania oraz mechanizm zastępowania identyfikatorów UUID urządzeń ich czytelnymi nazwami.
*   **Sfinalizowano moduł wizualizacji danych historycznych:**
    *   **Frontend:** Dodano do widoku wykresu interfejs pozwalający na dynamiczną zmianę zakresu czasowego (`1m`, `15m`, `1h` itd.).
    *   **Frontend:** Rozwiązano problem nieprawidłowego skalowania osi czasu poprzez implementację dynamicznie aktualizowanej domeny, co zapewnia, że wykres zawsze odzwierciedla wybrany przez użytkownika zakres.
    *   **Frontend:** Wprowadzono alternatywny widok tabelaryczny, umożliwiający analizę surowych danych, w tym wartości nienumerycznych.
*   **Zrefaktoryzowano mechanizm zarządzania połączeniem WebSocket:**
    *   **Frontend:** Zastąpiono pierwotną implementację (hook `useWebSocket`) architekturą opartą na **React Context (`WebSocketProvider`)**. Rozwiązanie to zarządza jedną, globalną instancją klienta STOMP, zapewniając stabilną i niezawodną obsługę wielu subskrypcji z różnych komponentów aplikacji.

---
**2025-11-30 (Optymalizacje i Bugfixy):**

*   **Optymalizacja Wydajności Logów:**
    *   Próby rozwiązanie problemu "skaczącego scrolla" i zacinania interfejsu przy dużej ilości logów.
    *   Wdrożenie buforowania (**Batching**) i synchronizacji z odświeżaniem ekranu (**requestAnimationFrame**) w hooku `useLogStream`.
    *   Zastosowanie stabilnych kluczy (Stable IDs) dla elementów listy wirtualnej.
*   **Naprawa Błędów Renderowania:**
    *   Wyeliminowanie nieskończonej pętli renderowania (`Maximum update depth exceeded`) w komponencie wykresu poprzez zastosowanie selektora `useShallow` w Zustand.
    *   Naprawa błędów typowania TypeScript w konfiguracji `Recharts`.
    *   Eliminacja błędu `Zero-sized element` w wirtualizacji poprzez poprawne filtrowanie pustych wiadomości logów.
*   **Optymalizacja Ładowania Danych:**
    *   Ograniczenie początkowego zapytania o historię logów do 1000 wpisów.
    *   Włączenie kompresji **GZIP** w kontenerze Nginx. (redukcja payloadu JSON z 10MB do <1MB)