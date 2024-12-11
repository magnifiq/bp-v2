import mongoose from "mongoose";
import Users from "./models/Users";
import dotenv from "dotenv";
import connectDB from "./db";

dotenv.config();

const addSampleOrganization = async () => {
  try {
    await connectDB();
    const email = "john.doe@example.com";
    await Users.deleteOne({ email });
    const organization = await Users.findOne({
      email: "john.doe@example.com",
    });
    if (organization) {
      console.log("User details:", organization);
    } else {
      console.log("Organization not found");
    }

    mongoose.connection.close();
  } catch (err) {
    console.error("Failed to add sample organization", err);
    process.exit(1);
  }
};

addSampleOrganization();
