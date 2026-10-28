import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isSameLocalDay } from '../utils/date';

export default function Attendance() {
  const { user } = useAuth();
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);

  const fetchAttendance = async () => {
    try {
      const res = await API.get('/attendance');
      const data = res.data.data || res.data || [];
      setAttendanceList(data);

      const current = data.find(
        (a) => a.date && isSameLocalDay(a.date) && (a.user?._id || a.user) === user?._id
      );
      setTodayRecord(current || null);
    } catch (err) {
      console.error('Failed to fetch attendance', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [user?._id]);

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      await API.post('/attendance/clock-in');
      fetchAttendance();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clock in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      await API.post('/attendance/clock-out');
      fetchAttendance();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clock out');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Tracking</h1>
          <p className="text-sm text-slate-500 mt-1">Record daily work hours & logs</p>
        </div>

        <div className="flex items-center space-x-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          {!todayRecord || !todayRecord.clockIn ? (
            <button
              onClick={handleClockIn}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg text-sm transition shadow-sm disabled:opacity-60"
            >
              {actionLoading ? 'Processing...' : 'Clock In Now'}
            </button>
          ) : !todayRecord.clockOut ? (
            <button
              onClick={handleClockOut}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg text-sm transition shadow-sm disabled:opacity-60"
            >
              {actionLoading ? 'Processing...' : 'Clock Out Now'}
            </button>
          ) : (
            <span className="px-4 py-2 bg-slate-100 text-slate-600 font-medium rounded-lg text-sm">
              Shift Completed Today ✓
            </span>
          )}
        </div>
      </div>

      {/* Attendance History Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      ) : attendanceList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          No attendance records found.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Date</th>
                  {(user?.role === 'admin' || user?.role === 'manager') && (
                    <th className="py-4 px-6">Employee</th>
                  )}
                  <th className="py-4 px-6">Clock In</th>
                  <th className="py-4 px-6">Clock Out</th>
                  <th className="py-4 px-6">Total Hours</th>
                  <th className="py-4 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {attendanceList.map((att) => (
                  <tr key={att._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-medium text-slate-900">
                      {new Date(att.date).toLocaleDateString()}
                    </td>
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                      <td className="py-4 px-6 text-slate-800 font-medium">
                        {att.user?.name || 'Staff Member'}
                        <span className="block text-xs text-slate-400 font-normal">{att.user?.department}</span>
                      </td>
                    )}
                    <td className="py-4 px-6 text-slate-600">
                      {att.clockIn ? new Date(att.clockIn).toLocaleTimeString() : '-'}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {att.clockOut ? new Date(att.clockOut).toLocaleTimeString() : 'Active'}
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-medium">
                      {att.totalHours ? `${att.totalHours} hrs` : '-'}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          att.status === 'present'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {att.status || 'present'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
