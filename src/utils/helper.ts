import { Symbol } from '@prisma/client';

export function makeSymbol(s: string) {
  return Symbol[`S_${s.toUpperCase()}`];
}
