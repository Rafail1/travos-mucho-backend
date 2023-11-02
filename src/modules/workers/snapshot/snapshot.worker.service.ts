import { Injectable } from '@nestjs/common';
import { interval } from 'rxjs';
import { TIME_WINDOW } from 'src/app.service';
import { DatabaseService } from 'src/modules/database/database.service';
import { IDepth } from 'src/modules/websocket/websocket.service';

@Injectable()
export class SnapshotWorkerService {
  constructor(private databaseService: DatabaseService) {}

  private async initSnapshotFlow() {
    const symbol = 'BTCUSDT';
    const fromTime = '2023-11-02';
    const TIME_WINDOW_SEC = `${TIME_WINDOW} sec`;
    const series: Array<{
      series: string;
      snapshot_time_truncated: string;
      snapshot_time: string;
      previous_snapshot_time: string;
      previous_id: string;
    }> = await this.databaseService.$queryRaw` 
        with intervals as (
            select generate_series(date_trunc('minute', min("E")), NOW(), ${TIME_WINDOW_SEC}) as series from feautures."OrderBookSnapshot"
        ), snapshots as (
            SELECT date_bin(${TIME_WINDOW_SEC}, "E", ${fromTime}) AS snapshot_time_truncated, symbol, "E" as snapshot_time, id FROM feautures."OrderBookSnapshot"
            WHERE symbol = ${symbol}
        ), lagged as (
        SELECT series, snapshot_time_truncated, snapshot_time,id,
        LAG(snapshot_time,1) OVER (
                ORDER BY series
            ) previous_snapshot_time,
        LAG(id,1) OVER (
                ORDER BY series
            ) previous_id,
            ROW_NUMBER() OVER(ORDER BY series) as rn
        FROM intervals
        LEFT JOIN snapshots ON series = snapshot_time_truncated
        )
        SELECT series, snapshot_time_truncated, snapshot_time, previous_snapshot_time, previous_id from lagged

        WHERE snapshot_time IS NULL
        `;

    for (const seria of series) {
      const snapshot =
        await this.databaseService.orderBookSnapshot.findUniqueOrThrow({
          where: { id: seria.previous_id },
        });
      const depthUpdates: Array<IDepth> = await this.databaseService.$queryRaw`
        select * from feautures."DepthUpdates"
        where s = 'BTCUSDT' and "E" >= ${seria.previous_snapshot_time} AND "E" <= ${seria.series}
        ORDER by "E" ASC`;
    }
    // interval(TIME_WINDOW).subscribe(async () => {
    //   const snapshots = this.databaseService.orderBookSnapshot.findMany();
    // });
  }
}
