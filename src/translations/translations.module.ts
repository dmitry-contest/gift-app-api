import { Module } from '@nestjs/common';

import { TranslationsService } from './translations.service';

@Module({
    imports: [],
    controllers: [],
    providers: [TranslationsService],
})
export class UserModule {}
