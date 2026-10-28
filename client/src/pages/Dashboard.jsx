import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Users, Calendar, Clock, Megaphone, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isSameLocalDay } from '../utils/date';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    employeesCount: 0,
    leavesCount: 0,
    announcementsCount: 0,
  });
  const [clockedIn, setClockedIn] = useState(false);
  const [shiftDone, setShiftDone] = useState(false);
  const [loadingClock, setLoadingClock] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [empRes, leaveRes, annRes, attRes] = await Promise.all([
          API.get('/employees').catch(() => ({ data: [] })),
          API.get('/leaves').catch(() => ({ data: [] })),
          API.get('/announcements').catch(() => ({ data: [] })),
          API.get('/attendance').catch(() => ({ data: [] })),
        ]);

        const employees = empRes.data.data || empRes.data || [];
        const leaves = leaveRes.data.data || leaveRes.data || [];
        const announcements = annRes.data.data || annRes.data || [];
        const attendance = attRes.data.data || attRes.data || [];

        // Check if clocked in today without clock-out
        // (the API is role-aware: managers/admins get everyone's records, so match on the current user)
        const todayAttendance = attendance.find(
          (a) => a.date && isSameLocalDay(a.date) && (a.user?._id || a.user) === user?._id
        );
        if (todayAttendance && todayAttendance.clockIn) {
          setClockedIn(!todayAttendance.clockOut);
          setShiftDone(!!todayAttendance.clockOut);
        }

        setStats({
          employeesCount: employees.length,
          leavesCount: leaves.filter((l) => l.status === 'pending').length,
          announcementsCount: announcements.length,
        });
      } catch (err) {
        console.error('Error fetching dashboard stats', err);
      }
    };
    fetchDashboardData();
  }, [user?._id]);

  const handleClockToggle = async () => {
    setLoadingClock(true);
    try {
      if (clockedIn) {
        await API.post('/attendance/clock-out');
        setClockedIn(false);
        setShiftDone(true);
      } else {
        await API.post('/attendance/clock-in');
        setClockedIn(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update attendance');
    } finally {
      setLoadingClock(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.name}! 👋</h1>
          <p className="text-brand-100 mt-2 text-sm">
            Here is what is happening across StaffSync HRM today.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20 flex items-center space-x-4">
          <div>
            <p className="text-xs text-brand-100 uppercase tracking-wider font-semibold">Status</p>
            <p className="text-lg font-bold flex items-center mt-0.5">
              <span className={`w-3 h-3 rounded-full mr-2 ${clockedIn ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              {clockedIn ? 'Clocked In' : shiftDone ? 'Shift Completed' : 'Clocked Out'}
            </p>
          </div>
          <button
            onClick={handleClockToggle}
            disabled={loadingClock || shiftDone}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition shadow ${
              clockedIn
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {loadingClock ? 'Processing...' : clockedIn ? 'Clock Out' : shiftDone ? 'Done for today' : 'Clock In'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Employees</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.employeesCount}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Pending Leave Requests</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.leavesCount}</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Announcements</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.announcementsCount}</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Megaphone className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/employees" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-500 transition group">
          <Users className="w-8 h-8 text-brand-500 mb-4" />
          <h3 className="font-semibold text-slate-900 group-hover:text-brand-600 transition">Employee Directory</h3>
          <p className="text-sm text-slate-500 mt-1">Browse company staff & profiles</p>
          <div className="mt-4 flex items-center text-sm font-medium text-brand-500">
            <span>View directory</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        <Link to="/leaves" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-500 transition group">
          <Calendar className="w-8 h-8 text-brand-500 mb-4" />
          <h3 className="font-semibold text-slate-900 group-hover:text-brand-600 transition">Leave Requests</h3>
          <p className="text-sm text-slate-500 mt-1">Apply & manage time off</p>
          <div className="mt-4 flex items-center text-sm font-medium text-brand-500">
            <span>Manage leaves</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        <Link to="/attendance" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-500 transition group">
          <Clock className="w-8 h-8 text-brand-500 mb-4" />
          <h3 className="font-semibold text-slate-900 group-hover:text-brand-600 transition">Attendance Tracking</h3>
          <p className="text-sm text-slate-500 mt-1">Check daily logs & history</p>
          <div className="mt-4 flex items-center text-sm font-medium text-brand-500">
            <span>View attendance</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        <Link to="/announcements" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-500 transition group">
          <Megaphone className="w-8 h-8 text-brand-500 mb-4" />
          <h3 className="font-semibold text-slate-900 group-hover:text-brand-600 transition">Announcements</h3>
          <p className="text-sm text-slate-500 mt-1">Company news & updates</p>
          <div className="mt-4 flex items-center text-sm font-medium text-brand-500">
            <span>Read feed</span>
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
          </div>
        </Link>
      </div>
    </div>
  );
}
