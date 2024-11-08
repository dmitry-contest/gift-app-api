import axios from 'axios';
import { createHmac, createHash } from 'node:crypto';
import type { CryptoCurrencyCode } from '../src/purchases/purchase.types';
import { Update } from 'grammy/types';

import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { sign } from '@telegram-apps/init-data-node';

import { initSDK, type sdk } from '../src/sdk/index';
import { AppModule } from '../src/app.module';
import { User } from '../src/user/user.schema';

import { user1 } from './data/user1/user.data';
import { user2 } from './data/user2/user.data';

import { StoreElement } from '../src/store/store-element.schema';
import { ApiErrorMessages } from '../src/api/dictionary/api.errors';
import { StoreService } from '../src/store/store.service';
import { PurchaseErrorMessages } from '../src/purchases/dictionary/purchase.errors';
import { ApiResponseMessages } from '../src/api/dictionary/api.messages';

let messageCounter: number = 0;
let updateIdCounter: number = 0;

const generateMessage = (params: {
    message: string;
    chat_id: number;
}): Update => ({
    update_id: updateIdCounter++,
    message: {
        date: +new Date(),
        chat: {
            last_name: 'Test Lastname',
            id: params.chat_id,
            first_name: 'Test',
            username: 'Test',
            type: 'private',
        },
        message_id: messageCounter,
        from: {
            last_name: 'Test Lastname',
            id: 1111111,
            first_name: 'Test',
            username: 'Test',
            is_bot: false,
        },
        text: params.message,
    },
});

