import { Connection } from 'mongoose';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Controller, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectConnection } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

import { invoiceContract } from './invoice.contract';
import { InvoiceService } from './invoice.service';
import { InvoiceError } from './dicrionary/invoice.errors';

import { StoreService } from '../store/store.service';
import { ApiErrorMessages } from '../api/dictionary/api.errors';
import { ApiEvents } from '../api/api.events';
import { PurchaseService } from '../purchases/purchase.service';
import { PurchaseErrorMessages } from '../purchases/dictionary/purchase.errors';
import { Purchase } from '../purchases/purchase.schema';
import { StoreErrorMessages } from '../store/dictionary/store.errors';
import { UserService } from '../user/user.service';
import { TranslationsService } from '../translations/translations.service';
import { UserLanguage } from '../api/api.contract';

@Controller()
export class InvoiceController {
    private logger = new Logger(InvoiceController.name);
    private miniAppUrl: string;
    constructor(
        @InjectConnection() private readonly connection: Connection,
        private readonly invoiceService: InvoiceService,
        private readonly storeService: StoreService,
        private readonly purchaseService: PurchaseService,
        private readonly eventEmitter: EventEmitter2,
        private readonly userService: UserService,
        private readonly configService: ConfigService,
    ) {
        this.miniAppUrl = configService.get('TG_MINI_APP_URL') as string;
    }

    @TsRestHandler(invoiceContract.webhook)
    async webhook() {
        return tsRestHandler(invoiceContract.webhook, async (req) => {
            // if (!this.invoiceService.checkSignature(req)) {
            //   this.logger.error(InvoiceError.InvalidSignature, JSON.stringify(req));
            //   return {
            //     status: 200,
            //     body: {
            //       message: InvoiceError.InvalidSignature,
            //     },
            //   };
            // }

            let purchase: Purchase | null = null;

            const cryptobotInvoiceHash = req.body.payload.hash;

            try {
                purchase =
                    await this.purchaseService.updatePaidDateByCryptoBotHash(
                        cryptobotInvoiceHash,
                    );

                if (purchase == null) {
                    throw new Error(PurchaseErrorMessages.PurchaseNotFound);
                }
            } catch (error) {
                this.logger.error(PurchaseErrorMessages.ErrorUpdatingPurchase, error);
                return {
                    status: 200,
                    body: {
                        message: PurchaseErrorMessages.ErrorUpdatingPurchase,
                    },
                };
            }
            // update store, user bought if there is enough amount in store
            const transactionSession = await this.connection.startSession();
            transactionSession.startTransaction();

            try {
                // update store, if there is enough amount in store

                // find gift in store
                const giftInStore = await this.storeService.findGiftById(
                    purchase.giftId,
                    transactionSession,
                );
                // if gift not found in store, throw error
                if (giftInStore == null) {
                    throw new Error(StoreErrorMessages.giftNotFoundInStore);
                }

                // if gift amountSold === gift amount, throw error
                if (giftInStore.amount - giftInStore.amountSold === 0) {
                    throw new Error(ApiErrorMessages.soldOut);
                }

                const storeOrderNum = giftInStore.amountSold + 1;

                // increase amountSold in store
                await this.storeService.increaseGiftAmountSoldById(
                    purchase.giftId,
                    transactionSession,
                );

                // update storeOrderNum
                await this.purchaseService.updateStoreOrderNumByCryptoBotHash(
                    cryptobotInvoiceHash,
                    storeOrderNum,
                    transactionSession,
                );

                await transactionSession.commitTransaction();

                const user = await this.userService.findByTgUserId(purchase.tgUserId);
                if (user != null) {
                    const language = user.language ?? UserLanguage.EN;
                    const giftName = TranslationsService.getTranslation({
                        language,
                        key: 'giftNames',
                        params: { id: giftInStore.id },
                    });
                    const message = TranslationsService.getTranslation({
                        language,
                        key: 'BotMessageGiftHasBeenBought',
                        params: { name: giftName },
                    });
                    this.eventEmitter.emit(ApiEvents.GIFT_BOUGHT, {
                        chatId: purchase.tgUserId,
                        message,
                        link: {
                            message: TranslationsService.getTranslation({
                                language,
                                key: 'openGifts',
                            }),
                            link: `${this.miniAppUrl}?startapp=gifts`,
                        },
                    });
                }
            } catch (error) {
                this.logger.error(InvoiceError.ErrorHandlingWebhook, error);

                await transactionSession.abortTransaction();

                // TODO: if error.message === ApiErrorMessages.soldOut, refund
            } finally {
                await transactionSession.endSession();
            }

            return {
                status: 200,
                body: {
                    success: 'ok',
                    payload: req.body,
                },
            };
        });
    }
}
