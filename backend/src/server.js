import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const start = async () => {
  await connectDB();
  app.listen(process.env.PORT, () =>
    console.log(`Server running on port ${process.env.PORT}`)
  );
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});