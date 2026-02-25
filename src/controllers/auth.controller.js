import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/User.models.js";
import jwt from "jsonwebtoken";

const genrateRefereshTokensAndAccessToken = async (userID) => {
  try {
    const user = await User.findById(userID).select("+refreshToken");
    if (!user) throw new ApiError(404, "User not found");

    const accessToken = user.generateAccessToken();
    const refereshToken = user.generateRefreshToken();

    user.refreshToken = refereshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refereshToken };
  } catch (error) {
    throw new ApiError(500, "Token generation failed", [error?.message || error]);
  }
};

const loginUser = asynchandler(async (req, res) => {
  const { customerNumber, email, password } = req.body;

  if ((!customerNumber && !email) || !password) {
    throw new ApiError(400, "Customer Number or Email and Password are required");
  }

  const user = await User.findOne({
    $or: [{ customerNumber }, { email }],
  }).select("+password +refreshToken");

  if (!user) throw new ApiError(404, "User not found");
  if (!user.isActive) throw new ApiError(403, "Account disabled by admin");

  const ok = await user.isPasswordCorrect(password);
  if (!ok) throw new ApiError(401, "Invalid credentials");

  const { accessToken, refereshToken } = await genrateRefereshTokensAndAccessToken(user._id);

  const loggedUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refereshToken", refereshToken, options)
    .json(new ApiResponse(200, { user: loggedUser, accessToken, refereshToken }, "Login success"));
});

const logoutUser = asynchandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refereshToken", options)
    .json(new ApiResponse(200, {}, "Logout success"));
});

const getMe = asynchandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, "Current user"));
});

const refreshToken = asynchandler(async (req, res) => {
  const incoming = req.cookies?.refereshToken || req.body?.refereshToken;
  if (!incoming) throw new ApiError(401, "Refresh token required");

  let decoded;
  try {
    decoded = jwt.verify(incoming, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await User.findById(decoded?._id).select("+refreshToken");
  if (!user) throw new ApiError(401, "Invalid refresh token");

  if (user.refreshToken !== incoming) throw new ApiError(401, "Refresh token expired/used");

  const { accessToken, refereshToken } = await genrateRefereshTokensAndAccessToken(user._id);

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refereshToken", refereshToken, options)
    .json(new ApiResponse(200, { accessToken, refereshToken }, "Token refreshed"));
});

export { loginUser, logoutUser, getMe, refreshToken };
