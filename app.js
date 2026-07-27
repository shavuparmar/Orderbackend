import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { sanitize } from "./src/middlewares/sanitize.middleware.js";

// routes
import UserRouter from "./src/routes/user.routes.js";
import ProductRouter from "./src/routes/product.routes.js";
import OrderRouter from "./src/routes/order.routes.js";
import PaymentRouter from "./src/routes/payment.routes.js";
import SettingsRouter from "./src/routes/settings.routes.js";
import stockInRoutes from "./src/routes/stockIn.routes.js";
import ReportsRouter from "./src/routes/reports.routes.js";
import ReturnRouter from "./src/routes/returns.routes.js";
import { errorHandler } from "./src/middlewares/error.middleware.js";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8081",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8081",
  "https://ksorder.vercel.app",
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
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  optionsSuccessStatus: 204,
};

// 1. CORS Configuration (MUST BE FIRST)
app.use(cors(corsOptions));

// 2. Security Headers (Helmet)
// configure helmet to allow cross-origin requests
app.use(helmet({ crossOriginResourcePolicy: false }));

// 3. Body Parsers
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true }));

// 4. Cookie Parser
app.use(cookieParser());

// 5. Data Sanitization against NoSQL query injection
app.use(sanitize);

// 6. Static files
app.use(express.static("static"));

// 7. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again after 15 minutes"
});
app.use("/api/", limiter);

// 8. Routes
app.get("/ping", (req, res) => res.json({ ok: true }));
app.use("/api/v1/users", UserRouter);
app.use("/api/v1/products", ProductRouter);
app.use("/api/v1/orders", OrderRouter);
app.use("/api/v1/payments", PaymentRouter);
app.use("/api/v1/settings", SettingsRouter);
app.use("/api/v1/reports", ReportsRouter);
app.use("/api/v1/returns", ReturnRouter);
app.use("/api/v1/stock-in", stockInRoutes);
app.use("/api/stock-in", stockInRoutes);

// 9. Error Handler (MUST BE LAST)
app.use(errorHandler);

export { app };
