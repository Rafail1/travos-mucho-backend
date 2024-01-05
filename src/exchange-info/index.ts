import { symbols } from './symbols';

export function getExchangeInfo() {
  switch (process.env.PART) {
    case 'first': {
      return symbols.slice(0, 81);
    }
    case 'second': {
      return symbols.slice(81, 162);
    }
    case 'third': {
      return symbols.slice(162);
    }
    default: {
      return symbols;
    }
  }
}
