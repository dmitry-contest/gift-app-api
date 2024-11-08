// import { validate } from '@telegram-apps/init-data-node';

import {
    BadRequestException,
    Injectable,
    NestMiddleware,
    RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { middlewareErrorMessages } from './errors/middleware.errors';

@Injectable()
export class InitDataMiddleware implements NestMiddleware {
    constructor(private readonly config: ConfigService) {}

    use(
        req: RawBodyRequest<FastifyRequest>,
        _: FastifyReply['raw'],
        next: () => void,
    ) {
        if (!['GET', 'POST'].includes(req.method)) {
            next();
            return;
        }
        const initData = req.headers['x-init-data'] as string | undefined;
        const secretKey = this.config.get('TG_BOT_TOKEN') as string;

        if (initData == null) {
            throw new BadRequestException({
                message: middlewareErrorMessages.emptyInitData,
            });
        }

        try {
            // TODO: validate initData
            // validate(initData, secretKey, {
            //   expiresIn: 0,
            // });
            next();
        } catch (error) {
            throw new BadRequestException({
                message: middlewareErrorMessages.invalidInitData,
                details: initData,
            });
        }
    }
}
