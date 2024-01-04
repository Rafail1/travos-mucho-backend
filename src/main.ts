import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { OrderBookService } from './modules/orderbook/orderbook.service';
import { SnapshotWorkerService } from './modules/workers/snapshot/snapshot.worker.service';
import { DatabaseService } from './modules/database/database.service';

async function bootstrap() {
  BigInt.prototype['toJSON'] = function () {
    return this.toString();
  };
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    cors: true,
  });
  setTimeout(async () => {
    if (process.argv.includes('migrate')) {
      await app.get(DatabaseService).onModuleInit();
      await app.get(DatabaseService).syncTables();
    } else if (process.argv.includes('start-sub-first')) {
      process.env.PART = 'first';
      console.log('start-sub-first');
      await app
        .get(AppService)
        .subscribeAll()
        .catch((e) => {
          Logger.error(e);
          process.exit(1);
        });
    } else if (process.argv.includes('start-sub-second')) {
      process.env.PART = 'second';
      console.log('start-sub-second');
      await app
        .get(AppService)
        .subscribeAll()
        .catch((e) => {
          Logger.error(e);
          process.exit(1);
        });
    } else if (process.argv.includes('start-sub-third')) {
      process.env.PART = 'third';
      console.log('start-sub-third');

      await app
        .get(AppService)
        .subscribeAll()
        .catch((e) => {
          Logger.error(e);
          process.exit(1);
        });
    } else if (process.argv.includes('start-sub-ob')) {
      console.log('start-sub-ob');
      await app.get(OrderBookService).init();
      await app.get(SnapshotWorkerService).initSnapshotFlow();
    } else if (process.argv.includes('remove-history')) {
      console.log('remove-history');
      await app.get(AppService).removeHistoryInterval();
      console.log('remove-history done');
    } else if (process.argv.includes('start-sub-all')) {
      console.log('start-sub-all');
      app
        .get(AppService)
        .subscribeAll()
        .catch((e) => {
          Logger.error(e);
          process.exit(1);
        });
    } else {
      console.log('8080');
      await app.listen(8080);
    }
  }, 5000);
  console.log(process.argv);
}
bootstrap();
