const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const crudController = (
  Model,
  { searchFields = ["name", "phone"], populate = "" } = {}
) => ({
  list: async (req, res) => {
    const { search, active, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (active === "true") filter.isActive = true;
    if (active === "false") filter.isActive = false;
    if (search) {
      const rx = new RegExp(escapeRegex(String(search)), "i");
      filter.$or = searchFields.map((f) => ({ [f]: rx }));
    }
    const p = Math.max(Number(page) || 1, 1);
    const l = Math.min(Number(limit) || 50, 200);

    const query = Model.find(filter)
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l);
    if (populate) query.populate(populate);

    const [items, total] = await Promise.all([
      query,
      Model.countDocuments(filter),
    ]);
    res.json({ items, total, page: p, limit: l });
  },

  get: async (req, res) => {
    const query = Model.findById(req.params.id);
    if (populate) query.populate(populate);
    const doc = await query;
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  },

  create: async (req, res) => {
    const doc = await Model.create(req.body);
    if (populate) await doc.populate(populate);
    res.status(201).json(doc);
  },

  update: async (req, res) => {
    const query = Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (populate) query.populate(populate);
    const doc = await query;
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  },

  // soft delete: trips and ledgers will reference these records
  deactivate: async (req, res) => {
    const doc = await Model.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  },
});