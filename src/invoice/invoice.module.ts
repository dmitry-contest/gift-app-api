import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';

import { InvoiceController } from './invoice.controller';
import { StoreService } from '../store/store.service';
import { InvoiceService } from './invoice.service';
import { UserSchema } from '../user/user.schema';
import {
    StoreElement,
    StoreElementSchema,
} from '../store/store-element.schema';
import { User } from '../user/user.schema';
import { Purchase, PurchaseSchema } from '../purchases/purchase.schema';

import {
    Leaderboard,
    LeaderboardSchema,
} from '../leaderboard/leaderboard.schema';
import { BotModule } from '../bot/bot.module';
import { StoreModule } from '../store/store.module';
import { PurchaseModule } from '../purchases/purchase.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { UserModule } from '../user/user.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: StoreElement.name, schema: StoreElementSchema },
            { name: Purchase.name, schema: PurchaseSchema },
            { name: Leaderboard.name, schema: LeaderboardSchema },
        ]),
        LoggerModule,
        ConfigModule,
        forwardRef(() => BotModule),
        StoreModule,
        PurchaseModule,
        LeaderboardModule,
        forwardRef(() => UserModule),
    ],
    controllers: [InvoiceController],
    providers: [InvoiceService],
    exports: [InvoiceService],
})
export class InvoiceModule {}
