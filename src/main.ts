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

  if (process.argv.includes('start-sub')) {
    await app
      .get(AppController)
      .subscribeAll()
      .catch((e) => {
        Logger.error(e);
        process.exit(1);
      });
  } else if (process.argv.includes('start-sub-ob')) {
    await app.get(AppController).subscribeOb();
  } else {
    await app.listen(8080);
  }
}
bootstrap();
