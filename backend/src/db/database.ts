import mongoose from "mongoose";

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set in .env\n" +
      "  → For free cloud MongoDB: https://www.mongodb.com/cloud/atlas/register\n" +
      "  → Set MONGODB_URI=mongodb+srv://... in backend/.env"
    );
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // fail fast if unreachable
    });
    isConnected = true;

    // Mask credentials in log output
    const safeUri = uri.replace(/:\/\/([^:]+):([^@]+)@/, "://<user>:<pass>@");
    console.log(`✅ MongoDB connected: ${safeUri}`);
  } catch (err: any) {
    console.error("❌ MongoDB connection failed:", err.message);
    console.error(
      "\n  Make sure MongoDB is running, or use MongoDB Atlas:\n" +
      "  https://www.mongodb.com/cloud/atlas/register\n"
    );
    throw err;
  }
}

export default connectDB;
