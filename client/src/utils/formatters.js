/**
 * Format a number as Indian Rupee currency
 */
export const formatCurrency = (amount) => {
  return `₹${Number(amount).toFixed(2)}`;
};

/**
 * Format a date string to locale date/time
 */
export const formatDate = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

/**
 * Capitalize first letter
 */
export const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};
