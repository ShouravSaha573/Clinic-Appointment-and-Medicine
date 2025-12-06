import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
    fullName:{
        type:String,
        required:true
    },
    email:{
        type:String,
        unique:true,
        required:true
    },
    password:{
        type:String,
        minlength:6,
        required:true
    },
    profilePic:{
        type:String,
        default: "",
    },
    isAdmin:{
        type:Boolean,
        default: false,
    }
},
{timestamps:true}
);

const User = mongoose.model("User",userSchema);
export default User;