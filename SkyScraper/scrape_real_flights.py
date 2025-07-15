# scrape_real_flights.py

import requests
import json
from pymongo import MongoClient
from datetime import datetime
import pytz
from dateutil import parser

# --------------------------
# MongoDB connection
# --------------------------
client = MongoClient("mongodb+srv://bbmcclosky:LtpCIzRMDjxIZuv3@mernapp.2okngfv.mongodb.net/flightmap")
flights_col = client["flightmap"]["flights"]
airports_col = client["flightmap"]["airports"]

def scrape(airport, api_key, mode="Upsert"):
    try:
        # --------------------------
        # Build API request
        # --------------------------
        url = "http://api.aviationstack.com/v1/flights"
        params = {
            "access_key": api_key,
            "dep_iata": airport
        }

        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        records = []

        for item in data.get("data", []):
            # Parse departure and arrival info
            dep = item.get("departure", {})
            arr = item.get("arrival", {})
            flight = item.get("flight", {})
            airline = item.get("airline", {})

            dep_time_str = dep.get("scheduled")
            arr_time_str = arr.get("scheduled")

            departure_time = dep_time_str
            arrival_time = arr_time_str

            # --- Compute dayOfWeek using local departure time ---
            if departure_time:
                dt = parser.isoparse(departure_time)
                local_day_of_week = dt.strftime("%A")
            else:
                local_day_of_week = None

            # Lookup airport names and iataCodes from MongoDB
            dep_iata = dep.get("iata")
            arr_iata = arr.get("iata")

            dep_airport_doc = airports_col.find_one({"iataCode": dep_iata})
            arr_airport_doc = airports_col.find_one({"iataCode": arr_iata})

            dep_airport_name = dep_airport_doc["name"] if dep_airport_doc else dep.get("airport")
            arr_airport_name = arr_airport_doc["name"] if arr_airport_doc else arr.get("airport")

            dep_iata_final = dep_airport_doc["iataCode"] if dep_airport_doc else dep_iata
            arr_iata_final = arr_airport_doc["iataCode"] if arr_airport_doc else arr_iata

            # Use operating airline if present
            codeshared = flight.get("codeshared")
            if codeshared:
                airline_name = codeshared.get("airline_name")
                flight_number = codeshared.get("flight_number")
            else:
                airline_name = airline.get("name")
                flight_number = flight.get("number")

            # Skip if missing required fields
            if not (dep_airport_name and arr_airport_name and departure_time and arrival_time):
                continue

            record = {
                "departureAirport": {
                    "name": dep_airport_name,
                    "iataCode": dep_iata_final
                },
                "arrivalAirport": {
                    "name": arr_airport_name,
                    "iataCode": arr_iata_final
                },
                "departureTime": departure_time,
                "arrivalTime": arrival_time,
                "airline": airline_name,
                "flightNumber": flight_number,
                "dayOfWeek": local_day_of_week
            }

            records.append(record)

        if not records:
            print("No valid flight data returned.")
            return False, 0, mode

        # Deduplicate by key fields
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

        # Store in MongoDB or JSON
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

        return True, len(records), mode

    except Exception as e:
        print(f"Error: {e}")
        return False, 0, mode
