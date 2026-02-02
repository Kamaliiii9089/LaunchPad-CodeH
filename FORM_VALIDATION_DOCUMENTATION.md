# Form Validation & Toast Notifications - Documentation

## Overview

This implementation provides a comprehensive form validation system with visual feedback and toast notifications to improve user experience across the dashboard.

## Features Implemented

### ✅ 1. Toast Notification System
- **Success notifications** (green) with checkmark icon
- **Error notifications** (red) with X icon
- **Warning notifications** (yellow) with warning icon  
- **Info notifications** (blue) with info icon
- Auto-dismiss after 5 seconds
- Manual dismiss with X button
- Smooth fade-in/fade-out animations
- Stacks multiple notifications
- Positioned at top-right corner

### ✅ 2. Form Validation System
- Real-time validation on blur
- Inline error messages below inputs
- Visual feedback with icons (✓ for success, ⚠ for error)
- Color-coded borders (red for error, green for success)
- Helper text support
- Custom validation rules
- Pre-built patterns (email, phone, 6-digit codes, etc.)

### ✅ 3. FormInput Component
- Reusable input component with built-in validation
- Error state with red styling
- Success state with green styling
- Icon support for both left side and validation feedback
- Required field indicator (*)
- Smooth animations for error/success messages
- Fully accessible

---

## Components Created

### 1. Toast Component
**Location:** `/components/Toast.tsx`

**Props:**
```typescript
{
  message: string;        // The message to display
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;      // Auto-dismiss time (default: 5000ms)
  onClose: () => void;    // Close callback
}
```

**Features:**
- Auto-dismiss timer
- Smooth exit animation
- Type-specific colors and icons
- Manual close button

---

### 2. ToastContainer (Toast Provider)
**Location:** `/components/ToastContainer.tsx`

**Usage:**
```tsx
import { ToastProvider, useToast } from '@/components/ToastContainer';

// Wrap your app
<ToastProvider>
  <YourApp />
</ToastProvider>

// In your component
const toast = useToast();

toast.success('Operation successful!');
toast.error('Something went wrong');
toast.warning('Please be careful');
toast.info('Here is some information');
```

**Methods:**
- `toast.success(message)` - Show success toast
- `toast.error(message)` - Show error toast
- `toast.warning(message)` - Show warning toast
- `toast.info(message)` - Show info toast
- `toast.showToast(message, type)` - Generic toast

---

### 3. FormInput Component
**Location:** `/components/FormInput.tsx`

**Props:**
```typescript
{
  label?: string;           // Input label
  error?: string;          // Error message to display
  touched?: boolean;       // Whether field has been touched
  success?: boolean;       // Show success state
  helperText?: string;     // Helper text below input
  icon?: React.ReactNode;  // Icon on left side
  ...InputHTMLAttributes   // All standard input props
}
```

**Example:**
```tsx
<FormInput
  label="Email Address"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  onBlur={() => setFieldTouched('email')}
  error={errors.email}
  touched={touched.email}
  required
  placeholder="Enter your email"
  helperText="We'll never share your email"
/>
```

---

### 4. Validation Hook
**Location:** `/lib/validation.ts`

**Usage:**
```tsx
import { useFormValidation, validationPatterns } from '@/lib/validation';

const { errors, touched, validate, setFieldTouched, resetValidation } = useFormValidation();

// Validate a single field
const isValid = validate('email', emailValue, {
  required: true,
  pattern: validationPatterns.email,
});

// Validate multiple fields
const isAllValid = validateAll({
  email: { 
    value: emailValue, 
    rules: { required: true, pattern: validationPatterns.email } 
  },
  password: { 
    value: passwordValue, 
    rules: { required: true, minLength: 8 } 
  },
});

// Mark field as touched
setFieldTouched('email');

// Reset all validation
resetValidation();
```

**Validation Rules:**
```typescript
{
  required?: boolean;        // Field is required
  minLength?: number;        // Minimum length
  maxLength?: number;        // Maximum length
  pattern?: RegExp;          // Regex pattern
  custom?: ValidationRule[]; // Custom validation functions
}
```

**Pre-built Patterns:**
```typescript
validationPatterns.email       // Email validation
validationPatterns.phone       // Phone number
validationPatterns.url         // URL validation
validationPatterns.alphanumeric // Letters and numbers only
validationPatterns.numeric     // Numbers only
validationPatterns.sixDigits   // Exactly 6 digits (for 2FA codes)
```

