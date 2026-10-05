function normalizeSupabaseUrl(value: string): string {
  return value
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  database: { url: process.env.DATABASE_URL },
  redis: { url: process.env.REDIS_URL || 'redis://localhost:6379' },
  jwt: {
    secret: process.env.JWT_SECRET || 'default_jwt_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'default_refresh_secret_change_in_production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  supabase: {
    url: normalizeSupabaseUrl(process.env.SUPABASE_URL || ''),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'sth-files',
  },
  sms: {
    provider: process.env.SMS_PROVIDER || '',
    fast2sms: {
      apiKey: process.env.FAST2SMS_API_KEY || '',
    },
  },
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:3000' },
});
