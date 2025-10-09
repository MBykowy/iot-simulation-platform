

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