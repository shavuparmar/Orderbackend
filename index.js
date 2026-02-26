import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import connectDB from "./src/config/db.js";
import { app } from "./app.js";
import { bootstrapAdmin } from "./bootstrapAdmin.js";

connectDB()
  .then(async () => {
    await bootstrapAdmin(); // ✅ CREATE ADMIN ON DEPLOY

    app.listen(process.env.PORT || 9000, () => {
      console.log(`Server running on ${process.env.PORT || 9000}`);
      console.log("CROSS_ORIGIN =", process.env.CROSS_ORIGIN);
    });
  })
  .catch((err) => {
    console.log("MONGODB database is not connected properly", err);
  });