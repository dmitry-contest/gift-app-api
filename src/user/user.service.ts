import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { TgUser, User } from './user.schema';
import { Purchase } from '../purchases/purchase.schema';
import { UserLanguage } from '../api/api.contract';
import { Leaderboard } from '../leaderboard/leaderboard.schema';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Purchase.name) private purchaseModel: Model<Purchase>,
        @InjectModel(Leaderboard.name) private leaderboardModel: Model<Leaderboard>,
    ) {}

    async create(params: { tgUser: TgUser; chatId?: number }): Promise<User> {
        const createdUser = new this.userModel(new User(params));
        return createdUser.save();
    }

    async findByTgUserId(tgUserId: number): Promise<User | null> {
        return this.userModel.findOne({ id: tgUserId }).exec();
    }

    async getOrCreate(params: {
        tgUser: TgUser;
        chatId?: number;
    }): Promise<User> {
        let user: User | null = await this.findByTgUserId(params.tgUser.id);
        if (user == null) {
            user = await this.create(params);
        } else {
            // update chatId
            if (params.chatId != null) {
                await this.userModel
                    .updateOne(
                        { id: params.tgUser.id },
                        {
                            chatId: params.chatId,
                        },
                    )
                    .exec();
            }
        }

        return user;
    }

    async getReceivedGifts(tgUserId: number): Promise<Purchase[]> {
        return this.purchaseModel
            .aggregate([
                {
                    $match: {
                        toTgUserId: tgUserId,
                        dateReceived: { $ne: null },
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'toTgUserId',
                        foreignField: 'id',
                        as: 'toTgUser',
                    },
                },
            ])
            .exec();
    }

    async setLanguage(tgUserId: number, language: UserLanguage): Promise<void> {
        await this.userModel.updateOne({ id: tgUserId }, { language }).exec();
    }

    async getLeaderboardPosition(tgUserId: number): Promise<null | number> {
        const leaderboardPosition = await this.leaderboardModel
            .aggregate([
                {
                    $setWindowFields: {
                        sortBy: { amount: -1 },
                        output: {
                            rank: { $denseRank: {} },
                        },
                    },
                },
                {
                    $match: {
                        tgUserId,
                    },
                },
            ])
            .exec();

        return leaderboardPosition[0]?.rank ?? null;
    }

    async setPhotoUrl(tgUserId: number, photoUrl: string): Promise<void> {
        await this.userModel
            .updateOne({ id: tgUserId }, { 'tg.avatarUrl': photoUrl })
            .exec();
    }

    async setChatId(tgUserId: number, chatId: number): Promise<void> {
        // await this.userModel.updateOne({ id: tgUserId }, { chatId }).exec();
    }
}
