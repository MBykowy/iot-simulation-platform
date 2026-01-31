import time
import sqlite3
import random
import os
import csv
from influxdb_client import InfluxDBClient, Point, WriteOptions

# Config
SAMPLES = 10000
RUNS = 25
OUTPUT_FILE = "db_benchmark_results.csv"
SQLITE_FILE = "test_benchmark.db"

INFLUX_URL = "http://localhost:8086"
INFLUX_TOKEN = "SuperSafeToken_Local_Only"
INFLUX_ORG = "iot-project"
INFLUX_BUCKET = "device_data"

def get_data():
    return {
        "temp": round(random.uniform(20.0, 30.0), 2),
        "hum": round(random.uniform(40.0, 60.0), 2)
    }

def run_sqlite():
    if os.path.exists(SQLITE_FILE):
        os.remove(SQLITE_FILE)

    conn = sqlite3.connect(SQLITE_FILE)
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE telemetry (id INTEGER PRIMARY KEY, dev TEXT, temp REAL, hum REAL)")
    conn.commit()

    start = time.time()
    for _ in range(SAMPLES):
        d = get_data()
        cursor.execute("INSERT INTO telemetry (dev, temp, hum) VALUES (?, ?, ?)", ("dev_1", d['temp'], d['hum']))
        conn.commit()

    end = time.time()
    conn.close()
    return end - start

def run_influx():
    client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
    write_api = client.write_api(write_options=WriteOptions(batch_size=1000, flush_interval=1000))

    start = time.time()
    for _ in range(SAMPLES):
        d = get_data()
        p = Point("sensor_readings").tag("deviceId", "dev_1").field("temp", d['temp']).field("hum", d['hum'])
        write_api.write(bucket=INFLUX_BUCKET, record=p)

    write_api.close()
    client.close()
    return time.time() - start

if __name__ == "__main__":
    with open(OUTPUT_FILE, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["Run", "SQLite_Time", "SQLite_OPS", "Influx_Time", "Influx_OPS"])

        for i in range(1, RUNS + 1):
            print(f"Executing Run {i}/{RUNS}...")

            t_sql = run_sqlite()
            t_inf = run_influx()

            row = [i, t_sql, SAMPLES/t_sql, t_inf, SAMPLES/t_inf]
            writer.writerow(row)
            f.flush()

            print(f"  SQLite: {t_sql:.2f}s | Influx: {t_inf:.2f}s")

    print(f"Benchmark finished {OUTPUT_FILE}")