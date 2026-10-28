const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  clockIn: { type: Date },
  clockOut: { type: Date },
  status: { type: String, enum: ['present', 'absent', 'late', 'half-day'], default: 'present' },
  totalHours: { type: Number, default: 0 }
}, { timestamps: true });

AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
