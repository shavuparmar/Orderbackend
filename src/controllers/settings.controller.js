import { asynchandler } from "../utils/asynchandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Settings from "../models/settings.model.js";

const getSettings = asynchandler(async (req, res) => {
  const s = await Settings.getSingleton();
  return res.status(200).json(new ApiResponse(200, s, "Settings fetched"));
});

const updateOrderWindow = asynchandler(async (req, res) => {
  const { enabled, startTime, endTime } = req.body;

  const s = await Settings.getSingleton();

  if (enabled !== undefined) s.orderWindow.enabled = !!enabled;
  if (startTime) s.orderWindow.startTime = startTime;
  if (endTime) s.orderWindow.endTime = endTime;

  await s.save();
  return res.status(200).json(new ApiResponse(200, s, "Order window updated"));
});

export { getSettings, updateOrderWindow };
