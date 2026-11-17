// Adds 3 sample records to every section, through the running app's own API.
//   node scripts/seed-sample.mjs
//   other port?  API_URL=http://localhost:4000/api node scripts/seed-sample.mjs

const API = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}/api`;

const iso = (d) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
const day = (offset = 0) => iso(new Date(Date.now() + offset * 86400000));
const TODAY = day(0);

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.errors ? " " + JSON.stringify(data.errors) : "";
    throw new Error(`${res.status} ${data.message || res.statusText}${detail}`);
  }
  return data;
}
const post = (p, b) => call("POST", p, b);

let ok = 0, failed = 0;
async function step(label, fn) {
  try {
    const out = await fn();
    ok++;
    console.log(`  ok    ${label}`);
    return out;
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${label}: ${e.message}`);
    return null;
  }
}
const section = (t) => console.log(`\n${t}`);
const id = (doc) => doc?._id;

section("Suppliers / vendors");
const vendors = [];
for (const v of [
  { name: "Demo Rahim Auto Parts", phone: "01711000001", companyName: "Rahim Auto" },
  { name: "Demo City Tyres", phone: "01711000002", companyName: "City Tyre House" },
  { name: "Demo Karim Travels", phone: "01711000003", companyName: "Karim Travels" },
]) vendors.push(await step(v.name, () => post("/vendors", v)));

section("Drivers");
const drivers = [];
for (const d of [
  { name: "Demo Abdul Karim", phone: "01712000001", nidNo: "1990123456", licenseNo: "DH-100001" },
  { name: "Demo Jamal Uddin", phone: "01712000002", nidNo: "1985123457", licenseNo: "DH-100002" },
  { name: "Demo Sohel Rana", phone: "01712000003", nidNo: "1992123458", licenseNo: "DH-100003" },
]) drivers.push(await step(d.name, () => post("/drivers", d)));

section("Cars");
const cars = [];
for (const c of [
  { companyName: "Toyota", model: "Noah", year: 2019, seatCapacity: 7, ac: true, soundSystem: true, fuelTypes: ["octane", "cng"], registrationNo: "DHAKA-METRO-DEMO-1" },
  { companyName: "Toyota", model: "Hiace", year: 2018, seatCapacity: 12, ac: true, soundSystem: false, fuelTypes: ["octane"], registrationNo: "DHAKA-METRO-DEMO-2" },
  { companyName: "Toyota", model: "Corolla", year: 2020, seatCapacity: 4, ac: true, soundSystem: true, fuelTypes: ["octane", "lpg"], registrationNo: "DHAKA-METRO-DEMO-3" },
]) cars.push(await step(`${c.companyName} ${c.model}`, () => post("/cars", c)));

section("Clients");
const clients = [];
clients.push(await step("Demo Individual client", () => post("/clients", { type: "individual", name: "Demo Nasrin Akter", phone: "01713000001", address: "Dhanmondi, Dhaka" })));
clients.push(await step("Demo Office client", () => post("/clients", { type: "office", name: "Demo Blue Sky Office", phone: "01713000002", contactName: "Mr. Hasan", address: "Gulshan 1, Dhaka" })));
clients.push(await step("Demo Corporate client", () => post("/clients", {
  type: "corporate", name: "Demo Delta Group", contactName: "HR Desk", address: "Motijheel, Dhaka",
  units: [{ name: "Head Office", contactName: "Ms. Rima", phone: "01713000003", address: "Motijheel, Dhaka" }],
})));
const corpUnit = clients[2]?.units?.[0]?._id;

section("Trips (2 completed, 1 upcoming and active)");
await step("Trip 1: completed, own car, rent 12000, driver pay 3000", () => post("/trips", {
  status: "completed", date: TODAY, pickupLocation: "Mirpur 10", dropLocation: "Hazrat Shahjalal Airport", client: id(clients[0]),
  vehicleSource: "own", car: id(cars[0]), driver: id(drivers[0]), rent: 12000, ownerAmount: 3000, totalKm: 48, fuelType: "octane",
}));
await step("Trip 2: completed, rented from a vendor, rent 9000, vendor amount 7000", () => post("/trips", {
  status: "completed", date: TODAY, pickupLocation: "Gulshan 2", dropLocation: "Savar", client: id(clients[1]),
  vehicleSource: "rent", vendor: id(vendors[2]), vendorCarNo: "DHAKA-GA-11-2233", vehicleType: "Toyota Hiace",
  driverName: "Demo Vendor Driver", driverPhone: "01714000001", rent: 9000, ownerAmount: 7000, totalKm: 35,
}));
const upcoming = await step("Trip 3: booked for 2 days ahead", () => post("/trips", {
  date: day(2), startTime: "09:00", pickupLocation: "Motijheel", dropLocation: "Cox's Bazar", client: id(clients[2]), unitId: corpUnit,
  passengerName: "Demo Passenger", passengerPhone: "01715000001", vehicleType: "Toyota Noah",
}));
if (upcoming) {
  await step("Trip 3: assign own car and driver", () => post(`/trips/${id(upcoming)}/assign`, {
    vehicleSource: "own", car: id(cars[1]), driver: id(drivers[1]), client: id(clients[2]), unitId: corpUnit, rent: 25000, ownerAmount: 6000,
  }));
  await step("Trip 3: mark as sent", () => post(`/trips/${id(upcoming)}/status`, { status: "sent" }));
}

section("Expenses");
for (const e of [
  { date: TODAY, category: "fuel", car: id(cars[0]), amount: 4200, description: "Demo: Octane 40 litres" },
  { date: TODAY, category: "office", amount: 15000, description: "Demo: Office rent share" },
  { date: day(-1), category: "salary", amount: 22000, description: "Demo: Helper salary" },
]) await step(e.description, () => post("/expenses", e));

