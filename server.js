var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var Bandwidth = require("node-bandwidth");
var port = process.env.PORT || 3000;
var bandwidth_client = new Bandwidth({
  userId: process.env.USERID,
  apiToken: process.env.APITOKEN,
  apiSecret: process.env.APISECRET
});

// heroku's postgres stuff
const { Client } = require("pg");
const client = new Client({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: "ec2-54-243-241-62.compute-1.amazonaws.com",
  port: "5432",
  database: process.env.PGDATABASE
});

client
  .connect()
  .then(() => console.log("connected successfully"))
  .catch(e => console.log("Error connecting to database: " + e));
client.end();

app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// this is used so all the users stay in sync
io.on("connect", socket => {
  console.log("User connected to website.");
});

// Hey hey they're tyring to send something
app.post("/messages", async (req, res) => {
  console.log("User trying to send a message");
  console.log(req.body.message);
  var message = {
    from: "+15712060489", // your registered Bandwidth Number
    to: req.body.number,
    text: req.body.message
  };
  bandwidth_client.Message.send(message)
    .then(function(message) {
      console.log("Just texted a message with an id of " + message.id);
    })
    .catch(function(err) {
      console.log(err.message);
    });
});

var server = http.listen(port, () => {
  console.log("server is up and running.");
});
