import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "KORDER_SETTINGS", index: true },

    general: {
      appName: { type: String, default: "KsOrder Enterprise" },
      contactEmail: { type: String, default: "support@ksorder.com" },
      contactPhone: { type: String, default: "+91 9876543210" },
      address: { type: String, default: "Main Street, Commercial Hub, India" },
    },

    orderWindow: {
      enabled: { type: Boolean, default: true },
      startTime: { type: String, default: "10:00" }, // HH:mm
      endTime: { type: String, default: "21:00" },   // HH:mm
      workingDays: [{ type: String, default: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] }],
    },

    notifications: {
      emailAlerts: { type: Boolean, default: true },
      smsAlerts: { type: Boolean, default: true },
      orderAlerts: { type: Boolean, default: true },
    },

    security: {
      requireAuth: { type: Boolean, default: true },
      allowGuestOrders: { type: Boolean, default: false },
    },

    payments: {
      currency: { type: String, default: "INR" },
      cashEnabled: { type: Boolean, default: true },
      upiEnabled: { type: Boolean, default: true },
      cardsEnabled: { type: Boolean, default: true },
    },

    appearance: {
      theme: { type: String, default: "light" },
      accentColor: { type: String, default: "indigo" },
    },
  },
  { timestamps: true }
);

settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: "KORDER_SETTINGS" });
  if (!doc) doc = await this.create({ key: "KORDER_SETTINGS" });
  return doc;
};

const Settings = mongoose.model("Settings", settingsSchema);
export default Settings;
