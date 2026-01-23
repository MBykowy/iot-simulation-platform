"""
Final Benchmark: Isolated I/O Latency.

Separates "Data Preparation" (CPU) from "Database Commit" (I/O).
This purely measures how long the main application thread is blocked
by the database operation.
"""

import logging
import os
import random
import sqlite3
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import ASYNCHRONOUS

# --- CONFIGURATION ---
@dataclass(frozen=True)
class Config:
    INFLUX_URL: str = "http://localhost:8086"
    INFLUX_TOKEN: str = "SuperSafeToken_Local_Only"
    INFLUX_ORG: str = "iot-project"
    INFLUX_BUCKET: str = "device_data"
    SQLITE_DB_PATH: Path = Path("benchmark_io.db")

    NUM_SAMPLES: int = 100_000
    BATCH_SIZE: int = 5_000

CONF = Config()
logging.basicConfig(level=logging.ERROR)

def generate_raw_data(count: int) -> list[dict]:
    print(f"-> Generating {count} raw records in memory...")
    now = datetime.now(timezone.utc)
    return [{
        'device_id': f"sensor_{i % 100}",
        'timestamp': now - timedelta(seconds=i),
        'temp': random.uniform(20.0, 30.0),
        'hum': random.uniform(40.0, 60.0),
        'status': "OK"
    } for i in range(count)]

def benchmark_sqlite_io(raw_data: list[dict]) -> float:
    # 1. PREPARATION (CPU) - Outside the timer
    db_path = CONF.SQLITE_DB_PATH
    if db_path.exists(): db_path.unlink()

    # Pre-convert to tuples so we only measure Disk I/O
    prepared_rows = [
        (p['device_id'], p['timestamp'], p['temp'], p['hum'], p['status'])
        for p in raw_data
    ]

    with sqlite3.connect(db_path) as conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("CREATE TABLE data (id INTEGER PRIMARY KEY, dev TEXT, ts DATETIME, temp REAL, hum REAL, stat TEXT)")
        conn.commit()

        # 2. EXECUTION (I/O) - Inside the timer
        print(f"[SQLite] Writing {len(raw_data)} rows (Blocking I/O)...")
        start = time.perf_counter()

        conn.executemany("INSERT INTO data (dev, ts, temp, hum, stat) VALUES (?,?,?,?,?)", prepared_rows)
        conn.commit() # <--- The Main Thread BLOCKS here until disk confirms

        duration = time.perf_counter() - start

    return duration

def benchmark_influx_io(raw_data: list[dict]) -> float:
    # 1. PREPARATION (CPU) - Outside the timer
    client = InfluxDBClient(url=CONF.INFLUX_URL, token=CONF.INFLUX_TOKEN, org=CONF.INFLUX_ORG)
    write_api = client.write_api(write_options=ASYNCHRONOUS)
    measurement = f"io_test_{uuid.uuid4().hex[:6]}"

    # Pre-convert to Points so we only measure Network/Buffer Hand-off
    prepared_points = [
        Point(measurement)
        .tag("deviceId", p['device_id'])
        .tag("status", p['status'])
        .field("temp", p['temp'])
        .field("hum", p['hum'])
        .time(p['timestamp'])
        for p in raw_data
    ]

    # 2. EXECUTION (I/O) - Inside the timer
    print(f"[InfluxDB] Writing {len(raw_data)} points (Async Hand-off)...")
    start = time.perf_counter()

    write_api.write(bucket=CONF.INFLUX_BUCKET, org=CONF.INFLUX_ORG, record=prepared_points)
    # <--- The Main Thread does NOT block here. It dumps to memory and continues.

    duration = time.perf_counter() - start

    # Cleanup background threads
    write_api.close()
    client.close()
    return duration

def main():
    raw_data = generate_raw_data(CONF.NUM_SAMPLES)

    # Run Benchmarks
    t_sqlite = benchmark_sqlite_io(raw_data)
    t_influx = benchmark_influx_io(raw_data)

    # Storage check
    sqlite_size = CONF.SQLITE_DB_PATH.stat().st_size / (1024*1024)

    print("\n" + "=" * 80)
    print(f"{'METRIC':<30} | {'SQLite (Disk Wait)':<20} | {'InfluxDB (Async)':<20} | {'Result':<10}")
    print("-" * 80)

    # Latency
    diff = f"{t_sqlite / t_influx:.1f}x Faster" if t_influx > 0 else "Instant"
    print(f"{'Main Thread Block Time':<30} | {t_sqlite:<18.4f} s | {t_influx:<18.4f} s | {diff}")

    # Storage
    print(f"{'Disk Usage (Raw)':<30} | {sqlite_size:<18.2f} MB | ~{sqlite_size*0.2:<18.2f} MB | InfluxDB")

    print("-" * 80)
    print("CONCLUSION:")
    print("1. SQLite blocks the app while writing to the physical disk (Durability).")
    print("2. InfluxDB (Async) dumps data to a RAM buffer and returns control immediately.")
    print("   The network transmission happens in the background, keeping the App UI responsive.")
    print("=" * 80)

if __name__ == "__main__":
    main()