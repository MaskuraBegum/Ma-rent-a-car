// Fills every section with 5 realistic records, through the running app's own API
// (so all business rules, numbers and balances work exactly as in real use).
//
//   1. create the admin first   node src/scripts/create-admin.mjs "Name" you@example.com "password"
//   2. start the backend        npm run dev
//   3. run this ONCE            ADMIN_EMAIL=you@example.com ADMIN_PASSWORD="password" node src/scripts/seed-demo.mjs
//      other port?              add  API_URL=http://localhost:4000/api

const API = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}/api`;
const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.log('Set ADMIN_EMAIL and ADMIN_PASSWORD, for example:\n  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD="password" node src/scripts/seed-demo.mjs');
  process.exit(1);
}

// ---- dates (Dhaka time) ----
const iso = (d) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
const day = (n = 0) => iso(new Date(Date.now() + n * 86400000));
const TODAY = day(0);
const MONTH = TODAY.slice(0, 7);

// ---- API helper with the admin's sign-in cookie ----
let cookie = "";
async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie && { Cookie: cookie }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.errors ? " " + JSON.stringify(data.errors) : "";
    throw new Error(`${res.status} ${data.message || res.statusText}${detail}`);
  }
  if (path === "/auth/login") cookie = (res.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
  return data;
}
const get = (p) => call("GET", p);
const post = (p, b) => call("POST", p, b);
const patch = (p, b) => call("PATCH", p, b);

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
const id = (d) => d?._id;
async function each(rows, label, fn) {
  const out = [];
  for (const r of rows) out.push(await step(label(r), () => fn(r)));
  return out;
}

await step("Sign in", () => post("/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD })).then((r) => {
  if (!r) { console.log("\nCould not sign in. Check the email and password, and that the backend is running."); process.exit(1); }
});

// =====================================================================
section("Vendors");
const vendors = await each([
  { name: "Rahim Auto Parts", phone: "01711000001", companyName: "Rahim Auto" },
  { name: "City Tyre House", phone: "01711000002", companyName: "City Tyre House" },
  { name: "Karim Travels", phone: "01711000003", companyName: "Karim Travels" },
  { name: "Alam Lubricants", phone: "01711000004", companyName: "Alam Oil Depot" },
  { name: "Noor Garage", phone: "01711000005", companyName: "Noor Motors" },
], (v) => v.name, (v) => post("/vendors", v));

section("Drivers");
const drivers = await each([
  { name: "Abdul Karim", phone: "01712000001", nidNo: "1990123456", licenseNo: "DH-200001" },
  { name: "Jamal Uddin", phone: "01712000002", nidNo: "1985123457", licenseNo: "DH-200002" },
  { name: "Sohel Rana", phone: "01712000003", nidNo: "1992123458", licenseNo: "DH-200003" },
  { name: "Mizanur Rahman", phone: "01712000004", nidNo: "1988123459", licenseNo: "DH-200004" },
  { name: "Habib Hossain", phone: "01712000005", nidNo: "1994123460", licenseNo: "DH-200005" },
], (d) => d.name, (d) => post("/drivers", d));

section("Cars");
const cars = await each([
  { companyName: "Toyota", model: "Noah", year: 2019, seatCapacity: 7, ac: true, soundSystem: true, fuelTypes: ["octane", "cng"], registrationNo: "DHAKA-METRO-HA-11-1001" },
  { companyName: "Toyota", model: "Hiace", year: 2018, seatCapacity: 12, ac: true, soundSystem: false, fuelTypes: ["octane"], registrationNo: "DHAKA-METRO-HA-11-1002" },
  { companyName: "Toyota", model: "Corolla", year: 2020, seatCapacity: 4, ac: true, soundSystem: true, fuelTypes: ["octane", "lpg"], registrationNo: "DHAKA-METRO-HA-11-1003" },
  { companyName: "Toyota", model: "Premio", year: 2017, seatCapacity: 4, ac: true, soundSystem: true, fuelTypes: ["octane", "cng"], registrationNo: "DHAKA-METRO-HA-11-1004" },
  { companyName: "Toyota", model: "Alphard", year: 2021, seatCapacity: 7, ac: true, soundSystem: true, fuelTypes: ["octane"], registrationNo: "DHAKA-METRO-HA-11-1005" },
], (c) => `${c.companyName} ${c.model}`, (c) => post("/cars", c));

section("Clients (office and corporate)");
const clients = await each([
  { type: "office", name: "Blue Sky Office", phone: "01713000001", contactName: "Mr. Hasan", address: "Gulshan 1, Dhaka" },
  { type: "office", name: "Rupayan Traders", phone: "01713000002", contactName: "Ms. Farzana", address: "Motijheel, Dhaka" },
  { type: "office", name: "Green Leaf Agro", phone: "01713000003", contactName: "Mr. Salam", address: "Uttara Sector 7, Dhaka" },
  { type: "corporate", name: "Delta Group", address: "Motijheel, Dhaka", units: [
    { name: "Head Office", contactName: "Ms. Rima", phone: "01713000004", address: "Motijheel, Dhaka" },
    { name: "Gulshan Branch", contactName: "Mr. Anis", phone: "01713000005", address: "Gulshan 2, Dhaka" },
  ] },
  { type: "corporate", name: "Eastern Pharma", address: "Tejgaon, Dhaka", units: [
    { name: "Factory", contactName: "Mr. Kabir", phone: "01713000006", address: "Gazipur" },
  ] },
], (c) => c.name, (c) => post("/clients", c));
const unitOf = (c) => c?.units?.[0]?._id;

// =====================================================================
section("Trips (3 completed with own cars, 1 completed with a rented car, 1 upcoming)");
const trip = (label, body) => step(label, () => post("/trips", body));
await trip("Trip 1: Mirpur to airport", { status: "completed", date: day(-4), pickupLocation: "Mirpur 10", dropLocation: "Hazrat Shahjalal Airport", client: id(clients[0]), vehicleSource: "own", car: id(cars[0]), driver: id(drivers[0]), rent: 3500, ownerAmount: 800, totalKm: 24, fuelType: "octane" });
await trip("Trip 2: Gulshan to Savar", { status: "completed", date: day(-3), pickupLocation: "Gulshan 2", dropLocation: "Savar", client: id(clients[1]), vehicleSource: "own", car: id(cars[1]), driver: id(drivers[1]), rent: 9000, ownerAmount: 1800, totalKm: 70, fuelType: "octane" });
await trip("Trip 3: Dhaka to Sylhet", { status: "completed", date: day(-2), pickupLocation: "Uttara", dropLocation: "Sylhet", client: id(clients[2]), vehicleSource: "own", car: id(cars[2]), driver: id(drivers[2]), rent: 22000, ownerAmount: 4500, totalKm: 480, fuelType: "lpg" });
await trip("Trip 4: rented car from a vendor", { status: "completed", date: day(-1), pickupLocation: "Motijheel", dropLocation: "Narayanganj", client: id(clients[3]), unitId: unitOf(clients[3]), vehicleSource: "rent", vendor: id(vendors[2]), vendorCarNo: "DHAKA-GA-11-2233", vehicleType: "Toyota Hiace", driverName: "Vendor Driver Nasir", driverPhone: "01714000001", rent: 9000, ownerAmount: 7000, totalKm: 35 });
const upcoming = await trip("Trip 5: booked for 2 days ahead", { date: day(2), startTime: "09:00", pickupLocation: "Motijheel", dropLocation: "Cox's Bazar", client: id(clients[4]), unitId: unitOf(clients[4]), passengerName: "Mr. Imran", passengerPhone: "01715000001", vehicleType: "Toyota Alphard" });
if (upcoming) {
  await step("Trip 5: assign car and driver", () => post(`/trips/${id(upcoming)}/assign`, { vehicleSource: "own", car: id(cars[4]), driver: id(drivers[4]), client: id(clients[4]), unitId: unitOf(clients[4]), rent: 45000, ownerAmount: 9000 }));
  await step("Trip 5: mark as sent", () => post(`/trips/${id(upcoming)}/status`, { status: "sent" }));
}

section("Expenses");
await each([
  { date: day(-4), category: "fuel", car: id(cars[0]), amount: 2800, description: "Octane 28 litres" },
  { date: day(-3), category: "fuel", car: id(cars[1]), amount: 5200, description: "Octane 50 litres" },
  { date: day(-2), category: "office", amount: 15000, description: "Office rent share" },
  { date: day(-1), category: "salary", amount: 12000, description: "Cleaner salary" },
  { date: TODAY, category: "other", amount: 1500, description: "Tea, snacks and cleaning items" },
], (e) => e.description, (e) => post("/expenses", e));

section("Maintenance");
await each([
  { car: id(cars[0]), type: "oil_change", date: day(-5), status: "completed", workshop: "Quick Lube", cost: 1800, description: "Engine oil and filter", parts: [{ name: "Engine oil 4L", quantity: 1, unitCost: 1500 }, { name: "Oil filter", quantity: 1, unitCost: 300 }] },
  { car: id(cars[1]), type: "tire", date: day(-2), status: "in_progress", workshop: "City Tyre House", cost: 18000, description: "Two tyres being changed", parts: [{ name: "Tyre 195/65 R15", quantity: 2, unitCost: 9000 }] },
  { car: id(cars[2]), type: "breakdown", date: day(-1), status: "pending", description: "Engine will not start", cost: 0 },
  { car: id(cars[3]), type: "service", date: TODAY, status: "pending", workshop: "Noor Garage", description: "Regular 10,000 km service", cost: 0 },
  { car: id(cars[4]), type: "inspection", date: TODAY, status: "completed", workshop: "BRTA Centre", cost: 2500, description: "Fitness inspection" },
], (m) => m.description, (m) => post("/maintenance", m));

// =====================================================================
const line = (name, quantity, rate) => ({ name, quantity, rate });
section("Client invoices (receivable)");
await each([
  { type: "client", party: id(clients[0]), status: "sent", invoiceDate: day(-12), dueDate: day(-5), items: [line("Airport transfer", 1, 3500)] },
  { type: "client", party: id(clients[1]), status: "partial", invoiceDate: day(-3), dueDate: day(10), items: [line("Day hire", 2, 9000)], received: { amount: 6000, date: TODAY, method: "bank" } },
  { type: "client", party: id(clients[2]), status: "paid", invoiceDate: day(-6), dueDate: day(4), items: [line("Sylhet trip", 1, 22000)], received: { date: TODAY, method: "cash" } },
  { type: "client", party: id(clients[3]), unitId: unitOf(clients[3]), status: "unpaid", invoiceDate: day(-1), dueDate: day(14), items: [line("Narayanganj trip", 1, 9000)] },
  { type: "client", party: id(clients[4]), unitId: unitOf(clients[4]), status: "sent", invoiceDate: TODAY, dueDate: day(20), items: [line("Monthly pickup service", 1, 30000)] },
], (i) => `Invoice for ${i.items[0].name}`, (i) => post("/invoices", i));

section("Supplier bills (payable)");
await each([
  { type: "vendor", party: id(vendors[0]), status: "unpaid", invoiceDate: day(-4), dueDate: day(7), items: [line("Brake pads", 4, 2500)] },
  { type: "vendor", party: id(vendors[1]), status: "partial", invoiceDate: day(-8), dueDate: day(3), items: [line("Tyres", 4, 9000)], received: { amount: 12000, date: TODAY, method: "cash" } },
  { type: "vendor", party: id(vendors[2]), status: "paid", invoiceDate: day(-10), dueDate: day(-2), items: [line("Vehicle hire charge", 1, 7000)], received: { date: TODAY, method: "bank" } },
  { type: "vendor", party: id(vendors[3]), status: "unpaid", invoiceDate: day(-2), dueDate: day(12), items: [line("Engine oil 5W-30", 10, 1100)] },
  { type: "vendor", party: id(vendors[4]), status: "unpaid", invoiceDate: TODAY, dueDate: day(15), items: [line("Workshop labour", 1, 4500)] },
], (b) => `Bill for ${b.items[0].name}`, (b) => post("/invoices", b));

section("Purchases");
await step("Purchase 1: draft", () => post("/purchases", { vendor: id(vendors[0]), status: "draft", refNo: "CH-101", date: TODAY, dueDate: day(7), items: [{ name: "Oil filter", description: "Toyota Noah", quantity: 10, rate: 350 }], notes: "Draft purchase" }));
await step("Purchase 2: unpaid, VAT and discount", () => post("/purchases", { vendor: id(vendors[1]), status: "unpaid", refNo: "CH-102", date: TODAY, dueDate: day(10), items: [{ name: "Tyre 195/65 R15", quantity: 4, rate: 9000, discount: 1000, vatPercent: 5 }], discount: 500, otherCharges: 300, footer: "Thank you" }));
const p3 = await step("Purchase 3: unpaid", () => post("/purchases", { vendor: id(vendors[3]), status: "unpaid", refNo: "CH-103", date: TODAY, dueDate: day(5), items: [{ name: "Engine oil 5W-30", quantity: 20, rate: 1100 }, { name: "Coolant", quantity: 5, rate: 450 }] }));
if (p3) await step("Purchase 3: payment of 10000", () => post(`/purchases/${id(p3)}/payments`, { date: TODAY, amount: 10000, method: "cash" }));
await step("Purchase 4: unpaid", () => post("/purchases", { vendor: id(vendors[4]), status: "unpaid", refNo: "CH-104", date: day(-2), dueDate: day(8), items: [{ name: "Brake pads", quantity: 8, rate: 2500 }] }));
await step("Purchase 5: unpaid", () => post("/purchases", { vendor: id(vendors[0]), status: "unpaid", refNo: "CH-105", date: day(-5), dueDate: day(-1), items: [{ name: "Wiper blades", quantity: 12, rate: 400 }] }));

section("Inventory categories");
const cats = await each(["Filters", "Tyres", "Oils and fluids", "Brakes", "Electrical"], (n) => n, (name) => post("/inventory/categories", { name }));
section("Inventory units");
const units = await each([
  { name: "Piece", shortName: "pcs" }, { name: "Liter", shortName: "ltr" }, { name: "Set", shortName: "set" },
  { name: "Box", shortName: "box" }, { name: "Kilogram", shortName: "kg" },
], (u) => `${u.name} (${u.shortName})`, (u) => post("/inventory/units", u));
section("Inventory items");
await each([
  { name: "Oil filter", sku: "OF-01", category: id(cats[0]), unit: id(units[0]), currentStock: 2, minStock: 5, purchasePrice: 350, salePrice: 500, assetAccount: "Parts in stock" },
  { name: "Engine oil 5W-30", sku: "EO-01", category: id(cats[2]), unit: id(units[1]), currentStock: 40, minStock: 10, purchasePrice: 1100, salePrice: 1400, assetAccount: "Fuel & lubricants in stock" },
  { name: "Tyre 195/65 R15", sku: "TY-01", category: id(cats[1]), unit: id(units[0]), currentStock: 8, minStock: 4, purchasePrice: 9000, salePrice: 11000, assetAccount: "Tyres in stock" },
  { name: "Brake pad set", sku: "BR-01", category: id(cats[3]), unit: id(units[2]), currentStock: 6, minStock: 3, purchasePrice: 2500, salePrice: 3200, assetAccount: "Parts in stock" },
  { name: "Car battery 12V", sku: "EL-01", category: id(cats[4]), unit: id(units[0]), currentStock: 3, minStock: 2, purchasePrice: 8500, salePrice: 10500, assetAccount: "Other stock" },
], (i) => i.name, (i) => post("/inventory/items", i));

// =====================================================================
section("Staff");
await each([
  { name: "Tanvir Ahmed", designation: "Manager", phone: "01716000001", email: "tanvir@example.com", nidNo: "1980123456", joiningDate: "2023-01-10", salary: 45000, address: "Mirpur, Dhaka" },
  { name: "Shirin Akter", designation: "Accountant", phone: "01716000002", nidNo: "1991123457", joiningDate: "2023-06-01", salary: 32000, address: "Mohammadpur, Dhaka" },
  { name: "Rubel Hossain", designation: "Office staff", phone: "01716000003", nidNo: "1995123458", joiningDate: "2024-02-15", salary: 18000, address: "Badda, Dhaka" },
  { name: "Kamal Mia", designation: "Helper", phone: "01716000004", nidNo: "1997123459", joiningDate: "2024-08-01", salary: 14000, address: "Jatrabari, Dhaka" },
  { name: "Delwar Hossain", designation: "Mechanic", phone: "01716000005", nidNo: "1986123460", joiningDate: "2022-11-20", salary: 26000, address: "Tongi, Gazipur" },
], (s) => s.name, (s) => post("/staff", s));

// =====================================================================
section("Accounts (cash, bank, mobile, card)");
const accounts = await each([
  { name: "Cash in Hand", type: "cash", openingBalance: 50000 },
  { name: "Dutch-Bangla Bank", type: "bank", accountNo: "1011234567890", openingBalance: 300000 },
  { name: "City Bank", type: "bank", accountNo: "2209876543210", openingBalance: 120000 },
  { name: "bKash Merchant", type: "mobile", accountNo: "01717000001", openingBalance: 15000 },
  { name: "Visa Credit Card", type: "card", accountNo: "**** 4821", openingBalance: 0 },
], (a) => a.name, (a) => post("/transactions/accounts", a));

section("Cash in");
await each([
  { type: "in", date: day(-6), account: id(accounts[1]), source: "Client", amount: 22000, voucherNo: "CI-001", method: "bank_transfer", transactionId: "DBBL-88231", description: "Sylhet trip payment" },
  { type: "in", date: day(-5), account: id(accounts[0]), source: "Client", amount: 3500, voucherNo: "CI-002", method: "cash", description: "Airport transfer payment" },
  { type: "in", date: day(-4), account: id(accounts[3]), source: "Client", amount: 9000, voucherNo: "CI-003", method: "bkash", transactionId: "BK7G2H9K", description: "Day hire payment" },
  { type: "in", date: day(-3), account: id(accounts[1]), source: "Owner Investment", amount: 100000, voucherNo: "CI-004", method: "bank_transfer", description: "Owner added capital" },
  { type: "in", date: day(-1), account: id(accounts[2]), source: "Loan", amount: 50000, voucherNo: "CI-005", method: "cheque", description: "Short-term loan received" },
], (t) => `${t.voucherNo} ${t.description}`, (t) => post("/transactions", t));

section("Cash out");
await each([
  { type: "out", date: day(-6), account: id(accounts[0]), category: "Fuel", amount: 5200, voucherNo: "CO-001", method: "cash", payee: "Padma Filling Station", description: "Octane for Hiace" },
  { type: "out", date: day(-5), account: id(accounts[1]), category: "Supplier payment", amount: 12000, voucherNo: "CO-002", method: "bank_transfer", payee: "City Tyre House", description: "Part payment for tyres" },
  { type: "out", date: day(-4), account: id(accounts[1]), category: "Salary", amount: 32000, voucherNo: "CO-003", method: "bank_transfer", payee: "Shirin Akter", description: "Monthly salary" },
  { type: "out", date: day(-2), account: id(accounts[0]), category: "Office", amount: 3500, voucherNo: "CO-004", method: "cash", description: "Office supplies and tea" },
  { type: "out", date: day(-1), account: id(accounts[2]), category: "Owner withdrawal", amount: 20000, voucherNo: "CO-005", method: "cheque", description: "Owner withdrawal" },
], (t) => `${t.voucherNo} ${t.description}`, (t) => post("/transactions", t));

section("Transfers");
await each([
  { type: "transfer", date: day(-6), account: id(accounts[0]), toAccount: id(accounts[1]), amount: 20000, voucherNo: "TR-001", method: "cash", description: "Cash deposited to bank" },
  { type: "transfer", date: day(-5), account: id(accounts[1]), toAccount: id(accounts[0]), amount: 10000, voucherNo: "TR-002", method: "bank_transfer", description: "Cash withdrawn for expenses" },
  { type: "transfer", date: day(-3), account: id(accounts[1]), toAccount: id(accounts[3]), amount: 8000, voucherNo: "TR-003", method: "bank_transfer", description: "Top up bKash" },
  { type: "transfer", date: day(-2), account: id(accounts[3]), toAccount: id(accounts[0]), amount: 4000, voucherNo: "TR-004", method: "bkash", description: "bKash cash out" },
  { type: "transfer", date: day(-1), account: id(accounts[2]), toAccount: id(accounts[1]), amount: 15000, voucherNo: "TR-005", method: "bank_transfer", description: "Move funds between banks" },
], (t) => `${t.voucherNo} ${t.description}`, (t) => post("/transactions", t));

section("Chart of accounts (5 extra heads; the default heads are created first)");
await step("Create default heads", () => get("/chart"));
await each([
  { name: "Toll and Parking", group: "expenses", note: "Bridge, expressway and parking fees" },
  { name: "Vehicle Insurance", group: "expenses" },
  { name: "Advertising Income", group: "income" },
  { name: "Vehicle Loan", group: "liabilities", note: "Bank loan for cars" },
  { name: "Prepaid Insurance", group: "assets", subGroup: "Other Short-Term Assets" },
], (h) => h.name, (h) => post("/chart/heads", h));

// =====================================================================
section("HR: leave types");
const leaveTypes = await each([
  { name: "Casual Leave", maxDaysPerYear: 10, isPaid: true },
  { name: "Sick Leave", maxDaysPerYear: 14, isPaid: true },
  { name: "Annual Leave", maxDaysPerYear: 15, isPaid: true },
  { name: "Maternity Leave", maxDaysPerYear: 120, isPaid: true },
  { name: "Unpaid Leave", maxDaysPerYear: 30, isPaid: false },
], (l) => l.name, (l) => post("/hr/leave-types", l));

section("HR: salary structure");
await each([
  { designation: "Manager", baseSalary: 45000, foodAllowance: 3000, travelAllowance: 2000, effectiveFrom: "2024-01-01" },
  { designation: "Accountant", baseSalary: 32000, foodAllowance: 2000, effectiveFrom: "2024-01-01" },
  { designation: "Office staff", baseSalary: 18000, foodAllowance: 1500, effectiveFrom: "2024-01-01" },
  { designation: "Helper", baseSalary: 14000, effectiveFrom: "2024-01-01" },
  { designation: "Mechanic", baseSalary: 26000, otherAllowance: 1500, effectiveFrom: "2024-01-01" },
  { designation: "Driver", baseSalary: 18000, perTripIncentive: 300, foodAllowance: 1500, effectiveFrom: "2024-01-01" },
], (s) => s.designation, (s) => post("/hr/structures", s));

section("HR: employees");
const emps = (await get("/hr/employees")).items;
const emp = (name) => emps.find((e) => e.name === name);
const who = (name) => ({ employeeModel: emp(name)?.employeeModel, employee: emp(name)?.employee });
console.log(`  ${emps.length} employees found (staff and drivers)`);

section("HR: attendance (last 5 days, everyone)");
for (let n = 4; n >= 0; n--) {
  const entries = emps.map((e, i) => ({
    employeeModel: e.employeeModel, employee: e.employee,
    status: n === 2 && i % 4 === 1 ? "A" : n === 1 && i % 5 === 2 ? "HD" : n === 3 && i === 3 ? "L" : "P",
  }));
  await step(`Attendance ${day(-n)}`, () => post("/hr/attendance/bulk", { date: day(-n), entries }));
}

section("HR: leave requests");
const lv = await each([
  { ...who("Shirin Akter"), leaveType: id(leaveTypes[0]), from: day(5), to: day(6), reason: "Family function" },
  { ...who("Rubel Hossain"), leaveType: id(leaveTypes[1]), from: day(-3), to: day(-2), reason: "Fever" },
  { ...who("Kamal Mia"), leaveType: id(leaveTypes[2]), from: day(10), to: day(14), reason: "Village visit" },
  { ...who("Abdul Karim"), leaveType: id(leaveTypes[4]), from: day(7), to: day(8), reason: "Personal work" },
  { ...who("Delwar Hossain"), leaveType: id(leaveTypes[0]), from: day(3), to: day(3), reason: "Bank work" },
], (l) => `Leave: ${l.reason}`, (l) => post("/hr/leaves", l));
if (lv[1]) await step("Leave: approve fever leave", () => patch(`/hr/leaves/${id(lv[1])}`, { status: "approved" }));
if (lv[2]) await step("Leave: approve village visit", () => patch(`/hr/leaves/${id(lv[2])}`, { status: "approved" }));
if (lv[3]) await step("Leave: reject personal work", () => patch(`/hr/leaves/${id(lv[3])}`, { status: "rejected" }));

section("HR: advances");
const adv = await each([
  { ...who("Rubel Hossain"), date: day(-10), amount: 6000, monthlyDeduction: 2000, reason: "Medical expense" },
  { ...who("Kamal Mia"), date: day(-8), amount: 4000, monthlyDeduction: 1000, reason: "Rent" },
  { ...who("Abdul Karim"), date: day(-6), amount: 10000, monthlyDeduction: 2500, reason: "Family need" },
  { ...who("Delwar Hossain"), date: day(-4), amount: 8000, monthlyDeduction: 2000, reason: "Tools" },
  { ...who("Shirin Akter"), date: day(-2), amount: 5000, monthlyDeduction: 2500, reason: "Festival" },
], (a) => `Advance: ${a.reason}`, (a) => post("/hr/advances", a));
for (const a of [adv[0], adv[1], adv[2]]) if (a) await step("Advance: approve", () => patch(`/hr/advances/${id(a)}`, { status: "approved" }));

section("HR: fines");
await each([
  { ...who("Jamal Uddin"), date: day(-5), amount: 500, reason: "Late for pickup" },
  { ...who("Sohel Rana"), date: day(-4), amount: 1000, reason: "Traffic rule violation" },
  { ...who("Kamal Mia"), date: day(-3), amount: 300, reason: "Late arrival" },
  { ...who("Mizanur Rahman"), date: day(-2), amount: 700, reason: "Car not cleaned" },
  { ...who("Habib Hossain"), date: day(-1), amount: 400, reason: "Late for pickup" },
], (f) => `Fine: ${f.reason}`, (f) => post("/hr/fines", f));

section("HR: payroll (draft salary sheets for this month)");
await step(`Generate ${MONTH}`, () => post("/hr/payroll/generate", { month: MONTH }));

console.log(`\nDone: ${ok} ok, ${failed} failed.`);
if (failed) console.log("Read the FAIL lines above. Send them to me and I will fix the script.");
process.exit(failed ? 1 : 0);