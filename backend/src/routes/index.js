import { Router } from "express";
import { makeRouter } from "./makeRouter.js";
import { crudController } from "../controllers/crudFactory.js";
import { imageUpload } from "../middleware/upload.js";
import { driverSchema } from "../validators/driver.js";
import { vendorSchema } from "../validators/vendor.js";
import { carSchema } from "../validators/car.js";
import { clientSchema } from "../validators/client.js";
import { expenseSchema } from "../validators/expense.js";
import Driver from "../models/Driver.js";
import Vendor from "../models/Vendor.js";
import Car from "../models/Car.js";
import Client from "../models/Client.js";
import Expense from "../models/Expense.js";
import tripsRouter from "./trips.js";
import reportsRouter from "./reports.js";
import invoicesRouter from "./invoices.js";
import maintenanceRouter from "./maintenance.js";
import ledgerRouter from "./ledger.js";
import dashboardRouter from "./dashboard.js";     
      

const router = Router();

router.use("/drivers", makeRouter(crudController(Driver), driverSchema, { upload: imageUpload("photo") }));

router.use(
  "/vendors",
  makeRouter(crudController(Vendor, { searchFields: ["name", "companyName", "phone"] }), vendorSchema, {
    upload: imageUpload("image"),
  })
);

router.use(
  "/cars",
  makeRouter(
    crudController(Car, { searchFields: ["companyName", "model", "registrationNo"], populate: "vendor" }),
    carSchema
  )
);

router.use(
  "/clients",
  makeRouter(crudController(Client, { searchFields: ["name", "phone", "units.name", "units.phone"] }), clientSchema)
);

router.use(
  "/expenses",
  makeRouter(
    crudController(Expense, {
      searchFields: ["description"],
      populate: { path: "car", select: "companyName model registrationNo" },
    }),
    expenseSchema
  )
);

router.use("/trips", tripsRouter);
router.use("/reports", reportsRouter);
router.use("/invoices", invoicesRouter); // client invoices and vendor (supplier) bills
router.use("/maintenance", maintenanceRouter);
router.use("/ledger", ledgerRouter)
router.use("/dashboard", dashboardRouter); 

export default router;
