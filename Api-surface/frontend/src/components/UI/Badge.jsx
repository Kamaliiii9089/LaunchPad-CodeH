import React from 'react'
import { cn, getSeverityColor } from '../../utils/helpers'

const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  className,
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full'
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-sm'
  }
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-primary-100 text-primary-800',
    success: 'bg-success-100 text-success-800',
    danger: 'bg-danger-100 text-danger-800',
    warning: 'bg-warning-100 text-warning-800',
    yellow: 'bg-yellow-100 text-yellow-800'
  }

  return (
    <span
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export const SeverityBadge = ({ severity, ...props }) => {
  const color = getSeverityColor(severity)
  return (
    <Badge variant={color} {...props}>
      {severity?.charAt(0)?.toUpperCase() + severity?.slice(1)}
    </Badge>
  )
}

export const StatusBadge = ({ status, ...props }) => {
  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'active':
        return 'success'
      case 'running':
      case 'scanning':
        return 'primary'
      case 'pending':
        return 'yellow'
      case 'failed':
      case 'error':
        return 'danger'
      default:
        return 'default'
    }
  }

  return (
    <Badge variant={getStatusVariant(status)} {...props}>
      {status?.charAt(0)?.toUpperCase() + status?.slice(1)}
    </Badge>
  )
}

export default Badge
