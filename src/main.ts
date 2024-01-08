import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppService } from './app.service';
import { DatabaseService } from './modules/database/database.service';
import { OrderBookService } from './modules/orderbook/orderbook.service';
import { SnapshotWorkerService } from './modules/workers/snapshot/snapshot.worker.service';

async function bootstrap() {
  process.env.logging = process.argv.includes('logging') ? '1' : undefined;

  BigInt.prototype['toJSON'] = function () {
    return this.toString();
  };
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    cors: true,
  });
  await app.init();
  console.log(`part ${process.env.PART}`);

  setTimeout(async () => {
    if (process.argv.includes('reset')) {
      await app.get(DatabaseService).reset();
    } else if (process.argv.includes('clean')) {
      await app.get(DatabaseService).removeTables();
    } else if (process.argv.includes('migrate')) {
      await app.get(DatabaseService).syncTables();
    } else if (process.argv.includes('start-sub-part')) {
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
    } else if (process.argv.includes('init-snapshot-calculated')) {
      console.log('init-snapshot-calculated');
      await app.get(SnapshotWorkerService).initCaclulatedSnapshot();
    } else if (process.argv.includes('remove-history')) {
      console.log('remove-history');
      await app.get(AppService).removeHistoryInterval();
      console.log('remove-history done');
    } else if (process.argv.includes('start-sub-all')) {
      console.log('start-sub-all');
      process.env.PART = '0';
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
