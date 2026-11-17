const API = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}/api`;

const staff = [
  { name: "Demo Rafiq Hasan", designation: "Manager", phone: "01716000001", email: "rafiq.demo@example.com", nidNo: "5500123401", joiningDate: "2024-01-10", salary: 35000, address: "Mirpur 12, Dhaka" },
  { name: "Demo Shirin Akter", designation: "Accountant", phone: "01716000002", nidNo: "5500123402", joiningDate: "2025-03-01", salary: 28000, address: "Uttara, Dhaka" },
  { name: "Demo Babul Mia", designation: "Helper", phone: "01716000003", joiningDate: "2026-06-15", salary: 15000, address: "Savar, Dhaka" },
];

for (const s of staff) {
  const res = await fetch(`${API}/staff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(s),
  });
  const data = await res.json().catch(() => ({}));
  console.log(res.ok ? "  ok   " : "  FAIL ", s.name, res.ok ? "" : `${res.status} ${data.message || ""} ${JSON.stringify(data.errors || "")}`);
}