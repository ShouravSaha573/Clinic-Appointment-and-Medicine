import mongoose from "mongoose";


export const connectDB = async ()=>{
  try{
    const uri =
      process.env.MONGO_URI ||
      'mongodb+srv://sonusaha573:Sst123@cluster0.7vfw4q0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

    await mongoose.connect(uri);
    console.log("Database connected");
    
  }catch(e){
    console.log("Database connection error:", e?.message || e);
    throw e;
  }
  
};



