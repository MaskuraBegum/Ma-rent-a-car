import Trip from "../models/Trip.js";
import Client from "../models/Client.js";

export const createBooking = async (req, res) => {
  const { name, whatsapp, date, time, pickup, drop, dropDate, dropTime, vehicleType, notes, website } = req.body;

  // bots fill hidden fields: pretend it worked and save nothing
  if (website) return res.status(201).json({ message: "Request received." });

  const pickupAt = new Date(`${date}T${time}:00+06:00`);
  if (isNaN(pickupAt) || pickupAt.getTime() < Date.now() + 60 * 60 * 1000) {
    return res.status(400).json({ message: "Pickup time must be at least 1 hour from now" });
  }

  const day = new Date(`${date}T00:00:00+06:00`);

  // optional drop date and time: the trip hours are worked out from them
  const dropDay = dropDate ? new Date(`${dropDate}T00:00:00+06:00`) : null;
  if (dropDay && isNaN(dropDay)) return res.status(400).json({ message: "Invalid drop date" });
  if (dropDay && dropDay < day) return res.status(400).json({ message: "The drop date cannot be before the pickup date" });
  if (dropTime) {
    const dropAt = new Date(`${dropDate || date}T${dropTime}:00+06:00`);
    if (dropAt <= pickupAt) {
      return res
        .status(400)
        .json({ message: "The drop time must be after the pickup time. If you drop on another day, choose the drop date." });
    }
  }

  // returning customer? link the client and unit automatically
  const known = await Client.findOne({ $or: [{ phone: whatsapp }, { "units.phone": whatsapp }] });
  const unit = known?.units.find((u) => u.phone === whatsapp);

  const dup = await Trip.exists({
    passengerPhone: whatsapp,
    date: day,
    status: { $in: ["requested", "assigned", "sent"] },
  });

  const trip = await Trip.create({
    source: "website",
    status: "requested",
    date: day,
    startTime: time,
    pickupLocation: pickup,
    dropLocation: drop,
    dropDate: dropDay || undefined,
    finishTime: dropTime,
    passengerName: name,
    passengerPhone: whatsapp,
    vehicleType,
    notes,
    client: known?._id,
    unitId: unit?._id,
    unitName: unit?.name,
    isPossibleDuplicate: !!dup,
  });

  res.status(201).json({
    message: "Request received. We will confirm on WhatsApp shortly.",
    tripNo: trip.tripNo,
  });
};