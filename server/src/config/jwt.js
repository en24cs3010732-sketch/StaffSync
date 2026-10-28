// Single source of truth for JWT settings (previously duplicated in several files).
const getJwtSecret = () => process.env.JWT_SECRET || 'dev-only-secret-change-me';
const getJwtExpire = () => process.env.JWT_EXPIRE || '7d';
module.exports = { getJwtSecret, getJwtExpire };
