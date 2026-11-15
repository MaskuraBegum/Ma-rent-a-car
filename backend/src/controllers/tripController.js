import Trip, { TRANSITIONS } from "../models/Trip.js";
import Client from "../models/Client.js";
import Driver from "../models/Driver.js";
import Car from "../models/Car.js";
import Vendor from "../models/Vendor.js";
import { buildWhatsApp } from "../services/whatsappService.js";

const POP = [
  { path: "client", select: "name type" },
  { path: "driver", select: "name phone" },
  { path: "car", select: "companyName model registrationNo" },
  { path: "vendor", select: "name companyName" },
];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const bad = (res, message) => res.status(400).json({ message });
const notFound = (res) => res.status(404).json({ message: "Trip not found" });

// copies the unit name onto the trip so old trips keep it even if the unit is renamed
const syncUnit = async (trip) => {
  if (!trip.client) {
    trip.unitId = undefined;
    trip.unitName = undefined;
    return null;
  }
  const client = await Client.findById(trip.client);
  if (!client) return "Client not found";
  if (trip.unitId) {
    const unit = client.units.id(trip.unitId);
    if (!unit) return "This unit does not belong to the client";
    trip.unitName = unit.name;
  } else if (client.type === "corporate") {
    return "Choose a unit for a corporate client";
  }
  return null;
};

// Checks driver/car/vendor exist, keeps own/rent tidy, fills snapshots. Returns an error string or null
const applyRefs = async (trip, body) => {
  if (body.vehicleSource === "own") {
    trip.vendor = null; // a company car has no vendor
    trip.vendorCarNo = undefined;
  }
  if (body.vehicleSource === "rent") {
    if (!body.driver) trip.driver = null; // the vendor's driver is typed, not picked
    if (!body.car) trip.car = null;
  }

  if (body.driver) {
    const d = await Driver.findById(body.driver);
    if (!d) return "Driver not found";
    trip.driverName = d.name;
    trip.driverPhone = d.phone;
  }
  if (body.car) {
    const c = await Car.findById(body.car);
    if (!c) return "Car not found";
    if (!body.vendor && c.vendor && body.vehicleSource !== "own") trip.vendor = c.vendor; // vendor's car -> vendor trip
    if (!trip.vehicleType) trip.vehicleType = `${c.companyName} ${c.model}`;
  }
  if (body.vendor && !(await Vendor.exists({ _id: body.vendor }))) return "Vendor not found";
  return syncUnit(trip);
};

// who gets the message: passenger number, else the unit, else the client
const whatsappFor = async (trip) => {
  let to = trip.passengerPhone;
  if (!to && trip.client) {
    const c = await Client.findById(trip.client);
    to = c?.units.id(trip.unitId)?.phone || c?.phone;
  }
  if (!to) return null;

  const carId = trip.car?._id || trip.car;
  const car = carId ? await Car.findById(carId) : null;
  return buildWhatsApp(to, trip, car);
};

export const listTrips = async (req, res) => {
  const { status, from, to, client, driver, search, sort, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (status) filter.status = { $in: String(status).split(",") };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(`${from}T00:00:00+06:00`);
    if (to) filter.date.$lte = new Date(`${to}T00:00:00+06:00`);
  }
  if (client) filter.client = client;
  if (driver) filter.driver = driver;
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), "i");
    filter.$or = ["location", "passengerName", "passengerPhone", "driverName", "chalanNo", "vendorCarNo"].map((f) => ({ [f]: rx }));
  }

  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Number(limit) || 50, 200);
  const order = sort === "oldest" ? { createdAt: 1 } : { date: -1, createdAt: -1 };

  const [items, total] = await Promise.all([
    Trip.find(filter).populate(POP).sort(order).skip((p - 1) * l).limit(l),
    Trip.countDocuments(filter),
  ]);
  res.json({ items, total, page: p, limit: l });
};

export const getTrip = async (req, res) => {
  const trip = await Trip.findById(req.params.id).populate(POP);
  if (!trip) return notFound(res);
  res.json(trip);
};

export const createTrip = async (req, res) => {
  const trip = new Trip({ ...req.body, source: "manual" });
  const err = await applyRefs(trip, req.body);
  if (err) return bad(res, err);
  await trip.save();
  res.status(201).json(await trip.populate(POP));
};

export const updateTrip = async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return notFound(res);
  trip.set(req.body);
  const err = await applyRefs(trip, req.body);
  if (err) return bad(res, err);
  await trip.save();
  res.json(await trip.populate(POP));
};

export const assignTrip = async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return notFound(res);
  if (!["requested", "assigned", "sent"].includes(trip.status)) {
    return bad(res, `Cannot assign a ${trip.status} trip`);
  }
  // an assignment replaces the previous vehicle and driver; sending the form again re-assigns
  trip.set({
    car: undefined,
    vendor: undefined,
    driver: undefined,
    vendorCarNo: undefined,
    driverName: undefined,
    driverPhone: undefined,
    ...req.body,
  });
  const err = await applyRefs(trip, req.body);
  if (err) return bad(res, err);
  if (!trip.driver && !trip.driverName) return bad(res, "Choose a driver or type the driver's name");
  trip.setStatus("assigned");
  await trip.save();
  res.json({ trip: await trip.populate(POP), whatsapp: await whatsappFor(trip) });
};

export const changeStatus = async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return notFound(res);
  const { status } = req.body;
  if (!TRANSITIONS[trip.status].includes(status)) {
    return bad(res, `Cannot change a ${trip.status} trip to ${status}`);
  }
  trip.setStatus(status);
  await trip.save();
  res.json(await trip.populate(POP));
};

export const getWhatsApp = async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return notFound(res);
  if (!trip.driverName) return bad(res, "Assign a driver first");
  res.json({ whatsapp: await whatsappFor(trip) });
};
