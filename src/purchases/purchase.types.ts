import type { TgUser } from '../user/user.schema';
import type { Purchase } from './purchase.schema';
export type CryptoCurrencyCode =
    | 'USDT'
    | 'TON'
    | 'BTC'
    | 'ETH'
    | 'LTC'
    | 'BNB'
    | 'TRX'
    | 'USDC'
    | 'JET';

export type PurchaseWithTgUser = Purchase & { tgUser: { tg: TgUser } };

export type PurchaseCreateResult = {
    url: string;
    amount: number;
    currency: CryptoCurrencyCode;
    hash: string;
    cryptobotInvoiceHash: string;
};
