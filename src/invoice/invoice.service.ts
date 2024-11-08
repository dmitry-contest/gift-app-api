import { createHmac, createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InvoiceService {
    private readonly cryptoBotToken: string;

    constructor(private configService: ConfigService) {
        this.cryptoBotToken = this.configService.get('CRYPTO_BOT_TOKEN') as string;
    }

    public checkSignature = ({ body, headers }: { body: any; headers: any }) => {
        const secret = createHash('sha256').update(this.cryptoBotToken).digest();
        const checkString = JSON.stringify(body);
        const hmac = createHmac('sha256', secret).update(checkString).digest('hex');
        return hmac === headers['crypto-pay-api-signature'];
    };
}
