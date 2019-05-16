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
    let from = req.body.from; // the person sending the text :)
    let to = req.body.to; // the bandwidth number
    let text = req.body.text;
    pool.query(
      "SELECT id, attendeecount FROM event WHERE active",
      (err, res) => {
        console.log(res.rows);
        var count = res.rows[0].attendeecount;
        var id = res.rows[0].id;
        var numberArray = res.rows[0].receivednumbers;
        console.log("hey", numberArray);
        if (checkUniqueNumber(numberArray, receivedNumber)) {
          checkNewNumberIn(count, id, numberArray, receivedNumber);
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

function checkUniqueNumber(arr, receivedNumber) {
  if (receivedNumber != undefined) {
    const desiredNumber = receivedNumber.replace(/[^\w]/gi, "");
    console.log(arr.includes(desiredNumber));
    return !arr.includes(desiredNumber);
  } else {
    // true will stop the process as it acts as though the number is already in the array.
    return true;
  }
}

function checkNewNumberIn(count, id, numberArray, receivedNumber) {
  let updatedCount = count + 1;
  const desiredNumber = receivedNumber.replace(/[^\w]/gi, "");
  numberArray.push(desiredNumber);
  const update_string =
    "update event set attendeecount=$1, receivednumbers=$2 where id=$3";
  const values = [updatedCount, numberArray, id];
  pool.query(update_string, values, (err, res) => {
    if (err) {
      console.log(err);
    } else {
      io.emit("checkedIn", count);
    }
  });
}
