import { symbols } from './symbols';

export function getExchangeInfo() {
  switch (process.env.PART) {
    case 'first': {
      return symbols.slice(0, 86);
    }
    case 'second': {
      return symbols.slice(86, 172);
    }
    case 'third': {
      return symbols.slice(172);
    }
  }
}
