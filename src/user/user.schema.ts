import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import { UserLanguage } from '../api/api.contract';

export type UserDocument = HydratedDocument<User>;

export type TgUser = {
    id: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    languageCode: string | null;
    avatarUrl: string | null;
    premium: boolean;
};

@Schema()
export class User {
    @Prop({ type: Number, required: true, unique: true })
    id: number;

    @Prop({ type: Object })
    tg: TgUser;

    @Prop({ type: Date, required: true, default: () => new Date() })
    registeredDate: Date;

    @Prop({ type: String, required: true, default: UserLanguage.EN })
    language: UserLanguage;

    @Prop({ type: Number, required: false })
    chatId?: number;

    constructor(params: { tgUser: TgUser; chatId?: number }) {
        this.tg = params.tgUser;
        this.chatId = params.chatId;
        this.id = params.tgUser.id;
    }
}

export const UserSchema = SchemaFactory.createForClass(User);
