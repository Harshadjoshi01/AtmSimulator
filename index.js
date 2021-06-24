
const express = require("express");
const bodyParser = require('body-parser');
const mysql = require("mysql");
const nodemailer = require('nodemailer');
// const cookieParser = require('cookie-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
var MySQLStore = require('express-mysql-session')(session);
require('dotenv').config();
//use process.env.{VARIABLE-NAME}

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

var options = {
  host: process.env.DATABASEHOST, 
  port: process.env.DATABASEPORT,    
  user: process.env.DATABASEUSER,   
  password: process.env.DATABASEPASSWORD, 
  database: process.env.DATABASENAME,     
  insecureAuth: true,
  	// Whether or not to automatically check for and clear expired sessions:
	clearExpired: true,
	// How frequently expired sessions will be cleared; milliseconds:
	checkExpirationInterval: 100000,
	// The maximum age of a valid session; milliseconds:
	expiration: 600000,
  schema: {
		tableName: 'usersession',
		columnNames: {
			session_id: 'user_session_id',
			expires: 'session_expires',
			data: 'user_data'
		}
	}
};

var sessionStore = new MySQLStore(options);
const db = mysql.createConnection(options);
db.connect(function(err) {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
 
  console.log('connected as id ' + db.threadId);
});
// app.use(cookieParser('secret'))
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore
  })
);

const isAuth = (req, res, next) => {
  if(req.session.isAuth) {
    next();
  } else {
    res.redirect("/");
  }
}

const isAllowedloginpage = (req, res, next) => {
  if(req.session.isAllowedloginpage){
    res.redirect("/transaction");
  } else {
    next();
  }
}
// app.use(session({
//   cookie: {
//     maxAge: null
//   }
// }))

//flash message middleware
app.use((req, res, next) => {
  res.locals.message = req.session.message
  delete req.session.message
  next()
})

app.use(express.static("public"));

// const db = mysql.createConnection({
//   user: process.env.DATABASE_USER,
//   host: "localhost",
//   password: process.env.DATABASE_PASSWORD,
//   database: "bankdb",
//   insecureAuth: true
// });
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD
  }
});

var user_card_no = 0;
app.get("/",isAllowedloginpage, function(req, res) {
  res.locals.title = "HOMEPAGE";
  res.render("homepage")
});

app.get("/addmember", function(req, res) {
  res.locals.title = "ADDMEMBER";
  res.render("addmember")
});

app.get("/transaction", isAuth, function(req, res) {
    res.locals.title = "TRANSCATION";
    res.render("transaction");
});

app.get("/withdraw", isAuth, function(req, res) {
  res.locals.title = "WITHDRAW";
  res.render("withdraw");
});

app.get("/deposite", isAuth, function(req, res) {
  res.locals.title = "DEPOSITE";
  res.render("deposite");
});

app.get("/team", function(req, res) {
  res.locals.title = "TEAM";
  res.render("team");
});

app.get("/ministatement", isAuth, function(req, res) {
  db.query("SELECT transcount FROM user_data WHERE Cardno = ?", [user_card_no], function(err, result){
    if(err) {
      console.log(err)
    }
    const user_trans_count = result[0].transcount;
    if(user_trans_count >= 3){
      db.query("select withdraw_amount, deposite_amount, transfer_amount, transfer_account_num, tran_time from trans where Cardno = ?  order by tran_num desc", [user_card_no], function (err, result){
        if (err) {
          console.log(err);
        }
        var wa_1 = result[0].withdraw_amount
        var da_1 = result[0].deposite_amount
        var tr_amount_1 = result[0].transfer_amount
        var tr_acc_1 = result[0].transfer_account_num
        var tr_time_1 = result[0].tran_time
        var wa_2 = result[1].withdraw_amount
        var da_2 = result[1].deposite_amount
        var tr_amount_2 = result[1].transfer_amount
        var tr_acc_2 = result[1].transfer_account_num
        var tr_time_2 = result[1].tran_time
        var wa_3 = result[2].withdraw_amount
        var da_3 = result[2].deposite_amount
        var tr_amount_3 = result[2].transfer_amount
        var tr_acc_3 = result[2].transfer_account_num
        var tr_time_3 = result[2].tran_time
        res.locals.title = "MINISTATEMENT";
        res.render("ministatement",{
          
          c_1_wa : wa_1,
          c_1_da : da_1 ,
          c_1_ta : tr_amount_1,
          c_1_tac : tr_acc_1,
          c_1_ti : tr_time_1,
          c_2_wa : wa_2,
          c_2_da : da_2,
          c_2_ta : tr_amount_2,
          c_2_tac : tr_acc_2,
          c_2_ti : tr_time_2,
          c_3_wa : wa_3,
          c_3_da : da_3,
          c_3_ta : tr_amount_3,
          c_3_tac : tr_acc_3,
          c_3_ti : tr_time_3
        
        })
      });
  
    } else {
      req.session.message = {type: "danger", message: "Please make atleast 3 transaction"}
      res.redirect("/transaction")
    }

  });
});

