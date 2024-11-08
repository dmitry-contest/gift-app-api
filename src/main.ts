import { NestFactory } from '@nestjs/core';
import {
    NestFastifyApplication,
    FastifyAdapter,
} from '@nestjs/platform-fastify';
import * as NestPino from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { StoreService } from './store/store.service';
import { BotService } from './bot/bot.service';

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter(),
        {
            rawBody: true,
            bufferLogs: true,
        },
    );

    const logger = app.get(NestPino.Logger);
    app.useLogger(logger);

    app.useGlobalInterceptors(new NestPino.LoggerErrorInterceptor());

    app.enableCors({
        origin: '*', // TODO: change to https://t.me
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    });

    const config = app.get(ConfigService);

    const port = config.get('PORT');
    if (port == null) {
        throw new Error('PORT is not defined');
    }

    const tgBotToken = config.get('TG_BOT_TOKEN');
    if (tgBotToken == null) {
        throw new Error('TG_BOT_TOKEN is not defined');
    }

    const miniAppUrl = config.get('TG_MINI_APP_URL');
    if (miniAppUrl == null) {
        throw new Error('TG_MINI_APP_URL is not defined');
    }

    await app.get(StoreService).initStore();

    await app.get(BotService).start(tgBotToken, miniAppUrl);

    logger.log(`Starting server on port ${port}`);
    await app.listen(
        { host: '0.0.0.0', port: parseInt(port) },
        (err, address) => {
            if (err) {
                logger.error('Error starting server', err);
            }
            logger.log(`Server is running on ${address}`);
        },
    );
}
bootstrap();
