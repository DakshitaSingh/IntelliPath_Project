const CareerProfile = require('../models/CareerProfile');

/**
 * One-time startup migration.
 *
 * An earlier version of the CareerProfile schema (or a manual `createIndex`
 * call) left a UNIQUE index on `{ user: 1 }` sitting in MongoDB itself. Mongoose
 * does not drop indexes that are no longer declared in the schema, so simply
 * removing `unique: true` from the model (already done in CareerProfile.js)
 * is not enough - the old index keeps living in the collection and keeps
 * throwing:
 *   E11000 duplicate key error collection: test.careerprofiles index: user_1
 * on every second assessment by the same user.
 *
 * This runs once per server start, is idempotent, and is safe to leave in
 * permanently: if the stale index is already gone it's a fast no-op.
 */
const fixCareerProfileIndexes = async () => {
  try {
    const existingIndexes = await CareerProfile.collection.indexes();
    const staleUniqueUserIndex = existingIndexes.find(
      (idx) => idx.unique && Object.keys(idx.key).length === 1 && idx.key.user === 1
    );

    if (staleUniqueUserIndex) {
      await CareerProfile.collection.dropIndex(staleUniqueUserIndex.name);
      console.log(
        `Dropped stale unique index "${staleUniqueUserIndex.name}" on careerprofiles.user - ` +
          'users can now submit multiple career predictions.'
      );
    }

    // Bring the collection's real indexes in line with the schema
    // (creates the new non-unique { user: 1, createdAt: -1 } index if missing).
    await CareerProfile.syncIndexes();
  } catch (err) {
    // A missing collection on a brand-new database is not an error here.
    if (err.codeName === 'NamespaceNotFound') return;
    console.error('CareerProfile index migration failed:', err.message);
  }
};

module.exports = fixCareerProfileIndexes;
