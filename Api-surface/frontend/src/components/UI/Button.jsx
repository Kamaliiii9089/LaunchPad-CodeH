import React from 'react'
import { cn } from '../../utils/helpers'

const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className,
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white border-transparent hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-gray-600 text-white border-transparent hover:bg-gray-700 focus:ring-gray-500',
    success: 'bg-success-600 text-white border-transparent hover:bg-success-700 focus:ring-success-500',
    danger: 'bg-danger-600 text-white border-transparent hover:bg-danger-700 focus:ring-danger-500',
    warning: 'bg-warning-600 text-white border-transparent hover:bg-warning-700 focus:ring-warning-500',
    outline: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-primary-500',
    ghost: 'bg-transparent text-gray-700 border-transparent hover:bg-gray-100 focus:ring-primary-500'
  }

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {loading && (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
      )}
      {children}
    </button>
  )
})

Button.displayName = 'Button'

export default Button
