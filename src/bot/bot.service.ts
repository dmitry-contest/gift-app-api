import axios from 'axios';
import {
    S3Client,
    PutObjectCommand,
    HeadObjectCommand,
} from '@aws-sdk/client-s3';

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import { Bot, Context, InlineQueryResultBuilder, InlineKeyboard } from 'grammy';

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

import { BotEvents } from './bot.events';

import { ApiEvents } from '../api/api.events';
import { StoreService } from '../store/store.service';
import { PurchaseService } from '../purchases/purchase.service';
import { TranslationsService } from '../translations/translations.service';
import { UserService } from '../user/user.service';
import { UserLanguage } from '../api/api.contract';

@Injectable()
export class BotService {
    private readonly logger = new Logger();
    private fileStoragePath: string;
    private mainImage: {
        big: string;
        inline: string;
    };
    public static bot: Bot;
    public static miniAppUrl: string;

    public static s3: S3Client;

    public static bucketName: string;
    public static cdnUrl: string;

    public static noPhotoPlaceholderUrl: string;

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly configService: ConfigService,
        private readonly storeService: StoreService,
        private readonly purchaseService: PurchaseService,
        private readonly userService: UserService,
    ) {
        this.logger.log('BotService Constructor', new Date().toISOString());
        this.mainImage = {
            big: this.configService.get('BOT_MAIN_IMAGE_BIG') as string,
            inline: this.configService.get('BOT_MAIN_IMAGE_INLINE') as string,
        };
        this.fileStoragePath = this.configService.get(
            'FILE_STORAGE_PATH',
        ) as string;

        if (!fs.existsSync(this.fileStoragePath)) {
            fs.mkdirSync(this.fileStoragePath, { recursive: true });
        }

        const endpoint = this.configService.get<string>('DO_SPACE_ENDPOINT');
        if (endpoint == null) {
            throw new Error('No DO_SPACE_ENDPOINT provided');
        }

        const accessKeyId = this.configService.get<string>('DO_SPACES_KEY');
        if (accessKeyId == null) {
            throw new Error('No DO_SPACES_KEY provided');
        }

        const secretAccessKey = this.configService.get<string>('DO_SPACES_SECRET');
        if (!secretAccessKey) {
            throw new Error('No DO_SPACES_SECRET provided');
        }

        const bucketName = this.configService.get<string>('DO_SPACE_BUCKET');
        if (bucketName == null) {
            throw new Error('No DO_SPACE_BUCKET provided');
        }
        BotService.bucketName = bucketName;

        const cdnUrl = this.configService.get<string>('CDN_URL');
        if (cdnUrl == null) {
            throw new Error('No CDN_URL provided');
        }
        BotService.cdnUrl = cdnUrl;

        const noPhotoPlaceholderUrl = this.configService.get<string>(
            'NO_PHOTO_PLACEHOLDER_URL',
        );
        if (noPhotoPlaceholderUrl == null) {
            throw new Error('No NO_PHOTO_PLACEHOLDER_URL provided');
        }
        BotService.noPhotoPlaceholderUrl = noPhotoPlaceholderUrl;
        BotService.s3 = new S3Client({
            forcePathStyle: false,
            endpoint,
            region: 'us-east-1',
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });
    }

    async start(token: string, miniAppUrl: string) {
        this.logger.log(
            `${new Date()} Starting bot with for miniAppUrl: ${miniAppUrl}`,
        );

        BotService.miniAppUrl = miniAppUrl;
        BotService.bot = new Bot(token);

        BotService.bot.on('message', (ctx) => {
            this.logger.log(`Message received: ${JSON.stringify(ctx)}`);
            if (ctx.message?.text === '/start') {
                this.eventEmitter.emit(BotEvents.StartMessage, {
                    from: ctx.update.message.from,
                    chatId: ctx.update.message.chat.id,
                });
            }
        });
        BotService.bot.on('inline_query', async (ctx) => {
            this.logger.log(`Inline query received: ${JSON.stringify(ctx)}`);
            this.eventEmitter.emit(BotEvents.InlineQuery, ctx);
        });
        BotService.bot.start();
    }

    async getUserProfilePhoto(tgUserId: number): Promise<string | null> {
        let photoPath: string | null = null;
        const url: string = `${BotService.cdnUrl}/${tgUserId.toString()}`;

        try {
            await BotService.s3.send(
                new HeadObjectCommand({
                    Bucket: BotService.bucketName,
                    Key: tgUserId.toString(),
                }),
            );

            return url;
        } catch (error) {
            // step forward
        }
        try {
            const userPhotos =
                await BotService.bot?.api.getUserProfilePhotos(tgUserId);
            const fileId = userPhotos?.photos[0]?.[0]?.file_id;
            if (fileId == null) {
                return BotService.noPhotoPlaceholderUrl;
            }
            const file_path = (await BotService.bot?.api.getFile(fileId))?.file_path;

            if (file_path == null) {
                return null;
            }

            const { data }: { data: Buffer } = await axios.get(
                `https://api.telegram.org/file/bot${BotService.bot?.token}/${file_path}`,
                {
                    responseType: 'arraybuffer',
                },
            );
            photoPath = `${this.fileStoragePath}/${tgUserId}`;
            await fsPromises.writeFile(photoPath, data);

            const lineEnd = data.indexOf('\n');
            const firstline = data.subarray(0, lineEnd);

            let type: string | null = null;

            if (firstline.includes('%PNG')) {
                type = 'image/png';
            }
            if (firstline.includes('JFIF')) {
                type = 'image/jpeg';
            }
            if (firstline.includes('WEBPVP8')) {
                type = 'image/webp';
            }

            if (type != null) {
                try {
                    await BotService.s3.send(
                        new PutObjectCommand({
                            Bucket: BotService.bucketName,
                            Key: tgUserId.toString(),
                            Body: fs.createReadStream(photoPath),
                            ContentType: type,
                            ACL: 'public-read',
                        }),
                    );

                    return url;
                } catch (error) {}
            }
        } catch (error) {
            this.logger.error(
                `Error getting user profile photo (${tgUserId}): ${error.message}`,
            );
        }

        return BotService.noPhotoPlaceholderUrl;
    }

    @OnEvent(BotEvents.StartMessage)
    async onStartMessage(data: {
        from: {
            id: number;
            first_name: string;
            last_name: string;
            language_code: string;
            username: string;
            is_premium?: boolean;
        };
        chatId: number;
    }) {
        const photoUrl = await this.getUserProfilePhoto(data.from.id);
        const user = await this.userService.getOrCreate({
            tgUser: {
                id: data.from.id ?? 0,
                username: data.from.username ?? null,
                firstName: data.from.first_name ?? null,
                lastName: data.from.last_name ?? null,
                languageCode: ['en', 'ru'].includes(data.from.language_code)
                    ? data.from.language_code
                    : 'en',
                avatarUrl: photoUrl ?? null,
                premium: data.from.is_premium ?? false,
            },
            chatId: data.chatId,
        });

        // const user = await this.userService.findByTgUserId(data.tgUserId);
        const language = user?.language ?? UserLanguage.EN;

        await BotService.bot?.api.sendPhoto(data.chatId, this.mainImage.big, {
            caption: TranslationsService.getTranslation({
                language,
                key: 'startMessageCaption',
            }),
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: TranslationsService.getTranslation({
                                language,
                                key: 'openApp',
                            }),
                            url: BotService.miniAppUrl,
                        },
                    ],
                ],
            },
        });
    }

    @OnEvent(ApiEvents.GIFT_RECEIVED)
    @OnEvent(ApiEvents.GIFT_SENT)
    @OnEvent(ApiEvents.GIFT_BOUGHT)
    async onGiftEvent(data: {
        chatId: number;
        message: string;
        link?: { message: string; link: string };
    }) {
        this.logger.log(
            `onGiftEvent: ${data.chatId}, ${data.message}, ${JSON.stringify(data.link)}`,
        );

        await BotService.bot?.api.sendMessage(data.chatId, data.message, {
            reply_markup: data.link
                ? {
                    inline_keyboard: [
                        [{ text: data.link.message, url: data.link.link }],
                    ],
                }
                : undefined,
            parse_mode: 'HTML',
        });
    }

    @OnEvent(BotEvents.InlineQuery)
    async onInlineQuery(ctx: Context) {
        const purchaseHash = ctx.inlineQuery?.query as string;
        this.logger.log(`Inline query received: ${purchaseHash}`);

        // get purchase from db
        const notSentPurchase =
            await this.purchaseService.getPaidNotReceivedByHash(purchaseHash);
        if (notSentPurchase == null) {
            return;
        }

        const giftid = notSentPurchase.giftId;

        // get gift name from store
        const gift = await this.storeService.findGiftById(giftid);
        if (gift == null) {
            return;
        }

        const user = await this.userService.findByTgUserId(ctx.me.id);
        const language = user?.language ?? UserLanguage.EN;

        const giftName = TranslationsService.getTranslation({
            language,
            key: 'giftNames',
            params: { id: gift.id },
        });

        const sendGift = TranslationsService.getTranslation({
            language,
            key: 'inlineQuerySendGift',
        });

        const inlineQueryRecieveGift = TranslationsService.getTranslation({
            language,
            key: 'inlineQueryRecieveGift',
        });

        const link = `${BotService.miniAppUrl}?startapp=receive_${purchaseHash}`;

        const description = TranslationsService.getTranslation({
            language,
            key: 'inlineQuerySendGiftOf',
            params: { name: giftName },
        });

        const inlineQueryHtml = TranslationsService.getTranslation({
            language,
            key: 'inlineQueryHtml',
        });

        const result = InlineQueryResultBuilder.article('id:1', sendGift, {
            thumbnail_url: this.mainImage.inline,
            reply_markup: new InlineKeyboard().url(inlineQueryRecieveGift, link),
            description,
        }).text(inlineQueryHtml, {
            parse_mode: 'HTML',
        });

        await ctx.answerInlineQuery([result]);
    }
}
