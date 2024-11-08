import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { nanoid } from 'nanoid-cjs';
import { CryptoCurrencyCode } from './purchase.types';

export type PurchaseDocument = HydratedDocument<Purchase>;

@Schema()
export class Purchase {
    @Prop({
        type: String,
        required: true,
        unique: true,
        default: () => nanoid(10),
    })
    hash: string;

    @Prop({ type: Number, required: true })
    giftId: number;

    @Prop({ type: Date, required: true, default: () => new Date() })
    dateCreated: Date;

    @Prop({ type: Number, required: true, index: true })
    tgUserId: number;

    @Prop({ type: String, required: false, index: true, default: null })
    cryptobotInvoiceHash: string | null;

    @Prop({ type: Number, required: true })
    amount: number;

    @Prop({ type: String, required: true })
    currency: CryptoCurrencyCode;

    // Paid

    @Prop({ type: Date, required: false, default: null })
    datePaid: Date | null;

    @Prop({ type: Number, required: false, default: null })
    storeOrderNum: number | null;

    // Sent

    @Prop({ type: Number, required: false, default: null })
    sendToTgUserId: number | null;

    @Prop({ type: Date, required: false, default: null })
    dateReceived: Date | null;

    constructor(params: {
        giftId: number;
        tgUserId: number;
        amount: number;
        currency: CryptoCurrencyCode;
    }) {
        this.giftId = params.giftId;
        this.tgUserId = params.tgUserId;
        this.amount = params.amount;
        this.currency = params.currency;
    }
}

export const PurchaseSchema = SchemaFactory.createForClass(Purchase);
