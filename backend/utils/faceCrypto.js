// Encrypts face descriptors at rest (AES-256-GCM). Face data is biometric, so we
// never store it as plain numbers in MongoDB.
// Key: FACE_ENCRYPTION_KEY if set, otherwise derived from JWT_SECRET (so no new
// env var is mandatory and existing .env files keep working).
const crypto = require('crypto');

const getKey = () => {
  const secret = process.env.FACE_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET (or FACE_ENCRYPTION_KEY) must be set');
  return crypto.createHash('sha256').update(`face-v1:${secret}`).digest();
};

const encryptDescriptor = (descriptor) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(descriptor), 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), enc.toString('base64')].join('.');
};

const decryptDescriptor = (payload) => {
  const [iv, tag, data] = payload.split('.').map((p) => Buffer.from(p, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(dec.toString('utf8'));
};

module.exports = { encryptDescriptor, decryptDescriptor };