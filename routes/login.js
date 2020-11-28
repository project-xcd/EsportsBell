const express=require('express');
const router = express.Router();
const bodyParser=require('body-parser');
const mongoose=require('mongoose');
const _=require('lodash');
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const { result } = require('lodash');

router.get("/",function(req,res){
    res.render("login");
  });
module.exports = router;