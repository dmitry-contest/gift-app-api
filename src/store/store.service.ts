import { ClientSession, Model } from 'mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

import { StoreElement } from './store-element.schema';
import { StoreErrorMessages } from './dictionary/store.errors';

@Injectable()
export class StoreService {
    private readonly logger = new Logger(StoreService.name);

    // for tests
    public storeInitState: StoreElement[] = [];

    constructor(
        @InjectModel(StoreElement.name)
        private storeElementModel: Model<StoreElement>,
        private configService: ConfigService,
    ) {}

    async initStore(): Promise<StoreElement[] | null> {
        const storeInitState = this.configService.get<string>(
            'STORE_INIT_STATE',
        ) as string;

        if (!storeInitState) {
            this.logger.error('STORE_INIT_STATE is not set');
            process.exit(1);
        }

        this.storeInitState = JSON.parse(storeInitState) as StoreElement[];

        try {
            const store = await this.storeElementModel.insertMany(
                this.storeInitState.map((element) => new StoreElement(element)),
            );

            this.logger.log(`Store initialized with ${store.length} elements`);
            return store;
        } catch (error) {
            this.logger.error(StoreErrorMessages.errorInitializingStore, error);
        }
        return null;
    }

    async getStore(): Promise<StoreElement[]> {
        const store = await this.storeElementModel.find({}).exec();

        return store.map((element) => ({
            id: element.id,
            name: element.name,
            price: element.price,
            currency: element.currency,
            amountSold: element.amountSold,
            amount: element.amount,
        }));
    }

    async findGiftById(
        id: number,
        session?: ClientSession,
    ): Promise<StoreElement | null> {
        if (session) {
            return this.storeElementModel.findOne({ id }).session(session).exec();
        }
        return this.storeElementModel.findOne({ id }).exec();
    }

    async increaseGiftAmountSoldById(
        id: number,
        session: ClientSession,
    ): Promise<StoreElement | null> {
        return this.storeElementModel
            .findOneAndUpdate({ id }, { $inc: { amountSold: 1 } }, { session })
            .exec();
    }
}
