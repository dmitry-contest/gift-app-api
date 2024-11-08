import { Injectable } from '@nestjs/common';

import { ru } from './ru';
import { en } from './en';

import { TranslationsErrors } from './dictionary/translations.errors';
import { UserLanguage } from '../api/api.contract';

@Injectable()
export class TranslationsService {
    public static readonly languages = {
        ru,
        en,
    } as const;

    public static getTranslation({
                                     language,
                                     key,
                                     params,
                                 }: {
        language: UserLanguage;
        key: string;
        params?: Record<string, string | number>;
    }) {
        if (!TranslationsService.languages[language]) {
            throw new Error(TranslationsErrors.languageNotSupported);
        }
        if (typeof TranslationsService.languages[language][key] === 'string') {
            return TranslationsService.languages[language][key];
        }
        return TranslationsService.languages[language][key](params);
    }
}
