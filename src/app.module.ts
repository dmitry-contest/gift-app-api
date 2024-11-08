import pino from 'pino';
import { LoggerModule } from 'nestjs-pino';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TsRestModule } from '@ts-rest/nest';

import { InitDataMiddleware } from './middlewares/initdata.middleware';
import { ApiModule } from './api/api.module';
import { BotModule } from './bot/bot.module';
import { HealthModule } from './health/health.module';
import { InvoiceModule } from './invoice/invoice.module';

@Module({
    controllers: [],
    imports: [
        TerminusModule,
        ConfigModule.forRoot({ isGlobal: true }),
        LoggerModule.forRoot({
            pinoHttp: {
                base: null,
                timestamp: pino.stdTimeFunctions.isoTime,
                serializers: {
                    req: pino.stdSerializers.wrapRequestSerializer((req) => {
                        return {
                            id: req.raw?.id,
                            method: req.method,
                            url: req.url,
                        };
                    }),
                },
            },
        }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const url = configService.getOrThrow('MONGO_URL');
                const dbName = configService.getOrThrow('MONGO_DB');
                return {
                    uri: `${url}/${dbName}`,
                    directConnection: process.env.NODE_ENV !== 'production',
                };
            },
            inject: [ConfigService],
        }),
        TsRestModule.register({
            isGlobal: true,
            validateResponses: true,
            validateRequestHeaders: true,
            validateRequestQuery: true,
            validateRequestBody: true,
        }),

        // router modules
        HealthModule,
        ApiModule,
        InvoiceModule,
        BotModule,
    ],
    providers: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(InitDataMiddleware)
            .exclude('health')
            .exclude('api/user/photo')
            .exclude('api/invoice/webhook')
            .forRoutes('*');
        // .exclude({ path: 'user/registerorlogin', method: RequestMethod.POST });
        // //   .forRoutes(UsersController, InvoiceController);
    }
}
