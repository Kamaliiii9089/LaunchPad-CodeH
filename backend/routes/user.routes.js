router.get("/users", (req, res) => {
  if (req.apiVersion === "1") {
    return res.json({
      version: "v1",
      message: "User data from API version 1",
    });
  }

  if (req.apiVersion === "2") {
    return res.json({
      version: "v2",
      message: "User data from API version 2",
    });
  }

  return res.status(400).json({
    error: "Unsupported API version",
  });
});
