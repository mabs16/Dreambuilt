import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Client } from 'pg';
import * as http from 'http';
import { RequestMethod } from '@nestjs/common';

console.log('--- [DEBUG] MAIN.TS FILE LOADED ---');

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log critical error but don't exit immediately to allow logs to flush
});

async function bootstrap() {
  // Force PORT logic early
  let port = 8080;
  if (process.env.PORT) {
    const parsedPort = parseInt(process.env.PORT, 10);
    if (!isNaN(parsedPort)) {
      port = parsedPort;
    }
  }

  console.log(`--- [DEBUG] PREPARING TO START ON PORT: ${port}`);

  // 1. DIAGNOSTIC STEP: Check DB Connection manually
  // This prevents the app from crashing silently if DB is unreachable
  console.log('--- [DEBUG] TESTEANDO CONEXION DB DIRECTA ---');
  try {
    const dbClient = new Client({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000, // 5s timeout
    });

    await dbClient.connect();
    console.log('--- [DEBUG] CONEXION DB EXITOSA ---');
    await dbClient.end();
  } catch (dbError: any) {
    console.error('--- [CRITICAL] FALLO CONEXION DB ---', dbError);

    // 2. EMERGENCY MODE: Start a simple HTTP server to report the error
    // This keeps Cloud Run happy (port is open) and lets us see the error in browser
    console.log('--- [INFO] INICIANDO SERVIDOR DE EMERGENCIA ---');
    const server = http.createServer((req, res) => {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          {
            status: 'error',
            message:
              'Database connection failed. Backend started in emergency mode.',
            error: dbError.message || dbError,
            details: JSON.stringify(
              dbError,
              Object.getOwnPropertyNames(dbError),
            ),
            env_check: {
              host: process.env.DB_HOST,
              port: process.env.DB_PORT,
              user: process.env.DB_USERNAME ? '***' : 'Unset',
              db: process.env.DB_NAME,
            },
          },
          null,
          2,
        ),
      );
    });

    server.listen(port, '0.0.0.0', () => {
      console.log(`⚠️  EMERGENCY SERVER LISTENING ON PORT ${port}`);
      console.log(
        '⚠️  Application is in maintenance mode due to DB connection failure.',
      );
    });
    return; // Stop normal bootstrap
  }

  try {
    console.log('--- [DEBUG] INICIANDO BOOTSTRAP DEL BACKEND (NORMAL) ---');

    // Debug Environment Variables (Keys only for security)
    const envKeys = Object.keys(process.env).sort();
    console.log('--- [DEBUG] AVAILABLE ENV VARS:', envKeys.join(', '));

    // Port logic already handled above
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

    // Exclude root path from global prefix to allow health checks on /
    app.setGlobalPrefix('api', {
      exclude: [{ path: '/', method: RequestMethod.GET }],
    });

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
