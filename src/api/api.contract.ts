import { initContract } from '@ts-rest/core';
import { z } from 'zod';

export enum UserLanguage {
    EN = 'en',
    RU = 'ru',
}

const c = initContract();

const currencySchema = z.enum([
    'USDT',
    'TON',
    'BTC',
    'ETH',
    'LTC',
    'BNB',
    'TRX',
    'USDC',
    'JET',
]);

const tgUserSchema = z.object({
    id: z.number(),
    username: z.string().nullable(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    languageCode: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    premium: z.boolean(),
});

const userGiftSchema = z.object({
    giftId: z.number(),
    storeOrderNum: z.number(),
    date: z.date(),
    hash: z.string(),
});

export type UserGift = z.infer<typeof userGiftSchema>;

const userMovedGiftSchema = z.object({
    hash: z.string(),
    date: z.date(),
    giftId: z.number(),
    storeOrderNum: z.number(),
    amount: z.number(),
    currency: currencySchema,
    tgUser: tgUserSchema,
});

export type UserMovedGift = z.infer<typeof userMovedGiftSchema>;

const headerSchema = z.object({
    'x-init-data': z.string(),
});

const meResponseSchema = z.object({
    user: z.object({
        id: z.number(),
        tg: tgUserSchema,
        registeredDate: z.date(),
        language: z.nativeEnum(UserLanguage),
        gifts: z.object({
            paid: z.array(userGiftSchema),
            sent: z.array(userMovedGiftSchema),
            received: z.array(userMovedGiftSchema),
        }),
        leaderboard: z.object({
            position: z.number().nullable(),
        }),
    }),
});

export const apiContract = c.router({
    me: {
        method: 'GET',
        path: '/api/user/me',
        headers: headerSchema,
        responses: {
            200: meResponseSchema,
            400: z.object({
                message: z.string(),
            }),
            404: z.object({
                message: z.string(),
            }),
        },
    },
    notMe: {
        method: 'GET',
        path: '/api/user/notme',
        query: z.object({
            tgUserId: z.string(),
        }),
        headers: headerSchema,
        responses: {
            200: meResponseSchema,
            400: z.object({
                message: z.string(),
            }),
            404: z.object({
                message: z.string(),
            }),
        },
    },
    store: {
        method: 'GET',
        path: '/api/store',
        headers: headerSchema,
        responses: {
            200: z.object({
                store: z.array(
                    z.object({
                        id: z.number(),
                        name: z.string(),
                        price: z.number(),
                        currency: z.string(),
                        amount: z.number(),
                        amountSold: z.number(),
                    }),
                ),
            }),
        },
    },
    storeGiftInfo: {
        method: 'GET',
        headers: headerSchema,
        path: '/api/store/gift',
        query: z.object({
            id: z.string(),
        }),
        responses: {
            200: z.array(
                z.object({
                    hash: z.string(),
                    paid: z.object({
                        date: z.date().nullable(),
                        tgUser: tgUserSchema.nullable(),
                        currency: currencySchema,
                        amount: z.number(),
                        storeOrderNum: z.number().nullable(),
                    }),
                    received: z
                        .object({
                            date: z.date(),
                            tgUser: tgUserSchema,
                        })
                        .nullable(),
                }),
            ),
            404: z.object({
                message: z.string(),
            }),
        },
    },
    giftBuy: {
        method: 'POST',
        path: '/api/gift/buy',
        headers: headerSchema,
        body: z.object({
            gift: z.object({
                id: z.number(),
            }),
        }),
        responses: {
            200: z.object({
                invoice: z.object({
                    url: z.string(),
                    amount: z.number(),
                    currency: currencySchema,
                    hash: z.string(),
                    cryptobotInvoiceHash: z.string(),
                }),
            }),
            404: z.object({
                message: z.string(),
            }),
        },
    },
    giftReceived: {
        method: 'POST',
        path: '/api/gift/received',
        headers: headerSchema,
        body: z.object({
            purchaseHash: z.string(),
        }),
        responses: {
            200: z.object({
                hash: z.string(),
                fromTgUser: tgUserSchema,
                giftId: z.number(),
            }),
            400: z.object({
                message: z.string(),
            }),
            404: z.object({
                message: z.string(),
            }),
        },
    },
    giftInfo: {
        method: 'GET',
        path: '/api/gift',
        headers: headerSchema,
        query: z.object({
            hash: z.string(),
        }),
        responses: {
            200: z.object({
                giftId: z.number(),
                paid: z.object({
                    date: z.date().nullable(),
                    tgUser: tgUserSchema.nullable(),
                    currency: currencySchema,
                    amount: z.number(),
                    storeOrderNum: z.number().nullable(),
                }),
                received: z
                    .object({
                        date: z.date(),
                        tgUser: tgUserSchema,
                    })
                    .nullable(),
            }),
            404: z.object({
                message: z.string(),
            }),
        },
    },
    leaderboard: {
        method: 'GET',
        path: '/api/leaderboard',
        headers: headerSchema,
        responses: {
            200: z.object({
                leaderboard: z.array(
                    z.object({
                        tgUser: tgUserSchema,
                        amount: z.number(),
                    }),
                ),
            }),
        },
    },
    setLanguage: {
        method: 'POST',
        path: '/api/user/set-language',
        headers: headerSchema,
        body: z.object({
            language: z.nativeEnum(UserLanguage),
        }),
        responses: {
            200: z.object({}),
            400: z.object({
                message: z.string(),
            }),
        },
    },
});

export type ApiContract = typeof apiContract;
