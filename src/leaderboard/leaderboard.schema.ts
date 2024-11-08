import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LeaderboardDocument = HydratedDocument<Leaderboard>;

@Schema()
export class Leaderboard {
    @Prop({ type: Number, required: true, index: true })
    tgUserId: number;


    @Prop({ type: Number, required: true })
    amount: number;

    constructor(params: {
    }) {
    }
}

export const LeaderboardSchema = SchemaFactory.createForClass(Leaderboard);