app.get("/pinchange", isAuth, function(req, res) {
  res.locals.title = "PINCHANGE";
  res.render("pinchange");
});

app.get("/balance", isAuth, function(req, res) {
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
});

app.get("/transfer", isAuth, function(req, res) {
  res.locals.title = "TRANSFER";
  res.render("transfer");
});

app.post("/addmember", async (req, res) => {
  var max_card = 100000000000;
  var min_card = 999999999999;
  var max_pin = 100000;
  var min_pin = 999999;
  var card_no = Math.floor(Math.random() * (max_card - min_card + 1)) + min_card;
  var pin_no = Math.floor(Math.random() * (max_pin - min_pin + 1)) + min_pin;
  var hasdPsw = await bcrypt.hash(pin_no.toString(), 10);
  var user_name = req.body.username;
  var user_email = req.body.email;
  var user_mobileno = req.body.mobileno;
  db.query("select Email from user_data where Email = ?",[user_email], function(err, result){
    if(err){
      console.log(err)
    }
    if(result.length == 0){
    db.query("INSERT INTO user_data (Username, Email, Mobileno, Cardno, pin_num) VALUES (?, ?, ?, ?, ?)", [user_name, user_email, user_mobileno, card_no, hasdPsw], function(err, result) {
      if (err) {
        console.log(err);
      }
      db.query("SELECT account_num FROM user_data WHERE Email = ?",[user_email], function(err, result) {
        if(err){
          console.log(err);
        }
        let account_num = result[0].account_num;
        var msg = "Your Account Number is " + account_num.toString() + " Your Card Number is " + card_no.toString() + " and Your Pin Number is " + pin_no.toString();
        var mailOptions = {
          from: process.env.EMAIL,
          to: user_email,
          subject: 'Email from ATMSIMULATOR',
          text: msg
        };
        transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
      req.session.message = {
        type: "success",
        message: 'An Email is sent to your Email Address With Your Card Number and Pin Number'
      }
      res.redirect("/addmember")
      });
    });
    } else {
      req.session.message = {
        type: "danger",
        message: 'Email already exists please change your email address'
      }
      res.redirect("/addmember")
    }
  })
});

// User loged in after log in validation of its card no and pin no and all
app.post("/pin", function(req, res) {
  user_card_no = req.body.Cardno;
  db.query("SELECT Cardno FROM user_data WHERE Cardno = ?", [user_card_no],function(err, result) {
    if (err) {
      console.log(err);
    }
    if(result.length == 0){
      req.session.message = {
        type: "danger",
        message: 'PLEASE INSERT A VALID CARD NUMBER'
      }
      res.redirect("/")
    } else {
      res.locals.title = "PIN PAGE";
      res.render("pin");
    }
  });
});

