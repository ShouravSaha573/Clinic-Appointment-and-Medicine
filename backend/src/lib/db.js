import mongoose from "mongoose";


export const connectDB = async ()=>{
  try{
    await mongoose.connect('mongodb+srv://sonusaha573:Sst123@cluster0.7vfw4q0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log("Database connected");
    
  }catch(e){
    console.log(e)
  }
  
};



