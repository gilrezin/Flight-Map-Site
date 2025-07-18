# scrape_real_flights.py

import requests
import json
from pymongo import MongoClient
from datetime import datetime
import pytz
from dateutil import parser
from dotenv import load_dotenv
import os

# --------------------------------
# Load .env and MongoDB connection
# --------------------------------
load_dotenv()
MONGO_URI = os.getenv("MONGODB_URI")

print(f"MONGO_URI = {MONGO_URI}")

client = MongoClient(MONGO_URI)
flights_col = client["flightmap"]["flights"]
airports_col = client["flightmap"]["airports"]

def scrape(airport, api_key, mode="Upsert", offset=0):
    try:
        records = []
        limit = 100

        while True:
            url = "http://api.aviationstack.com/v1/flights"
            params = {
                "access_key": api_key,
                "dep_iata": airport,
                "offset": offset
            }

            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            raw_flights = data.get("data", [])
            print(f"Offset {offset}: Received {len(raw_flights)} flights")

            for item in raw_flights:
                dep = item.get("departure", {})
                arr = item.get("arrival", {})
                flight = item.get("flight", {})
                airline = item.get("airline", {})

                dep_time_utc = dep.get("scheduled")
                arr_time_utc = arr.get("scheduled")

                if not dep_time_utc or not arr_time_utc:
                    continue

                # --- Replace +00:00 with local offsets ---
                dep_iata = dep.get("iata")
                arr_iata = arr.get("iata")

                dep_airport_doc = airports_col.find_one({"iataCode": dep_iata})
                arr_airport_doc = airports_col.find_one({"iataCode": arr_iata})

                dep_airport_name = dep_airport_doc["name"] if dep_airport_doc else dep.get("airport")
                arr_airport_name = arr_airport_doc["name"] if arr_airport_doc else arr.get("airport")

                dep_iata_final = dep_airport_doc["iataCode"] if dep_airport_doc else dep_iata
                arr_iata_final = arr_airport_doc["iataCode"] if arr_airport_doc else arr_iata

                dep_tz = dep_airport_doc.get("timezone") if dep_airport_doc else None
                arr_tz = arr_airport_doc.get("timezone") if arr_airport_doc else None

                if dep_tz:
                    dt_dep_utc = parser.isoparse(dep_time_utc)
                    dt_dep_local = dt_dep_utc.astimezone(pytz.timezone(dep_tz))
                    dep_time_local_str = dt_dep_local.isoformat()
                else:
                    dep_time_local_str = dep_time_utc

                if arr_tz:
                    dt_arr_utc = parser.isoparse(arr_time_utc)
                    dt_arr_local = dt_arr_utc.astimezone(pytz.timezone(arr_tz))
                    arr_time_local_str = dt_arr_local.isoformat()
                else:
                    arr_time_local_str = arr_time_utc

                if dep_time_local_str:
                    dt = parser.isoparse(dep_time_local_str)
                    local_day_of_week = dt.strftime("%A")
                else:
                    local_day_of_week = None

                codeshared = flight.get("codeshared")
                if codeshared:
                    airline_name = codeshared.get("airline_name")
                    flight_number = codeshared.get("flight_number")
                else:
                    airline_name = airline.get("name")
                    flight_number = flight.get("number")

                if not (dep_airport_name and arr_airport_name and dep_time_local_str and arr_time_local_str):
                    continue

                # Normalize airline name if matched and not cargo
                airline_name_clean = airline_name.strip().lower() if airline_name else ""
                normalized = None

                if "cargo" not in airline_name_clean:
                    for doc in client["flightmap"]["airlines"].find():
                        ref = doc["name"]
                        if ref.lower() in airline_name_clean:
                            normalized = ref
                            break

                if normalized:
                    airline_name = normalized

                record = {
                    "departureAirport": {
                        "name": dep_airport_name,
                        "iataCode": dep_iata_final
                    },
                    "arrivalAirport": {
                        "name": arr_airport_name,
                        "iataCode": arr_iata_final
                    },
                    "departureTime": dep_time_local_str,
                    "arrivalTime": arr_time_local_str,
                    "airline": airline_name,
                    "flightNumber": flight_number,
                    "dayOfWeek": local_day_of_week,
                    "departureTimeOfDay": dt.strftime("%H:%M")
                }

                records.append(record)

            if len(raw_flights) < limit:
                break
            else:
                offset += limit  # Keep chaining correctly when looping

        if not records:
            print("No valid flight data returned.")
            return False, 0, mode, offset

        # Deduplicate
        unique = {}
        for rec in records:
            key = (
                rec["departureAirport"]["iataCode"],
                rec["arrivalAirport"]["iataCode"],
                rec["departureTime"],
                rec["dayOfWeek"]
            )
            unique[key] = rec
        records = list(unique.values())

        if mode == "Upsert":
            for rec in records:
                flights_col.update_one(
                    {
                        "departureAirport.iataCode": rec["departureAirport"]["iataCode"],
                        "arrivalAirport.iataCode": rec["arrivalAirport"]["iataCode"],
                        "departureTime": rec["departureTime"],
                        "dayOfWeek": rec["dayOfWeek"]
                    },
                    {"$set": rec},
                    upsert=True
                )
            print(f"Upserted {len(records)} flights.")
        else:
            filename = f"{airport}_{datetime.utcnow().date()}.json"
            with open(filename, "w") as f:
                for rec in records:
                    f.write(json.dumps(rec) + "\n")
            print(f"Saved {len(records)} records to {filename}")

        print(f"Total API requests made for {airport}: {int(offset/limit) + 1}")
        return True, len(records), mode, offset  # Return final offset used

    except Exception as e:
        print(f"Error: {e}")
        return False, 0, mode, offset  # Return offset so GUI can retry properly
