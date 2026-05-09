import { Buffer } from 'buffer';
import * as Crypto from 'expo-crypto';

global.Buffer = Buffer;

if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (tpArray) => Crypto.getRandomValues(tpArray),
  };
}