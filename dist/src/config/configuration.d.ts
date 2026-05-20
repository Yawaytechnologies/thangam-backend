declare const _default: () => {
    port: number;
    database: {
        url: string | undefined;
    };
    redis: {
        url: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
        refreshSecret: string;
        refreshExpiresIn: string;
    };
    supabase: {
        url: string;
        serviceRoleKey: string;
        bucket: string;
    };
    cors: {
        origin: string;
    };
};
export default _default;
