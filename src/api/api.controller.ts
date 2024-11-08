import * as fsPromises from 'node:fs/promises';

import { ConfigService } from '@nestjs/config';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import {
    BadRequestException,
    Controller,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { apiContract, UserGift, UserMovedGift } from './api.contract';
import { ApiEvents } from './api.events';
import { ApiErrorMessages } from './dictionary/api.errors';
import { ApiResponseMessages } from './dictionary/api.messages';

import { parseInitData } from '../libs/tg';
import { StoreService } from '../store/store.service';
import { TgUser } from '../user/user.schema';
import { StoreElement } from '../store/store-element.schema';
import { UserService } from '../user/user.service';
import { PurchaseService } from '../purchases/purchase.service';
import { PurchaseErrorMessages } from '../purchases/dictionary/purchase.errors';
import { TranslationsService } from '../translations/translations.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { BotService } from '../bot/bot.service';

const getReceivedGifts = async (
    tgUserId: number,
    purchaseService: PurchaseService,
): Promise<UserMovedGift[]> => {
    return (await purchaseService.getReceivedGiftsByTgUserId(tgUserId)).map(
        (i) => ({
            hash: i.hash,
            date: i.dateReceived as Date,
            giftId: i.giftId,
            storeOrderNum: i.storeOrderNum as number,
            amount: i.amount,
            currency: i.currency,
            tgUser: i.tgUser[0].tg as TgUser,
        }),
    );
};

const getGifts = async (
    tgUserId: number,
    purchaseService: PurchaseService,
): Promise<{
    paid: UserGift[];
    sent: UserMovedGift[];
    received: UserMovedGift[];
}> => {
    const paidGiftsRaw = await purchaseService.getPaidGiftsByTgUserId(tgUserId);

    const paidGifts = paidGiftsRaw.map((i) => ({
        date: i.datePaid as Date,
        giftId: i.giftId,
        storeOrderNum: i.storeOrderNum as number,
        hash: i.hash,
    }));

    const sentGifts = (
        await purchaseService.getSentGiftsByTgUserId(tgUserId)
    ).map((i) => ({
        hash: i.hash,
        date: i.dateReceived as Date,
        giftId: i.giftId,
        storeOrderNum: i.storeOrderNum as number,
        amount: i.amount,
        currency: i.currency,
        tgUser: i.tgUser[0].tg as TgUser,
    }));

    const receivedGifts = await getReceivedGifts(tgUserId, purchaseService);

    return { paid: paidGifts, sent: sentGifts, received: receivedGifts };
};

@Controller()
export class ApiController {
    private readonly logger = new Logger();

    private readonly photoPlaceholderUrl: string;

    private miniAppUrl: string;

    constructor(
        private readonly storeService: StoreService,
        private readonly purchaseService: PurchaseService,
        private readonly userService: UserService,
        private readonly eventEmitter: EventEmitter2,
        private readonly configService: ConfigService,
        private readonly leaderboardService: LeaderboardService,
        private readonly botService: BotService,
    ) {
        this.miniAppUrl = configService.get('TG_MINI_APP_URL') as string;

        this.photoPlaceholderUrl = this.configService.get<string>(
            'PHOTO_PLACEHOLDER_URL',
        ) as string;
    }

    @TsRestHandler(apiContract.me)
    async me() {
        return tsRestHandler(apiContract.me, async (req) => {
            const initData = req.headers['x-init-data'];
            const tgData = parseInitData(initData);
            const tgUserId = tgData.user?.id;

            if (tgUserId == null) {
                throw new BadRequestException(ApiErrorMessages.dataInitUserIdRequired);
            }

            const user = await this.userService.getOrCreate({
                tgUser: {
                    id: tgUserId,
                    username: tgData.user.username ?? null,
                    firstName: tgData.user.first_name ?? null,
                    lastName: tgData.user.last_name ?? null,
                    languageCode: tgData.user.language_code ?? null,
                    avatarUrl: '',
                    premium: tgData.user.is_premium ?? false,
                },
                chatId: tgUserId, //tgData.chat_instance,
            });

            if (user.tg.avatarUrl === '') {
                try {
                    const url = await this.botService.getUserProfilePhoto(tgUserId);
                    if (url != null) {
                        await this.userService.setPhotoUrl(tgUserId, url);
                        user.tg.avatarUrl = url;
                    }
                } catch (error) {
                    this.logger.error(
                        `Error getting user photo in /me: ${error.message}`,
                    );
                }
            }

            const { paid, sent, received } = await getGifts(
                tgUserId,
                this.purchaseService,
            );

            const leaderboardPosition =
                await this.userService.getLeaderboardPosition(tgUserId);

            return {
                status: 200,
                body: {
                    user: {
                        id: user.id,
                        tg: user.tg,
                        registeredDate: user.registeredDate,
                        language: user.language,
                        gifts: {
                            paid,
                            sent,
                            received,
                        },
                        leaderboard: {
                            position: leaderboardPosition,
                        },
                    },
                },
            };
        });
    }

    @TsRestHandler(apiContract.notMe)
    async notMe() {
        return tsRestHandler(apiContract.notMe, async (req) => {
            const tgUserId = parseInt(req.query.tgUserId);

            if (tgUserId == null || isNaN(tgUserId)) {
                throw new BadRequestException(ApiErrorMessages.dataInitUserIdRequired);
            }

            const user = await this.userService.findByTgUserId(tgUserId);

            if (user == null) {
                throw new NotFoundException(ApiErrorMessages.userNotFound);
            }

            const received = await getReceivedGifts(tgUserId, this.purchaseService);
            const leaderboardPosition =
                await this.userService.getLeaderboardPosition(tgUserId);

            return {
                status: 200,
                body: {
                    user: {
                        id: user.id,
                        tg: user.tg,
                        registeredDate: user.registeredDate,
                        language: user.language,
                        gifts: {
                            paid: [],
                            sent: [],
                            received,
                        },
                        leaderboard: {
                            position: leaderboardPosition,
                        },
                    },
                },
            };
        });
    }

    @TsRestHandler(apiContract.leaderboard)
    async leaderboard() {
        return tsRestHandler(apiContract.leaderboard, async () => {
            const leaderboard = (await this.leaderboardService.getLeaderboard()).map(
                (i) => ({
                    amount: i.amount,
                    tgUser: i.tgUser[0]?.tg,
                }),
            );
            return {
                status: 200,
                body: { leaderboard },
            };
        });
    }

    @TsRestHandler(apiContract.setLanguage)
    async setLanguage() {
        return tsRestHandler(apiContract.setLanguage, async (req) => {
            const initData = req.headers['x-init-data'];
            const tgData = parseInitData(initData);
            const tgUserId = tgData.user?.id;

            if (tgUserId == null) {
                throw new BadRequestException(ApiErrorMessages.dataInitUserIdRequired);
            }

            const { language } = req.body;

            await this.userService.setLanguage(tgUserId, language);

            return {
                status: 200,
                body: {},
            };
        });
    }

    @TsRestHandler(apiContract.store)
    async store() {
        return tsRestHandler(apiContract.store, async () => {
            const store = await this.storeService.getStore();

            return {
                status: 200,
                body: {
                    store,
                },
            };
        });
    }

    @TsRestHandler(apiContract.giftBuy)
    async giftBuy() {
        return tsRestHandler(apiContract.giftBuy, async (req) => {
            const { gift } = req.body;

            const initData = req.headers['x-init-data'];
            const tgData = parseInitData(initData);
            const tgUserId = tgData.user?.id;

            if (tgUserId == null) {
                throw new BadRequestException(ApiErrorMessages.dataInitUserIdRequired);
            }
            const user = await this.userService.findByTgUserId(tgUserId);
            if (user == null) {
                throw new NotFoundException({
                    message: ApiErrorMessages.userNotFound,
                });
            }

            const giftInStore: StoreElement | null =
                await this.storeService.findGiftById(gift.id);

            if (giftInStore == null) {
                throw new NotFoundException({
                    message: ApiErrorMessages.giftNotFound,
                });
            }

            if (giftInStore.amount - giftInStore.amountSold === 0) {
                throw new NotFoundException({
                    message: ApiErrorMessages.soldOut,
                });
            }

            const invoice = await this.purchaseService.create({
                giftId: giftInStore.id,
                tgUserId: user.id,
                language: user.language,
            });

            return {
                status: 200,
                body: {
                    invoice,
                },
            };
        });
    }

    @TsRestHandler(apiContract.giftReceived)
    async giftReceived() {
        return tsRestHandler(apiContract.giftReceived, async (req) => {
            const initData = req.headers['x-init-data'];
            const tgData = parseInitData(initData);
            const tgUserId = tgData.user?.id;

            const { purchaseHash } = req.body;

            if (tgUserId == null) {
                throw new BadRequestException(ApiErrorMessages.dataInitUserIdRequired);
            }
            const user = await this.userService.getOrCreate({
                tgUser: {
                    id: tgUserId,
                    username: tgData.user.username ?? null,
                    firstName: tgData.user.first_name ?? null,
                    lastName: tgData.user.last_name ?? null,
                    languageCode: tgData.user.language_code ?? null,
                    avatarUrl: '',
                    premium: tgData.user.is_premium ?? false,
                },
                chatId: tgUserId, // tgData.chat_instance,
            });

            // check sender = receiver
            const purchase =
                await this.purchaseService.getPaidNotReceivedByHash(purchaseHash);

            if (purchase == null) {
                throw new NotFoundException({
                    message: PurchaseErrorMessages.PurchaseNotFound,
                });
            }

            // if (purchase.tgUserId === tgUserId) {
            //   throw new BadRequestException(ApiErrorMessages.giftReceivedBySender);
            // }

            if (purchase.dateReceived != null) {
                throw new BadRequestException(ApiErrorMessages.giftAlreadyReceived);
            }

            // update Purchase with dateReceived
            const receivedPurchase = await this.purchaseService.receive(
                purchaseHash,
                tgUserId,
            );

            if (receivedPurchase == null) {
                throw new NotFoundException({
                    message: PurchaseErrorMessages.PurchaseNotFound,
                });
            }

            await this.leaderboardService.updateLeaderboardByTgUserId(tgUserId);

            const fromTgUser = await this.userService.findByTgUserId(
                receivedPurchase.tgUserId,
            );
            if (fromTgUser == null) {
                throw new NotFoundException({
                    message: ApiErrorMessages.userNotFound,
                });
            }

            // emit event to bot
            const nameFrom =
                fromTgUser.tg.firstName ??
                TranslationsService.getTranslation({
                    language: fromTgUser.language,
                    key: 'unknown',
                });

            const message = TranslationsService.getTranslation({
                language: fromTgUser.language,
                key: 'BotMessageGiftRecievedFrom',
                params: {
                    name: nameFrom,
                    giftName: TranslationsService.getTranslation({
                        language: fromTgUser.language,
                        key: 'giftNames',
                        params: {
                            id: receivedPurchase.giftId,
                        },
                    }),
                },
            });

            const link = {
                message: TranslationsService.getTranslation({
                    language: fromTgUser.language,
                    key: 'viewGift',
                }),
                link: `${this.miniAppUrl}?startapp=view_gift_${purchaseHash}`,
            };
            this.logger.log(
                `Emit ApiEvents.GIFT_RECEIVED: ${fromTgUser.chatId}, ${message}, ${JSON.stringify(link)}`,
            );
            this.eventEmitter.emit(ApiEvents.GIFT_RECEIVED, {
                chatId: user.chatId,
                message,
                link,
            });

            // emit event to bot
            const nameTo =
                user.tg.firstName ??
                TranslationsService.getTranslation({
                    language: user.language,
                    key: 'unknown',
                });

            this.logger.log(
                `Emit ApiEvents.GIFT_SENT: ${fromTgUser.chatId}, ${message}, ${JSON.stringify(link)}`,
            );
            this.eventEmitter.emit(ApiEvents.GIFT_SENT, {
                chatId: fromTgUser?.chatId,
                message: TranslationsService.getTranslation({
                    language: user.language,
                    key: 'BotMessageGiftSentTo',
                    params: {
                        name: nameTo,
                        giftName: TranslationsService.getTranslation({
                            language: user.language,
                            key: 'giftNames',
                            params: {
                                id: receivedPurchase.giftId,
                            },
                        }),
                    },
                }),
                link: {
                    message: TranslationsService.getTranslation({
                        language: user.language,
                        key: 'openApp',
                    }),
                    link: this.miniAppUrl,
                },
            });

            return {
                status: 200,
                body: {
                    hash: receivedPurchase.hash,
                    fromTgUser: fromTgUser.tg,
                    giftId: receivedPurchase.giftId,
                },
            };
        });
    }

    @TsRestHandler(apiContract.giftInfo)
    async giftInfo() {
        return tsRestHandler(apiContract.giftInfo, async (req) => {
            const { hash } = req.query;

            const purchases = await this.purchaseService.getInfoByHash(hash);

            if (purchases.length === 0) {
                throw new NotFoundException({
                    message: PurchaseErrorMessages.PurchaseNotFound,
                });
            }
            const purchase = purchases[0];

            return {
                status: 200,
                body: {
                    giftId: purchase.giftId,
                    paid: {
                        date: purchase.datePaid ?? null,
                        tgUser: purchase.tgUser[0].tg ?? null,
                        currency: purchase.currency,
                        amount: purchase.amount,
                        storeOrderNum: purchase.storeOrderNum ?? null,
                    },
                    received:
                        purchase.dateReceived != null &&
                        purchase.sendToTgUser?.[0]?.tg != null
                            ? {
                                date: purchase.dateReceived,
                                tgUser: purchase.sendToTgUser[0].tg,
                            }
                            : null,
                },
            };
        });
    }

    @TsRestHandler(apiContract.storeGiftInfo)
    async storeGiftInfo() {
        return tsRestHandler(apiContract.storeGiftInfo, async (req) => {
            const { id } = req.query;

            const purchases = await this.purchaseService.getInfoByGiftId(
                parseInt(id),
            );

            return {
                status: 200,
                body: purchases.map((i) => ({
                    hash: i.hash,
                    paid: {
                        date: i.datePaid ?? null,
                        tgUser: i.tgUser[0].tg ?? null,
                        currency: i.currency,
                        amount: i.amount,
                        storeOrderNum: i.storeOrderNum ?? null,
                    },
                    received:
                        i.dateReceived != null && i.sendToTgUser?.[0]?.tg != null
                            ? {
                                date: i.dateReceived,
                                tgUser: i.sendToTgUser[0].tg,
                            }
                            : null,
                })),
            };
        });
    }
}
