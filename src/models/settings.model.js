import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "KORDER_SETTINGS", index: true },

    orderWindow: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: "10:00" }, // HH:mm
      endTime: { type: String, default: "18:00" },   // HH:mm
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
