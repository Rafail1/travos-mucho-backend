// import { Injectable, Logger } from '@nestjs/common';
// import { interval } from 'rxjs';
// import { TIME_WINDOW } from 'src/app.service';
// import { DatabaseService } from 'src/modules/database/database.service';
// import { IDepth } from 'src/modules/websocket/websocket.service';
// import { StateService } from 'src/state/state.service';

// @Injectable()
// export class SnapshotWorkerService {
//   constructor(
//     private databaseService: DatabaseService,
//     private stateService: StateService,
//   ) {}

//   public async initSnapshotFlow() {
//     interval(TIME_WINDOW * 4).subscribe(async () => {
//       Logger.debug('start snapshot work');
//       await this.setSnapshot();
//       Logger.debug('snapshot work finished');
//     });
//   }

//   private async setSnapshot() {
//     const TIME_WINDOW_SEC = `${TIME_WINDOW / 1000} sec`;
//     const symbols: Array<{ symbol: string }> = await this.databaseService
//       .$queryRaw`SELECT DISTINCT symbol from feautures."OrderBookSnapshot"`;

//     for (const { symbol } of symbols) {
//       Logger.verbose(`filling orderbook for symbol ${symbol}`);
//       const tickSize = this.stateService.getTickSize(symbol);
//       if (!tickSize) {
//         Logger.warn(`no tickSize for ${symbol}`);
//         continue;
//       }

//       const series: Array<{
//         generated_series_time: Date;
//         snapshot_time_truncated: Date;
//         snapshot_time: Date;
//         previous_snapshot_time: Date;
//         previous_id: string;
//       }> = await this.databaseService.$queryRaw`
//          with max_ts as (
//           SELECT date_trunc('minute', max("E")) as time_to from feautures."DepthUpdates" where s = ${symbol}
//         ),
//         min_ts as (
//           SELECT date_trunc('minute', min("E")) as time_from from feautures."OrderBookSnapshot" where symbol = ${symbol}
//         ),
//         intervals as (
//           select generate_series(time_from, time_to, ${TIME_WINDOW_SEC}::interval) as generated_series_time
//           from feautures."OrderBookSnapshot" 
//           JOIN max_ts ON true
//           JOIN min_ts ON true
// 			    GROUP BY time_to, time_from
//         ), snapshots as (
//             SELECT date_bin(${TIME_WINDOW_SEC}::interval, "E", time_from) AS snapshot_time_truncated, symbol, "E" as snapshot_time, id 
//             FROM feautures."OrderBookSnapshot"
//             JOIN min_ts ON true
//                   WHERE symbol = ${symbol}
//             GROUP BY time_from, "E", symbol, id
//         ), lagged as (
//           SELECT generated_series_time, snapshot_time_truncated, snapshot_time,id,
//           LAG(snapshot_time,1) OVER (
//                   ORDER BY generated_series_time
//               ) previous_snapshot_time,
//           LAG(id,1) OVER (
//                   ORDER BY generated_series_time
//               ) previous_id,
//               ROW_NUMBER() OVER(ORDER BY generated_series_time) as rn
//           FROM intervals
//           LEFT JOIN snapshots ON generated_series_time = snapshot_time_truncated
//         )
//           SELECT generated_series_time, snapshot_time_truncated, snapshot_time, previous_snapshot_time, previous_id from lagged
//           WHERE snapshot_time IS NULL
//         `;
//       let previous_id = null;

//       for (const seria of series) {
//         if (!seria.previous_id && !previous_id) {
//           continue;
//         }

