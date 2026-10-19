const errorHandler = (err, req, res, next) => {
  let status = res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || "Something went wrong";

  if (err.code === 11000) {
    status = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = `This ${field} already exists`;
  }
  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  }
  if (err.name === "CastError") {
    status = 400;
    message = "Invalid ID";
  }

  res.status(status).json({ message });
};

module.exports = errorHandler;