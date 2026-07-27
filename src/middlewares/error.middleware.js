import { ApiError } from "../utils/ApiError.js";

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Catch MongoDB Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new ApiError(409, `An account with that ${field} already exists.`);
  }
  
  // Catch Mongoose CastError
  if (err.name === "CastError") {
    error = new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  }

  // Catch Mongoose ValidationError
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message).join(", ");
    error = new ApiError(400, message);
  }

  if (!(error instanceof ApiError)) {
    error = new ApiError(500, err?.message || "Internal Server Error");
  }

  return res.status(error.statusCode).json({
    success: false,
    message: error.message,
    errors: error.errors || [],
    data: null,
    // Add stack trace in development mode only
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
