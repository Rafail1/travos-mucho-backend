import { Injectable, Logger } from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { TIME_WINDOW } from 'src/app.service';
import { getExchangeInfo } from 'src/exchange-info';
import { DatabaseService } from 'src/modules/database/database.service';
import { OrderBookService } from 'src/modules/orderbook/orderbook.service';
import { IDepth, ISnapsoht } from 'src/modules/websocket/websocket.service';
import { StateService } from 'src/state/state.service';
const FULL_SNAPSHOT_INTERVAL = 2000;
const CALCULATED_SNAPSHOT_INTERVAL = 60000;
@Injectable()
export class SnapshotWorkerService {
  constructor(
    private orderBookService: OrderBookService,
    private stateService: StateService,
    private databaseService: DatabaseService,
  ) {}

  public async initSnapshotFlow() {
    Logger.debug('start snapshot work');
    this.orderBookService.setObToAll().then(() => {
      setTimeout(async () => {
        this.initSnapshotFlow();
      }, FULL_SNAPSHOT_INTERVAL);
    });
    Logger.debug('snapshot work finished');
  }

  public async initCaclulatedSnapshot() {
    // Logger.debug('start initCaclulatedSnapshot work');
    // try {
    //   await this.setSnapshot();
    // } catch (e) {
    //   Logger.error(`initCaclulatedSnapshot ${e?.message}`);
    // }
    // Logger.debug('initCaclulatedSnapshot work finished');
    // setTimeout(async () => {
    //   await this.initCaclulatedSnapshot().catch((e) => {
    //     Logger.error(e?.message);
    //   });
    // }, CALCULATED_SNAPSHOT_INTERVAL);
  }

