# scraper_gui.py

import tkinter as tk
from tkinter import ttk, messagebox
from pymongo import MongoClient
from datetime import datetime
from dotenv import load_dotenv
import os

import scrape_real_flights

# --------------------------------
# Load .env and MongoDB connection
# --------------------------------
load_dotenv()
MONGO_URI = os.getenv("MONGODB_URI")

client = MongoClient(MONGO_URI)
airports_col = client["flightmap"]["airports"]

# --------------------------------
# Load completed scrapes log
# --------------------------------
completed = set()
if os.path.exists("completed_scrapes.txt"):
    with open("completed_scrapes.txt") as f:
        for line in f:
            completed.add(line.strip())

# --------------------------------
# Tkinter GUI
# --------------------------------
root = tk.Tk()
root.title("SkyScraper")

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
    if not api_key:
        messagebox.showerror("Error", "Please enter your AviationStack API key.")
        return

    mode = mode_var.get()
    offset = 0  # Always start at offset 0 for GUI

    # Call scrape function
    success, record_count, actual_mode, _ = scrape_real_flights.scrape(
        airport=airport,
        api_key=api_key,
        mode=mode,
        offset=offset  # Pass offset
    )

    if success:
        now_local = datetime.now()
        timestamp_str = now_local.strftime("%Y-%m-%d %H:%M:%S")
        with open("completed_scrapes.txt", "a") as f:
            f.write(f"{airport} | {timestamp_str} | {record_count} flights [{actual_mode}]\n")
        messagebox.showinfo("Done", f"Scrape complete for {airport}!\n{record_count} flights [{actual_mode}]")

tk.Button(root, text="Run Scrape", command=run_scrape).pack(pady=10)

root.mainloop()
