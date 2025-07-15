# auto_scraper_gui.py

import tkinter as tk
from tkinter import messagebox
import threading
import time
from datetime import datetime
import scrape_real_flights

API_KEYS_FILE = "api_keys.txt"
AIRPORTS_FILE = "airports.txt"
AUTO_LOG_FILE = "auto_completed_scrapes.txt"

class AutoScraper:
    def __init__(self):
        self.api_keys = []
        self.api_index = 0
        self.airports = []
        self.last_run = None
        self.running = False

    def load_api_keys(self):
        with open(API_KEYS_FILE) as f:
            self.api_keys = [line.strip() for line in f if line.strip()]
        if not self.api_keys:
            raise Exception("API keys file is empty.")
        self.api_index = 0

    def load_airports(self):
        with open(AIRPORTS_FILE) as f:
            self.airports = [line.strip().upper() for line in f if line.strip()]
        if not self.airports:
            raise Exception("Airports file is empty.")

    def get_next_api_key(self):
        if not self.api_keys:
            self.load_api_keys()
        key = self.api_keys[self.api_index]
        self.api_index += 1
        if self.api_index >= len(self.api_keys):
            self.load_api_keys()  # Reload to check for new keys
            self.api_index = 0
        return key

    def remove_bad_key(self, bad_key):
        if bad_key in self.api_keys:
            self.api_keys.remove(bad_key)
            with open(API_KEYS_FILE, "w") as f:
                for k in self.api_keys:
                    f.write(f"{k}\n")

    def run_scrape_sequence(self):
        try:
            self.load_api_keys()
            self.load_airports()
        except Exception as e:
            print(f"Setup error: {e}")
            return

        total_scrapes = 0
        for airport in self.airports:
            api_key = self.get_next_api_key()
            print(f"Scraping {airport} with key ending {api_key[-4:]}")
            success, count, _ = scrape_real_flights.scrape(
                airport=airport,
                api_key=api_key,
                mode="Upsert"
            )
            if not success:
                # Remove key if it's a 401
                print(f"Failed key {api_key} will be removed.")
                self.remove_bad_key(api_key)
                continue

            # Log result
            local_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            log_line = f"{airport} | {local_now} | {count} flights [Auto-Upsert]\n"
            with open(AUTO_LOG_FILE, "a") as f:
                f.write(log_line)

            total_scrapes += count

        print(f"Completed sequence: {total_scrapes} flights scraped.")

    def run_background(self):
        self.running = True
        while self.running:
            print("Starting scheduled scrape sequence...")
            self.run_scrape_sequence()
            self.last_run = datetime.now()
            time.sleep(30 * 60)  # 30 minutes

    def stop(self):
        self.running = False

# --------------------------
# GUI
# --------------------------
scraper = AutoScraper()
root = tk.Tk()
root.title("SkyScraper Auto-Scraper")

status_label = tk.Label(root, text="Ready.")
status_label.pack()

def start_auto():
    status_label.config(text="Auto mode running every 30 minutes.")
    t = threading.Thread(target=scraper.run_background)
    t.daemon = True
    t.start()

def run_once_now():
    status_label.config(text="Running manual scrape sequence...")
    t = threading.Thread(target=scraper.run_scrape_sequence)
    t.daemon = True
    t.start()

tk.Button(root, text="Start Auto Mode", command=start_auto).pack(pady=5)
tk.Button(root, text="Run Once Now", command=run_once_now).pack(pady=5)

root.mainloop()
