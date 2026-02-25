import { ApiError } from "../utils/ApiError.js";

export const errorHandler = (err, req, res, next) => {
  const error = err instanceof ApiError ? err : new ApiError(500, err?.message || "Internal Server Error");

  return res.status(error.statusCode).json({
    success: false,
    message: error.message,
    errors: error.errors || [],
    data: null,
  });
};
