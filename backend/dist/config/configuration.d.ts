declare const _default: () => {
    port: number;
    database: {
        host: string | undefined;
        port: number;
        username: string | undefined;
        password: string | undefined;
        database: string | undefined;
    };
    redis: {
        host: string | undefined;
        port: number;
        password: string | undefined;
        tls: {} | undefined;
    };
    whatsapp: {
        accessToken: string | undefined;
        phoneNumberId: string | undefined;
        verifyToken: string | undefined;
    };
    sentry: {
        dsn: string | undefined;
    };
};
export default _default;
