/**
 * Validation Utilities
 * Centralized validation functions for form inputs and data integrity
 */

/**
 * Sanitize string input to prevent XSS attacks
 * Strips HTML tags and potentially dangerous characters
 */
export const sanitizeString = (input) => {
  if (!input) return '';

  return String(input)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validate project name
 * Rules: 1-100 characters, alphanumeric + spaces, hyphens, underscores, dots
 */
export const validateProjectName = (name) => {
  const errors = [];

  if (!name || name.trim().length === 0) {
    errors.push('Project name is required');
    return { isValid: false, errors };
  }

  const sanitized = sanitizeString(name);

  if (sanitized.length < 1) {
    errors.push('Project name must be at least 1 character');
  }

  if (sanitized.length > 100) {
    errors.push('Project name must not exceed 100 characters');
  }

  // Allow alphanumeric, spaces, hyphens, underscores, dots
  const validPattern = /^[a-zA-Z0-9\s\-_.]+$/;
  if (!validPattern.test(sanitized)) {
    errors.push('Project name can only contain letters, numbers, spaces, hyphens, underscores, and dots');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
};

/**
 * Validate hourly rate
 * Rules: positive number, max 2 decimal places, range 0-10000
 */
export const validateHourlyRate = (rate) => {
  const errors = [];

  if (rate === '' || rate === null || rate === undefined) {
    // Rate is optional
    return { isValid: true, errors: [], sanitized: null };
  }

  const numRate = Number(rate);

  if (isNaN(numRate)) {
    errors.push('Hourly rate must be a valid number');
    return { isValid: false, errors };
  }

  if (numRate < 0) {
    errors.push('Hourly rate must be positive');
  }

  if (numRate > 10000) {
    errors.push('Hourly rate must not exceed $10,000/hour');
  }

  // Check decimal places
  const decimalPlaces = (numRate.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    errors.push('Hourly rate can have at most 2 decimal places');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: numRate
  };
};

/**
 * Validate description/note field
 * Rules: max 500 characters, sanitized for XSS
 */
export const validateDescription = (description, maxLength = 500) => {
  const errors = [];

  if (!description) {
    // Description is optional
    return { isValid: true, errors: [], sanitized: '' };
  }

  const sanitized = sanitizeString(description);

  if (sanitized.length > maxLength) {
    errors.push(`Description must not exceed ${maxLength} characters`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
};

/**
 * Validate email address
 * Rules: RFC 5322 compliant
 */
export const validateEmail = (email) => {
  const errors = [];

  if (!email || email.trim().length === 0) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  const sanitized = email.trim().toLowerCase();

  // RFC 5322 compliant regex (simplified but robust)
  const emailPattern = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

  if (!emailPattern.test(sanitized)) {
    errors.push('Please enter a valid email address');
  }

  if (sanitized.length > 254) {
    errors.push('Email address is too long');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
};

/**
 * Validate password
 * Rules: min 8 characters, at least one uppercase, one lowercase, one number
 */
export const validatePassword = (password, options = {}) => {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumber = true,
    requireSpecial = false
  } = options;

  const errors = [];

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (requireSpecial && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate financial amount (transaction amount)
 * Rules: can be positive or negative, max 2 decimal places, reasonable range
 */
export const validateAmount = (amount, options = {}) => {
  const {
    allowNegative = true,
    min = -1000000,
    max = 1000000
  } = options;

  const errors = [];

  if (amount === '' || amount === null || amount === undefined) {
    errors.push('Amount is required');
    return { isValid: false, errors };
  }

  const numAmount = Number(amount);

  if (isNaN(numAmount)) {
    errors.push('Amount must be a valid number');
    return { isValid: false, errors };
  }

  if (!allowNegative && numAmount < 0) {
    errors.push('Amount must be positive');
  }

  if (numAmount < min) {
    errors.push(`Amount must be at least $${min.toLocaleString()}`);
  }

  if (numAmount > max) {
    errors.push(`Amount must not exceed $${max.toLocaleString()}`);
  }

  // Check decimal places
  const decimalPlaces = (Math.abs(numAmount).toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    errors.push('Amount can have at most 2 decimal places');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: numAmount
  };
};

/**
 * Validate tag name
 * Rules: 1-30 characters, alphanumeric + spaces, hyphens
 */
export const validateTag = (tag) => {
  const errors = [];

  if (!tag || tag.trim().length === 0) {
    errors.push('Tag cannot be empty');
    return { isValid: false, errors };
  }

  const sanitized = sanitizeString(tag);

  if (sanitized.length < 1) {
    errors.push('Tag must be at least 1 character');
  }

  if (sanitized.length > 30) {
    errors.push('Tag must not exceed 30 characters');
  }

  const validPattern = /^[a-zA-Z0-9\s\-]+$/;
  if (!validPattern.test(sanitized)) {
    errors.push('Tag can only contain letters, numbers, spaces, and hyphens');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
};

/**
 * Validate phone number (optional field)
 * Rules: 10-15 digits, optional country code
 */
export const validatePhone = (phone) => {
  if (!phone || phone.trim().length === 0) {
    // Phone is optional
    return { isValid: true, errors: [], sanitized: '' };
  }

  const errors = [];

  // Remove all non-numeric characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.length < 10) {
    errors.push('Phone number must have at least 10 digits');
  }

  if (cleaned.length > 15) {
    errors.push('Phone number is too long');
  }

  const phonePattern = /^\+?[1-9]\d{9,14}$/;
  if (!phonePattern.test(cleaned)) {
    errors.push('Please enter a valid phone number');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: cleaned
  };
};

/**
 * Validate URL
 * Rules: valid URL format, http/https protocol
 */
export const validateUrl = (url) => {
  if (!url || url.trim().length === 0) {
    // URL is optional
    return { isValid: true, errors: [], sanitized: '' };
  }

  const errors = [];

  try {
    const urlObj = new URL(url);

    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      errors.push('URL must use http or https protocol');
    }
  } catch {
    errors.push('Please enter a valid URL');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: url.trim()
  };
};

/**
 * Validate generic text field
 * Rules: optional min/max length, sanitized
 */
export const validateTextField = (text, options = {}) => {
  const {
    required = false,
    minLength = 0,
    maxLength = 1000,
    fieldName = 'Field'
  } = options;

  const errors = [];

  if (required && (!text || text.trim().length === 0)) {
    errors.push(`${fieldName} is required`);
    return { isValid: false, errors };
  }

  if (!text) {
    return { isValid: true, errors: [], sanitized: '' };
  }

  const sanitized = sanitizeString(text);

  if (minLength > 0 && sanitized.length < minLength) {
    errors.push(`${fieldName} must be at least ${minLength} characters`);
  }

  if (sanitized.length > maxLength) {
    errors.push(`${fieldName} must not exceed ${maxLength} characters`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
};

/**
 * Batch validate multiple fields
 * Returns combined validation result
 */
export const validateFields = (validations) => {
  const allErrors = {};
  let isValid = true;

  Object.keys(validations).forEach(fieldName => {
    const validation = validations[fieldName];
    if (!validation.isValid) {
      isValid = false;
      allErrors[fieldName] = validation.errors;
    }
  });

  return {
    isValid,
    errors: allErrors
  };
};

export default {
  sanitizeString,
  validateProjectName,
  validateHourlyRate,
  validateDescription,
  validateEmail,
  validatePassword,
  validateAmount,
  validateTag,
  validatePhone,
  validateUrl,
  validateTextField,
  validateFields
};
