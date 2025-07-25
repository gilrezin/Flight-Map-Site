# SkyScraper
Collect real-time data from aviationstack.com and upsert it to MongoDB

Make sure .env file with MONGODB_URI= is present in the SkyScraper folder.

airport.txt holds the airports IATA code to download  
api_keys.txt holds the access keys for AviationStack

Create free AviationStack API keys:  
`https://aviationstack.com/signup/free`
  
2. **Install dependencies**
   ```bash
   npm install
   ```
## SkyScraper single-airport JSON builder

   ```bash
   python3 scraper_gui.py

   ```
1. Enter airport IATA code
2. Enter a valid AviationStack API code
3. Select JSON as the Output Mode to create a JSON file,  
   or Upsert to atomatically upsert to MongoDB


## SkyScraper Auto-Upserter

   ```bash
   python3 auto_scraper_gui.py

   ```
Airports in airports.txt are automatically loaded  
API keys from api_keys.txt are automatically loaded  

Airports added to the Airports List get added to airports.txt  
API keys added to the API Keys List get added to api_keys.txt
