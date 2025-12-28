import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api'); // Añadir prefijo global
  
  // Log para verificar rutas registradas
  const server = app.getHttpServer();
  const router = server._events.request._router;
  if (router) {
    const availableRoutes: [] = router.stack
      .filter((r: any) => r.route)
      .map((r: any) => `${Object.keys(r.route.methods).toUpperCase()} ${r.route.path}`);
    console.log('Rutas registradas:', availableRoutes);
  }

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
    optionsSuccessStatus: 204,
  });
  const port = process.env.PORT || 8080;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend desplegado con éxito en el puerto ${port}`);
  console.log(`🌍 Aceptando peticiones...`);
}
void bootstrap();
