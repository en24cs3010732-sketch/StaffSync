const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Announcement = require('../models/Announcement');

dotenv.config();

const seedData = async (shouldExit = true) => {
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
      console.log('Connected to DB for seeding...');
    }

    // Clear existing users and announcements
    await User.deleteMany();
    await Announcement.deleteMany();

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@staffsync.com',
      password: 'Password123!',
      role: 'admin',
      department: 'Management',
      position: 'HR Director',
      phone: '+1555019283'
    });

    const manager = await User.create({
      name: 'Manager User',
      email: 'manager@staffsync.com',
      password: 'Password123!',
      role: 'manager',
      department: 'Engineering',
      position: 'Engineering Manager',
      phone: '+1555014829'
    });

    const employee = await User.create({
      name: 'Employee User',
      email: 'employee@staffsync.com',
      password: 'Password123!',
      role: 'employee',
      department: 'Engineering',
      position: 'Software Engineer',
      phone: '+1555019842'
    });

    await Announcement.create({
      title: 'Welcome to StaffSync HRM',
      content: 'We are excited to launch our new HR management platform. Please complete your profile and check in daily.',
      author: admin._id,
      targetDepartment: 'All',
      priority: 'high'
    });

    console.log('Database seeded successfully!');
    console.log('Demo Accounts:');
    console.log('Admin: admin@staffsync.com / Password123!');
    console.log('Manager: manager@staffsync.com / Password123!');
    console.log('Employee: employee@staffsync.com / Password123!');

    if (shouldExit) {
      await disconnectDB();
      process.exit(0);
    }
  } catch (error) {
    console.error('Error seeding database:', error);
    if (shouldExit) {
      process.exit(1);
    }
    throw error;
  }
};

if (require.main === module) {
  seedData(true);
}

module.exports = { seedData };