//         const snapshot =
//           await this.databaseService.orderBookSnapshot.findUniqueOrThrow({
//             where: { id: previous_id ? previous_id : seria.previous_id },
//           });
//         const snapshotAsks = snapshot.asks
//           .sort((a, b) => {
//             return Number(a[0]) - Number(b[0]) > 0 ? 1 : -1;
//           })
//           .reduce((acc, item) => {
//             acc[item[0]] = item;
//             return acc;
//           }, {});
//         const snapshotBids = snapshot.bids
//           .sort((a, b) => {
//             return Number(a[0]) - Number(b[0]) > 0 ? -1 : 1;
//           })
//           .reduce((acc, item) => {
//             acc[item[0]] = item;
//             return acc;
//           }, {});

//         const depthUpdates: Array<IDepth> = await this.databaseService
//           .$queryRaw`
//         select * from feautures."DepthUpdates"
//         where s = ${symbol} and "E" >= ${snapshot.E.toISOString()}::timestamp AND "E" <= ${seria.generated_series_time.toISOString()}::timestamp
//         ORDER by "E" ASC`;
//         if (!depthUpdates.length) {
//           Logger.warn(`no depthUpdates for symbol ${symbol}`);
//           continue;
//         }

//         const middleAsk = Number(snapshot.asks[snapshot.asks.length - 1]?.[0]);
//         const middleBid = Number(snapshot.bids[0]?.[0]); //Cannot read properties of undefined (reading '0')
//         if (!middleBid || !middleAsk) {
//           continue;
//         }
//         const max = middleAsk + tickSize * snapshot.asks.length;
//         const min = middleBid - tickSize * snapshot.bids.length;

//         for (const depthUpdate of depthUpdates) {
//           for (const ask of depthUpdate.a) {
//             if (Number(ask[0]) < min || Number(ask[0]) > max) {
//               continue;
//             }
//             if (Number(ask[1]) === 0) {
//               delete snapshotAsks[ask[0]];
//             } else if (snapshotAsks[ask[0]]) {
//               snapshotAsks[ask[0]][1] = ask[1];
//             } else {
//               snapshotAsks[ask[0]] = ask;
//             }

//             if (Number(ask[1]) !== 0 && snapshotBids[ask[0]]) {
//               // TODO(Rafa): test it
//               const index = snapshot.bids.findIndex(
//                 (item) => item[0] === ask[0],
//               );
//               if (index >= 0) {
//                 const bids = snapshot.bids.splice(0, index + 1);
//                 for (const item of bids) {
//                   delete snapshotBids[item[0]];
//                 }
//               }
//             }
//           }

//           for (const bid of depthUpdate.b) {
//             if (Number(bid[0]) < min || Number(bid[0]) > max) {
//               continue;
//             }

//             if (Number(bid[1]) === 0) {
//               delete snapshotBids[bid[0]];
//             } else if (snapshotBids[bid[0]]) {
//               snapshotBids[bid[0]][1] = bid[1];
//             } else {
//               snapshotBids[bid[0]] = bid;
//             }

//             if (Number(bid[1]) !== 0 && snapshotAsks[bid[0]]) {
//               // TODO(Rafa): test it
//               const index = snapshot.asks.findIndex(
//                 (item) => item[0] === bid[0],
//               );
//               if (index >= 0) {
//                 const asks = snapshot.asks.splice(0, index + 1);
//                 for (const item of asks) {
//                   delete snapshotAsks[item[0]];
//                 }
//               }
//             }
//           }
//         }

//         const createdSnapshot =
//           await this.databaseService.orderBookSnapshot.create({
//             data: {
//               symbol,
//               E: seria.generated_series_time,
//               T: seria.generated_series_time,
//               bids: Object.values(snapshotBids).sort((a, b) => {
//                 return Number(a[0]) - Number(b[0]) > 0 ? -1 : 1;
//               }),
//               asks: Object.values(snapshotAsks).sort((a, b) => {
//                 return Number(a[0]) - Number(b[0]) > 0 ? 1 : -1;
//               }),
//               lastUpdateId: depthUpdates[depthUpdates.length - 1].u,
//             },
//           });
//         previous_id = createdSnapshot.id;
//       }
//     }
//   }
// }
