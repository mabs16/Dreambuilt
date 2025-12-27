import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
