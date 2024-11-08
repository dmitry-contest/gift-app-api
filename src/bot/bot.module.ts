import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';

import { BotService } from './bot.service';

import { PurchaseService } from '../purchases/purchase.service';
import { Purchase, PurchaseSchema } from '../purchases/purchase.schema';
import { StoreService } from '../store/store.service';
import {
    StoreElement,
    StoreElementSchema,
} from '../store/store-element.schema';
import { UserService } from '../user/user.service';
import { User, UserSchema } from '../user/user.schema';
import {
    Leaderboard,
    LeaderboardSchema,
} from '../leaderboard/leaderboard.schema';
import { StoreModule } from '../store/store.module';
import { PurchaseModule } from '../purchases/purchase.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { UserModule } from '../user/user.module';

@Global()
@Module({
    imports: [
        ConfigModule,
        MongooseModule.forFeature([
            { name: Purchase.name, schema: PurchaseSchema },
            { name: StoreElement.name, schema: StoreElementSchema },
            { name: User.name, schema: UserSchema },
            { name: Leaderboard.name, schema: LeaderboardSchema },
        ]),
        EventEmitterModule.forRoot(),
        StoreModule,
        PurchaseModule,
        LeaderboardModule,
        UserModule,
    ],
    controllers: [],
    providers: [BotService],
    exports: [BotService],
})
export class BotModule {}
