export const notFound = (req, res) =>
    res.status(404).json({ message: "Route not found" });
  
  export const errorHandler = (err, req, res, next) => {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "value";
      return res.status(409).json({ message: `This ${field} already exists` });
    }
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid id" });
    }
    if (err.name === "MulterError" || err.message?.startsWith("Only JPG")) {
      return res.status(400).json({ message: err.message });
    }
    if (err.name === "ValidationError") {
        return res.status(400).json({
          message: "Validation failed",
          errors: Object.values(err.errors).map((e) => ({
            field: e.path,
            message: e.message,
          })),
        });
      }
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  };