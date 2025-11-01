import os
import time
import json
from datetime import datetime

# === CONFIG ===
LOGS_DIR = os.path.join(os.getcwd(), "logs")
TASKS_DIR = os.path.join(os.getcwd(), "tasks")
REPORTS_DIR = os.path.join(LOGS_DIR, "reports")

os.makedirs(REPORTS_DIR, exist_ok=True)

def read_last_lines(file_path, num_lines=20):
    """Читает последние строки файла."""
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
    return lines[-num_lines:]

def collect_status():
    """Собирает состояние проекта."""
    status = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "cwd": os.getcwd(),
        "files_in_tasks": os.listdir(TASKS_DIR) if os.path.exists(TASKS_DIR) else [],
        "last_task": read_last_lines(os.path.join(TASKS_DIR, "current_task.txt")),
        "context_log_tail": read_last_lines(os.path.join(LOGS_DIR, "context_load.log")),
    }
    return status

def save_report(data):
    """Сохраняет отчёт в /logs/reports."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    report_path = os.path.join(REPORTS_DIR, f"report_{timestamp}.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"📘 Report saved: {report_path}")

def main():
    print("👀 Project Watcher started. Monitoring logs and tasks...")
    while True:
        status = collect_status()
        save_report(status)
        time.sleep(300)  # каждые 5 минут

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Watcher stopped by user.")