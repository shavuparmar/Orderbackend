import { asynchandler } from "../utils/asynchandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Settings from "../models/settings.model.js";

const getSettings = asynchandler(async (req, res) => {
  const s = await Settings.getSingleton();
  return res.status(200).json(new ApiResponse(200, s, "Settings fetched"));
});

const updateOrderWindow = asynchandler(async (req, res) => {
  const { enabled, startTime, endTime, workingDays } = req.body;

  const s = await Settings.getSingleton();

  if (enabled !== undefined) s.orderWindow.enabled = !!enabled;
  if (startTime) s.orderWindow.startTime = startTime;
  if (endTime) s.orderWindow.endTime = endTime;
  if (workingDays) s.orderWindow.workingDays = workingDays;

  await s.save();
  return res.status(200).json(new ApiResponse(200, s, "Working hours / order window updated"));
});

const updateSettings = asynchandler(async (req, res) => {
  const { general, orderWindow, notifications, security, payments, appearance } = req.body;

  const s = await Settings.getSingleton();

  if (general) s.general = { ...s.general, ...general };
  if (orderWindow) s.orderWindow = { ...s.orderWindow, ...orderWindow };
  if (notifications) s.notifications = { ...s.notifications, ...notifications };
  if (security) s.security = { ...s.security, ...security };
  if (payments) s.payments = { ...s.payments, ...payments };
  if (appearance) s.appearance = { ...s.appearance, ...appearance };

  await s.save();
  return res.status(200).json(new ApiResponse(200, s, "Settings updated successfully"));
});

export { getSettings, updateOrderWindow, updateSettings };
