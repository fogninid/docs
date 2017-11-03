function errorHandler(e, req, res, next) {
  try {
    if (e instanceof Error) {
      console.error(e.stack);
    }
    res.status(e.code || 500).json({error: e.cause || "unknown"});
  } catch (e) {
    res.status(500).json({error: "unknown"});
  }
}

exports.errorHandler = errorHandler;

