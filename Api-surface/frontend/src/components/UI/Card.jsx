import React from 'react'
import { cn } from '../../utils/helpers'

const Card = ({ 
  children, 
  title, 
  description, 
  className,
  ...props 
}) => {
  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-gray-200 shadow-sm',
        className
      )}
      {...props}
    >
      {(title || description) && (
        <div className="px-6 py-4 border-b border-gray-200">
          {title && (
            <h3 className="text-lg font-medium text-gray-900">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="px-6 py-4">
        {children}
      </div>
    </div>
  )
}

export const CardHeader = ({ children, className, ...props }) => (
  <div
    className={cn('px-6 py-4 border-b border-gray-200', className)}
    {...props}
  >
    {children}
  </div>
)

export const CardTitle = ({ children, className, ...props }) => (
  <h3
    className={cn('text-lg font-medium text-gray-900', className)}
    {...props}
  >
    {children}
  </h3>
)

export const CardDescription = ({ children, className, ...props }) => (
  <p
    className={cn('mt-1 text-sm text-gray-500', className)}
    {...props}
  >
    {children}
  </p>
)

export const CardContent = ({ children, className, ...props }) => (
  <div
    className={cn('px-6 py-4', className)}
    {...props}
  >
    {children}
  </div>
)

export const CardFooter = ({ children, className, ...props }) => (
  <div
    className={cn('px-6 py-4 border-t border-gray-200', className)}
    {...props}
  >
    {children}
  </div>
)

export default Card
