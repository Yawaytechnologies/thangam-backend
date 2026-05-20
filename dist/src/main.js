"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
    });
    app.use((0, helmet_1.default)());
    app.use((0, cookie_parser_1.default)());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.enableCors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    });
    if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('Sri Thangam Housing API')
            .setDescription('Real estate operations management API')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('api/docs', app, document);
        logger.log('Swagger docs available at /api/docs');
    }
    app.enableShutdownHooks();
    const port = process.env.PORT || 3001;
    await app.listen(port);
    logger.log(`Sri Thangam Housing API running on port ${port} [${process.env.NODE_ENV || 'development'}]`);
}
bootstrap().catch((err) => {
    console.error('Failed to start application:', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map