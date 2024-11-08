const giftNames = {
    1: 'Delicious Cake',
    2: 'Green Star',
    3: 'Blue Star',
    4: 'Red Star',
};

export const ru = {
    inlineQueryRecieveGift: 'Получить подарок',
    inlineQuerySendGift: 'Отправить подарок',
    inlineQuerySendGiftOf: (params: { name: string }) =>
        `Отправить подарок ${params.name}`,
    inlineQueryHtml:
        '🎁 У меня есть <b>подарок</b> для вас! Нажмите на кнопку ниже, чтобы открыть его.',
    unknown: 'Неизвестен',
    BotMessageGiftSentTo: (params: { name: string; giftName: string }) =>
        `👌 <b>${params.name}</b> получил(а) ваш подарок <b>${params.giftName}</b>`,
    BotMessageGiftHasBeenBought: (params: { name: string }) =>
        `✅ Вы купили подарок <b>${params.name}</b>`,
    BotMessageGiftRecievedFrom: (params: { name: string; giftName: string }) =>
        `⚡ <b>${params.name}</b> подарил(а) вам подарок <b>${params.giftName}</b>`,
    startMessageCaption: '🎁 Здесь вы можете купить и отправить подарки друзьям',
    openApp: 'Открыть приложение',
    viewGift: 'Посмотреть подарок',
    openGifts: 'Открыть подарки',
    //
    giftNames: (params: { id: number }) => giftNames[params.id] ?? 'Неизвестно',
    invoiceDescription: (params: { giftName: string }) =>
        `Покупка подарка ${params.giftName}`,
};
