import { Module } from '@nestjs/common';
import { SnapshotWorkerService } from './snapshot.worker.service';
import { DatabaseModule } from 'src/modules/database/database.module';

@Module({
  imports: [DatabaseModule],
  exports: [SnapshotWorkerService],
  providers: [SnapshotWorkerService],
})
export class SnapshotWorkerModule {}
