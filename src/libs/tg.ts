export const parseInitData = (initData: string) =>
    decodeURIComponent(initData)
        .split('&')
        .map((item) => item.split('='))
        .reduce((acc, [key, value]) => {
            if (key == null) return acc;
            if (value == null) return acc;
            try {
                acc[key] = JSON.parse(value);
            } catch (e) {
                acc[key] = value;
            }
            return acc;
        }, {}) as {
        user: {
            id: number;
            first_name: string;
            last_name: string;
            username?: string;
            language_code: string;
            allows_write_to_pm: boolean;
            is_premium?: boolean;
        };
        chat_instance?: number;
        chat_type?: 'sender' | 'private';
        start_param?: string;
        auth_date: number;
        hash: string;
    };
