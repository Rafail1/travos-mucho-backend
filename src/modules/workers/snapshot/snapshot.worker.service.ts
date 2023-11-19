import { Injectable, Logger } from '@nestjs/common';
import { Symbol, Prisma } from '@prisma/client';
import { interval } from 'rxjs';
import { DatabaseService } from 'src/modules/database/database.service';
import { StateService } from 'src/state/state.service';
const SNAPSHOT_INTERVAL = 1000 * 60 * 30;
@Injectable()
export class SnapshotWorkerService {
  constructor(
    private databaseService: DatabaseService,
    private stateService: StateService,
  ) {}

  public async initSnapshotFlow() {
    interval(SNAPSHOT_INTERVAL).subscribe(async () => {
      Logger.debug('start snapshot work');
      await this.setSnapshot();
      Logger.debug('snapshot work finished');
    });
  }

  private async setSnapshot() {
    for (const symbol of Object.values(Symbol)) {
      try {
        const latestSnapshotTime = await this.databaseService.$queryRaw<
          {
            time: Date;
          }[]
        >`
      SELECT time from depthUpdates WHERE s = ${symbol}
      AND snapshot = true
      order by time 'desc' limit 1
      `;
        if (!latestSnapshotTime.length) {
          Logger.warn(`No snapshot for symbol ${symbol}`);
          continue;
        }

        const depthUpdates = await this.databaseService.$queryRaw<
          Prisma.DepthUpdatesCreateManyInput[]
        >`
        SELECT DISTINCT ON (price) price, s, true as snapshot, time, quantity, m from depthUpdates
        WHERE s = ${symbol}
        AND time <= ${latestSnapshotTime[0].time}
        order by time 'desc'
        `;

        await this.databaseService.depthUpdates.createMany({
          data: depthUpdates,
        });
      } catch (e) {
        Logger.error(e?.message);
      }
    }
  }
}
