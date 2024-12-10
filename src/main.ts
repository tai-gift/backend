import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from 'process';

async function bootstrap() {
  const PORT = env.PORT || 3000;
  const app = await NestFactory.create(AppModule);
  console.log('App is running on port: ', PORT);
  await app.listen(PORT);
}
bootstrap();
