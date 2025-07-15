# scraper_gui.py

import tkinter as tk
from tkinter import ttk, messagebox
from pymongo import MongoClient
from datetime import datetime
import pytz
import scrape_real_flights
import os

# --------------------------
# MongoDB connection
# --------------------------
client = MongoClient("mongodb+srv://bbmcclosky:LtpCIzRMDjxIZuv3@mernapp.2okngfv.mongodb.net/flightmap")
airports_col = client["flightmap"]["airports"]

# --------------------------
# Load completed scrapes log
# --------------------------
completed = set()
if os.path.exists("completed_scrapes.txt"):
    with open("completed_scrapes.txt") as f:
        for line in f:
            completed.add(line.strip())

# --------------------------
# Tkinter GUI
# --------------------------
root = tk.Tk()
root.title("Flight Schedule Scraper")

# --- Airport search ---
search_var = tk.StringVar()
listbox = tk.Listbox(root, height=10)

def update_listbox(*args):
    term = search_var.get().upper()
    listbox.delete(0, tk.END)
    if len(term) >= 1:
        matches = airports_col.find({"iataCode": {"$regex": f"^{term}"}})
        for airport in matches:
            listbox.insert(tk.END, airport["iataCode"])

search_var.trace("w", update_listbox)
tk.Label(root, text="Search Airport IATA:").pack()
tk.Entry(root, textvariable=search_var).pack()
listbox.pack()

# --- Mode selector ---
mode_var = tk.StringVar(value="Upsert")
ttk.Label(root, text="Output Mode:").pack()
ttk.Radiobutton(root, text="Upsert", variable=mode_var, value="Upsert").pack()
ttk.Radiobutton(root, text="JSON", variable=mode_var, value="JSON").pack()

# --- API key ---
api_key_var = tk.StringVar()
tk.Label(root, text="AviationStack API Key:").pack()
tk.Entry(root, textvariable=api_key_var).pack()

# --- Run scrape ---
def run_scrape():
    airport = listbox.get(tk.ACTIVE)
    if not airport:
        messagebox.showerror("Error", "Please select an airport.")
        return

    api_key = api_key_var.get()
    mode = mode_var.get()

    airport_doc = airports_col.find_one({"iataCode": airport})
    timezone_str = airport_doc["timezone"] if airport_doc else "UTC"

    local_tz = pytz.timezone(timezone_str)
    now_local = datetime.now(local_tz)
    date_str = now_local.strftime("%Y-%m-%d %H:%M")

    key_prefix = f"{airport}|{date_str}"

    success, record_count, actual_mode = scrape_real_flights.scrape(
        airport=airport,
        api_key=api_key,
        mode=mode
    )

    if success:
        if actual_mode == "Upsert":
            log_line = f"{key_prefix}|Upserted {record_count} flights"
        else:
            log_line = f"{key_prefix}|Saved... {record_count} flights to JSON"

        with open("completed_scrapes.txt", "a") as f:
            f.write(f"{log_line}\n")

        completed.add(log_line)
        messagebox.showinfo(
            "Done",
            f"Scrape complete for {airport}!\n{log_line}"
        )
    else:
        messagebox.showerror("Error", f"Scrape failed for {airport}.")

tk.Button(root, text="Run Scrape", command=run_scrape).pack(pady=10)

root.mainloop()
