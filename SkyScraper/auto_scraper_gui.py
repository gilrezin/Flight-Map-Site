# auto_scraper_gui.py

import tkinter as tk
from tkinter import simpledialog
import scrape_real_flights
from datetime import datetime, timedelta, time as dt_time
import time
import os
import threading

API_KEYS_FILE = "api_keys.txt"
AIRPORTS_FILE = "airports.txt"
AUTO_LOG_FILE = "auto_completed_scrapes.txt"

class AutoScraperApp:
    def __init__(self, root):
        self.root = root
        self.root.title("SkyScraper Auto-Upserter")

        self.api_keys = []
        self.api_key_index = 0
        self.airports = []

        # === Main UI ===
        top_frame = tk.Frame(root)
        top_frame.pack(fill=tk.X)

        tk.Label(top_frame, text="SkyScraper Auto-Upserter is running.").pack(pady=5)
        tk.Button(top_frame, text="Run Manual Scrape", command=self.manual_scrape).pack(pady=5)

        content_frame = tk.Frame(root)
        content_frame.pack(fill=tk.BOTH, expand=True)

        # --- Airports Panel ---
        airports_frame = tk.Frame(content_frame)
        airports_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        tk.Label(airports_frame, text="Airports List").pack()
        self.airports_listbox = tk.Listbox(airports_frame, width=20)
        self.airports_listbox.pack(fill=tk.BOTH, expand=True)

        tk.Button(airports_frame, text="Add Airport", command=self.add_airport).pack(fill=tk.X, pady=2)
        tk.Button(airports_frame, text="Remove Selected", command=self.remove_airport).pack(fill=tk.X, pady=2)

        # --- API Keys Panel ---
        keys_frame = tk.Frame(content_frame)
        keys_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        tk.Label(keys_frame, text="API Keys List").pack()
        self.keys_listbox = tk.Listbox(keys_frame, width=45)
        self.keys_listbox.pack(fill=tk.BOTH, expand=True)

        tk.Button(keys_frame, text="Add API Key", command=self.add_api_key).pack(fill=tk.X, pady=2)
        tk.Button(keys_frame, text="Remove Selected", command=self.remove_api_key).pack(fill=tk.X, pady=2)

        self.load_airports()
        self.load_api_keys()

        self.start_background_loop()

    # === Loaders ===
    def load_airports(self):
        if os.path.exists(AIRPORTS_FILE):
            with open(AIRPORTS_FILE) as f:
                self.airports = [line.strip().upper() for line in f if line.strip()]
        else:
            self.airports = []
        self.refresh_airports_listbox()

    def load_api_keys(self):
        if os.path.exists(API_KEYS_FILE):
            with open(API_KEYS_FILE) as f:
                self.api_keys = [line.strip() for line in f if line.strip()]
        else:
            self.api_keys = []
        self.refresh_keys_listbox()

    def save_airports(self):
        with open(AIRPORTS_FILE, "w") as f:
            for a in self.airports:
                f.write(f"{a}\n")

    def save_api_keys(self):
        with open(API_KEYS_FILE, "w") as f:
            for k in self.api_keys:
                f.write(f"{k}\n")

    # === API key logic ===
    def get_current_api_key(self):
        if not self.api_keys:
            return None
        return self.api_keys[self.api_key_index % len(self.api_keys)]

    def move_to_next_api_key(self):
        if self.api_keys:
            self.api_key_index = (self.api_key_index + 1) % len(self.api_keys)

    def remove_bad_key(self, key):
        if key in self.api_keys:
            self.api_keys.remove(key)
            self.save_api_keys()
            self.refresh_keys_listbox()
            if self.api_key_index >= len(self.api_keys):
                self.api_key_index = 0

    # === Scraping ===
    def scrape_sequence(self):
        self.load_airports()
        self.load_api_keys()

        for airport in self.airports:
            success = False
            offset = 0  # Start at 0 for each airport

            while not success:
                if not self.api_keys:
                    print("No valid API keys left. Skipping airport.")
                    break

                api_key = self.get_current_api_key()
                print(f"Scraping {airport} with API key ending {api_key[-4:]}")

                result = scrape_real_flights.scrape(airport, api_key, mode="Upsert", offset=offset)

                if isinstance(result, tuple) and result[0] is True:
                    _, count, mode_used, returned_offset = result
                    local_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    log_line = f"{airport} | {local_now} | {count} flights [Auto-Upsert]\n"
                    with open(AUTO_LOG_FILE, "a") as f:
                        f.write(log_line)
                    print(f"Upsert complete for {airport} with {count} flights.")
                    success = True
                    offset = 0  # Reset for next airport
                else:
                    _, _, _, returned_offset = result
                    print("Key failed. Removing key and retrying same airport.")
                    self.remove_bad_key(api_key)
                    self.move_to_next_api_key()
                    offset = returned_offset  # Retry with same offset

    def manual_scrape(self):
        threading.Thread(target=self.scrape_sequence).start()

    # === Scheduler ===
    def wait_until_next_scrape(self):
        # PDT scrape schedule: 02:00, 06:00, 10:00, 14:00, 18:00, 22:00
        scrape_times = [
            dt_time(2, 0), dt_time(6, 0), dt_time(10, 0),
            dt_time(14, 0), dt_time(18, 0), dt_time(22, 0)
        ]
        now = datetime.now()
        next_run = None

        for t in scrape_times:
            candidate = now.replace(hour=t.hour, minute=t.minute, second=0, microsecond=0)
            if candidate > now:
                next_run = candidate
                break

        if not next_run:
            # All times passed today, schedule first for tomorrow
            first_time = scrape_times[0]
            next_run = (now + timedelta(days=1)).replace(hour=first_time.hour, minute=first_time.minute, second=0, microsecond=0)

        wait_seconds = (next_run - now).total_seconds()
        print(f"Next auto scrape scheduled for: {next_run.strftime('%Y-%m-%d %H:%M:%S')}")
        time.sleep(wait_seconds)

    def start_background_loop(self):
        def loop():
            while True:
                self.wait_until_next_scrape()
                print("Starting scheduled auto scrape sequence...")
                self.scrape_sequence()
        threading.Thread(target=loop, daemon=True).start()

    # === Manage Airports ===
    def add_airport(self):
        code = simpledialog.askstring("Add Airport", "Enter IATA Code:")
        if code:
            code = code.upper()
            if code not in self.airports:
                self.airports.append(code)
                self.save_airports()
                self.refresh_airports_listbox()

    def remove_airport(self):
        sel = self.airports_listbox.curselection()
        if sel:
            idx = sel[0]
            del self.airports[idx]
            self.save_airports()
            self.refresh_airports_listbox()

    def refresh_airports_listbox(self):
        self.airports_listbox.delete(0, tk.END)
        for a in self.airports:
            self.airports_listbox.insert(tk.END, a)

    # === Manage API Keys ===
    def add_api_key(self):
        key = simpledialog.askstring("Add API Key", "Enter API Key:")
        if key and key not in self.api_keys:
            self.api_keys.append(key)
            self.save_api_keys()
            self.refresh_keys_listbox()

    def remove_api_key(self):
        sel = self.keys_listbox.curselection()
        if sel:
            idx = sel[0]
            del self.api_keys[idx]
            self.save_api_keys()
            self.refresh_keys_listbox()

    def refresh_keys_listbox(self):
        self.keys_listbox.delete(0, tk.END)
        for k in self.api_keys:
            self.keys_listbox.insert(tk.END, k)

if __name__ == "__main__":
    root = tk.Tk()
    app = AutoScraperApp(root)
    root.mainloop()
