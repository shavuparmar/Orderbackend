// bootstrapAdmin.js
import User from "./src/models/User.models.js";

export const bootstrapAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({ role: "ADMIN" }).lean();
    if (existingAdmin) {
      console.log("✅ Admin already exists:", existingAdmin.email);
      return;
    }

    const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
    const phone = process.env.BOOTSTRAP_ADMIN_PHONE || "0000000000";

    if (!email || !password) {
      console.log("⚠️ BOOTSTRAP_ADMIN_EMAIL/PASSWORD not set. Skipping admin bootstrap.");
      return;
    }

    const admin = await User.create({
      customerName: "Admin",
      firstName: "Super",
      email,
      customerNumber: phone,
      password, // your schema should hash it in pre-save
      role: "ADMIN",
    });

    console.log("✅ Bootstrapped ADMIN created:", admin.email);
  } catch (err) {
    console.error("❌ bootstrapAdmin error:", err.message);
  }
};