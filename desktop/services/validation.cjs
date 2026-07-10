function requireNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value;
}

function requireSafePathSegment(value, field) {
  const segment = requireNonEmptyString(value, field);
  if (segment === '.' || segment === '..' || /[\\/\0]/.test(segment)) {
    throw new TypeError(`${field} must be a safe path segment`);
  }
  return segment;
}

module.exports = { requireNonEmptyString, requireSafePathSegment };
