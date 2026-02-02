import { useState, useCallback } from 'react';

export interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: ValidationRule[];
}

export interface FormErrors {
  [key: string]: string;
}

export const useFormValidation = () => {
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const validateField = useCallback(
    (name: string, value: any, rules: FieldValidation): string => {
      // Required validation
      if (rules.required && (!value || value.toString().trim() === '')) {
        return 'This field is required';
      }

      // Skip other validations if value is empty and not required
      if (!value) return '';

      const stringValue = value.toString();

      // Min length validation
      if (rules.minLength && stringValue.length < rules.minLength) {
        return `Must be at least ${rules.minLength} characters`;
      }

      // Max length validation
      if (rules.maxLength && stringValue.length > rules.maxLength) {
        return `Must be no more than ${rules.maxLength} characters`;
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(stringValue)) {
        return 'Invalid format';
      }

      // Custom validations
      if (rules.custom) {
        for (const rule of rules.custom) {
          if (!rule.validate(value)) {
            return rule.message;
          }
        }
      }

      return '';
    },
    []
  );

  const validate = useCallback(
    (name: string, value: any, rules: FieldValidation) => {
      const error = validateField(name, value, rules);
      setErrors((prev) => ({ ...prev, [name]: error }));
      return error === '';
    },
    [validateField]
  );

  const validateAll = useCallback(
    (fields: { [key: string]: { value: any; rules: FieldValidation } }): boolean => {
      const newErrors: FormErrors = {};
      let isValid = true;

      Object.entries(fields).forEach(([name, { value, rules }]) => {
        const error = validateField(name, value, rules);
        if (error) {
          newErrors[name] = error;
          isValid = false;
        }
      });

      setErrors(newErrors);
      return isValid;
    },
    [validateField]
  );

  const setFieldTouched = useCallback((name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }, []);

  const resetValidation = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const clearError = useCallback((name: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  return {
    errors,
    touched,
    validate,
    validateAll,
    setFieldTouched,
    resetValidation,
    clearError,
  };
};

// Common validation patterns
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s-()]+$/,
  url: /^https?:\/\/.+/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^\d+$/,
  sixDigits: /^\d{6}$/,
};

// Common validation rules
export const validationRules = {
  email: {
    pattern: validationPatterns.email,
    message: 'Please enter a valid email address',
  },
  password: {
    minLength: 8,
    custom: [
      {
        validate: (value: string) => /[A-Z]/.test(value),
        message: 'Password must contain at least one uppercase letter',
      },
      {
        validate: (value: string) => /[a-z]/.test(value),
        message: 'Password must contain at least one lowercase letter',
      },
      {
        validate: (value: string) => /\d/.test(value),
        message: 'Password must contain at least one number',
      },
    ],
  },
  twoFactorCode: {
    pattern: validationPatterns.sixDigits,
    minLength: 6,
    maxLength: 6,
  },
};
