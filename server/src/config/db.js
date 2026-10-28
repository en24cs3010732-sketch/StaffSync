const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

let mongoServer = null;

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/staffsync';

/**
 * Connects to MongoDB. If no MongoDB is running locally, falls back to an
 * embedded MongoDB that keeps its data in server/.data/mongo so your data
 * survives restarts. (First run downloads the mongod binary for your OS.)
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || DEFAULT_URI;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    console.log(`Connected to MongoDB at ${uri}`);
    return;
  } catch (err) {
    console.log('No MongoDB found at', uri);
    console.log('Starting embedded MongoDB (first run downloads ~100MB, please wait)...');
  }

  const { MongoMemoryServer } = require('mongodb-memory-server');
  const dbPath = path.join(__dirname, '..', '..', '.data', 'mongo');

  try {
    fs.mkdirSync(dbPath, { recursive: true });
    mongoServer = await MongoMemoryServer.create({
      instance: { dbName: 'staffsync', dbPath, storageEngine: 'wiredTiger' },
    });
  } catch (persistErr) {
    console.warn('Persistent embedded DB failed (' + persistErr.message + '). Using temporary in-memory DB.');
    mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'staffsync' } });
  }

  await mongoose.connect(mongoServer.getUri());
  console.log('Embedded MongoDB started.');
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
};

module.exports = { connectDB, disconnectDB };
