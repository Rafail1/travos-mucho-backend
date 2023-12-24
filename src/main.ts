import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  BigInt.prototype['toJSON'] = function () {
    return this.toString();
  };
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    cors: true,
  });
  await app.listen(3000);
  await app
    .get(AppController)
    .subscribeAll()
    .then(() => {
      console.log('subscribed to all');
      setTimeout(() => {
        app.get(AppController).subscribeOb();
      }, 3000);
    })
    .catch((e) => {
      Logger.error(e);
      process.exit(1);
    });
}
bootstrap();
