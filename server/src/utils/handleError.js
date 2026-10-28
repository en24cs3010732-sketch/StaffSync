// Central place to turn thrown errors into sensible HTTP responses.
module.exports = (res, error) => {
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors).map((e) => e.message).join(', ');
    return res.status(400).json({ message });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${error.path}` });
  }
  if (error.code === 11000) {
    return res.status(400).json({ message: 'A record with these details already exists' });
  }
  console.error(error);
  return res.status(500).json({ message: error.message || 'Server error' });
};
