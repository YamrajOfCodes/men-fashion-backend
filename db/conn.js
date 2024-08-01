const mongoose = require("mongoose");

const DB = "mongodb+srv://kundan:9960322509@cluster0.k4tndq4.mongodb.net/Male-fashion?retryWrites=true&w=majority&appName=Cluster0"

mongoose.connect(DB,{
    useUnifiedTopology:true,
    useNewUrlParser:true
}).then(()=>console.log("database connected")).catch((err)=>console.log("err",err))