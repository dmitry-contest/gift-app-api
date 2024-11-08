import * as TsRest from '@ts-rest/core';

import { contracts } from '../contracts/index';

import { ApiErrorMessages } from '../api/dictionary/api.errors';
import { PurchaseErrorMessages } from '../purchases/dictionary/purchase.errors';
import { StoreErrorMessages } from '../store/dictionary/store.errors';
import { TranslationsErrors } from '../translations/dictionary/translations.errors';

export const initSDK = (baseUrl: string, opts?: Partial<TsRest.ClientArgs>) =>
    TsRest.initClient(contracts, {
        ...opts,
        throwOnUnknownStatus: true,
        baseUrl,
    });

export type sdk = ReturnType<typeof initSDK>;

export const errors = {
    api: ApiErrorMessages,
    purchases: PurchaseErrorMessages,
    store: StoreErrorMessages,
    translations: TranslationsErrors,
};
