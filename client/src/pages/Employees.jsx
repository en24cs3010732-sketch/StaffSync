import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, Search, Plus, Mail, Building, Briefcase, Trash2, Edit2, X } from 'lucide-react';

export default function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({
    name: '',
    department: '',
    position: '',
    role: 'employee',
  });
  const [editError, setEditError] = useState('');

  // New employee form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: 'Engineering',
    designation: 'Software Engineer',
  });
  const [error, setError] = useState('');

  const fetchEmployees = async () => {
    try {
      const res = await API.get('/employees');
      setEmployees(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch employees', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await API.post('/employees', formData);
      setShowModal(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'employee',
        department: 'Engineering',
        designation: 'Software Engineer',
      });
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create employee');
    }
  };

  const handleEditClick = (emp) => {
    setEditingId(emp._id);
    setEditData({
      name: emp.name || '',
      department: emp.department || '',
      position: emp.position || emp.designation || '',
      role: emp.role || 'employee',
    });
    setEditError('');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    try {
      // Only admins may change roles; don't send the field for anyone else
      const payload = { ...editData };
      if (user?.role !== 'admin') delete payload.role;
      await API.put(`/employees/${editingId}`, payload);
      setShowEditModal(false);
      fetchEmployees();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update employee');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this employee? They will no longer be able to log in.')) return;
    try {
      await API.delete(`/employees/${id}`);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete employee');
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      (emp.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (emp.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (emp.department || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employee Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and view company personnel</p>
        </div>

        {(user?.role === 'admin' || user?.role === 'manager') && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-5 h-5" />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, department..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-500 text-sm shadow-sm"
        />
      </div>

      {/* Employee List Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          No employees found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((emp) => (
            <div key={emp._id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 font-bold flex items-center justify-center text-lg">
                      {(emp.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{emp.name}</h3>
                      <p className="text-xs text-slate-500 capitalize">{emp.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                      <button
                        onClick={() => handleEditClick(emp)}
                        className="p-2 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-slate-50 transition"
                        title="Edit Employee"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {user?.role === 'admin' && emp._id !== user._id && (
                      <button
                        onClick={() => handleDelete(emp._id)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-50 transition"
                        title="Delete Employee"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span>{emp.department}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <span>{emp.position || emp.designation || 'Staff'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Add New Employee</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                  placeholder="jane@staffsync.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                  >
                    <option value="employee">Employee</option>
                    {user?.role === 'admin' && <option value="manager">Manager</option>}
                    {user?.role === 'admin' && <option value="admin">Admin</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                    placeholder="Engineering"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  required
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                  placeholder="Software Engineer"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg text-sm shadow-sm"
                >
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Employee Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Edit Employee</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={editData.role}
                    disabled={user?.role !== 'admin'}
                    onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={editData.department}
                    onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Position / Designation</label>
                <input
                  type="text"
                  required
                  value={editData.position}
                  onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg text-sm shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
