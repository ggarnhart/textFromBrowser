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
const { Client, Pool } = require("pg");
const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: "ec2-54-243-241-62.compute-1.amazonaws.com",
  port: "5432",
  database: process.env.PGDATABASE
});

app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

loadOldData();

// this is used so all the users stay in sync
io.on("connect", socket => {
  console.log("User connected to website.");
});

app.post("/callbacks", async (req, res) => {
  if (req.body.eventType === "sms") {
    let from = req.body.from;
    let to = req.body.to;
    let text = req.body.text;

    console.log("checking text against event logs");
    //console.log(checkEventMatches(text));
    pool.query(
      "SELECT id, attendeecount FROM event WHERE active",
      (err, res) => {
        if (err) {
          console.log("Error");
          console.log(err);
        } else {
          console.log(res.rows);
          var count = res.rows[0].attendeecount;
          var id = res.rows[0].id;
          count = count + 1;

          const update_string =
            "update event set attendeecount=$1 where id =$2;";
          const values = [count, id];

          pool.query(update_string, values, (err, res) => {
            if (err) {
              console.log(err);
            }
          });
          io.emit("checkedIn", count);
        }
      }
    );

    var insertString =
      "INSERT INTO receivedMessages(id, myPhoneNumber, theirPhoneNumber, message) VALUES(DEFAULT, $1, $2, $3)";
    var values = [to, from, text];
    pool.query(insertString, values, (err, res) => {
      if (err) {
        console.log(err.stack);
      } else {
        console.log(res.rows[0]);
      }
    });

    // let's put these in a database.

    // then, let's send a response?
  }
});

// Hey hey they're tyring to send something
app.post("/messages", async (req, res) => {
  var message = {
    from: "+15712060489", // your registered Bandwidth Number
    to: req.body.number,
    text: req.body.message
  };

  if (message.to != undefined && message.text != undefined) {
    bandwidth_client.Message.send(message)
      .then(function(message) {
        console.log("Just texted a message with an id of " + message.id);
      })
      .catch(function(err) {
        console.log(err.message);
      });
  }
});

var server = http.listen(port, () => {
  console.log("server is up and running.");
});

// this does not work rn. Currently just placing this code back up there.
function checkEventMatches(text) {
  // query for all eventCodes.
  pool.query("SELECT eventcode FROM event", (err, res) => {
    if (err) {
      console.log("Error");
      console.log(err);
    } else {
      return res.rows.includes(text);
    }
  });
}

function loadOldData() {
  pool.query("SELECT id, attendeecount FROM event WHERE active", (err, res) => {
    if (err) {
      console.log(err);
    } else {
      io.emit("checkedIn", res.rows[0].attendeecount);
    }
  });
}
