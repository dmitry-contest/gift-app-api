import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const INVOICE_WEBHOOK_PATH = '/api/invoice/webhook';

export const invoiceContract = c.router({
    webhook: {
        method: 'POST',
        path: INVOICE_WEBHOOK_PATH,

        body: z.object({
            update_id: z.number(),
            update_type: z.enum(['invoice_paid']),
            request_date: z.string(),
            payload: z
                .object({
                    hash: z.string(),
                })
                .passthrough(),
        }),
        responses: {
            200: z.any(),
        },
    },
});

export type InvoiceContract = typeof invoiceContract;
