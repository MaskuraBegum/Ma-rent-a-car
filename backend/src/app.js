import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import publicRouter from "./routes/public.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/uploads", express.static("uploads"));
app.use("/api/public", publicRouter);
app.use("/api", routes);   

app.use(notFound);
app.use(errorHandler);

export default app;