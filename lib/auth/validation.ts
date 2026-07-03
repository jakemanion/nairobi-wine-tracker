import { MIN_PASSWORD_LENGTH } from '@/lib/auth/constants'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateRegistrationForm(
  email: string,
  password: string,
  confirmPassword: string,
): string | null {
  const trimmedEmail = email.trim()

  if (!trimmedEmail) {
    return 'Email is required.'
  }

  if (!EMAIL_PATTERN.test(trimmedEmail)) {
    return 'Enter a valid email address.'
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  if (password !== confirmPassword) {
    return 'Passwords do not match.'
  }

  return null
}
