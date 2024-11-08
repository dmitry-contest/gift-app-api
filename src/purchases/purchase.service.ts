import { ClientSession, Model } from 'mongoose';
import axios from 'axios';
import type { PurchaseCreateResult } from './purchase.types';

import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Purchase } from './purchase.schema';
import { StoreService } from '../store/store.service';
import { StoreErrorMessages } from '../store/dictionary/store.errors';
import { PurchaseWithTgUser } from './purchase.types';
import { TgUser } from '../user/user.schema';
import { TranslationsService } from '../translations/translations.service';
import { UserLanguage } from '../api/api.contract';

@Injectable()
export class PurchaseService {
    private readonly logger = new Logger(PurchaseService.name);

    private readonly cryptoBotApiUrl: string;
    private readonly cryptoBotToken: string;

    constructor(
        @InjectModel(Purchase.name) private purchaseModel: Model<Purchase>,
        private storeService: StoreService,
        private configService: ConfigService,
    ) {
        this.cryptoBotApiUrl = `${this.configService.get('CRYPTO_BOT_API_URL') as string}/api/createInvoice`;
        this.cryptoBotToken = this.configService.get('CRYPTO_BOT_TOKEN') as string;
    }

    async create(params: {
        giftId: number;
        tgUserId: number;
        language: UserLanguage;
    }): Promise<PurchaseCreateResult> {
        try {
            const giftInStore = await this.storeService.findGiftById(params.giftId);
            if (giftInStore == null) {
                throw new Error(StoreErrorMessages.giftNotFoundInStore);
            }

            const createdPurchase = await this.purchaseModel.create(
                new Purchase({
                    amount: giftInStore.price,
                    currency: giftInStore.currency,
                    tgUserId: params.tgUserId,
                    giftId: params.giftId,
                }),
            );

            const giftName = TranslationsService.getTranslation({
                language: params.language,
                key: 'giftNames',
                params: {
                    id: params.giftId,
                },
            });
            const description = TranslationsService.getTranslation({
                language: params.language,
                key: 'invoiceDescription',
                params: {
                    giftName,
                },
            });

            const cryptoBotInvoice = await axios.post(
                this.cryptoBotApiUrl,
                {
                    amount: giftInStore.price,
                    currencyType: 'crypto',
                    asset: giftInStore.currency,
                    paidBtnName: 'callback',
                    paid_btn_url: `${process.env.TG_MINI_APP_URL}?startapp=invoicepaid_${createdPurchase.hash}`,
                    description,
                },
                {
                    headers: {
                        'Crypto-Pay-API-Token': this.cryptoBotToken,
                    },
                },
            );
            const invoiceData = cryptoBotInvoice.data.result as {
                invoice_id: number;
                hash: string;
                mini_app_invoice_url: string;
            };

            createdPurchase.cryptobotInvoiceHash = invoiceData.hash;

            await createdPurchase.save();

            return {
                url: invoiceData.mini_app_invoice_url,
                amount: giftInStore.price,
                currency: giftInStore.currency,
                hash: createdPurchase.hash,
                cryptobotInvoiceHash: createdPurchase.cryptobotInvoiceHash,
            };
        } catch (error) {
            this.logger.error(error);
            throw error;
        }
    }

    async updatePaidDateByCryptoBotHash(hash: string): Promise<Purchase | null> {
        return this.purchaseModel.findOneAndUpdate(
            { cryptobotInvoiceHash: hash, datePaid: null },
            { $set: { datePaid: new Date() } },
        );
    }

    async updateStoreOrderNumByCryptoBotHash(
        hash: string,
        storeOrderNum: number,
        session?: ClientSession,
    ): Promise<Purchase | null> {
        return this.purchaseModel.findOneAndUpdate(
            { cryptobotInvoiceHash: hash, datePaid: { $ne: null } },
            { $set: { storeOrderNum } },
            { session },
        );
    }

    async findUnpaidByCryptoBotHash(
        hash: string,
        session?: ClientSession,
    ): Promise<Purchase | null> {
        return this.purchaseModel.findOne(
            { cryptobotInvoiceHash: hash, datePaid: null },
            { session },
        );
    }

    async getPaidGiftsByTgUserId(tgUserId: number): Promise<Purchase[]> {
        return this.purchaseModel.find({
            tgUserId,
            datePaid: { $ne: null },
            dateReceived: null,
        });
    }

    async getPaidNotReceivedByHash(hash: string): Promise<Purchase | null> {
        return this.purchaseModel.findOne({
            hash,
            datePaid: { $ne: null },
            dateReceived: null,
        });
    }

    async getSentGiftsByTgUserId(
        tgUserId: number,
    ): Promise<PurchaseWithTgUser[]> {
        return this.purchaseModel
            .aggregate([
                {
                    $match: {
                        tgUserId,
                        dateReceived: { $ne: null },
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'sendToTgUserId',
                        foreignField: 'id',
                        as: 'tgUser',
                    },
                },
                {
                    $sort: {
                        dateReceived: -1,
                    },
                },
            ])
            .exec();
    }

    async getReceivedGiftsByTgUserId(
        tgUserId: number,
    ): Promise<PurchaseWithTgUser[]> {
        return this.purchaseModel
            .aggregate([
                {
                    $match: {
                        sendToTgUserId: tgUserId,
                        dateReceived: { $ne: null },
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'tgUserId',
                        foreignField: 'id',
                        as: 'tgUser',
                    },
                },
                {
                    $sort: {
                        dateReceived: -1,
                    },
                },
            ])
            .exec();
    }

    async receive(
        hash: string,
        sendToTgUserId: number,
    ): Promise<Purchase | null> {
        return this.purchaseModel.findOneAndUpdate(
            { hash, dateReceived: null },
            { $set: { sendToTgUserId, dateReceived: new Date() } },
        );
    }

    async getInfoByHash(
        hash: string,
    ): Promise<(PurchaseWithTgUser & { sendToTgUser: null | { tg: TgUser } })[]> {
        return this.purchaseModel
            .aggregate([
                {
                    $match: {
                        hash,
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'tgUserId',
                        foreignField: 'id',
                        as: 'tgUser',
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'sendToTgUserId',
                        foreignField: 'id',
                        as: 'sendToTgUser',
                    },
                },
            ])
            .exec();
    }

    async getInfoByGiftId(
        giftId: number,
    ): Promise<(PurchaseWithTgUser & { sendToTgUser: null | { tg: TgUser } })[]> {
        return this.purchaseModel
            .aggregate([
                {
                    $match: {
                        giftId,
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'tgUserId',
                        foreignField: 'id',
                        as: 'tgUser',
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'sendToTgUserId',
                        foreignField: 'id',
                        as: 'sendToTgUser',
                    },
                },
                {
                    $sort: {
                        datePaid: -1,
                    },
                },
            ])
            .exec();
    }
}
