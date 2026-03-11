module.exports = (err, req, res, next) => {
  console.error(err);

  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    tenantId: req.tenantId || "unknown",
    route: `${req.method} ${req.path}`,
    error: err.message,
    stack: err.stack,
  }));

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Duplicate record detected",
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};