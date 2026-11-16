import "dotenv/config";
import mongoose from "mongoose";
import Trip from "../src/models/Trip.js";
import { syncTripLedger } from "../src/services/ledgerService.js";

await mongoose.connect(process.env.MONGO_URI);
const trips = await Trip.find({ status: "completed" });
for (const t of trips) await syncTripLedger(t);
console.log(`Done: ${trips.length} completed trips`);
await mongoose.disconnect();