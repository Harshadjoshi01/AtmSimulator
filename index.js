const express = require("express");
const bodyParser = require('body-parser');
const mysql = require("mysql");
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
const session = require('express-session');
require('dotenv').config();
//use process.env.{VARIABLE-NAME}


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
  res.locals.title = "ADDMEMBER";
  res.render("addmember")
});
app.get("/homepage", function(req, res) {
  res.locals.title = "HOMEPAGE";
  res.render("homepage")
});
app.get("/transaction", function(req, res) {
  res.locals.title = "TRANSCATION";
  res.render("transaction")
})
app.post("/", function(req, res) {
  var max_card = 100000000000;
  var min_card = 999999999999;
  var max_pin = 100000;
  var min_pin = 999999;
  var card_no = Math.floor(Math.random() * (max_card - min_card + 1)) + min_card;
  var pin_no = Math.floor(Math.random() * (max_pin - min_pin + 1)) + min_pin;
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
      res.locals.title = "PIN PAGE";
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
  db.query("SELECT pin_num FROM user_data WHERE Cardno = ?", [user_card_no], function(err, result) {
    if (err) {
      console.log(err);
    }
    if (entered_pin_no.toString() === result[0].pin_num.toString()) {
      res.locals.title = "TRANSCATION";
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

app.post("/features", function(req, res) {
  var pressed_button = req.body[Object.keys(req.body)[0]];
  switch (pressed_button) {
    case '1':
      res.locals.title = "WITHDRAW";
      res.render("withdraw")
      break;
    case '2':
      res.locals.title = "DEPOSITE";
      res.render("deposite")
      break;
    case '3':
      res.locals.title = "MINISTATEMENT";
      res.render("ministatement")
      break;
    case '4':
      res.locals.title = "PINCHANGE";
      res.render("pinchange")
      break;
    case '5':
      res.locals.title = "BALANCEINQUARY";
      res.render("balanceinquary")
      break;
    case '6':
      res.locals.title = "TRANSFER";
      res.render("transfer")
      break;
    case '7':
      res.locals.title = "FASTCASH";
      res.render("fastcash")
      break;
    default:
      res.render("homepage")
    }
});

  app.post("/withdraw", function(req, res) {
    var amount = parseInt(req.body.amount);
    db.query("SELECT amount FROM user_data WHERE Cardno = ?", [user_card_no], function(err, result) {
      if (err) {
        console.log(err)
      }
      var balance = result[0].amount;
      if (amount <= balance) {
        db.query("UPDATE  user_data SET  user_data.amount=user_data.amount - ? WHERE  Cardno = ?", [amount, user_card_no], function(err, result) {
          if (err) {
            console.log(err)
          }
          req.session.message = {
            type: "success",
            message: "YOUR ACCOUNT HAS BEEN DEBITED WITH " + req.body.amount.toString() + " Rs"
          }
          res.redirect("/transaction")
        });
      } else {
        req.session.message = {
          type: "danger",
          message: "YOU DON'T HAVE SUFFICIENT AMOUNT TO WITHDRAW PLEASE ADD SOME CASH"
        }
        res.redirect("/transaction")
      }
    });
  });
  app.post("/deposite", function(req, res) {
    var amount = parseInt(req.body.amount);
    db.query("UPDATE  user_data SET  user_data.amount=user_data.amount + ? WHERE  Cardno = ?", [amount, user_card_no], function(err, result) {
      if (err) {
        console.log(err)
      }
      req.session.message = {
        type: "success",
        message: "YOUR ACCOUNT HAS BEEN CREDITED WITH " + req.body.amount.toString() + " Rs"
      }
      res.redirect("/transaction")
    });
  });


  
app.listen(3000, function() {
  console.log("server is running @ port 3000");
});
