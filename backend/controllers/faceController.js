const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { encryptDescriptor, decryptDescriptor } = require('../utils/faceCrypto');
const { isValidDescriptor, getThreshold, bestDistance } = require('../utils/faceMatcher');

const MIN_SAMPLES = 3;
const MAX_SAMPLES = 8;
const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// GET /api/face/status  (auth)
const status = async (req, res) => {
  const user = await User.findById(req.user._id).select('faceEnrolled faceRegisteredAt');
  res.json({ enrolled: !!user.faceEnrolled, registeredAt: user.faceRegisteredAt || null });
};

// POST /api/face/register  (auth)  body: { descriptors: number[128][] }
const register = async (req, res) => {
  try {
    const { descriptors } = req.body;
    if (!Array.isArray(descriptors) || descriptors.length < MIN_SAMPLES || descriptors.length > MAX_SAMPLES) {
      return res.status(400).json({ message: `Provide ${MIN_SAMPLES}-${MAX_SAMPLES} face samples` });
    }
    if (!descriptors.every(isValidDescriptor)) {
      return res.status(400).json({ message: 'Invalid face data' });
    }
    // The samples must agree with each other (guards against two different people / bad captures).
    const { euclidean } = require('../utils/faceMatcher');
    for (let i = 1; i < descriptors.length; i++) {
      if (euclidean(descriptors[0], descriptors[i]) > getThreshold() + 0.1) {
        return res.status(400).json({ message: 'Captured samples are inconsistent. Please retry with only your face in view.' });
      }
    }
    // updateOne with $set: touches only the face fields, never other user data.
    await User.updateOne(
      { _id: req.user._id },
      {
        $set: {
          faceDescriptors: descriptors.map(encryptDescriptor),
          faceEnrolled: true,
          faceRegisteredAt: new Date(),
        },
      }
    );
    res.json({ enrolled: true, message: 'Face registered' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/face  (auth)
const remove = async (req, res) => {
  await User.updateOne(
    { _id: req.user._id },
    { $set: { faceDescriptors: [], faceEnrolled: false }, $unset: { faceRegisteredAt: 1 } }
  );
  res.json({ enrolled: false, message: 'Face data removed' });
};

// POST /api/face/login  body: { email, descriptor }   (1:1 verification)
const login = async (req, res) => {
  try {
    const { email, descriptor } = req.body;
    if (!email || !isValidDescriptor(descriptor)) {
      return res.status(400).json({ message: 'Email and a valid face sample are required' });
    }
    const fail = () => res.status(401).json({ message: 'Face not recognised. Try again or use your password.' });

    const user = await User.findOne({ email: String(email).toLowerCase() }).select('+faceDescriptors');
    if (!user || !user.faceEnrolled || !user.faceDescriptors?.length) return fail();

    let enrolled;
    try {
      enrolled = user.faceDescriptors.map(decryptDescriptor);
    } catch {
      return fail();
    }
    if (bestDistance(descriptor, enrolled) > getThreshold()) return fail();

    res.json({ token: signToken(user._id), user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { status, register, remove, login };