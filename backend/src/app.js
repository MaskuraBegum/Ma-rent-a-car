import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import publicRouter from "./routes/public.js";
import authRouter from "./routes/auth.js";
import { requireAdmin } from "./middleware/auth.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.get("/api/health", (req, res) => res.json({ ok: true }));
// open to everyone: the customer booking form and the sign-in itself
app.use("/api/public", publicRouter);
app.use("/api/auth", authRouter);

// everything else is for the signed-in admin only
app.use("/uploads", requireAdmin, express.static("uploads"));
app.use("/api", requireAdmin, routes); 

app.use(notFound);
app.use(errorHandler);

export default app;