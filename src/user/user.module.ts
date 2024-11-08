import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';

import { User, UserSchema } from './user.schema';

import { UserService } from './user.service';
import {
    StoreElementSchema,
    StoreElement,
} from '../store/store-element.schema';
import {
    Leaderboard,
    LeaderboardSchema,
} from '../leaderboard/leaderboard.schema';
import { BotModule } from '../bot/bot.module';
import { StoreModule } from '../store/store.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { PurchaseModule } from '../purchases/purchase.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { Purchase, PurchaseSchema } from '../purchases/purchase.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: StoreElement.name, schema: StoreElementSchema },
            { name: Leaderboard.name, schema: LeaderboardSchema },
            { name: Purchase.name, schema: PurchaseSchema },
        ]),
        LoggerModule,
        forwardRef(() => BotModule),
        StoreModule,
        InvoiceModule,
        PurchaseModule,
        LeaderboardModule,
    ],
    controllers: [],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule {}
