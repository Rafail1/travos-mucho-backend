import { Injectable, Logger } from '@nestjs/common';
import { OrderBookService } from 'src/modules/orderbook/orderbook.service';
const FULL_SNAPSHOT_INTERVAL = 60000;
@Injectable()
export class SnapshotWorkerService {
  constructor(private orderBookService: OrderBookService) {}

  public async initSnapshotFlow() {
    Logger.debug('start snapshot work');
    await this.orderBookService.setObToAll();
    Logger.debug('snapshot work finished');
    setTimeout(() => {
      this.initSnapshotFlow();
    }, FULL_SNAPSHOT_INTERVAL);
  }
}
