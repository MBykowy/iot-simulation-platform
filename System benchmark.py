import asyncio
import json
import random
import time
from typing import Optional, List

import aiohttp
from aiomqtt import Client as MqttClient

# --- Konfig ---
API_URL = "http://localhost:8081/api"
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
NUM_DEVICES = 50
MESSAGES_PER_DEVICE = 20
INTERVAL_MS = 200  # 5 wiadomości/s na urządzenie

created_device_ids: List[str] = []


async def create_virtual_device(session: aiohttp.ClientSession, idx: int) -> Optional[str]:
    """
    Creates a single virtual device via the REST API.

    Args:
        session: The active aiohttp session.
        idx: The index number for generating the device name.

    Returns:
        The ID of the created device, or None if creation failed.
    """
    name = f"StressDevice_{idx}"
    payload = {"name": name, "type": "PHYSICAL", "ioType": "SENSOR"}
    try:
        async with session.post(f"{API_URL}/devices", json=payload) as resp:
            if resp.status in [200, 201]:
                data = await resp.json()
                return data['id']
    except Exception:
        pass
    return None


async def simulate_device_mqtt(device_id: str) -> None:
    """
    Simulates an IoT device sending telemetry data via MQTT.

    Args:
        device_id: The ID of the device to simulate.
    """
    topic = f"iot/devices/{device_id}/data"
    # Losowe opóźnienie
    await asyncio.sleep(random.uniform(0, 2.0))

    try:
        async with MqttClient(MQTT_BROKER, MQTT_PORT) as client:
            for _ in range(MESSAGES_PER_DEVICE):
                payload = {
                    "sensors": {
                        "temperature": random.uniform(20.0, 30.0),
                        "load": random.uniform(0, 100)
                    }
                }
                await client.publish(topic, json.dumps(payload))
                await asyncio.sleep(INTERVAL_MS / 1000)
    except Exception as e:
        print(f"Błąd MQTT: {e}")


async def cleanup(session: aiohttp.ClientSession) -> None:
    """
    Deletes all devices created during the test session.

    Args:
        session: The active aiohttp session.
    """
    print("\n--- CZYSZCZENIE BAZY DANYCH ---")
    print(f"Usuwanie {len(created_device_ids)} urządzeń testowych...")
    for dev_id in created_device_ids:
        try:
            await session.delete(f"{API_URL}/devices/{dev_id}")
        except Exception:
            print(f"Nie udało się usunąć {dev_id}")
    print("Zakończono czyszczenie.")


async def main() -> None:
    """
    Main function for the system stress test.
    """
    print("=== STRESS TEST (SQLite Safe Mode) ===")

    async with aiohttp.ClientSession() as session:
        # 1. Tworzenie
        print(f"-> Tworzenie {NUM_DEVICES} urządzeń...")
        tasks = [create_virtual_device(session, i) for i in range(NUM_DEVICES)]
        ids = await asyncio.gather(*tasks)

        global created_device_ids
        created_device_ids = [d for d in ids if d]
        print(f"-> Sukces: {len(created_device_ids)}/{NUM_DEVICES}")

        # 2. Test
        print("-> Start MQTT...")
        start_time = time.time()
        mqtt_tasks = [simulate_device_mqtt(did) for did in created_device_ids]
        await asyncio.gather(*mqtt_tasks)
        duration = time.time() - start_time

        print(f"\nTest zakończony w {duration:.2f}s")

        # 3. Cleanup
        await asyncio.to_thread(input, "\nNaciśnij ENTER aby usunąć dane testowe ")
        await cleanup(session)


if __name__ == "__main__":
    if hasattr(asyncio, 'set_event_loop_policy'):
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nPrzerwano przez użytkownika.")