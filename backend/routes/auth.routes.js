const express = require("express");
const { signToken } = require("../utils/jwt");

const router = express.Router();

router.post("/login", async (req, res) => {
  // Example user payload
  const user = {
    id: "123",
    role: "user",
  };

  const token = signToken(user);

  res.json({
    accessToken: token,
  });
});

module.exports = router;
