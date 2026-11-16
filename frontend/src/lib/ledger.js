// A driver gets at most this % of the rent for a trip (the usual limit). It only warns, it never blocks.
export const DRIVER_PAY_MAX_PERCENT = 80;

export const LEDGER = {
  driver: { word: "Driver", bn: "চালক", plural: "Drivers", dues: "Driver dues", duesBn: "চালকের পাওনা" },
  vendor: { word: "Vendor", bn: "ভেন্ডর", plural: "Vendors", dues: "Vendor dues", duesBn: "ভেন্ডরের পাওনা" },
};

export const KIND_LABEL = { duty: "Trip", payment: "Payment", opening: "Opening balance", adjustment: "Adjustment" };