import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/api-mapper', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ Connected to MongoDB');
  
  try {
    console.log('Updating user plan limits for development...');
    const result = await User.updateMany({}, {
      $set: {
        'planLimits.domainsAllowed': 10,
        'planLimits.scansPerMonth': 50,
        'planLimits.aiAnalysisEnabled': true,
        'planLimits.realTimeMonitoring': true,
        'usage.scansThisMonth': 0  // Reset scan count
      }
    });
    console.log('Updated', result.modifiedCount, 'users');
    process.exit(0);
  } catch (error) {
    console.error('Error updating users:', error);
    process.exit(1);
  }
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});
