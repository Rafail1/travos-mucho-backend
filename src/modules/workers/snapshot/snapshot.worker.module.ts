import { Module } from '@nestjs/common';
import { SnapshotWorkerService } from './snapshot.worker.service';
import { DatabaseModule } from 'src/modules/database/database.module';
import { StateModule } from 'src/state/state.module';

@Module({
  imports: [DatabaseModule, StateModule],
  exports: [SnapshotWorkerService],
  providers: [SnapshotWorkerService],
})
export class SnapshotWorkerModule {}
