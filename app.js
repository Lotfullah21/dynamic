///////////////////// Requiring Libraries  ////////////////////
require("dotenv").config()
const express = require("express")
const bodyParser = require("body-parser")
const mongoose = require("mongoose")
const ejs = require("ejs")
const passport = require("passport")
const session = require("express-session")
const localpassport = require("passport-local-mongoose")

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findOrCreate")



const saltRounds = 10

const app = express()
app.use(session({
    secret:"MYSECRET",
    resave:false,
    saveUninitialized:true
}))



// the passport will maintain persistent login session, here we are serializing and deserialize based on user request

app.use(passport.initialize())
app.use(passport.session())

app.set("view engine", "ejs")
app.use(bodyParser.urlencoded({extended:true}))
app.use(express.static("public"))

//console.log(process.env.API)

mongoose.connect("mongodb://localhost:27017/UserDB",{useNewUrlParser:true});
// to remove depricate warning error
mongoose.set("useCreateIndex",true);


const UserSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    content: String
})

UserSchema.plugin(localpassport)
UserSchema.plugin(findOrCreate)

const User = new mongoose.model("Data",UserSchema)

passport.use(User.createStrategy())

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });


passport.use(new GoogleStrategy({
    clientID:process.env.client_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/hosh",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb){
    console.log(profile)
    User.findOrCreate({ googleId:profile.id },function(err,user){
        return cb(err,user)
    });
        
}
));


// ---------------encryption field----------------------//

app.get("/",function(req,res){
    res.render("home")
})

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/hosh",
  passport.authenticate("google",{ failureRedirect:"/login"}),
  function(req,res){
      res.redirect("/contents");
  }    
);



app.get("/logout",function(req,res){
    req.logOut()
    res.redirect("/")
})

app.get("/login",function(req,res){
    res.render("login")
})

app.get("/register",function(req,res){
   res.render("register")
 })

 app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit")
    }else{
        res.redirect("/login")
    }
})

app.get("/contents",function(req,res){
    User.find({"content":{$ne:null}},function(err,foundusers){
        if(err){
            console.log(err)
        }else{
            if(foundusers){
                res.render("contents",{userwithcontent:foundusers})
            }
        }
    })
})

app.post("/submit",function(req,res){
    const submitted_content = req.body.article;
    // findin current user and saving their article into database
    console.log(req.user.id)

    User.findById(req.user.id,function(err,founduser){
        if(err){
            console.log(err)
        }else{
            if(founduser){
                founduser.content = submitted_content
                founduser.save(function(){
                    res.redirect("/contents")
                })
            }
        }
    })
})

app.get("/contents",function(req,res){
    if(req.isAuthenticated()){
        res.render("contents")
    }else{
        res.render("/login")
    }
})



 app.post("/register",function(req,res){
 User.register({username:req.body.username},req.body.password,function(err,user){
     if(err){
         console.log(err)
    }else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("/contents")
        })
    }
 })
});




app.post("/login",function(req,res){
    const user = new User({
        username : req.body.username,
        password : req.body.password
    })
       req.login(user,function(err){
           if(err){
               console.log(err)
           }else{
               passport.authenticate("local")(req,res,function(){
                   res.redirect("/contents")
               })
           }
       })
    });


app.listen(3000,function(){
    console.log("server is running")
})