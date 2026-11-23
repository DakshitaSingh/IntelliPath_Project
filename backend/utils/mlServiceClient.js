/**
 * Thin HTTP client for the Python ML microservice (ml-service/app.py).
 * Uses Node's built-in fetch (Node 18+, already required by this project's
 * other dependencies), so no extra HTTP package is needed.
 */
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'https://intellipath-project-1.onrender.com';

const predictCareer = async (assessmentFeatures) => {
  let response;
  try {
    response = await fetch(`${ML_SERVICE_URL}/predict-career`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assessmentFeatures),
    });
  } catch (err) {
    throw Object.assign(
      new Error(
        `Could not reach the ML service at ${ML_SERVICE_URL}. Make sure it is running ` +
          `(cd ml-service && python app.py). Original error: ${err.message}`
      ),
      { status: 503 }
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data.message || 'ML service prediction failed'), {
      status: response.status,
    });
  }
  return data;
};

module.exports = { predictCareer, ML_SERVICE_URL };
