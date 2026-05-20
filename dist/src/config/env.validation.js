"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = validateEnv;
function validateEnv(config) {
    const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
    if (config.NODE_ENV === 'production') {
        const missing = required.filter((key) => !config[key]);
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}. ` +
                'Set them before starting the server.');
        }
        const insecure = [
            'default_jwt_secret_change_in_production',
            'default_refresh_secret_change_in_production',
        ];
        if (insecure.includes(config.JWT_SECRET) ||
            insecure.includes(config.JWT_REFRESH_SECRET)) {
            throw new Error('Default JWT secrets must be changed before deploying to production.');
        }
    }
    return config;
}
//# sourceMappingURL=env.validation.js.map