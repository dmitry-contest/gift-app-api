import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';

import { ApiController } from './api.controller';
import { User, UserSchema } from '../user/user.schema';
import { StoreService } from '../store/store.service';
import {
    StoreElement,
    StoreElementSchema,
} from '../store/store-element.schema';
import { UserService } from '../user/user.service';
// import { BotService } from '../bot/bot.service';
import { Purchase, PurchaseSchema } from '../purchases/purchase.schema';
import { PurchaseService } from '../purchases/purchase.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import {
    Leaderboard,
    LeaderboardSchema,
} from '../leaderboard/leaderboard.schema';
import { BotModule } from '../bot/bot.module';
import { StoreModule } from '../store/store.module';
import { UserModule } from '../user/user.module';
import { PurchaseModule } from '../purchases/purchase.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: StoreElement.name, schema: StoreElementSchema },
            { name: Purchase.name, schema: PurchaseSchema },
            { name: Leaderboard.name, schema: LeaderboardSchema },
        ]),
        LoggerModule,
        BotModule,
        StoreModule,
        UserModule,
        PurchaseModule,
        LeaderboardModule,
    ],
    controllers: [ApiController],
    providers: [],
})
export class ApiModule {}
