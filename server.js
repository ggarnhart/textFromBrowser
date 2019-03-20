var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var Bandwidth = require("node-bandwidth");
var credentials = require("./credentials");
console.log(credentials.apiSecret);
var client = new Bandwidth({
  userID: credentials.userID,
  apiToken: credentials.apiToken,
  apiSecret: credentials.apiSecret
});

app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/messages", (req, res) => {
  res.send("hello");
});

// this is used so all the users stay in sync
io.on("connect", socket => {
  console.log("A USER CONNECTED GUYS");
  console.log(process.env.APISECRET); // this will only work on heroku i think
});

// Hey hey they're tyring to send something
app.post("/messages", async (req, res) => {
  console.log(req.body);
  var message = {
    from: "+15712060489", // get this in a second
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

var server = http.listen(3000, () => {
  console.log("server is listening on port 3000 lets go");
});
