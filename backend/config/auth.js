function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || !secret.trim()) {
    throw new Error(
      "JWT_SECRET is not configured. Set JWT_SECRET in the Render environment variables."
    );
  }

  return secret;
}

module.exports = { getJwtSecret };
