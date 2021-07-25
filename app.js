require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose')
const bcrypt = require("bcrypt")
const saltRounds = 10
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate")
const nodemailer = require('nodemailer')
const mailGun = require('nodemailer-mailgun-transport')

const app = express()

app.use(express.static("public"))
app.set('view engine','ejs')

app.use(bodyParser.urlencoded({
  extended: true
}))


app.use(session({
    secret: `${process.env.secret}`,
    resave: false,
    saveUninitialized: false

}));

app.use(passport.initialize())
app.use(passport.session())


mongoose.connect("mongodb+srv://admin-pooja:Pooja@123@cluster0.ya6hm.mongodb.net/userDB", { useNewUrlParser: true , useUnifiedTopology: true });
mongoose.set("useCreateIndex",true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)


const User = new mongoose.model("User",userSchema)

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


passport.use(new GoogleStrategy({
    clientID: `${process.env.CLIENT_ID}`,
    clientSecret: `${process.env.CLIENT_SECRET}`,
    callbackURL: `${process.env.callbackURL}`,
    userProfileURL: `${process.env.userProfileURL}`
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile)    
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

const auth = {
  auth: {
    api_key: `${process.env.api_key }`,
    domain: `${process.env.domain}`
  }
};

const transporter = nodemailer.createTransport(mailGun(auth))

const sendMail = function(email, subject, text, cb){
  const mailOptions = {
    from: email,
    to: `${process.env.myEmail}`,
    subject: subject,
    text: text
  };
  
  transporter.sendMail(mailOptions, function(err, data) {
    if(err){
      cb(err, null);
    } else{
      cb(null, data);
    }
  })
}


app.get("/", function(req,res){
    res.render("index")
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] })
  );

app.get('/auth/google/donate', 
  passport.authenticate('google', { failureRedirect: '/registeragain' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/donate');
  });

  app.get("/login", function(req, res){
    res.render("login");
  });
  
  app.get("/register", function(req, res){
    res.render("signup");
  });

  app.get("/Our-Team", function(req,res){
    res.render("Our-Team")
  })
  app.get("/contact", function(req,res){
    res.render("contact")
  })


app.get("/donate", function(req,res){

    if(req.isAuthenticated()){
        res.render("donate")
    }else{
        res.send("Please Sign In First")
    }
    
})

app.get("/logout", function(req,res){
  req.logout()
  res.redirect("/")
})

app.post("/register",function(req,res){

    User.register({username: req.body.username}, req.body.password, function(err, user){                
     if(err){
         console.log(err)
         res.redirect("/")
     } else{
         passport.authenticate("local")(req,res,function(){
             res.redirect("/donate")
         })
     }
    })
  })

  app.post("/send", function(req,res){
    const email = req.body.Email
    const subject = req.body.Name
    const text = req.body.Message
    console.log('Data: ',email,subject,text);

    sendMail(email, subject, text, function(err, data){
      if(err){
        res.status(500).json({message: 'Internal Error'});
      } else{
        res.send("Thankyou,your message has been sent, we will get back to you soon!!")
      }
    })
  })


app.post("/login",function(req,res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user,function(err){
      if(err){
        console.log(err)
      }else{
        passport.authenticate("local")(req,res, function(){
          res.redirect("/donate")
        })
      }

  })


})

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port,function(){
    console.log("Server has started successfully")
})




