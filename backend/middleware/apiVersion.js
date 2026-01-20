module.exports = (req, res, next) => {
  const version = req.headers["api-version"];

  // agar header missing hai
  if (!version) {
    return res.status(400).json({
      error: "API-Version header is required",
    });
  }

  req.apiVersion = version;
  next();
};
