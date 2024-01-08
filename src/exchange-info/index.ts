import { symbols } from './symbols';
const partSize = 31;
export function getExchangeInfo() {
  const part = Number(process.env.PART);

  if (part) {
    return symbols.slice((part - 1) * partSize, part * partSize);
  }
  return symbols;

  }
}
