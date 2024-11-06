import mongoose from "mongoose";
import dotenv from "dotenv";
import { ensureDefaultStage } from "./models/Stages";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string).then(async () => {
      console.log("Connected to MongoDB");
      await ensureDefaultStage();
    });
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
};

export default connectDB;
