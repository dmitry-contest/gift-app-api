import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';

import { Leaderboard, LeaderboardSchema } from './leaderboard.schema';
import { LeaderboardService } from './leaderboard.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Leaderboard.name, schema: LeaderboardSchema },
        ]),
        LoggerModule,
    ],
    controllers: [],
    providers: [LeaderboardService],
    exports: [LeaderboardService],
})
export class LeaderboardModule {}
