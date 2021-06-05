const express = require("express");
const bodyParser = require('body-parser');
const mysql = require("mysql");
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
const session = require('express-session');
require('dotenv').config();
//use process.env.{VARIABLE-NAME}

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
  user: process.env.DATABASE_USER,
  host: "localhost",
  password: process.env.DATABASE_PASSWORD,
  database: "bankdb",
  insecureAuth: true
});
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD
  }
});
var user_session = false;
app.get("/", function(req, res) {
  res.locals.title = "ADDMEMBER";
  res.render("addmember")
});
app.get("/homepage", function(req, res) {
  res.locals.title = "HOMEPAGE";
  res.render("homepage")
});
app.get("/transaction", function(req, res) {
  if (user_session) {
    res.locals.title = "TRANSCATION";
    res.render("transaction");
  } else {
    res.redirect("/homepage");
  }

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
    var mailOptions = {
      from: process.env.EMAIL,
      to: user_email,
      subject: 'Sending Email using Node.js',
      text: msg
    };
    transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
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
      user_session = true;
      res.locals.title = "TRANSCATION";
      res.redirect("/transaction")
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
      var current = new Date();
      current.toLocaleString();
      db.query("select withdraw_amount, deposite_amount, tran_time from trans where account_num = 111  order by tran_num desc limit 3", function (err, result){
        if (err) {
          console.log(err);
        }
        console.log(result[0].withdraw_amount);
        console.log(result[1].withdraw_amount);
        console.log(result[2].withdraw_amount);
      })
      res.locals.title = "MINISTATEMENT";
      res.render("ministatement")
      break;
    case '4':
      res.locals.title = "PINCHANGE";
      res.render("pinchange")
      break;
    case '5':
      db.query("SELECT amount FROM user_data WHERE Cardno = ?", [user_card_no], function(err, result) {
        if (err) {
          console.log(err)
        }
        var balance = result[0].amount.toString();
        req.session.message = {
          type: "success",
          message: "YOUR CURRENT ACCOUNT BALANCE IS " + balance + " Rs"
        }
        res.redirect("/transaction")
      })
      break;
    case '6':
      res.locals.title = "TRANSFER";
      res.render("transfer")
      break;
    case '7':
      res.locals.title = "FASTCASH";
      res.render("fastcash")
      break;
    case '8':
      user_session = false;
      res.redirect("/homepage");
      break;
    default:
      user_session = false;
      res.render("/homepage")
  }
});