app.post("/transaction", function(req, res) {
  var entered_pin_no = req.body.pin_no;
  db.query("SELECT pin_num FROM user_data WHERE Cardno = ?", [user_card_no], async function(err, result) {
    if (err) {
      console.log(err);
    }
    var isMatch = await bcrypt.compare(entered_pin_no, result[0].pin_num);
    console.log(isMatch);

    if(!isMatch) {
      req.session.message = {
        type: "danger",
        message: 'PLEASE INSERT A VALID PIN NUMBER'
      }
      res.redirect("/")
    } else {
      const user_newsession_id = req.session.id;
      db.query("select user_sid from user_data where Cardno = ?",[user_card_no], function(err, result){
        if(err) {
          console.log(err);
        }
        const user_previous_sid = result[0].user_sid;
        db.query("DELETE FROM usersession WHERE user_session_id = ?",[user_previous_sid], function(err, result){
          if (err) {
            console.log(err);
          }
          db.query("UPDATE user_data SET user_sid = ? WHERE  Cardno = ?", [user_newsession_id, user_card_no], function (err, result){
            if (err){
              console.log(err);
            } 
            req.session.isAllowedloginpage = true;
            req.session.isAuth = true;
            res.locals.title = "TRANSCATION";
            res.redirect("/transaction")
  
          });
        });
  
      });

    }
  });
});

app.post("/features", function(req, res) {
  var pressed_button = req.body[Object.keys(req.body)[0]];
  switch (pressed_button) {
    case '1':
      res.redirect("/withdraw")
      break;
    case '2':
      res.redirect("/deposite")
      break;
    case '3':
      res.redirect("/ministatement")
      break;
    case '4':
      res.redirect("/pinchange")
      break;
    case '5':
      res.redirect("/balance")
      break;
    case '6':
      res.redirect("/transfer")
      break;
    case '8':
      req.session.destroy((err) => {
        if (err) throw err;
        res.redirect("/");
      });
      break;
    default:
      req.session.destroy((err) => {
        if (err) throw err;
        res.redirect("/");
      });
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
          db.query("UPDATE user_data SET user_data.transcount = user_data.transcount + 1 WHERE  Cardno = ?", [user_card_no], function(err, result){
            
            if (err){
              console.log(err)
            }
            req.session.message = {
              type: "success",
              message: "YOUR ACCOUNT HAS BEEN DEBITED WITH " + req.body.amount.toString() + " Rs"
            }
            res.redirect("/transaction")
          })
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
      db.query("UPDATE user_data SET user_data.transcount = user_data.transcount + 1 WHERE  Cardno = ?", [user_card_no], function(err, result){
        if(err){
          console.log(err);
        }
        req.session.message = {
          type: "success",
          message: "YOUR ACCOUNT HAS BEEN CREDITED WITH " + req.body.amount.toString() + " Rs"
        }
        res.redirect("/transaction")
      })
    });
  });
});

app.post("/transfer", function(req, res){
  var account_num = parseInt(req.body.account_num);
  var amount_transfer = parseInt(req.body.amount_tranfer);
  var current = new Date();
  var tran_time = current.toLocaleString();
  db.query("select account_num from user_data where account_num = ?",[account_num.toString()] ,function(err, result){
    if(err){
      console.log(err);
    }
    if(result.length == 0){
      req.session.message = {
        type: "danger",
        message: "Please Enter a Valid Account Number to transfer the Amount"
      }
      res.redirect("/transaction")
    } else {
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
                db.query("UPDATE user_data SET user_data.transcount = user_data.transcount + 1 WHERE  Cardno = ?", [user_card_no], function(err, result){
    
                  if(err) {
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
          });
        } else {
          req.session.message = {
            type: "danger",
            message: "YOU DON'T HAVE SUFFICIENT AMOUNT TO TRANSFER PLEASE ADD SOME CASH"
          }
          res.redirect("/transaction")
        }
      })
    }
  });
});

app.post("/pinchange", async function(req, res){
  var new_pin = parseInt(req.body.new_pin);
  if ((new_pin >= 100000) && (new_pin < 999999)){
    var hasdpin = await bcrypt.hash(new_pin.toString(), 10);
    db.query("UPDATE  user_data SET  user_data.pin_num = ? WHERE  Cardno = ?", [hasdpin, user_card_no], function(err, result){
      if(err){
        console.log(err);
      }
      db.query("select Email from user_data where Cardno = ?", [user_card_no], function(err, result){
        if (err) {
          console.log(err);
        }
        let user_email = result[0].Email;
        let msg = "YOUR PIN HAS BEEN CHANGED SUCCESSFULLY IF YOU HAVE NOT CHANGED YOUR PIN PLEASE CONTACT TO NEAREST BANK BRANCH"
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

app.listen( process.env.PORT|| 3000, function() {
    console.log("server is running @ port");
});
