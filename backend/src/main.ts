import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

console.log('--- [DEBUG] MAIN.TS FILE LOADED ---');

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log critical error but don't exit immediately to allow logs to flush
});

async function bootstrap() {
  try {
    console.log('--- [DEBUG] INICIANDO BOOTSTRAP DEL BACKEND ---');

    // Debug Environment Variables (Keys only for security)
    const envKeys = Object.keys(process.env).sort();
    console.log('--- [DEBUG] AVAILABLE ENV VARS:', envKeys.join(', '));
    console.log('--- [DEBUG] PORT ENV RAW:', process.env.PORT);

    // Force PORT logic
    let port = 8080;
    if (process.env.PORT) {
      const parsedPort = parseInt(process.env.PORT, 10);
      if (!isNaN(parsedPort)) {
        port = parsedPort;
      }
    }
    console.log(`--- [DEBUG] USING PORT: ${port}`);

    console.log(
      '--- [DEBUG] REDIS_HOST ENV:',
      process.env.REDIS_HOST ? 'Set' : 'Not Set',
    );
    console.log(
      '--- [DEBUG] DB_HOST ENV:',
      process.env.DB_HOST ? 'Set' : 'Not Set',
    );

    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api');

    // Log para verificar rutas registradas de forma segura
    try {
      const server = app.getHttpServer();

      const router = server._events?.request?._router;
      if (router) {
        const availableRoutes = (router.stack as any[])

          .filter((r: any) => r.route)
          .map((r: any) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const methods = Object.keys(r.route.methods)
              .join(',')
              .toUpperCase();

            const path = r.route.path as string;
            return `${methods} ${path}`;
          });
        console.log('Rutas registradas:', availableRoutes);
      } else {
        console.log('No se pudo acceder al router para listar rutas');
      }
    } catch (error) {
      console.error('Error al intentar listar las rutas:', error);
    }

    app.enableCors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
      allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
      optionsSuccessStatus: 204,
    });

    console.log(`Intentando iniciar servidor en puerto ${port}...`);
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Backend desplegado con éxito en el puerto ${port}`);
    console.log(`🌍 Aceptando peticiones en 0.0.0.0:${port}`);
  } catch (error) {
    console.error('❌ CRITICAL ERROR DURING BOOTSTRAP:', error);
    process.exit(1);
  }
}
void bootstrap();
