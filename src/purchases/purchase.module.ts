import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';

import { Purchase, PurchaseSchema } from './purchase.schema';
import { PurchaseService } from './purchase.service';
import { StoreModule } from '../store/store.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Purchase.name, schema: PurchaseSchema },
        ]),
        LoggerModule,
        StoreModule,
    ],
    controllers: [],
    providers: [PurchaseService],
    exports: [PurchaseService],
})
export class PurchaseModule {}
