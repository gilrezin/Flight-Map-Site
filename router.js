const express = require("express");
const path = require("path");
const session = require("express-session");

const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.json()); // for parsing application/json

app.set("view engine", "ejs");
app.set("views", "./views");

// Set up our models
const Register = require("./controllers/RegisterController.js");
const Login = require("./controllers/LoginController.js");
const Map = require("./controllers/MapController.js");
const MapControl = new Map();
const SearchResult = require("./controllers/SearchResultController.js");


// template engine setup
app.get('/', (req, res) => {
  MapControl.loadAllAirports()
    .then(airports => {
        console.log(airports);
        res.render("index", { airports: airports });
    })
    .catch(error => {
      res.status(500).send("Error fetching airports: " + error.message);
      console.error("Error fetching airports: ", error);
    });
  });

app.listen(3000, () => {
  console.log("Listening on port 3000");
});
