import os
import random
import sqlite3
import time
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

# Config
INFLUX_URL = "http://localhost:8086"
INFLUX_TOKEN = "SuperSafeToken"
INFLUX_ORG = "iot-project"
INFLUX_BUCKET = "device_data"
SQLITE_DB = "benchmark.db"
NUM_SAMPLES = 10000


def setup_sqlite() -> None:
    """Creates the SQLite database and schema for benchmarking."""
    if os.path.exists(SQLITE_DB):
        os.remove(SQLITE_DB)
    conn = sqlite3.connect(SQLITE_DB)
    cursor = conn.cursor()
    cursor.execute("""
                   CREATE TABLE sensor_readings
                   (
                       id          INTEGER PRIMARY KEY AUTOINCREMENT,
                       device_id   TEXT,
                       timestamp   DATETIME,
                       temperature REAL,
                       humidity    REAL
                   )
                   """)
    cursor.execute("CREATE INDEX idx_timestamp ON sensor_readings(timestamp)")
    cursor.execute("CREATE INDEX idx_device ON sensor_readings(device_id)")
    conn.commit()
    conn.close()


# --- Zapis ---
def benchmark_write_sqlite(data_points: List[Dict[str, Any]]) -> float:
    """Benchmarks the write performance of SQLite (Transactional Insert)."""
    print(f"--- [SQLite] Write {len(data_points)} records (Transactional) ---")
    setup_sqlite()
    conn = sqlite3.connect(SQLITE_DB)
    cursor = conn.cursor()

    start = time.time()
    for p in data_points:
        cursor.execute(
            "INSERT INTO sensor_readings (device_id, timestamp, temperature, humidity) VALUES (?, ?, ?, ?)",
            (p['device_id'], p['timestamp'], p['temp'], p['hum'])
        )
        conn.commit()
    end = time.time()
    conn.close()
    return end - start


def benchmark_write_influx(data_points: List[Dict[str, Any]]) -> float:
    """Benchmarks the write performance of InfluxDB (Batch Insert)."""
    print(f"--- [InfluxDB] Write {len(data_points)} records (Batch) ---")
    client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
    write_api = client.write_api(write_options=SYNCHRONOUS)

    influx_points = []
    for p in data_points:
        point = Point("benchmark_read_test") \
            .tag("deviceId", p['device_id']) \
            .field("temperature", p['temp']) \
            .field("humidity", p['hum']) \
            .time(p['timestamp'])
        influx_points.append(point)

    start = time.time()
    batch_size = 1000
    for i in range(0, len(influx_points), batch_size):
        batch = influx_points[i:i + batch_size]
        write_api.write(bucket=INFLUX_BUCKET, org=INFLUX_ORG, record=batch)
    end = time.time()
    client.close()
    return end - start


# --- Odczyt (ostatni rekord) ---
def read_single_sqlite() -> float:
    """Benchmarks reading the last record for a specific device from SQLite."""
    conn = sqlite3.connect(SQLITE_DB)
    cursor = conn.cursor()
    start = time.time()
    cursor.execute("SELECT * FROM sensor_readings WHERE device_id='dev_0' ORDER BY timestamp DESC LIMIT 1")
    cursor.fetchone()
    end = time.time()
    conn.close()
    return end - start


def read_single_influx() -> float:
    """Benchmarks reading the last record for a specific device from InfluxDB."""
    client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
    query_api = client.query_api()
    start = time.time()
    query = f'''
    from(bucket: "{INFLUX_BUCKET}")
      |> range(start: -24h)
      |> filter(fn: (r) => r["_measurement"] == "benchmark_read_test")
      |> filter(fn: (r) => r["deviceId"] == "dev_0")
      |> last()
    '''
    query_api.query(query)
    end = time.time()
    client.close()
    return end - start


# --- Odczyt (ostatnie 100) ---
def read_multi_sqlite() -> float:
    """Benchmarks reading the last 100 records for a specific device from SQLite."""
    conn = sqlite3.connect(SQLITE_DB)
    cursor = conn.cursor()
    start = time.time()
    cursor.execute("SELECT * FROM sensor_readings WHERE device_id='dev_0' ORDER BY timestamp DESC LIMIT 100")
    cursor.fetchall()
    end = time.time()
    conn.close()
    return end - start


def read_multi_influx() -> float:
    """Benchmarks reading the last 100 records for a specific device from InfluxDB."""
    client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
    query_api = client.query_api()
    start = time.time()
    query = f'''
    from(bucket: "{INFLUX_BUCKET}")
      |> range(start: -24h)
      |> filter(fn: (r) => r["_measurement"] == "benchmark_read_test")
      |> filter(fn: (r) => r["deviceId"] == "dev_0")
      |> limit(n: 100)
    '''
    query_api.query(query)
    end = time.time()
    client.close()
    return end - start


# --- Odczyt (średnia) ---
def read_agg_sqlite() -> float:
    """Benchmarks calculating the average temperature for a device using SQLite."""
    conn = sqlite3.connect(SQLITE_DB)
    cursor = conn.cursor()
    start = time.time()
    cursor.execute("SELECT avg(temperature) FROM sensor_readings WHERE device_id='dev_0'")
    cursor.fetchone()
    end = time.time()
    conn.close()
    return end - start


def read_agg_influx() -> float:
    """Benchmarks calculating the average temperature for a device using InfluxDB (Flux)."""
    client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
    query_api = client.query_api()
    start = time.time()
    query = f'''
    from(bucket: "{INFLUX_BUCKET}")
      |> range(start: -24h)
      |> filter(fn: (r) => r["_measurement"] == "benchmark_read_test")
      |> filter(fn: (r) => r["deviceId"] == "dev_0")
      |> filter(fn: (r) => r["_field"] == "temperature")
      |> mean()
    '''
    query_api.query(query)
    end = time.time()
    client.close()
    return end - start


# --- MAIN ---
if __name__ == "__main__":
    # Generate data once to be fair
    print("Generating data...")
    now = datetime.now(timezone.utc)
    data = []
    for i in range(NUM_SAMPLES):
        ts = now - timedelta(seconds=i)
        data.append({
            'device_id': f"dev_{i % 5}",  # 5 devices
            'timestamp': ts,
            'temp': random.uniform(20, 30),
            'hum': random.uniform(40, 60)
        })

    # 1. zapis
    t_write_sql = benchmark_write_sqlite(data)
    t_write_influx = benchmark_write_influx(data)

    # 2. odczyt (jeden)
    t_single_sql = read_single_sqlite()
    t_single_influx = read_single_influx()

    # 3. odczyt (wiele)
    t_multi_sql = read_multi_sqlite()
    t_multi_influx = read_multi_influx()

    # 4. odczyt (średnia)
    t_agg_sql = read_agg_sqlite()
    t_agg_influx = read_agg_influx()

    print("\n" + "=" * 40)
    print(f"{'TEST CASE':<20} | {'SQLite (s)':<10} | {'InfluxDB (s)':<10}")
    print("-" * 40)
    print(f"{'Write (10k)':<20} | {t_write_sql:<10.4f} | {t_write_influx:<10.4f}")
    print(f"{'Read Single':<20} | {t_single_sql:<10.4f} | {t_single_influx:<10.4f}")
    print(f"{'Read Multi (100)':<20} | {t_multi_sql:<10.4f} | {t_multi_influx:<10.4f}")
    print(f"{'Aggregation (Mean)':<20} | {t_agg_sql:<10.4f} | {t_agg_influx:<10.4f}")
    print("=" * 40)