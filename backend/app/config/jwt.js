const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "dev_secret";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function signJwt(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function verifyJwt(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signJwt, verifyJwt };
