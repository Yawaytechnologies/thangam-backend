/**
 * Called by ConfigModule at startup — throws if required env vars are missing
 * in production so the process fails fast rather than running with broken config.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];

  if (config.NODE_ENV === 'production') {
    const missing = required.filter((key) => !config[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}. ` +
          'Set them before starting the server.',
      );
    }
    // Reject insecure default secrets in production
    const insecure = [
      'default_jwt_secret_change_in_production',
      'default_refresh_secret_change_in_production',
    ];
    if (
      insecure.includes(config.JWT_SECRET as string) ||
      insecure.includes(config.JWT_REFRESH_SECRET as string)
    ) {
      throw new Error(
        'Default JWT secrets must be changed before deploying to production.',
      );
    }
  }

  return config;
}
