const fmtDate = (d) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  
  // full details when a car from the Cars list is chosen, otherwise the typed car type
  const carLines = (trip, car) => {
    if (!car) return trip.vehicleType ? [`Car: ${trip.vehicleType}`] : [];
    const lines = [`Car: ${car.companyName} ${car.model} (${car.year})`];
    if (car.registrationNo) lines.push(`Plate number: ${car.registrationNo}`);
    lines.push(`Seats: ${car.seatCapacity}${car.ac ? ", AC" : ""}`);
    return lines;
  };
  
  export const buildWhatsApp = (to, trip, car) => {
    const lines = [
      "Maa Rent a Car Private Service",
      `Your booking (Trip #${trip.tripNo}) is confirmed.`,
      "",
      `Date: ${fmtDate(trip.date)}${trip.startTime ? ` at ${trip.startTime}` : ""}`,
      `Location: ${trip.location}`,
      "",
      `Driver: ${trip.driverName}`,
      trip.driverPhone ? `Driver phone: +${trip.driverPhone}` : null,
      ...carLines(trip, car),
      "",
      "Thank you for choosing us.",
    ].filter((l) => l !== null);
  
    const message = lines.join("\n");
    return { to, message, url: `https://wa.me/${to}?text=${encodeURIComponent(message)}` };
  };