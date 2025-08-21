import jwt from "jsonwebtoken";

export function signToken(user) {
  const payload = { id: user._id, role: user.role, email: user.email };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
