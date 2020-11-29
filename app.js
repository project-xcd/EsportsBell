require('dotenv').config();
const express=require('express');
const app=express();
const bodyParser=require('body-parser');
const mongoose=require('mongoose');
const _=require('lodash');
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const { result } = require('lodash');
const cloudinary = require('cloudinary').v2
const multer = require('multer')
const upload = multer({dest:'tmp/'});
const moment = require('moment');
const mkdirp = require("mkdirp");
const rimraf = require("rimraf");

const login = require('./routes/login.js');
const logout = require('./routes/logout.js');
var selected = [];

app.set('view engine','ejs');

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect(process.env.DB_URL,{useNewUrlParser:true,useUnifiedTopology:true});
mongoose.set("useCreateIndex",true);


const userSchema=new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  admin: Boolean
});
userSchema.plugin(passportLocalMongoose);
const User=new mongoose.model("User",userSchema);
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


const articleSchema=new mongoose.Schema({
  title:String,
  slug: String,
  body: String,
  category: String,
  imgurl: String,
  imgtext: String,
  imgid: String,
  approved: Boolean,
  author: String,
  authorid: String,
  date: Date,
  dateformat: String
});
const Article=new mongoose.model("Article",articleSchema);

const CategoriesSchema=new mongoose.Schema({
  title:String
});
const Categories=new mongoose.model("Categories",CategoriesSchema);

app.get('/loaderio-3f201c89b88d0553ca67669a95850cd4',function(req,res){
  res.send('loaderio-3f201c89b88d0553ca67669a95850cd4')
})
//(Routes sequence) login logut register profile /  articles categories compose admin adminapproved adminunapproved edit delete
app.use('/login', login);
app.post("/login", function(req,res){
  const user=new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user,async function(err){
    if(err){
      console.log(err);
      res.redirect("/login");
    }else{
      await passport.authenticate("local")(req,res,function(){
        res.redirect("/");
      });
    }
  })
});

app.use('/logout', logout);

app.get("/register",function(req,res){
  res.render("register");
});
app.post("/register",function(req,res){
  User.register({username:req.body.username,name:req.body.name,admin:false},req.body.password, async function(err,user){
    if(err){
      res.send(err.message + " go back and use different email as username.")
      
    }
    else{
      await passport.authenticate("local")(req,res,function(){
        res.redirect("/");
      });
    }
  });
});

app.get("/profile/:userId",async function(req,res){
  var isAuth,curUser,uid="";

  if(req.isAuthenticated()){
    isAuth=true;uid=uid+req.user._id;
    await User.findOne({username:req.user.username},function(err,foundUsers){
      if(err){
        console.log(err);
        res.redirect("/login");
      }else{
        if(!foundUsers){
          res.redirect("/login");
        }
        else{
          curUser=foundUsers;
        }
      }
    });
  }else{
    isAuth=false;
  }
  var user;
  await User.findOne({_id:req.params.userId},function(err,foundUser){
    if(err){
      console.log(err);
      res.redirect("/");
    }else{
      user=foundUser;
    }
  });
  await Article.find({authorid:req.params.userId,approved:true}).sort({date:-1}).exec(async function(err,foundArticles){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
      await Categories.find().exec(function(err,foundCategories){
        if(err){
          console.log(err);
          res.redirect("/");
        }
        else{
          foundArticles.forEach(onearticle => {
            dateformat = date_formated =  moment(onearticle.date).format('MMM Do YY') + ", " + moment(moment(onearticle.date).format('YYMMDDhmmssa'),'YYMMDDhmmssa').fromNow();   
            onearticle.dateformat = dateformat         
          });
         
          res.render("profile",{articles:foundArticles,searchUserInfo:user,categories:foundCategories,userInfo:curUser,auth:isAuth,userID:uid});
          
        }
      });
      
    }
  });
});

