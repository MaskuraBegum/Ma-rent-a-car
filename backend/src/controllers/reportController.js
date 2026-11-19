
import { z } from "zod";
import { resolvePeriod } from "../services/reports/period.js";
import { PENDING, REPORTS, runReport } from "../services/reports/index.js";
import { renderPdf } from "../services/reports/pdf.js";

const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

const querySchema = z.object({
  frequency: z.enum(["monthly", "yearly", "range"]).default("monthly"),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  from: day.optional(),
  to: day.optional(),
  vehicle: id.optional(),
  customer: id.optional(),
  account: id.optional(),
  format: z.enum(["json", "pdf"]).default("json"),
});

// GET /api/reports/:section/:type?frequency=monthly&month=10&year=2026&format=json|pdf
export const generate = async (req, res) => {
  const { section, type } = req.params;

  if (PENDING[section]) return res.status(501).json({ message: PENDING[section].message });
  if (!REPORTS[section]?.[type]) return res.status(404).json({ message: "Unknown report" });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }
  const q = parsed.data;

  let range;
  try {
    range = resolvePeriod(q);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }

  const report = await runReport(section, type, { range, vehicle: q.vehicle, customer: q.customer, account: q.account });

  if (q.format === "pdf") {
    const name = `${section}-${type}-${range.label}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
    return renderPdf(report, res, `${name}.pdf`);
  }
  res.json(report);
};
