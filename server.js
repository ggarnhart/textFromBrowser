var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var Bandwidth = require("node-bandwidth");
var port = process.env.PORT || 3000;
var client = new Bandwidth({
  userId: process.env.USERID,
  apiToken: process.env.APITOKEN,
  apiSecret: process.env.APISECRET
});

var db_url = process.env.DATABASE_URL;
console.log(db_url);

app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/messages", (req, res) => {
  res.send("hello");
});

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
  client.Message.send(message)
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