app.get("/",async function(req,res){
  var isAuth,foundUser,uid="",foundCategories;
  selected=[];
  if(req.isAuthenticated()){
    isAuth=true;uid=uid+req.user._id;
    await User.findOne({username:req.user.username},function(err,foundUsers){
      if(err){
        console.log(err);
        res.redirect("/login");
      }else{
        if(!foundUsers){
          res.redirect("/login");
        }
        else{
          
          foundUser=foundUsers;
        }
      }
    });
  }else{
    isAuth=false;
  }
  await Article.find({approved:true}).sort({date:-1}).exec(async function(err,foundArticles){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
      await Categories.find().exec(function(err,foundCategories){
        if(err){
          console.log(err);
          res.redirect("/");
        }
        else{
            foundArticles.forEach(onearticle => {
                dateformat = date_formated =  moment(onearticle.date).format('MMM Do YY') + ", " + moment(moment(onearticle.date).format('YYMMDDhmmssa'),'YYMMDDhmmssa').fromNow();   
                onearticle.dateformat = dateformat         
          });
          
          res.render("home",{userInfo:foundUser,articles:foundArticles,categories:foundCategories,selected:selected,auth:isAuth,userID:uid});
        }
    });
  }
});
})

app.get("/articles/:curSlug",async function(req,res){
  const slugUrl=req.params.curSlug;
  var isAuth,foundUser,uid="";
  if(req.isAuthenticated()){
    isAuth=true;uid=uid+req.user._id;
    await User.findOne({username:req.user.username},function(err,foundUsers){
      if(err){
        console.log(err);
        res.redirect("/login");
      }else{
        if(!foundUsers){
          res.redirect("/login");
        }
        else{
          foundUser=foundUsers;
        }
      }
    });
  }else{
    isAuth=false;
  }
  await Article.findOne({slug:slugUrl},async function(err,foundArticle){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
      await Categories.find().exec(function(err,foundCategories){
        if(err){
          console.log(err);
          res.redirect("/");
        }
        else{
          
          dateformat = date_formated =  moment(foundArticle.date).format('MMM Do YY') + ", " + moment(moment(foundArticle.date).format('YYMMDDhmmssa'),'YYMMDDhmmssa').fromNow();   
          foundArticle.dateformat = dateformat;         
        
          res.render("article",{userInfo:foundUser,data:foundArticle,categories:foundCategories,auth:isAuth,userID:uid});
        }
    });
    }
  });
});

app.get("/categories/:getcat",async function(req,res){
  var isAuth,foundUser,usid="";
  selected=[req.params.getcat];
  
  if(req.isAuthenticated()){
    usid=usid+req.user._id
    isAuth=true;
    await User.findOne({username:req.user.username},function(err,foundUsers){
      if(err){
        console.log(err);
        res.redirect("/login");
      }else{
        if(!foundUsers){
          res.redirect("/login");
        }
        else{
         
          foundUser=foundUsers;
       
        }
      }
    });
  }else{
    isAuth=false;
  }
  await Article.find({category:req.params.getcat,approved:true}).sort({date:-1}).exec(async function(err,foundArticles){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
      await Categories.find().exec(function(err,foundCategories){
        if(err){
          console.log(err);
          res.redirect("/");
        }
        else{
          foundArticles.forEach(onearticle => {
            dateformat = date_formated =  moment(onearticle.date).format('MMM Do YY') + ", " + moment(moment(onearticle.date).format('YYMMDDhmmssa'),'YYMMDDhmmssa').fromNow();   
            onearticle.dateformat = dateformat         
         });
          res.render("home",{userInfo:foundUser,articles:foundArticles,categories:foundCategories,selected:selected,auth:isAuth,userID:usid});
        }
      });
      
    }
  });
});


app.get("/compose",async function(req,res){
  if(req.isAuthenticated()){
    await Categories.find().exec(function(err,foundCategories){
      if(err){
        console.log(err);
        res.redirect("/");
      }
      else{
        
        res.render("compose",{admin:req.user.admin,categories:foundCategories});
       
      }
    });
    
  }else{
    res.redirect("/login");
  }
});

