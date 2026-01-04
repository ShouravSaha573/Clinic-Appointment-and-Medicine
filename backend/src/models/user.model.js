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
        required:true
    },
    profilePic:{
        type:String,
        default: "",
    },
    isAdmin:{
        type:Boolean,
        default: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    }
},
{timestamps:true}
);

// Indexes for efficient queries
userSchema.index({ isAdmin: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model("User",userSchema);
export default User;