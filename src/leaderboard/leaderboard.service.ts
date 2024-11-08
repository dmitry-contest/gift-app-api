import { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Leaderboard } from './leaderboard.schema';
import { TgUser } from '../user/user.schema';

export type LeaderboardWithTgUser = Leaderboard & { tgUser: { tg: TgUser } };

@Injectable()
export class LeaderboardService {
    constructor(
        @InjectModel(Leaderboard.name) private leaderboardModel: Model<Leaderboard>,
    ) {}

    async getLeaderboard(): Promise<LeaderboardWithTgUser[]> {
        return this.leaderboardModel
            .aggregate([
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
                        amount: -1,
                    },
                },
            ])
            .exec();
    }

    async updateLeaderboardByTgUserId(tgUserId: number): Promise<void> {
        await this.leaderboardModel.findOneAndUpdate(
            { tgUserId },
            { $inc: { amount: 1 } },
            { upsert: true, setDefaultsOnInsert: true },
        );
    }
}
