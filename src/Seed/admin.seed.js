import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.models.js";

dotenv.config({ path: "./.env" });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const existingAdmin = await User.findOne({ role: "ADMIN" });
    if (existingAdmin) {
      console.log("Admin already exists:", existingAdmin.email);
      process.exit(0);
    }

    const admin = await User.create({
      customerName: "Admin",
      firstName: "Super",
      email: "admin@korder.com",
      customerNumber: "6352244221",
      password: "admin123", // 🔐 auto-hashed
      role: "ADMIN",
    });

    console.log("✅ Admin created successfully:");
    console.log("Email:", admin.email);
    console.log("Password: admin123");

    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to create admin:", err);
    process.exit(1);
  }
};

run();
