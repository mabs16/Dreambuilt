import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('--- [DEBUG] INICIANDO BOOTSTRAP DEL BACKEND ---');
  console.log('--- [DEBUG] PORT ENV:', process.env.PORT);
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Log para verificar rutas registradas de forma segura
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const server = app.getHttpServer();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const router = server._events?.request?._router;
    if (router) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const availableRoutes = (router.stack as any[])
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        .filter((r: any) => r.route)
        .map((r: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          const methods = Object.keys(r.route.methods).join(',').toUpperCase();
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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

  const port = process.env.PORT || 8080;
  console.log(`Intentando iniciar servidor en puerto ${port}...`);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend desplegado con éxito en el puerto ${port}`);
  console.log(`🌍 Aceptando peticiones en 0.0.0.0:${port}`);
}
void bootstrap();
