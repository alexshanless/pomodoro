import { useState, useCallback } from 'react';

/**
 * Custom hook for form validation
 * Provides real-time validation and error management for forms
 *
 * @param {Object} initialValues - Initial form values
 * @param {Object} validationRules - Validation functions for each field
 * @returns {Object} - Form state and handlers
 *
 * @example
 * const { values, errors, handleChange, handleBlur, validateForm, resetForm } = useFormValidation(
 *   { name: '', email: '' },
 *   {
 *     name: (value) => validateProjectName(value),
 *     email: (value) => validateEmail(value)
 *   }
 * );
 */
export const useFormValidation = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  /**
   * Handle input change
   * Validates on change if field has been touched
   */
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    setValues(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate on change if field has been touched
    if (touched[name] && validationRules[name]) {
      const validation = validationRules[name](value);
      setErrors(prev => ({
        ...prev,
        [name]: validation.isValid ? null : validation.errors
      }));
    }
  }, [touched, validationRules]);

  /**
   * Handle programmatic value change
   */
  const setValue = useCallback((name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate if field has been touched
    if (touched[name] && validationRules[name]) {
      const validation = validationRules[name](value);
      setErrors(prev => ({
        ...prev,
        [name]: validation.isValid ? null : validation.errors
      }));
    }
  }, [touched, validationRules]);

  /**
   * Handle input blur
   * Marks field as touched and validates
   */
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;

    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    // Validate on blur
    if (validationRules[name]) {
      const validation = validationRules[name](value);
      setErrors(prev => ({
        ...prev,
        [name]: validation.isValid ? null : validation.errors
      }));
    }
  }, [validationRules]);

  /**
   * Validate entire form
   * Returns true if form is valid
   */
  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(fieldName => {
      const validation = validationRules[fieldName](values[fieldName]);

      if (!validation.isValid) {
        isValid = false;
        newErrors[fieldName] = validation.errors;
      }
    });

    setErrors(newErrors);
    setTouched(
      Object.keys(validationRules).reduce((acc, key) => ({
        ...acc,
        [key]: true
      }), {})
    );

    return isValid;
  }, [values, validationRules]);

  /**
   * Validate a single field
   * Returns validation result
   */
  const validateField = useCallback((fieldName) => {
    if (!validationRules[fieldName]) {
      return { isValid: true, errors: [] };
    }

    const validation = validationRules[fieldName](values[fieldName]);

    setErrors(prev => ({
      ...prev,
      [fieldName]: validation.isValid ? null : validation.errors
    }));

    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));

    return validation;
  }, [values, validationRules]);

  /**
   * Reset form to initial values
   */
  const resetForm = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  /**
   * Set multiple errors manually
   */
  const setFieldErrors = useCallback((fieldErrors) => {
    setErrors(prev => ({
      ...prev,
      ...fieldErrors
    }));
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Check if form has any errors
   */
  const hasErrors = Object.keys(errors).some(key => errors[key] && errors[key].length > 0);

  /**
   * Check if form is pristine (no changes)
   */
  const isPristine = JSON.stringify(values) === JSON.stringify(initialValues);

  return {
    values,
    errors,
    touched,
    hasErrors,
    isPristine,
    handleChange,
    handleBlur,
    setValue,
    validateForm,
    validateField,
    resetForm,
    setFieldErrors,
    clearErrors
  };
};

export default useFormValidation;
