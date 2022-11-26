const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

// My answer starts here
let mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
  },
  log: [
    {
      description: {
        type: String,
        required: true,
      },
      duration: {
        type: Number,
        required: true,
      },
      date: {
        type: String,
      },
    },
  ],
});

let User = mongoose.model("User", userSchema);
// let Exercise = mongoose.model("Exercise", exerciseSchema);

let bodyParser = require("body-parser");
let bodyParserUrlencoded = bodyParser.urlencoded({ extended: false });

app.post("/api/users", bodyParserUrlencoded, bodyParser.json(), (req, res) => {
  let username = req.body["username"];
  console.log(username);

  let answer = {};
  answer["username"] = username;

  User.findOne({ username: username }, (err, result) => {
    if (err) return console.error(err);
    if (result) {
      console.log("Alredy, the user exists");
      answer["_id"] = result._id;
      res.send(answer);
    } else {
      console.log("The user not exist");
      User.create({ username: username }, (err, result) => {
        if (err) return console.error(err);
        answer["_id"] = result._id;
        res.send(answer);
      });
    }
  });
});

app.get("/api/users", (req, res) => {
  User.find({}, (err, result) => {
    if (err) return console.error(err);
    res.json(result);
  });
});

app.post(
  "/api/users/:_id/exercises",
  bodyParserUrlencoded,
  bodyParser.json(),
  (req, res) => {
    let _id = req.params._id;
    let duration = Number(req.body["duration"]);
    let date = req.body["date"];
    let description = req.body["description"].toString();
    let answer = {};

    if(date===undefined || date == "")
      date = new Date().toDateString();
    else
      date = new Date(date).toDateString();

    User.findOne({ _id: _id }, (err, result) => {
      if (err) return console.error(err);
      if (result) {
        console.log("Yes, there is such user.");
        answer["_id"] = result._id;
        answer["username"] = result.username;
        answer["date"] = date;
        answer["duration"] = duration;
        answer["description"] = description;

        let newExercise = {
          date: date,
          duration: duration,
          description: description,
        };

        res.send(answer);

        User.findByIdAndUpdate(
          _id,
          { $push: { log: newExercise } },
          { new: true },
          (err, result) => {
            if (err) return console.error(err);
            console.log(result);
          }
        );
      } else {
        console.log("No, there is no such user.");
      }
    });
  }
);

app.get("/api/users/:_id/logs", (req, res) => {
  User.findOne({ _id: req.params._id }, (err, result) => {
    if (err) return console.error(err);

    if (req.query.from || req.query.to) {
      let fromDate = new Date(0);
      let toDate = new Date();

      if (req.query.from) fromDate = new Date(req.query.from);
      if (req.query.to) toDate = new Date(req.query.to);

      fromDate = fromDate.getTime();
      toDate = toDate.getTime();

      result.log = result.log.filter((exercise) => {
        let exerciseDate = new Date(exercise.date).getTime();
        return exerciseDate >= fromDate && exerciseDate <= toDate;
      });
    }

    if (req.query.limit) {
      result.log = result.log.slice(0, req.query.limit);
    }

    let answer = {};
    answer["_id"] = result._id;
    answer["username"] = result.username;
    answer["count"] = result.log.length;
    answer["log"] = result.log;
    res.json(answer);
  });
});