---

## Implementation Examples

### Example 1: 2FA Code Validation (Already Implemented)

```tsx
const { errors, touched, validate, setFieldTouched, resetValidation } = useFormValidation();
const [code, setCode] = useState('');
const toast = useToast();

const handleSubmit = async () => {
  const isValid = validate('code', code, {
    required: true,
    pattern: validationPatterns.sixDigits,
    minLength: 6,
    maxLength: 6,
  });

  if (!isValid) {
    toast.error('Please enter a valid 6-digit code');
    return;
  }

  // Proceed with API call
};

// In JSX
<FormInput
  label="2FA Code"
  type="text"
  value={code}
  onChange={(e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    if (value.length > 0) {
      setFieldTouched('code');
    }
  }}
  onBlur={() => setFieldTouched('code')}
  error={errors.code}
  touched={touched.code}
  success={code.length === 6}
  required
/>
```

### Example 2: Login Form

```tsx
import { useFormValidation, validationPatterns } from '@/lib/validation';
import { useToast } from '@/components/ToastContainer';
import FormInput from '@/components/FormInput';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { errors, touched, validateAll, setFieldTouched } = useFormValidation();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateAll({
      email: { 
        value: email, 
        rules: { required: true, pattern: validationPatterns.email } 
      },
      password: { 
        value: password, 
        rules: { required: true, minLength: 8 } 
      },
    });

    if (!isValid) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) throw new Error('Login failed');

      toast.success('Login successful!');
    } catch (error) {
      toast.error('Invalid email or password');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => setFieldTouched('email')}
        error={errors.email}
        touched={touched.email}
        required
      />

      <FormInput
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onBlur={() => setFieldTouched('password')}
        error={errors.password}
        touched={touched.password}
        required
      />

      <button type="submit" className="btn-primary">
        Login
      </button>
    </form>
  );
}
```

### Example 3: Custom Validation

```tsx
const handlePasswordValidation = () => {
  const isValid = validate('password', password, {
    required: true,
    minLength: 8,
    custom: [
      {
        validate: (value) => /[A-Z]/.test(value),
        message: 'Must contain uppercase letter',
      },
      {
        validate: (value) => /[a-z]/.test(value),
        message: 'Must contain lowercase letter',
      },
      {
        validate: (value) => /\d/.test(value),
        message: 'Must contain a number',
      },
      {
        validate: (value) => /[!@#$%^&*]/.test(value),
        message: 'Must contain special character',
      },
    ],
  });

  if (!isValid) {
    toast.error('Password does not meet requirements');
  }
};
```

---

## Visual States

### Input States

**Normal (Untouched):**
- Gray border
- White background
- No icons

**Valid (Touched + No Errors):**
- Green border
- Light green background
- Green checkmark icon on right
- "Looks good!" message below

**Invalid (Touched + Has Error):**
- Red border
- Light red background  
- Red warning icon on right
- Error message below with icon

**Disabled:**
- Gray background
- Lower opacity
- Cursor not-allowed

---

## Toast Notification Types

### Success Toast
```tsx
toast.success('Profile updated successfully!');
```
- Green background
- Checkmark icon
- Auto-dismisses after 5 seconds

### Error Toast
```tsx
toast.error('Failed to save changes');
```
- Red background
- X icon
- Auto-dismisses after 5 seconds

### Warning Toast
```tsx
toast.warning('Your session will expire soon');
```
- Yellow background
- Warning triangle icon
- Auto-dismisses after 5 seconds

### Info Toast
```tsx
toast.info('New features available!');
```
- Blue background
- Info icon
- Auto-dismisses after 5 seconds

---

## Styling Reference

### Color Scheme

**Success:**
- Background: `bg-green-50`
- Border: `border-green-200`
- Text: `text-green-800`
- Icon: `text-green-600`

**Error:**
- Background: `bg-red-50`
- Border: `border-red-200`
- Text: `text-red-800`
- Icon: `text-red-600`

**Warning:**
- Background: `bg-yellow-50`
- Border: `border-yellow-200`
- Text: `text-yellow-800`
- Icon: `text-yellow-600`

**Info:**
- Background: `bg-blue-50`
- Border: `border-blue-200`
- Text: `text-blue-800`
- Icon: `text-blue-600`

---

## Best Practices

