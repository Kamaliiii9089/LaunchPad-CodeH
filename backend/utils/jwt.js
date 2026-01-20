const jwt = require("jsonwebtoken");
const jwtKeys = require("../config/jwtKeys");

exports.signToken = (payload) => {
  const { currentKid, keys } = jwtKeys;

  return jwt.sign(payload, keys[currentKid].secret, {
    expiresIn: keys[currentKid].expiresIn,
    header: {
      kid: currentKid,
    },
  });
};

exports.verifyToken = (token) => {
  const decodedHeader = jwt.decode(token, { complete: true });

  if (!decodedHeader || !decodedHeader.header.kid) {
    throw new Error("Invalid token header");
  }

  const kid = decodedHeader.header.kid;
  const key = jwtKeys.keys[kid];

  if (!key) {
    throw new Error("JWT secret not found for given kid");
  }

  return jwt.verify(token, key.secret);
};
