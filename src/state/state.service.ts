import { Injectable } from '@nestjs/common';

@Injectable()
export class StateService {
  private tickSizes = new Map<string, number>();
  public setTickSize(key: string, value: number) {
    this.tickSizes.set(key, value);
  }

  public getTickSize(key: string) {
    return this.tickSizes.get(key);
  }
}
