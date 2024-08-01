const cloudinary = require("../../Cloudinary/cloudinary");
const userDB = require("../../model/user/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.USER_SECRET_KEY
const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
const {transporter} = require("../../helper");
const usercontactDB = require("../../model/user/userContactModel");

// register
exports.userRegister = async (req, res) => {
    const { firstname, lastname, email, password, confirmpassword } = req.body;


    if (!firstname || !email || !lastname || !password || !confirmpassword || !req.file) {
        res.status(400).json({ error: "all fileds are required" })
    }

    const file = req.file?.path;
    const upload = await cloudinary.uploader.upload(file);

    try {
        const preuser = await userDB.findOne({email:email});

        if(preuser){
            res.status(400).json({error:"this user is already exist"});
        }else if(password !== confirmpassword){
            res.status(400).json({error:"password and confirm password not match"});
        }else{
            const userData = new userDB({
                firstname, lastname, email, password, userprofile:upload.secure_url
            });

            // here password hashing

            await userData.save();
            res.status(200).json(userData);
        }
    } catch (error) {
        res.status(400).json(error)
    }
}

// login
exports.login = async (req, res) => {
    const {email,password} = req.body;
    
    if(!email || !password){
        res.status(400).json({error:"all field require"})
    }

    try {
        const userValid = await userDB.findOne({email:email});
        if(userValid){
            const isMatch = await bcrypt.compare(password,userValid.password);

            if(!isMatch){
                res.status(400).json({error:"Invalid Details"})
            }else{

                // token generate
                const token = await userValid.generateuserAuthToken();

                const result = {
                    userValid,
                    token
                }
                res.status(200).json(result)
            }
        }else{
            res.status(400).json({error:"invalid details"})
        }
    } catch (error) {
        res.status(400).json(error)
        
    }
}

// userverify

exports.userverify = async(req,res)=>{
    try {
        const verifyUser = await userDB.findOne({_id:req.userId});
        res.status(200).json(verifyUser)
    } catch (error) {
        res.status(400).json(error)
        
    }
}

// logout
exports.logout = async(req,res)=>{
    try {
        req.rootUser.tokens = req.rootUser.tokens.filter((currentElement)=>{
            return currentElement.token !== req.token
        });

        req.rootUser.save();
        res.status(200).json({message:"user Succesfully Logout"})
    } catch (error) {
        res.status(400).json(error)
        
    }
}

// forgotpassword
exports.forgotpassword = async(req,res)=>{
    const {email} = req.body;
    
    if(!email){
        return res.status(400).json({error:"email is not provided"})
    }

    try {

        const userfind = await userDB.findOne({email});

        if(userfind){   

            const token = jwt.sign({_id:userfind._id},SECRET_KEY,{
                expiresIn:"120s"
            })

            const updatekey = await userDB.findByIdAndUpdate({_id:userfind._id},{verifytoken:token},{new:true})
           
            const emailpath = path.join(__dirname,"../../EmailTemplate/Forgottemplate.ejs");
            const emailpathread = fs.readFileSync(emailpath,"utf8");
            

            // setlogo

            const data = {
                passwordresetlink:`http://localhost:3000/resetpassword/${userfind.id}/${updatekey.verifytoken}`,
                logo:"https://cdn-icons-png-flaticon.com/128/732/732200.png"
            }

            const rendertamplate = ejs.render(emailpath,data) // data ki value add karo

        }else{
            return res.status(400).json({error:"user is not found"})
        }
        
    } catch (error) {
        return res.status(400).json(error)
    }
    
    
}

// forgotpasswordverify
exports.forgotpasswordverify = async(req,res)=>{
    const {id,token} = req.params;

    try {
        const validuser = await userDB.findOne({_id:id,verifytoken:token});

        const verifytoken = jwt.verify(token,SECRET_KEY);

        if(validuser && verifytoken._id){
            res.status(200).json({message:"Valid user"});
        }else{
            res.status(400).json({error:"user not exist"})
        }
    } catch (error) {
        res.status(400).json(error)
    }
}

// resetpassword
exports.resetpassword = async(req,res)=>{
    const {id,token} = req.params;
    const {password} = req.body;
    try {
        const validuser = await userDB.findOne({_id:id,verifytoken:token});

        const verifytoken = jwt.verify(token,SECRET_KEY);

        if(validuser && verifytoken._id){

            const newpassword = await bcrypt.hash(password,12);

            const setnewpassword = await userDB.findByIdAndUpdate({_id:id},{password:newpassword},{new:true})

            await setnewpassword.save();
            res.status(200).json({message:"Password sucessfully updated"});
        }else{
            res.status(400).json({error:"your session time out please generate newlink"})
        }
    } catch (error) {
        res.status(400).json(error)
    }
}

// getAlluser
exports.getAlluser = async(req,res)=>{
    const page = req.query.page || 1;
    const ITEM_PER_PAGE = 4;
    try {

        const skip = (page - 1) * ITEM_PER_PAGE;

        const count = await userDB.countDocuments();

        const pageCount = Math.ceil(count/ITEM_PER_PAGE);

        const usersdata = await userDB.find()
        .limit(ITEM_PER_PAGE)
        .skip(skip)
        .sort({_id:-1});

        res.status(200).json({
            Pagination:{
                count,pageCount
            },
            usersdata
        });
        
    } catch (error) {
        res.status(400).json(error)
    }
}

// userDelete
exports.userDelete = async(req,res)=>{
    const {userid} = req.params;
    try {
        const deleteuser = await userDB.findByIdAndDelete({_id:userid});
        res.status(200).json(deleteuser);
    } catch (error) {
        res.status(400).json(error)
    }
}


// userContact

exports.userContact = async(req,res)=>{
    const {name,email,message} = req.body;

    if(!name || !email || !message){
        res.status(400).json({error:"all fields are required"})
    }

    try {
        const usermessageData = new usercontactDB({
            name,email,message
        });


        await usermessageData.save();
        res.status(200).json(usermessageData)
    } catch (error) {
        res.status(400).json(error)
    }
}