app.post("/withdraw", function(req, res) {
  var amount = parseInt(req.body.amount);
  var current = new Date();
  var tran_time = current.toLocaleString();
  db.query("SELECT amount FROM user_data WHERE Cardno = ?", [user_card_no], function(err, result) {
    if (err) {
      console.log(err)
    }
    var balance = result[0].amount;
    if (amount <= balance) {
      db.query("select Email from user_data where Cardno = ?", [user_card_no], function(err, result){
        if (err) {
          console.log(err);
        }
        let user_email = result[0].Email;
        let msg = "YOUR ACCOUNT HAS BEEN DEBITED WITH " + req.body.amount.toString() + " Rs"
          var mailOptions = {
            from: process.env.EMAIL,
            to: user_email,
            subject: 'Email From Atmsimulator',
            text: msg
          };
          transporter.sendMail(mailOptions, function(error, info){
          if (error) {
            console.log(error);
          } else {
            console.log('Email sent: ' + info.response);
          }
        });
      });
      db.query("UPDATE  user_data SET  user_data.amount=user_data.amount - ? WHERE  Cardno = ?", [amount, user_card_no], function(err, result) {
        if (err) {
          console.log(err)
        }
        db.query("insert into trans(Cardno, withdraw_amount, tran_time) values (?, ?, ?)",[user_card_no, amount, tran_time], function(err, result){
          if(err){
            console.log(err);
          }
          req.session.message = {
            type: "success",
            message: "YOUR ACCOUNT HAS BEEN DEBITED WITH " + req.body.amount.toString() + " Rs"
          }
          res.redirect("/transaction")
        });
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
  var current = new Date();
  var tran_time = current.toLocaleString();
  db.query("select Email from user_data where Cardno = ?", [user_card_no], function(err, result){
    if (err) {
      console.log(err);
    }
    let user_email = result[0].Email;
    let msg = "YOUR ACCOUNT HAS BEEN CREDITED WITH " + req.body.amount.toString() + " Rs"
      var mailOptions = {
        from: process.env.EMAIL,
        to: user_email,
        subject: 'Email From Atmsimulator',
        text: msg
      };
      transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  });

  db.query("UPDATE  user_data SET  user_data.amount=user_data.amount + ? WHERE  Cardno = ?", [amount, user_card_no], function(err, result) {
    if (err) {
      console.log(err)
    }
    db.query("insert into trans(Cardno, deposite_amount, tran_time) values (?, ?, ?)",[user_card_no, amount, tran_time], function(err, result){
      if(err){
        console.log(err);
      }
      req.session.message = {
        type: "success",
        message: "YOUR ACCOUNT HAS BEEN CREDITED WITH " + req.body.amount.toString() + " Rs"
      }
      res.redirect("/transaction")
    });
  });
});

app.post("/transfer", function(req, res){
  var account_num = parseInt(req.body.account_num);
  var amount_transfer = parseInt(req.body.amount_tranfer);
  var current = new Date();
  var tran_time = current.toLocaleString();
  db.query("SELECT amount , Username, account_num FROM user_data WHERE Cardno = ?", [user_card_no], function(err, result) {
    if (err) {
      console.log(err)
    }
    var balance = result[0].amount;
    let user_name = result[0].Username;
    let user_acc_num = result[0].account_num;
    if (amount_transfer <= balance) {
      db.query("select Email from user_data where Cardno = ?", [user_card_no], function(err, result){
        if (err) {
          console.log(err);
        }
        let user_email = result[0].Email;
        let msg = "AMOUNT " + req.body.amount_tranfer.toString() + " Rs " + "SUCCESSFULLY TRANSFERED TO ACCOUNT NUMBER " + req.body.account_num.toString()
          var mailOptions = {
            from: process.env.EMAIL,
            to: user_email,
            subject: 'Email From Atmsimulator',
            text: msg
          };
          transporter.sendMail(mailOptions, function(error, info){
          if (error) {
            console.log(error);
          } else {
            console.log('Email sent: ' + info.response);
          }
        });
      });
      db.query("UPDATE  user_data SET  user_data.amount=user_data.amount + ? WHERE  account_num = ? ", [amount_transfer, account_num], function(err, result) {
        if (err) {
          console.log(err)
        }
        db.query("UPDATE  user_data SET  user_data.amount=user_data.amount - ? WHERE  Cardno = ?", [amount_transfer, user_card_no], function(err, result) {
          if (err) {
            console.log(err) 
          }
          db.query("insert into trans(Cardno, transfer_amount, transfer_account_num, tran_time) values (?, ?, ?, ?)",[user_card_no, amount_transfer ,account_num, tran_time], function(err, result){
            if(err){
              console.log(err);
            }
            db.query("select Email from user_data where account_num = ?", [account_num], function(err, result){
              if (err) {
                console.log(err);
              }
              let user_email = result[0].Email;
              let msg = "AMOUNT " + req.body.amount_tranfer.toString() + " Rs " + "SUCCESSFULLY CREDITED TO YOUR ACCOUNT FROM " + user_acc_num.toString() + " ACCOUNT HOLDER NAME " + user_name.toString() + "."
                var mailOptions = {
                  from: process.env.EMAIL,
                  to: user_email,
                  subject: 'Email From Atmsimulator',
                  text: msg
                };
                transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                  console.log(error);
                } else {
                  console.log('Email sent: ' + info.response);
                }
              })
            })
            req.session.message = {
              type: "success",
              message: "AMOUNT " + req.body.amount_tranfer.toString() + " Rs " + "SUCCESSFULLY TRANSFERED TO ACCOUNT NUMBER " + req.body.account_num.toString() 
            }
            res.redirect("/transaction")
          });
        });
      });
    } else {
      req.session.message = {
        type: "danger",
        message: "YOU DON'T HAVE SUFFICIENT AMOUNT TO TRANSFER PLEASE ADD SOME CASH"
      }
      res.redirect("/transaction")
    }
  })
});

app.post("/pinchange", function(req, res){
  var new_pin = parseInt(req.body.new_pin);
  if ((new_pin >= 100000) && (new_pin < 999999)){
    db.query("UPDATE  user_data SET  user_data.pin_num = ? WHERE  Cardno = ?", [new_pin, user_card_no], function(err, result){
      if(err){
        console.log(err);
      }
      req.session.message = {
        type: "warning",
        message: "YOUR PIN HAS BEEN CHANGED SUCCESSFULLY"
      }
      res.redirect("/transaction")
    })
  } else {
    req.session.message = {
      type: "danger",
      message: "PLEASE ENTER A VALID PIN NUMBER"
    }
    res.redirect("/transaction")
  }

})

app.listen(3000, function() {
  console.log("server is running @ port 3000");
});
