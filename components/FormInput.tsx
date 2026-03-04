'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  touched?: boolean;
  success?: boolean;
  helperText?: string;
  icon?: React.ReactNode;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, touched, success, helperText, icon, className = '', ...props }, ref) => {
    const showError = touched && error;
    const showSuccess = touched && success && !error;

    const getInputClasses = () => {
      const baseClasses =
        'w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all duration-200 dark:bg-gray-800 dark:text-white';

      if (showError) {
        return `${baseClasses} border-red-300 dark:border-red-500/50 focus:border-red-500 dark:focus:border-red-400 bg-red-50 dark:bg-red-900/10 text-red-900 dark:text-red-200 placeholder-red-400 dark:placeholder-red-400/50`;
      }

      if (showSuccess) {
        return `${baseClasses} border-green-300 dark:border-green-500/50 focus:border-green-500 dark:focus:border-green-400 bg-green-50 dark:bg-green-900/10`;
      }

      return `${baseClasses} border-gray-300 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 bg-white dark:placeholder-gray-500`;
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            className={`${getInputClasses()} ${icon ? 'pl-10' : ''} ${className}`}
            {...props}
          />

          {/* Error Icon */}
          {showError && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}

          {/* Success Icon */}
          {showSuccess && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Error Message */}
        {showError && (
          <div className="flex items-center gap-1 mt-2 text-sm text-red-600 dark:text-red-400 animate-fadeIn">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Helper Text */}
        {helperText && !showError && (
          <p className="mt-2 text-sm text-gray-500">{helperText}</p>
        )}

        {/* Success Message */}
        {showSuccess && (
          <div className="flex items-center gap-1 mt-2 text-sm text-green-600 animate-fadeIn">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Looks good!</span>
          </div>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput;
