export function normalizeAuthError(message: string, fallback: string) {
  const lower = message.toLowerCase();

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials") ||
    lower.includes("invalid email or password")
  ) {
    return "Email or password is incorrect.";
  }

  if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
    return "This email is not confirmed yet. Use Forgot password once, or ask an admin to confirm the account.";
  }

  if (lower.includes("password") && lower.includes("at least")) {
    return "Password must be at least 8 characters.";
  }

  if (lower.includes("weak password") || lower.includes("password")) {
    return "Choose a stronger password.";
  }

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Try again shortly.";
  }

  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "If this email already has access, sign in or reset your password.";
  }

  if (lower.includes("network") || lower.includes("fetch")) {
    return fallback;
  }

  return fallback;
}

export function validatePasswordPair(password: string, confirmPassword: string) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return "";
}
