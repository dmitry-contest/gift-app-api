import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';

import { StoreService } from './store.service';
import { StoreElement } from './store-element.schema';
import { StoreElementSchema } from './store-element.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: StoreElement.name, schema: StoreElementSchema },
        ]),
        LoggerModule,
    ],
    controllers: [],
    providers: [StoreService],
    exports: [StoreService],
})
export class StoreModule {}
