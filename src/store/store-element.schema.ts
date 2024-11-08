import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { CryptoCurrencyCode } from '../purchases/purchase.types';
import { HydratedDocument } from 'mongoose';

export type StoreElementDocument = HydratedDocument<StoreElement>;

@Schema()
export class StoreElement {
    @Prop({ unique: true })
    id: number;

    @Prop({ unique: true })
    name: string;

    @Prop()
    price: number;

    @Prop()
    currency: CryptoCurrencyCode;

    @Prop()
    amount: number;

    @Prop()
    amountSold: number;

    constructor(params: {
        id: number;
        name: string;
        price: number;
        currency: CryptoCurrencyCode;
        amount: number;
    }) {
        this.id = params.id;
        this.name = params.name;
        this.price = params.price;
        this.currency = params.currency;
        this.amount = params.amount;
        this.amountSold = 0;
    }
}

export const StoreElementSchema = SchemaFactory.createForClass(StoreElement);
