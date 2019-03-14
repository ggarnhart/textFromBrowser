var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);

app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/messages", (req, res) => {
  res.send("hello");
});

// this is used so all the users stay in sync
io.on("connect", socket => {
  console.log("A USER CONNECTED GUYS");
});

var server = http.listen(3000, () => {
  console.log("server is listening on port 3000 lets go");
});