section("Maintenance");
for (const m of [
  { car: id(cars[0]), type: "oil_change", date: TODAY, status: "completed", workshop: "Demo Quick Lube", cost: 1800, description: "Demo: engine oil and filter", parts: [{ name: "Engine oil 4L", quantity: 1, unitCost: 1500 }, { name: "Oil filter", quantity: 1, unitCost: 300 }] },
  { car: id(cars[1]), type: "tire", date: TODAY, status: "in_progress", workshop: "Demo Tyre Shop", cost: 18000, description: "Demo: 2 tyres being changed", parts: [{ name: "Tyre 195/65 R15", quantity: 2, unitCost: 9000 }] },
  { car: id(cars[2]), type: "breakdown", date: TODAY, status: "pending", description: "Demo: engine will not start", cost: 0 },
]) await step(m.description, () => post("/maintenance", m));

section("Client invoices (receivable)");
const item = (name, quantity, rate) => ({ name, quantity, rate });
await step("Invoice 1: sent, payment date already passed", () => post("/invoices", {
  type: "client", party: id(clients[0]), status: "sent", invoiceDate: day(-12), dueDate: day(-5),
  items: [item("Demo airport transfer", 1, 12000)],
}));
await step("Invoice 2: partly paid", () => post("/invoices", {
  type: "client", party: id(clients[1]), status: "partial", invoiceDate: day(-3), dueDate: day(10),
  items: [item("Demo day hire", 2, 9000)], received: { amount: 6000, date: TODAY, method: "bank" },
}));
await step("Invoice 3: paid in full", () => post("/invoices", {
  type: "client", party: id(clients[2]), unitId: corpUnit, status: "paid", invoiceDate: day(-6), dueDate: day(4),
  items: [item("Demo monthly pickup service", 1, 30000)], received: { date: TODAY, method: "cash" },
}));

section("Supplier bills (payable)");
await step("Bill 1: unpaid", () => post("/invoices", {
  type: "vendor", party: id(vendors[0]), status: "unpaid", invoiceDate: day(-4), dueDate: day(7),
  items: [item("Demo brake pads", 4, 2500)],
}));
await step("Bill 2: partly paid", () => post("/invoices", {
  type: "vendor", party: id(vendors[1]), status: "partial", invoiceDate: day(-8), dueDate: day(3),
  items: [item("Demo tyres", 4, 9000)], received: { amount: 12000, date: TODAY, method: "cash" },
}));
await step("Bill 3: paid in full", () => post("/invoices", {
  type: "vendor", party: id(vendors[2]), status: "paid", invoiceDate: day(-10), dueDate: day(-2),
  items: [item("Demo vehicle hire charge", 1, 7000)], received: { date: TODAY, method: "bank" },
}));

section("Purchases");
await step("Purchase 1: draft", () => post("/purchases", {
  vendor: id(vendors[0]), status: "draft", refNo: "DEMO-CH-101", date: TODAY, dueDate: day(7),
  items: [{ name: "Demo Oil filter", description: "Toyota Noah", quantity: 10, rate: 350 }], notes: "Demo draft purchase",
}));
await step("Purchase 2: confirmed, unpaid, with VAT and discount", () => post("/purchases", {
  vendor: id(vendors[1]), status: "unpaid", refNo: "DEMO-CH-102", date: TODAY, dueDate: day(10),
  items: [{ name: "Demo Tyre 195/65 R15", quantity: 4, rate: 9000, discount: 1000, vatPercent: 5 }], discount: 500, otherCharges: 300,
  notes: "Demo purchase", footer: "Thank you",
}));
const p3 = await step("Purchase 3: confirmed", () => post("/purchases", {
  vendor: id(vendors[2]), status: "unpaid", refNo: "DEMO-CH-103", date: TODAY, dueDate: day(5),
  items: [{ name: "Demo Engine oil 5W-30", quantity: 20, rate: 1100 }, { name: "Demo Coolant", quantity: 5, rate: 450 }],
}));
if (p3) await step("Purchase 3: add a payment of 10000", () => post(`/purchases/${id(p3)}/payments`, { date: TODAY, amount: 10000, method: "cash" }));

section("Inventory categories");
const cats = [];
for (const name of ["Demo Filter", "Demo Tyre", "Demo Oil"]) cats.push(await step(name, () => post("/inventory/categories", { name })));

section("Inventory units");
const units = [];
for (const u of [{ name: "Demo Piece", shortName: "pcs" }, { name: "Demo Liter", shortName: "ltr" }, { name: "Demo Set", shortName: "set" }])
  units.push(await step(`${u.name} (${u.shortName})`, () => post("/inventory/units", u)));

section("Inventory items");
for (const it of [
  { name: "Demo Oil filter", sku: "DEMO-OF-01", category: id(cats[0]), unit: id(units[0]), currentStock: 2, minStock: 5, purchasePrice: 350, salePrice: 500, assetAccount: "Parts in stock", note: "Low on purpose: 2 in stock, alert at 5" },
  { name: "Demo Engine oil 5W-30", sku: "DEMO-EO-01", category: id(cats[2]), unit: id(units[1]), currentStock: 40, minStock: 10, purchasePrice: 1100, salePrice: 1400, assetAccount: "Fuel & lubricants in stock" },
  { name: "Demo Tyre 195/65 R15", sku: "DEMO-TY-01", category: id(cats[1]), unit: id(units[0]), currentStock: 8, minStock: 4, purchasePrice: 9000, salePrice: 11000, assetAccount: "Tyres in stock" },
]) await step(it.name, () => post("/inventory/items", it));

console.log(`\nDone: ${ok} created, ${failed} failed.`);
process.exit(failed ? 1 : 0);