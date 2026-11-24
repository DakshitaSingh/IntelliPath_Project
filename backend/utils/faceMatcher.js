// Face descriptor helpers. Descriptors are 128-d vectors from face-api.js
// (dlib-style ResNet). Same person is typically < 0.5 euclidean distance.
const DESCRIPTOR_LENGTH = 128;
const DEFAULT_THRESHOLD = 0.5;

const isValidDescriptor = (d) =>
  Array.isArray(d) &&
  d.length === DESCRIPTOR_LENGTH &&
  d.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 10);

const euclidean = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
};

const getThreshold = () => {
  const t = parseFloat(process.env.FACE_MATCH_THRESHOLD);
  return Number.isFinite(t) && t > 0 && t < 1 ? t : DEFAULT_THRESHOLD;
};

// Best (smallest) distance between a probe and any enrolled sample.
const bestDistance = (probe, enrolled) => Math.min(...enrolled.map((e) => euclidean(probe, e)));

module.exports = { DESCRIPTOR_LENGTH, isValidDescriptor, euclidean, getThreshold, bestDistance };