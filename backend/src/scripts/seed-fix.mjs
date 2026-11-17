const API = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}/api`;
const TODAY = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${data.message || ""} ${JSON.stringify(data.errors || "")}`);
  return data;
}
const first = async (path) => (await call("GET", path)).items?.[0];

try {
  const driver = await call("POST", "/drivers", {
    name: "Demo Abdul Karim", phone: "01712000001", nidNo: "7700123456", licenseNo: "DH-100001",
  });
  console.log("  ok    Demo Abdul Karim");

  const car = await first("/cars?search=DEMO-1");
  const client = await first("/clients?search=Demo%20Nasrin");
  if (!car || !client) throw new Error("Could not find the demo car or client");

  await call("POST", "/trips", {
    status: "completed", date: TODAY, pickupLocation: "Mirpur 10", dropLocation: "Hazrat Shahjalal Airport",
    client: client._id, vehicleSource: "own", car: car._id, driver: driver._id,
    rent: 12000, ownerAmount: 3000, totalKm: 48, fuelType: "octane",
  });
  console.log("  ok    Trip 1: completed, own car");
} catch (e) {
  console.log("  FAIL ", e.message);
}