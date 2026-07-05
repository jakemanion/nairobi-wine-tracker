import { MIN_PASSWORD_LENGTH } from '@/lib/auth/constants'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string): string | null {
  const trimmedEmail = email.trim()

  if (!trimmedEmail) {
    return 'Email is required.'
  }

  if (!EMAIL_PATTERN.test(trimmedEmail)) {
    return 'Enter a valid email address.'
  }

  return null
}

export function validatePasswordUpdate(password: string, confirmPassword: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match.'
  }

  return null
}

export function validateRegistrationForm(
  email: string,
  password: string,
  confirmPassword: string,
): string | null {
  const emailError = validateEmail(email)
  if (emailError) return emailError

  return validatePasswordUpdate(password, confirmPassword)
}
