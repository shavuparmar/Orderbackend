import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/User.models.js";

export const verifyJWT = async (req, res, next) => {
  try {
    const tokenFromCookie = req.cookies?.accessToken;
    const tokenFromHeader = req.headers?.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null;

    const token = tokenFromCookie || tokenFromHeader;

    if (!token) throw new ApiError(401, "Access token missing");

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded?._id).select("-password -refreshToken");
    if (!user) throw new ApiError(401, "Invalid token user");

    if (!user.isActive) throw new ApiError(403, "Your account is disabled");

    req.user = user;
    next();
  } catch (error) {
    next(new ApiError(401, "Unauthorized", [error?.message || error]));
  }
};
export const requireAdmin = (req, _res, next) => {
  if (req.user?.role !== "ADMIN") throw new ApiError(403, "Admin access only");
  next();
};

export const requireStaffOrAdmin = (req, _res, next) => {
  if (!["STAFF", "ADMIN"].includes(req.user?.role)) {
    throw new ApiError(403, "Staff/Admin access only");
  }
  next();
};

export const requireUser = (req, _res, next) => {
  if (req.user?.role !== "USER") throw new ApiError(403, "User access only");
  next();
};