### 1. Validation Timing
- **On Change:** For real-time feedback (optional)
- **On Blur:** When user leaves the field (recommended)
- **On Submit:** Always validate before submitting

### 2. Error Messages
- Be specific: "Email is required" not "Invalid input"
- Be helpful: "Password must be at least 8 characters" 
- Be friendly: Use conversational tone

### 3. Toast Notifications
- Use **success** for completed actions
- Use **error** for failures
- Use **warning** for important notices
- Use **info** for general information
- Don't spam - one toast per action

### 4. Form UX
- Mark required fields with *
- Show helper text for complex fields
- Display success state after validation passes
- Reset validation when modal closes

---

## Accessibility

### Keyboard Support
- Tab through inputs naturally
- Enter to submit forms
- Escape to close modals

### Screen Readers
- Labels properly associated with inputs
- Error messages announced
- Required fields indicated
- Toast notifications announced

### Visual
- High contrast colors
- Clear visual indicators
- Icon + text for better understanding
- Animations can be disabled (respects `prefers-reduced-motion`)

---

## Testing

### Manual Testing Checklist

**Form Validation:**
- [ ] Enter valid data → Shows success state
- [ ] Enter invalid data → Shows error message
- [ ] Leave field empty (required) → Shows "required" error
- [ ] Enter too short text → Shows min length error
- [ ] Enter invalid pattern → Shows format error
- [ ] Fix error → Error disappears
- [ ] Submit with errors → Shows toast error

**Toast Notifications:**
- [ ] Success action → Green toast appears
- [ ] Error action → Red toast appears
- [ ] Multiple toasts → Stack properly
- [ ] Wait 5 seconds → Toast auto-dismisses
- [ ] Click X → Toast dismisses immediately
- [ ] Multiple toasts → All animate correctly

**2FA Disable Modal:**
- [ ] Open modal → Clean state
- [ ] Enter 1-5 digits → No validation yet
- [ ] Click submit with <6 digits → Error toast
- [ ] Enter invalid code → Shows error from API
- [ ] Enter valid code → Success, modal closes
- [ ] Cancel → Modal closes, state resets

---

## Migration Guide

### Replacing `alert()` with Toast

**Before:**
```tsx
alert('Success!');
```

**After:**
```tsx
const toast = useToast();
toast.success('Success!');
```

### Upgrading Regular Inputs

**Before:**
```tsx
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="..."
/>
```

**After:**
```tsx
<FormInput
  label="Field Name"
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  onBlur={() => setFieldTouched('fieldName')}
  error={errors.fieldName}
  touched={touched.fieldName}
  required
/>
```

---

## File Structure

```
LaunchPad-CodeH/
├── app/
│   ├── layout.tsx                    # Wrapped with ToastProvider
│   ├── globals.css                   # Added fadeIn animation
│   └── dashboard/
│       └── page.tsx                  # Updated with validation
├── components/
│   ├── Toast.tsx                     # NEW - Toast component
│   ├── ToastContainer.tsx            # NEW - Toast provider
│   └── FormInput.tsx                 # NEW - Validated input
└── lib/
    └── validation.ts                 # NEW - Validation hooks
```

---

## Future Enhancements

### Potential Additions:
1. **Form-level validation** - Validate entire form at once
2. **Async validation** - Check username availability
3. **Password strength meter** - Visual indicator
4. **Debounced validation** - Reduce API calls
5. **Multi-step form validation** - Wizard forms
6. **File upload validation** - Size, type checking
7. **Toast queue management** - Limit max toasts
8. **Toast positioning** - Top, bottom, left, right
9. **Dark mode support** - Theme-aware colors
10. **Animation preferences** - Respect user motion settings

---

## Troubleshooting

### Toast not appearing
- Check ToastProvider is wrapping your app in layout.tsx
- Verify `useToast()` is called inside ToastProvider
- Check z-index (should be 9999)

### Validation not working
- Ensure `setFieldTouched()` is called on blur
- Check validation rules are correct
- Verify error messages are passed to FormInput

### Styling issues
- Check Tailwind CSS is properly configured
- Verify globals.css has fadeIn animation
- Check for conflicting CSS classes

---

## Support

For issues or questions:
1. Check this documentation
2. Review component source code
3. Test with browser DevTools
4. Check console for errors

---

**Version:** 1.0.0  
**Last Updated:** February 2, 2026  
**Author:** BreachBuddy Development Team
