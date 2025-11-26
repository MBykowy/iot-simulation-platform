# IoT Simulation Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Pełnostackowa platforma do symulacji i wizualizacji interakcji w systemach IoT. Projekt demonstruje nowoczesną, sterowaną zdarzeniami architekturę do przetwarzania danych i automatyzacji w czasie rzeczywistym, wdrożoną w pełni skonteneryzowanym środowisku.

Platforma pozwala użytkownikom na definiowanie urządzeń wirtualnych, integrację danych z fizycznego sprzętu (poprzez MQTT), tworzenie reguł automatyzacji oraz wizualizację danych historycznych i bieżących na interaktywnych wykresach.

![Platform Screenshot](placeholder.png)

---

## Kluczowe Funkcjonalności

-   **Transparentne Zarządzanie Urządzeniami Hybrydowymi:** System bezproblemowo integruje urządzenia wirtualne (tworzone w UI) i fizyczne (automatycznie rejestrowane przez MQTT). Źródło danych jest transparentne dla logiki biznesowej i silnika reguł.
-   **Zaawansowany Moduł Symulacji:** Asynchroniczny generator danych, pozwalający na definiowanie wielowymiarowych sygnałów (np. sinusoida, losowy) dla urządzeń wirtualnych.
-   **Interaktywny Dashboard w Czasie Rzeczywistym:** Dynamiczny, responsywny interfejs (SPA) zbudowany w React, aktualizowany na żywo przez WebSockets, z obsługą motywów Dark/Light.
-   **Silnik Reguł z Obsługą Reakcji Łańcuchowych:** Backendowy silnik, który rekurencyjnie przetwarza zdarzenia, pozwalając na tworzenie łańcuchów przyczynowo-skutkowych (akcja jednej reguły może wyzwolić kolejną).
-   **Wizualizacja Danych Historycznych:** Przechowywanie i wyświetlanie danych szeregów czasowych z czujników w InfluxDB, prezentowanych na interaktywnych wykresach.
-   **Infrastruktura jako Kod (IaC):** Cały stos technologiczny (Frontend, Backend, Bazy Danych, Broker, API Gateway) jest zdefiniowany i zarządzany przez Docker Compose.

---

## Stos Technologiczny

| Kategoria           | Technologia                                                              |
| :------------------ | :----------------------------------------------------------------------- |
| **Backend**         | Java 21, Spring Boot 3 (Web, JPA, WebSocket, MQTT Integration)           |
| **Frontend**        | React 19, TypeScript, Vite, Material-UI, Zustand, Recharts, React Router |
| **Bazy Danych**     | SQLite (konfiguracja, stan), InfluxDB (dane szeregów czasowych)          |
| **Broker**          | Eclipse Mosquitto                                                        |
| **API Gateway**     | Nginx                                                                    |
| **Infrastruktura**  | Docker & Docker Compose                                                  |

---

## Architektura Systemu

System opiera się na architekturze **Monolitu Modułowego w Skonteneryzowanym Środowisku**. Centralnym punktem jest aplikacja backendowa (`iot-backend`), która hermetyzuje całą logikę biznesową. Jest ona otoczona przez zbiór serwisów infrastrukturalnych, zarządzanych przez Docker Compose.

Centralnym punktem wejścia do systemu jest bramka **Nginx (API Gateway)**, która kieruje ruchem do odpowiednich serwisów.

```mermaid
graph TD
    subgraph "Użytkownik / Świat Zewnętrzny"
        User((Użytkownik))
        PhysicalDevice(Urządzenie Fizyczne)
    end
    
    subgraph "Infrastruktura Docker"
        Gateway[Nginx API Gateway]
        
        subgraph "Aplikacja Monolityczna"
            Backend[Backend Monolith <br> (Spring Boot)]
        end

        subgraph "Serwis Prezentacji"
             Frontend[Frontend SPA <br> (React/Vite)]
        end
        
        subgraph "Serwisy Infrastrukturalne"
            Broker[Mosquitto MQTT Broker]
            DB_TS[InfluxDB]
            DB_State[(SQLite Volume)]
        end
    end

    User -- HTTP/HTTPS --> Gateway
    Gateway -- / (root) --> Frontend
    Gateway -- /api/* --> Backend
    Gateway -- /ws --> Backend

    PhysicalDevice -- MQTT (Port 1883) --> Broker
    Backend -- subskrybuje --> Broker

    Backend -- Zapis/Odczyt --> DB_State
    Backend -- Zapis/Odczyt --> DB_TS
```

---

## Uruchomienie Projektu

### Wymagania Wstępne
-   [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Uruchomienie

1.  **Sklonuj repozytorium:**
    ```bash
    git clone https://github.com/twoja-nazwa-uzytkownika/iot-simulation-platform.git
    cd iot-simulation-platform
    ```

2.  **Uruchom całą aplikację:**
    To polecenie zbuduje obrazy dla frontendu i backendu, a następnie uruchomi wszystkie skonteneryzowane serwisy.
    ```bash
    docker-compose up --build
    ```

3.  **Dostęp do aplikacji:**
    *   **Główna aplikacja (Frontend):** `http://localhost`
    *   **Broker MQTT:** `localhost:1883`
    *   **Baza InfluxDB UI:** `http://localhost:8086`

### Użycie Platformy

1.  **Otwórz interfejs** w przeglądarce pod adresem `http://localhost`.
2.  **Nawiguj** po aplikacji za pomocą menu bocznego (Dashboard, Devices, Automation).
3.  **Dodaj Urządzenie Wirtualne** na stronie "Dashboard", aby stworzyć nowy symulowany sensor lub aktywator.
4.  **Skonfiguruj Symulację** na stronie "Devices", klikając ikonę "gwiazdki" na karcie urządzenia wirtualnego.
5.  **Wysyłaj dane z fizycznego urządzenia** na broker MQTT (`localhost:1883`).
    *   **Temat:** `iot/devices/{ID_TWOJEGO_URZADZENIA}/data`
    *   **Payload:** `{"sensors": {"temperature": 25.5, "humidity": 48.2}}`
    *   *Uwaga: Jeśli urządzenie o podanym ID nie istnieje, zostanie utworzone automatycznie.*
6.  **Twórz Reguły Automatyzacji** na stronie "Automation".
7.  **Przeglądaj Historię** na stronie "Devices", klikając ikonę "wykresu" na karcie urządzenia typu SENSOR.

---

## Licencja

Projekt jest udostępniany na licencji MIT. Zobacz plik [LICENSE](LICENSE) po szczegóły.
