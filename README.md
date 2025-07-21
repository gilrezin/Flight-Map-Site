# Flight-Map-Site
A website that visually displays all destinations from a given airport with selected criteria.
Users can access our Flight Map Site at `https://flight-map-site.onrender.com/`

## Local Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd flight-map-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   PORT=3000
   NODE_ENV=development
   SESSION_SECRET=your_session_secret_here
   ```

4. **Start the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Test the connection**
   ```bash
   npm test
   ```

## Usage

- **Homepage**: `http://localhost:3000` - Interactive map and search
- **Search Page**: `http://localhost:3000/search` - Flight search results
- **Admin Dashboard**: `http://localhost:3000/admin` - Database management

## Admin Features

- View database statistics (flight count, active routes)
- Upload flight data via JSON files
- Add new airlines to the system

## Project Structure

```
├── backend/
│   ├── config/
│   │   └── database.js      # MongoDB connection
│   ├── controllers/
│   │   └── LoginController.js
│   ├── models/
│   │   ├── Admin.js         # Admin user schema
│   │   ├── Airline.js       # Airline schema
│   │   └── Airport.js       # Airport schema
│   ├── routes/
│   │   └── admin.js         # Admin route handlers
│   ├── .env                 # Environment variables
│   ├── package.json         # Backend dependencies
│   ├── package-lock.json
│   └─── server.js            # Main server file
│    
└── frontend/
    ├── public/
    │   ├── css/
    │   │   └── flightmap.css # Custom styles
    │   └── js/
    │       ├── MapController.js
    │       └── SearchResultController.js
    └── views/
        ├── admin/
        │   ├── dashboard.ejs # Admin dashboard
        │   └── login.ejs    # Admin login page
        └── pages/
            ├── index.ejs    # Homepage
            └── search.ejs   # Search results
```
