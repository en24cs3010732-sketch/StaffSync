const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../src/models/User');
const LeaveRequest = require('../src/models/LeaveRequest');
const Attendance = require('../src/models/Attendance');
const Announcement = require('../src/models/Announcement');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await LeaveRequest.deleteMany({});
  await Attendance.deleteMany({});
  await Announcement.deleteMany({});
});

describe('StaffSync Backend Comprehensive Test Suite', () => {

  // Helper variables for auth tokens and user IDs
  let employeeToken, managerToken, adminToken;
  let employeeId, managerId, adminId;

  beforeEach(async () => {
    // Privileged accounts are created directly (public registration only creates employees)
    const make = (name, email, role, department, position) =>
      User.create({ name, email, password: 'Password123!', role, department, position });

    const admin = await make('Admin User', 'admin@staffsync.com', 'admin', 'Management', 'Administrator');
    const manager = await make('Manager User', 'manager@staffsync.com', 'manager', 'Engineering', 'Engineering Manager');
    const employee = await make('Employee User', 'employee@staffsync.com', 'employee', 'Engineering', 'Software Engineer');
    adminId = admin._id.toString();
    managerId = manager._id.toString();
    employeeId = employee._id.toString();

    const login = async (email) =>
      (await request(app).post('/api/auth/login').send({ email, password: 'Password123!' })).body.token;
    adminToken = await login('admin@staffsync.com');
    managerToken = await login('manager@staffsync.com');
    employeeToken = await login('employee@staffsync.com');
  });

  // ==========================================
  // 1. AUTH REGISTRATION & LOGIN TESTS
  // ==========================================
  describe('1. Auth Registration & Login', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@staffsync.com',
          password: 'Password123!',
          role: 'employee',
          department: 'HR',
          position: 'HR Specialist'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.email).toEqual('newuser@staffsync.com');
      expect(res.body.role).toEqual('employee');
    });

    it('should fail registration with duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate',
          email: 'employee@staffsync.com', // Already registered in beforeEach
          password: 'Password123!'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message');
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'employee@staffsync.com',
          password: 'Password123!'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.email).toEqual('employee@staffsync.com');
    });

    it('should fail login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'employee@staffsync.com',
          password: 'WrongPassword!'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message');
    });

    it('should NOT let a self-registered user choose the admin role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Sneaky', email: 'sneaky@staffsync.com', password: 'Password123!', role: 'admin' });

      expect(res.statusCode).toEqual(201);
      expect(res.body.role).toEqual('employee');
    });

    it('should login regardless of email letter case', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'Employee@StaffSync.com', password: 'Password123!' });
      expect(res.statusCode).toEqual(200);
    });

    it('should fail login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'ghost@staffsync.com',
          password: 'Password123!'
        });

      expect(res.statusCode).toEqual(401);
    });
  });

  // ==========================================
  // 2. RBAC (ROLE-BASED ACCESS CONTROL) TESTS
  // ==========================================
  describe('2. RBAC (Role-Based Access Control)', () => {
    it('should forbid employee from creating an employee/user', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          name: 'Unauthorized Hire',
          email: 'hire@staffsync.com',
          password: 'Password123!',
          role: 'employee'
        });

      expect(res.statusCode).toEqual(403);
    });

    it('should allow manager/admin to create an employee', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Authorized Hire',
          email: 'hire@staffsync.com',
          password: 'Password123!',
          role: 'employee'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.email).toEqual('hire@staffsync.com');
    });

    it('should forbid a manager from creating an admin', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Boss', email: 'boss@staffsync.com', password: 'Password123!', role: 'admin' });
      expect(res.statusCode).toEqual(403);
    });

    it('should hide deactivated employees from the directory', async () => {
      const del = await request(app)
        .delete(`/api/employees/${employeeId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(del.statusCode).toEqual(200);

      const list = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(list.body.find((e) => e._id === employeeId)).toBeUndefined();
    });

    it('should not let an admin deactivate themselves', async () => {
      const res = await request(app)
        .delete(`/api/employees/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(400);
    });

    it('should forbid employee from publishing announcements', async () => {
      const res = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: 'Secret Announcement',
          content: 'Employee should not be able to post this.'
        });

      expect(res.statusCode).toEqual(403);
    });

    it('should allow manager/admin to publish announcements', async () => {
      const res = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Company Update',
          content: 'Admin posting announcement.'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.title).toEqual('Company Update');
    });
  });

  // ==========================================
  // 3. LEAVE REQUEST WORKFLOW TESTS
  // ==========================================
  describe('3. Leave Request Submission & Approval Workflow', () => {
    let leaveRequestId;

    it('should allow employee to submit a leave request', async () => {
      const res = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveType: 'annual',
          startDate: '2026-11-01',
          endDate: '2026-11-05',
          reason: 'Family vacation'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.status).toEqual('pending');
      leaveRequestId = res.body._id;
    });

    it('should fail leave request submission with missing required fields', async () => {
      const res = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveType: 'annual',
          reason: 'Incomplete dates'
        });

      expect(res.statusCode).toEqual(400);
    });

    it('should reject a leave request whose end date is before its start date', async () => {
      const res = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ leaveType: 'annual', startDate: '2026-11-10', endDate: '2026-11-01', reason: 'Backwards' });
      expect(res.statusCode).toEqual(400);
    });

    it('should allow employee to view own leaves and manager/admin to view all leaves', async () => {
      // Submit a leave first
      const leaveRes = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveType: 'sick',
          startDate: '2026-12-01',
          endDate: '2026-12-02',
          reason: 'Flu'
        });
      leaveRequestId = leaveRes.body._id;

      // Employee sees own leave
      const empGet = await request(app)
        .get('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(empGet.statusCode).toEqual(200);
      expect(empGet.body.length).toBeGreaterThan(0);

      // Manager sees all leaves
      const mgrGet = await request(app)
        .get('/api/leaves')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(mgrGet.statusCode).toEqual(200);
      expect(mgrGet.body.length).toBeGreaterThan(0);
    });

    it('should forbid employee from approving/rejecting leave requests', async () => {
      const leaveRes = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveType: 'annual',
          startDate: '2026-11-10',
          endDate: '2026-11-12',
          reason: 'Personal'
        });
      leaveRequestId = leaveRes.body._id;

      const res = await request(app)
        .put(`/api/leaves/${leaveRequestId}/status`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          status: 'approved',
          comments: 'Self approval attempt'
        });

      expect(res.statusCode).toEqual(403);
    });

    it('should allow manager/admin to approve or reject leave requests', async () => {
      const leaveRes = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveType: 'annual',
          startDate: '2026-11-15',
          endDate: '2026-11-18',
          reason: 'Trip'
        });
      leaveRequestId = leaveRes.body._id;

      const res = await request(app)
        .put(`/api/leaves/${leaveRequestId}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          status: 'approved',
          comments: 'Have a great trip!'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('approved');
      expect(res.body.comments).toEqual('Have a great trip!');
    });
  });

  // ==========================================
  // 4. ATTENDANCE CLOCK-IN/OUT LOGIC TESTS
  // ==========================================
  describe('4. Attendance Clock-In/Out Logic', () => {
    it('should allow employee to clock in successfully', async () => {
      const res = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('clockIn');
      expect(res.body).toHaveProperty('status');
    });

    it('should prevent duplicate clock-in on the same day', async () => {
      // First clock in
      await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${employeeToken}`);

      // Second clock in
      const res = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toMatch(/already clocked in/i);
    });

    it('should allow employee to clock out successfully after clocking in', async () => {
      // Clock in first
      await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${employeeToken}`);

      // Clock out
      const res = await request(app)
        .post('/api/attendance/clock-out')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('clockOut');
      expect(res.body).toHaveProperty('totalHours');
    });

    it('should prevent clock-out without clocking in first', async () => {
      const res = await request(app)
        .post('/api/attendance/clock-out')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.statusCode).toEqual(400);
    });

    it('should allow getting attendance history', async () => {
      await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${employeeToken}`);

      const res = await request(app)
        .get('/api/attendance')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // 5. INPUT VALIDATION & SECURITY TESTS
  // ==========================================
  describe('5. Input Validation & Security', () => {
    it('should reject protected route access without Authorization header', async () => {
      const res = await request(app).get('/api/employees');
      expect(res.statusCode).toEqual(401);
    });

    it('should reject protected route access with invalid/malformed token', async () => {
      const res = await request(app)
        .get('/api/employees')
        .set('Authorization', 'Bearer invalidtoken12345');

      expect(res.statusCode).toEqual(401);
    });

    it('should return 400 for invalid leave status update', async () => {
      const leaveRes = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveType: 'annual',
          startDate: '2026-12-10',
          endDate: '2026-12-12',
          reason: 'Holiday'
        });

      const res = await request(app)
        .put(`/api/leaves/${leaveRes.body._id}/status`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          status: 'invalid-status'
        });

      expect(res.statusCode).toEqual(400);
    });

    it('should return 404 for non-existent employee ID lookup', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/employees/${fakeId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.statusCode).toEqual(404);
    });
  });

});
