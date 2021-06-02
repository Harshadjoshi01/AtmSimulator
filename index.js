const express = require("express");
const bodyParser = require('body-parser');
const mysql = require("mysql");
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(cookieParser('secret'))
app.use(session({
  cookie: {
    maxAge: null
  }
}))

//flash message middleware
app.use((req, res, next) => {
  res.locals.message = req.session.message
  delete req.session.message
  next()
})

app.use(express.static("public"));

const db = mysql.createConnection({
  user: "root",
  host: "localhost",
  password: "root",
  database: "bankdb",
  insecureAuth: true
});

app.get("/", function(req, res) {
  res.render("addmember")
});
app.get("/homepage", function(req, res) {
  res.render("homepage")
});
// app.get("/pin", function(req, res){
//   res.render("pin")
// })
app.post("/", function(req, res) {
  var card_no = Math.floor(Math.random() * 100000000000000);
  var pin_no = Math.floor(Math.random() * 1000000);
  var user_name = req.body.username;
  var user_email = req.body.email;
  var user_mobileno = req.body.mobileno;
  var msg = "Your Card Number is " + card_no.toString() + " and Your Pin Number is " + pin_no.toString();
  //   var transporter = nodemailer.createTransport({
  //     service: 'gmail',
  //     auth: {
  //       user: 'atmsamulator@gmail.com',
  //       pass: 'atm@samulator3448'
  //     }
  //   });
  //   var mailOptions = {
  //     from: 'atmsamulator@gmail.com',
  //     to: user_email,
  //     subject: 'Sending Email using Node.js',
  //     text: msg
  //   };
  //   transporter.sendMail(mailOptions, function(error, info){
  //   if (error) {
  //     console.log(error);
  //   } else {
  //     console.log('Email sent: ' + info.response);
  //   }
  // });
  db.query("INSERT INTO user_data (Username, Email, Mobileno, Cardno, pin_num) VALUES (?, ?, ?, ?, ?)", [user_name, user_email, user_mobileno, card_no, pin_no], function(err, result) {
    if (err) {
      console.log(err);
    }
    req.session.message = {
      type: "success",
      message: 'An Email is sent to your Email Address With Your Card Number and Pin Number'
    }
    res.redirect("/")
  });
});

var user_card_no = 0;
app.post("/pin", function(req, res) {
  user_card_no = req.body.Cardno;
  var data = [];
  var equal = false;
  db.query("SELECT Cardno FROM user_data", function(err, result) {
    if (err) {
      console.log(err);
    }
    data = result;
    for (var i = 0; i < data.length; i++) {
      if (user_card_no === data[i].Cardno.toString()) {
        equal = true;
        break;
      }
    };
    if (equal) {
      res.render("pin")
    } else {
      req.session.message = {
        type: "danger",
        message: 'PLEASE INSERT A VALID CARD NUMBER'
      }
      res.redirect("/homepage")
    }
  });
});

app.post("/transaction", function(req, res) {
  var entered_pin_no = req.body.pin_no;
  db.query("SELECT pin_num FROM user_data WHERE Cardno = ?", [user_card_no], function(err, result){
    if (err){
      console.log(err);
    }
    if(entered_pin_no.toString() === result[0].pin_num.toString()){
      res.render("transaction")
    } else {
      req.session.message = {
        type: "danger",
        message: 'PLEASE INSERT A VALID PIN NUMBER'
      }
      res.redirect("/homepage")
    }
  });
})
app.listen(3000, function() {
  console.log("server is running @ port 3000");
});
