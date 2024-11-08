const giftNames = {
    1: 'Delicious Cake',
    2: 'Green Star',
    3: 'Blue Star',
    4: 'Red Star',
};

export const en = {
    inlineQueryRecieveGift: 'Receive Gift',
    inlineQuerySendGift: 'Send Gift',
    inlineQuerySendGiftOf: (params: { name: string }) =>
        `Send a gift of ${params.name}`,
    inlineQueryHtml:
        '🎁 I have a <b>gift</b> for you! Tap the button below to open it.',
    unknown: 'Unknown',
    //
    BotMessageGiftSentTo: (params: { name: string; giftName: string }) =>
        `👌 <b>${params.name}</b> received your gift of <b>${params.giftName}</b>`,
    BotMessageGiftHasBeenBought: (params: { name: string }) =>
        `✅ You have purchased the gift of <b>${params.name}</b>`,
    BotMessageGiftRecievedFrom: (params: { name: string; giftName: string }) =>
        `⚡ <b>${params.name}</b> has given you a gift of <b>${params.giftName}</b>`,
    startMessageCaption: '🎁 Here you can buy and send gifts to your friends',
    openApp: 'Open App',
    viewGift: 'View Gift',
    openGifts: 'Open Gifts',
    //
    giftNames: (params: { id: number }) => giftNames[params.id] ?? 'Unknown',
    invoiceDescription: (params: { giftName: string }) =>
        `Purchasing a ${params.giftName} gift`,
};
