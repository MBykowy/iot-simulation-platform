

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
    *   **Frontend:** Zbudowano kompleksowy widok `RulesManager`, który wyświetla listę istniejących reguł oraz zawiera formularz `AddRuleForm` do tworzenia nowych.
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
    *   **Frontend:** Zbudowano kompleksowy widok `RulesManager`, który wyświetla listę istniejących reguł oraz zawiera formularz `AddRuleForm` do tworzenia nowych.
    *   **Frontend:** Formularz umożliwia zdefiniowanie prostej reguły "IF-THEN" poprzez wybór urządzeń i warunków z list rozwijanych.
*   **Osiągnięto pełną pętlę automatyzacji:** Użytkownik może teraz z poziomu UI stworzyć regułę, a następnie za pomocą symulatora zdarzeń wywołać warunek i zaobserwować natychmiastową, automatyczną reakcję systemu w postaci zmiany stanu innego urządzenia.