/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validate password (minimum 6 characters)
 */
export const isValidPassword = (password) => {
  return typeof password === "string" && password.length >= 6;
};

/**
 * Validate required field (non-empty string)
 */
export const isRequired = (value) => {
  return typeof value === "string" && value.trim().length > 0;
};

/**
 * Validate positive number
 */
export const isPositiveNumber = (value) => {
  return typeof value === "number" && value > 0;
};
