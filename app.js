import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  process.env.CROSS_ORIGIN,
].filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    // allow server-to-server / Postman (no origin)
    if (!origin) return cb(null, true);

    if (allowedOrigins.includes(origin)) return cb(null, true);

    return cb(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// ✅ Express 5 safe preflight handler
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("static"));
app.use(cookieParser());

// routes
import UserRouter from "./src/routes/user.routes.js";
import ProductRouter from "./src/routes/product.routes.js";
import OrderRouter from "./src/routes/order.routes.js";
import PaymentRouter from "./src/routes/payment.routes.js";
import SettingsRouter from "./src/routes/settings.routes.js";
import stockInRoutes from "./src/routes/stockIn.routes.js";


app.use("/api/v1/users", UserRouter);
app.use("/api/v1/products", ProductRouter);
app.use("/api/v1/orders", OrderRouter);
app.use("/api/v1/payments", PaymentRouter);
app.use("/api/v1/settings", SettingsRouter);
app.use("/api/stock-in", stockInRoutes);






// error middleware (last)
import { errorHandler } from "./src/middlewares/error.middleware.js";
app.use(errorHandler);

export { app };
