# scraper_gui.py

import tkinter as tk
from tkinter import ttk, messagebox
from pymongo import MongoClient
from datetime import datetime
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

    api_key = api_key_var.get().strip()
    if not api_key:
        messagebox.showerror("Error", "Please enter your AviationStack API key.")
        return

    mode = mode_var.get()

    today = datetime.today()
    local_date_str = today.strftime("%Y-%m-%d")
    key = f"{airport}|{local_date_str}"

    # Disable this block to allow re-scraping same day:
    # if key in completed:
    #     messagebox.showerror("Error", f"{airport} for {local_date_str} already scraped.")
    #     return

    success, record_count, actual_mode = scrape_real_flights.scrape(
        airport=airport,
        api_key=api_key,
        mode=mode
    )

    if success:
        with open("completed_scrapes.txt", "a") as f:
            f.write(f"{key} | {record_count} flights [{actual_mode}]\n")
        completed.add(key)
        messagebox.showinfo("SkyScraper", f"Scrape complete for {airport} on {local_date_str}!\nFlights saved: {record_count} [{actual_mode}]")

tk.Button(root, text="Run Scrape", command=run_scrape).pack(pady=10)

root.mainloop()
