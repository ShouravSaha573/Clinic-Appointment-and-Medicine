import mongoose from "mongoose";


const normalizeMongoUri = (value) => {
  if (value === undefined || value === null) return "";
  let s = String(value).trim();
  // Common dotenv mistake: wrapping in quotes or adding a leading space
  if ((s.startsWith("\"") && s.endsWith("\"")) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
};

export const connectDB = async ()=>{
  try{
    const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";
    const envUri = normalizeMongoUri(process.env.MONGO_URI);
    const uri = envUri || (!isProd ? "mongodb://127.0.0.1:27017/clinic" : "");

    if (!uri) {
      throw new Error("MONGO_URI is not configured. Set it in environment variables.");
    }

    await mongoose.connect(uri);
    console.log("Database connected");
    
  }catch(e){
    console.log("Database connection error:", e?.message || e);
    throw e;
  }
  
};