  private async setSnapshot() {
    // const TIME_WINDOW_SEC = `${TIME_WINDOW / 1000} sec`;
    // const symbols = getExchangeInfo();
    // for (const { symbol } of symbols) {
    //   Logger.debug(`filling orderbook for symbol ${symbol}`);
    //   const tickSize = this.stateService.getTickSize(symbol);
    //   if (!tickSize) {
    //     Logger.warn(`no tickSize for ${symbol}`);
    //     continue;
    //   }
    //   const series: Array<{
    //     generated_series_time: Date;
    //     snapshot_time_truncated: Date;
    //     snapshot_time: Date;
    //     previous_snapshot_time: Date;
    //     previous_id: string;
    //   }> = await this.databaseService.query(
    //     `
    //      with max_ts as (
    //       SELECT date_trunc('minute', max("E")) as time_to from public."DepthUpdates_${symbol}"
    //     ),
    //     min_ts as (
    //       SELECT date_trunc('minute', min("E")) as time_from from public."OrderBookSnapshot_${symbol}"
    //     ),
    //     intervals as (
    //       select generate_series(time_from, time_to, '${TIME_WINDOW_SEC}'::interval) as generated_series_time
    //       from public."OrderBookSnapshot_${symbol}"
    //       JOIN max_ts ON true
    //       JOIN min_ts ON true
    // 	    GROUP BY time_to, time_from
    //     ), snapshots as (
    //         SELECT date_bin('${TIME_WINDOW_SEC}'::interval, "E", time_from) AS snapshot_time_truncated, "E" as snapshot_time, "lastUpdateId"
    //         FROM public."OrderBookSnapshot_${symbol}"
    //         JOIN min_ts ON true
    //         GROUP BY time_from, "E", "lastUpdateId"
    //     ), lagged as (
    //       SELECT generated_series_time, snapshot_time_truncated, snapshot_time,"lastUpdateId",
    //       LAG(snapshot_time,1) OVER (
    //               ORDER BY generated_series_time
    //           ) previous_snapshot_time,
    //       LAG("lastUpdateId",1) OVER (
    //               ORDER BY generated_series_time
    //           ) previous_id,
    //           ROW_NUMBER() OVER(ORDER BY generated_series_time) as rn
    //       FROM intervals
    //       LEFT JOIN snapshots ON generated_series_time = snapshot_time_truncated
    //     )
    //       SELECT generated_series_time, snapshot_time_truncated, snapshot_time, previous_snapshot_time, previous_id from lagged
    //       WHERE snapshot_time IS NULL
    //     `,
    //     { type: QueryTypes.SELECT },
    //   );
    //   let previous_id = null;
    //   Logger.debug(`run series for ${symbol} ${series.length}`);
    //   for (const seria of series) {
    //     if (!seria.previous_id && !previous_id) {
    //       continue;
    //     }
    //     const snapshots = await this.databaseService.query<ISnapsoht>(
    //       `select *
    //       from public."OrderBookSnapshot_${symbol}" WHERE "lastUpdateId" = ${
    //         previous_id ? previous_id : seria.previous_id
    //       }`,
    //       { type: QueryTypes.SELECT },
    //     );
    //     if (!snapshots.length) {
    //       throw 'snapshots not found';
    //     }
    //     const snapshot = snapshots[0];
    //     const snapshotAsks = snapshot.asks
    //       .sort((a, b) => {
    //         return Number(a[0]) - Number(b[0]) > 0 ? 1 : -1;
    //       })
    //       .reduce((acc, item) => {
    //         acc[item[0]] = item;
    //         return acc;
    //       }, {});
    //     const snapshotBids = snapshot.bids
    //       .sort((a, b) => {
    //         return Number(a[0]) - Number(b[0]) > 0 ? -1 : 1;
    //       })
    //       .reduce((acc, item) => {
    //         acc[item[0]] = item;
    //         return acc;
    //       }, {});
    //     const depthUpdates: Array<IDepth> = await this.databaseService.query(
    //       `
    //     select * from public."DepthUpdates_${symbol}"
    //     where "E" >= :snapshotTime AND "E" <= :seriaTime
    //     ORDER by "E" ASC`,
    //       {
    //         type: QueryTypes.SELECT,
    //         replacements: {
    //           snapshotTime: snapshot.E,
    //           seriaTime: seria.generated_series_time,
    //         },
    //       },
    //     );
    //     if (!depthUpdates.length) {
    //       Logger.warn(`no depthUpdates for symbol ${symbol}`);
    //       continue;
    //     }
    //     const middleAsk = Number(snapshot.asks[snapshot.asks.length - 1]?.[0]);
    //     const middleBid = Number(snapshot.bids[0]?.[0]); //Cannot read properties of undefined (reading '0')
    //     if (!middleBid || !middleAsk) {
    //       continue;
    //     }
    //     const max = middleAsk + tickSize * snapshot.asks.length;
    //     const min = middleBid - tickSize * snapshot.bids.length;
    //     for (const depthUpdate of depthUpdates) {
    //       for (const ask of depthUpdate.a) {
    //         if (Number(ask[0]) < min || Number(ask[0]) > max) {
    //           continue;
    //         }
    //         if (Number(ask[1]) === 0) {
    //           delete snapshotAsks[ask[0]];
    //         } else if (snapshotAsks[ask[0]]) {
    //           snapshotAsks[ask[0]][1] = ask[1];
    //         } else {
    //           snapshotAsks[ask[0]] = ask;
    //         }
    //         if (Number(ask[1]) !== 0 && snapshotBids[ask[0]]) {
    //           // TODO(Rafa): test it
    //           const index = snapshot.bids.findIndex(
    //             (item) => item[0] === ask[0],
    //           );
    //           if (index >= 0) {
    //             const bids = snapshot.bids.splice(0, index + 1);
    //             for (const item of bids) {
    //               delete snapshotBids[item[0]];
    //             }
    //           }
    //         }
    //       }
    //       for (const bid of depthUpdate.b) {
    //         if (Number(bid[0]) < min || Number(bid[0]) > max) {
    //           continue;
    //         }
    //         if (Number(bid[1]) === 0) {
    //           delete snapshotBids[bid[0]];
    //         } else if (snapshotBids[bid[0]]) {
    //           snapshotBids[bid[0]][1] = bid[1];
    //         } else {
    //           snapshotBids[bid[0]] = bid;
    //         }
    //         if (Number(bid[1]) !== 0 && snapshotAsks[bid[0]]) {
    //           // TODO(Rafa): test it
    //           const index = snapshot.asks.findIndex(
    //             (item) => item[0] === bid[0],
    //           );
    //           if (index >= 0) {
    //             const asks = snapshot.asks.splice(0, index + 1);
    //             for (const item of asks) {
    //               delete snapshotAsks[item[0]];
    //             }
    //           }
    //         }
    //       }
    //     }
    //     await this.databaseService.query(
    //       `INSERT INTO public."OrderBookSnapshot_${symbol}"
    //       ("lastUpdateId", "E", bids, asks)
    //       VALUES (
    //         :lastUpdateId,
    //         :E,
    //         :bids,
    //         :asks
    //       );`,
    //       {
    //         type: QueryTypes.INSERT,
    //         replacements: {
    //           lastUpdateId: depthUpdates[depthUpdates.length - 1].u,
    //           bids: JSON.stringify(
    //             Object.values(snapshotBids).sort((a, b) => {
    //               return Number(a[0]) - Number(b[0]) > 0 ? -1 : 1;
    //             }),
    //           ),
    //           asks: JSON.stringify(
    //             Object.values(snapshotAsks).sort((a, b) => {
    //               return Number(a[0]) - Number(b[0]) > 0 ? 1 : -1;
    //             }),
    //           ),
    //           E: seria.generated_series_time,
    //         },
    //       },
    //     );
    //     previous_id = depthUpdates[depthUpdates.length - 1].u;
    //   }
    //   Logger.debug(`done series for ${symbol}`);
    // }
  }
}
