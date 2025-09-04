const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'your-secret-key';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    secret,
    { expiresIn: '1h' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, secret);
}

module.exports = { generateToken, verifyToken };