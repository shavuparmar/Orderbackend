import { ApiError } from "../utils/ApiError.js";
import Settings from "../models/settings.model.js";

const timeToMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const checkOrderWindow = async (req, res, next) => {
  try {
    const s = await Settings.getSingleton();
    const w = s.orderWindow;

    if (!w?.enabled) return next();

    const now = new Date();
    // using server time. If needed you can enforce timezone later.
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const start = timeToMinutes(w.startTime);
    const end = timeToMinutes(w.endTime);

    const isOpen = start <= end
      ? nowMinutes >= start && nowMinutes <= end
      : nowMinutes >= start || nowMinutes <= end; // overnight range

    if (!isOpen) {
      throw new ApiError(403, `Ordering is closed. Open time: ${w.startTime} - ${w.endTime}`);
    }

    next();
  } catch (error) {
    next(error);
  }
};
