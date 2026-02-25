import { ApiError } from "../utils/ApiError.js";

export const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, "Unauthorized"));
    if (!roles.includes(req.user.role)) return next(new ApiError(403, "Access denied"));
    next();
  };
};