app.post("/compose",upload.single('image'),async function(req,res){
  var isApproved=false;
  var result, makeslug;
  var file = req.file;
  
  await cloudinary.uploader.upload(file.path,async function(error, result) {
    if(!result){
       console.log(error)
       res.redirect("/");
    }
    else{
    
      await rimraf("tmp", function(err) {
        if (err) console.log(err);
        mkdirp(__dirname+'/tmp').then()
      });
      
      var date_now = new Date();
      var date = ("0" + date_now.getDate()).slice(-2);
      var month = ("0" + (date_now.getMonth() + 1)).slice(-2);
      var year = date_now.getFullYear();
      var date_formated =  moment(date_now).format('YYMMDDhmmssa');
      makeslug=req.body.title.replace(/\s+/g, '-').toLowerCase();
      if(req.body.approve==="true") isApproved=true;
      article=new Article({
      title: req.body.title,
      slug: date+"-"+month+"-"+year+"-"+makeslug,
      body: req.body.body,
      category: req.body.category,
      imgurl: result.secure_url,
      imgtext: req.body.imgtext,
      imgid: result.public_id,
      approved: isApproved,
      author: req.user.name,
      authorid: req.user._id,
      date: Date.now(),
      dateformat: date_formated
      });
      article.save();
      
      res.redirect("/");
    }
  });
  
});

app.get("/admin",async function(req,res){
  if(req.isAuthenticated() && req.user.admin===true){
    await Article.find({}).sort({date:-1}).exec(async function(err,foundArticles){
      if(err){
        console.log(err);
        res.redirect("/");
      }
      else{
        await Categories.find().exec(function(err,foundCategories){
          if(err){
            console.log(err);
            res.redirect("/");
          }
          else{
            
            foundArticles.forEach(onearticle => {
              dateformat = date_formated =  moment(onearticle.date).format('MMM Do YY') + ", " + moment(moment(onearticle.date).format('YYMMDDhmmssa'),'YYMMDDhmmssa').fromNow();   
              onearticle.dateformat = dateformat         
        });
            res.render("admin",{articles:foundArticles,approved:'all',categories:foundCategories});
           
          }
        });
        
      }
    });
  }else{
    res.redirect("/login");
  }
});

app.get("/admin/approved",async function(req,res){
  if(req.isAuthenticated() && req.user.admin===true){
    await Article.find({approved:true}).sort({date:-1}).exec(async function(err,foundArticles){
      if(err){
        console.log(err);
        res.redirect("/");
      }
      else{
        await Categories.find().exec(function(err,foundCategories){
          if(err){
            console.log(err);
            res.redirect("/");
          }
          else{
            
            foundArticles.forEach(onearticle => {
              dateformat = date_formated =  moment(onearticle.date).format('MMM Do YY') + ", " + moment(moment(onearticle.date).format('YYMMDDhmmssa'),'YYMMDDhmmssa').fromNow();   
              onearticle.dateformat = dateformat         
        });
            res.render("admin",{articles:foundArticles,approved:'approved',categories:foundCategories});
           
          }
        });
      
      }
    });
  }else{
    res.redirect("/login");
  }
});

app.get("/admin/unapproved",async function(req,res){
  if(req.isAuthenticated() && req.user.admin===true){
    await Article.find({approved:false}).sort({date:-1}).exec(async function(err,foundArticles){
      if(err){
        console.log(err);
        res.redirect("/");
      }
      else{
        await Categories.find().exec(function(err,foundCategories){
          if(err){
            console.log(err);
            res.redirect("/");
          }
          else{
            
            foundArticles.forEach(onearticle => {
              dateformat = date_formated =  moment(onearticle.date).format('MMM Do YY') + ", " + moment(moment(onearticle.date).format('YYMMDDhmmssa'),'YYMMDDhmmssa').fromNow();   
              onearticle.dateformat = dateformat         
        });
            res.render("admin",{articles:foundArticles,approved:'unapproved',categories:foundCategories});
           
          }
        });
      }
    });
  }else{
    res.redirect("/login");
  }
});