describe('API', () => {
    let app: NestFastifyApplication;
    let client: sdk;
    let secretKey: string;
    let cryptoBotToken: string;
    let port: number;
    let url: string;

    let user: User & { chatId: undefined };
    let storeInitState: StoreElement[];
    let invoice: {
        url: string;
        amount: number;
        currency: CryptoCurrencyCode;
        hash: string;
        cryptobotInvoiceHash: string;
    };

    let giftId: number;
    let purchaseHash: string;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
            providers: [],
        })
            // .setLogger(new Logger())
            .compile();

        app = moduleRef.createNestApplication<NestFastifyApplication>(
            new FastifyAdapter(),
        );
        await app.init();
        await app.getHttpAdapter().getInstance().ready();
        await app.get(StoreService).initStore();

        const configService = app.get(ConfigService);

        port = parseInt(configService.get('PORT') as string);
        secretKey = configService.get('TG_BOT_TOKEN') as string;
        cryptoBotToken = configService.get('CRYPTO_BOT_TOKEN') as string;

        storeInitState = app.get(StoreService).storeInitState;

        await app.listen({ port });
        url = await app.getUrl();
        client = initSDK(url);
    });

    it(`/health [valid]`, async () => {
        const response = await axios.get(`${url}/health`);
        expect(response.status).toBe(200);
    });

    it(`/api/user/me (register user #1)[valid]`, async () => {
        const initData = sign(user1, secretKey, new Date(86400 * 1000));
        const response = await client.api.me({
            headers: { 'x-init-data': initData },
        });

        expect(response.status).toBe(200);
        if (response.status === 200) {
            user = { ...response.body.user, chatId: undefined } as User & {
                chatId: undefined;
            };
        }
    });

    it(`/api/user/me (get user #1)[valid]`, async () => {
        const initData = sign(user1, secretKey, new Date(86400 * 1000));
        const response = await client.api.me({
            headers: { 'x-init-data': initData },
        });

        expect(response.status).toBe(200);
        if (response.status === 200) {
            expect(response.body.user).toEqual(user);
        }
    });

    it(`/api/store [valid]`, async () => {
        const initData = sign(user1, secretKey, new Date(86400 * 1000));
        const response = await client.api.store({
            headers: { 'x-init-data': initData },
        });
        expect(response.status).toBe(200);
        if (response.status === 200) {
            expect(response.body.store).toEqual(
                storeInitState.map((el) => ({
                    ...el,
                    amountSold: 0,
                })),
            );
        }
    });

    it(`/api/gift/buy by user #1 [valid]`, async () => {
        const initData = sign(user1, secretKey, new Date(86400 * 1000));
        giftId = storeInitState[0]?.id;
        expect(giftId).toBeDefined();

        const response = await client.api.giftBuy({
            headers: { 'x-init-data': initData },
            body: {
                gift: {
                    id: giftId,
                },
            },
        });

        expect(response.status).toBe(200);
        if (response.status === 200) {
            expect(response.body.invoice).toBeDefined();
            invoice = response.body.invoice;
        }
    });

    it(`/api/invoice/webhook [valid]`, async () => {
        const body = {
            update_id: 1,
            update_type: 'invoice_paid',
            request_date: new Date().toISOString(),
            payload: {
                hash: invoice.cryptobotInvoiceHash,
                some: 'some',
            },
        };
        const secret = createHash('sha256').update(cryptoBotToken).digest();
        const checkString = JSON.stringify(body);
        const hmac = createHmac('sha256', secret).update(checkString).digest('hex');
        const response = await axios.post(`${url}/api/invoice/webhook`, body, {
            headers: {
                'crypto-pay-api-signature': hmac,
            },
        });

        expect(response.status).toBe(200);
        expect(response.data.success).toBe('ok');
    });

    it(`/api/user/me user #1 (after invoice paid)[valid]`, async () => {
        const initData = sign(user1, secretKey, new Date(86400 * 1000));
        const response = await client.api.me({
            headers: { 'x-init-data': initData },
        });

        expect(response.status).toBe(200);
        if (response.status === 200) {
            expect(response.body.user.gifts.paid.length).toBe(1);
            expect(response.body.user.gifts.paid[0].giftId).toBe(giftId);
            purchaseHash = response.body.user.gifts.paid[0].hash;
        }
    });

    it(`/api/store (after invoice paid)[valid]`, async () => {
        const initData = sign(user1, secretKey, new Date(86400 * 1000));
        const response = await client.api.store({
            headers: { 'x-init-data': initData },
        });
        expect(response.status).toBe(200);
        if (response.status === 200) {
            const element = response.body.store.find((el) => el.id === giftId);
            expect(element?.amountSold).toBe(1);
        }
    });

    // it(`/api/user/giftSend by user #1 [valid]`, async () => {
    //  const initData = sign(user1, secretKey, new Date(86400 * 1000));
    //   const response = await client.api.giftSend({
    //     headers: { 'x-init-data': initData },
    //     body: {
    //       gift: {
    //         id: giftId,
    //         purchaseHash,
    //       },
    //     },
    //   });

    //   expect(response.status).toBe(200);
    //   if (response.status === 200) {
    //     expect(response.body.movedGift).toBeDefined();
    //     movedGiftHash = response.body.movedGift.hash;
    //   }
    // });

    // it(`/api/user/giftReceived by sender #1 [invalid]`, async () => {
    //  const initData = sign(user1, secretKey, new Date(86400 * 1000));
    //   const response = await client.api.giftReceived({
    //     headers: { 'x-init-data': initData },
    //     body: {
    //       purchaseHash,
    //     },
    //   });

    //   expect(response.status).toBe(400);
    //   if (response.status === 400) {
    //     expect(response.body.message).toBe(ApiErrorMessages.giftReceivedBySender);
    //   }
    // });

    it(`/api/user/giftReceived by new user #2 [valid]`, async () => {
        const initData = sign(user2, secretKey, new Date(86400 * 1000));
        const response = await client.api.giftReceived({
            headers: { 'x-init-data': initData },
            body: {
                purchaseHash,
            },
        });

        expect(response.status).toBe(200);
        if (response.status === 200) {
            expect(response.body.hash).toBe(purchaseHash);
            expect(response.body.fromTgUser.id).toEqual(user1.user.id);
        }
    });

    it(`/api/user/giftReceived by user #2 again [invalid]`, async () => {
        const initData = sign(user2, secretKey, new Date(86400 * 1000));
        const response = await client.api.giftReceived({
            headers: { 'x-init-data': initData },
            body: {
                purchaseHash,
            },
        });

        expect(response.status).toBe(404);
        if (response.status === 404) {
            expect(response.body.message).toBe(
                PurchaseErrorMessages.PurchaseNotFound,
            );
        }
    });

    it(`/api/user/me (get user #1)[valid]`, async () => {
        const initData = sign(user1, secretKey, new Date(86400 * 1000));
        const response = await client.api.me({
            headers: { 'x-init-data': initData },
        });

        expect(response.status).toBe(200);
        if (response.status === 200) {
            expect(response.body.user.gifts.paid.length).toBe(0);
            expect(response.body.user.gifts.sent.length).toBe(1);
            expect(response.body.user.gifts.sent[0].giftId).toBe(giftId);
            expect(response.body.user.gifts.sent[0].tgUser.id).toBe(user2.user.id);
        }
    });

    it(`/api/user/me (get user #2)[valid]`, async () => {
        const initData = sign(user2, secretKey, new Date(86400 * 1000));
        const response = await client.api.me({
            headers: { 'x-init-data': initData },
        });

        expect(response.status).toBe(200);
        if (response.status === 200) {
            expect(response.body.user.gifts.received.length).toBe(1);
            expect(response.body.user.gifts.received[0].giftId).toBe(giftId);
            expect(response.body.user.gifts.received[0].tgUser.id).toBe(
                user1.user.id,
            );
        }
    });

    it(`/api/gift [valid]`, async () => {
        const initData = sign(user1, secretKey, new Date(86400 * 1000));
        const response = await client.api.giftInfo({
            query: { hash: purchaseHash },
            headers: { 'x-init-data': initData },
        });

        expect(response.status).toBe(200);
        if (response.status === 200) {
            expect(response.body.paid.tgUser?.id).toBe(user1.user.id);
            expect(response.body.received?.tgUser?.id).toBe(user2.user.id);
            expect(response.body.giftId).toBe(giftId);
        }
    });

    it(`/api/leaderboard [valid]`, async () => {
        const initData = sign(user1, secretKey, new Date(86400 * 1000));
        const response = await client.api.leaderboard({
            headers: { 'x-init-data': initData },
        });

        expect(response.status).toBe(200);
        if (response.status === 200) {
            expect(response.body.leaderboard.length).toBe(1);
            expect(response.body.leaderboard[0].tgUser.id).toBe(user2.user.id);
            expect(response.body.leaderboard[0].amount).toBe(1);
        }
    });

    it(`/api/user/notme user #1 about user #2 [valid]`, async () => {
        const initData = sign(user1, secretKey, new Date(86400 * 1000));
        const response = await client.api.notMe({
            query: { tgUserId: user2.user.id.toString() },
            headers: { 'x-init-data': initData },
        });

        expect(response.status).toBe(200);
        if (response.status === 200) {
            expect(response.body.user.gifts.paid.length).toBe(0);
            expect(response.body.user.gifts.sent.length).toBe(0);
            expect(response.body.user.gifts.received.length).toBe(1);
            expect(response.body.user.gifts.received[0].giftId).toBe(giftId);
            expect(response.body.user.gifts.received[0].tgUser.id).toBe(
                user1.user.id,
            );
        }
    });

    it(`/api/store/gift [valid]`, async () => {
        const initData = sign(user1, secretKey, new Date(86400 * 1000));
        const response = await client.api.storeGiftInfo({
            query: { id: giftId.toString() },
            headers: { 'x-init-data': initData },
        });

        expect(response.status).toBe(200);
        if (response.status === 200) {
            expect(response.body.length).toBe(1);
            expect(response.body[0].hash).toBe(purchaseHash);
            expect(response.body[0].paid.tgUser?.id).toBe(user1.user.id);
            expect(response.body[0].received?.tgUser?.id).toBe(user2.user.id);
        }
    });

    // ------------ FAIL CALLS ------------

    it(`/api/user/me [invalid init data]`, async () => {
        const response = await client.api.me({
            headers: { 'x-init-data': 'invalid' },
        });
        expect(response.status).toBe(400);
    });

    it(`/api/gift/buy [invalid gift name]`, async () => {
        const initData = sign(user1, secretKey, new Date(86400 * 1000));
        const response = await client.api.giftBuy({
            headers: { 'x-init-data': initData },
            body: {
                gift: {
                    id: 123,
                },
            },
        });
        expect(response.status).toBe(404);
        if (response.status === 404) {
            expect(response.body.message).toBe(ApiErrorMessages.giftNotFound);
        }
    });

    it(`/api/gift/buy [sold out]`, async () => {
        const initData = sign(user1, secretKey, new Date(86400 * 1000));
        const giftId = storeInitState.find((i) => i.name === 'sold-out')?.id;
        expect(giftId).toBeDefined();

        const response = await client.api.giftBuy({
            headers: { 'x-init-data': initData },
            body: {
                gift: {
                    id: giftId as number,
                },
            },
        });

        expect(response.status).toBe(404);
        if (response.status === 404) {
            expect(response.body.message).toBe(ApiErrorMessages.soldOut);
        }
    });

    afterAll(async () => {
        await app.close();
    });
});