app.get("/edit/:slugUrl",async function(req,res){
  if(req.isAuthenticated()){
    await Article.findOne({slug:req.params.slugUrl},async function(err,foundArticle){
      if(err){
        console.log(err);
        res.redirect("/");
      }
      else{
        await Categories.find().exec(function(err,foundCategories){
          if(err){
            console.log(err);
            res.redirect("/");
          }
          else{
        
            res.render("edit",{data:foundArticle,admin:req.user.admin,categories:foundCategories});
           
          }
        });
        
      }
    });
  }else{
    res.redirect("/login");
  }
});

app.post("/edit/:slugUrl",upload.single('image'),async function(req,res){
  file = req.file;
  var prevName=req.user.name,prevId=req.user._id;
  await Article.findOne({slug:req.params.slugUrl},async function(err,foundArticle){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
      console.log(req.body)
      date_now = new Date(req.body.date);
      date = ("0" + date_now.getDate()).slice(-2);
      month = ("0" + (date_now.getMonth() + 1)).slice(-2);
      year = date_now.getFullYear();
      makeslug=req.body.title.replace(/\s+/g, '-').toLowerCase();
      prevName=foundArticle.author;
      prevId=foundArticle.authorid;
      var isApproved=false,imageid,imageurl;
      
      if(!file){
        imageurl= req.body.imgurl;
        imageid = req.body.imgid
      }
      else{
        await cloudinary.uploader.upload(file.path, async function(error, result) {
          if(!result){
             console.log(error)
             res.redirect("/");
          }
          else{
            await rimraf("tmp", function(err) {
              if (err) console.log(err);
              mkdirp(__dirname+'/tmp').then()
            });
             imageurl= result.url;
             imageid =  result.public_id;
          }
       })
      }
      if(req.body.approve==="true" && req.user.admin) isApproved=true;
      article=new Article({
        title: req.body.title,
        slug: date+"-"+month+"-"+year+"-"+makeslug,
        body: req.body.body,
        category: req.body.category,
        imgurl: imageurl,
        imgtext: req.body.imgtext,
        imgid: imageid,
        approved: isApproved,
        author: prevName,
        authorid: prevId,
        date: req.body.date,
        dateformat: req.body.date
      });
      article.save();
      Article.deleteOne({slug:req.params.slugUrl},function(err){
        if(err){
          console.log(err);
          res.redirect("/");
        }
      });
       
      if(!file){
        res.redirect("/");
      }
      else{
      cloudinary.uploader.destroy(req.body.imgid, function(error,result) {
        console.log(result)
        res.redirect("/");
      });
      }
    }
  });
});

app.get("/delete/:slugUrl",async function(req,res){
  if(req.isAuthenticated()){
    await Article.findOne({slug:req.params.slugUrl},function(err,foundArticle){
      if(err){
        console.log(err);
        res.redirect("/");
      }
      else{
        res.render("delete",{data:foundArticle});
      }
    });
  }else{
    res.redirect("/login");
  }
});

app.post("/delete/:slugUrl",async function(req,res){
  var deleteimageid;
  await Article.findOne({slug:req.params.slugUrl},async function(err,foundArticle){
    if(err){
      console.log(err);
      res.redirect("/");
    }
    else{
      deleteimageid = foundArticle.imgid;
    }
    await Article.deleteOne({slug:req.params.slugUrl},function(err){
    if(err){
      console.log(err);
    }
    cloudinary.uploader.destroy(deleteimageid, function(error,result) {
      console.log(result)
    });
    res.redirect("/");
    });
  });
})
const PORT=process.env.PORT || 3000;
app.listen(PORT,function(){
  console.log('Server is running on port '+PORT);
})
