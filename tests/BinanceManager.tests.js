const BinanceManager  = require('../src/BinanceManager')
require('dotenv').config();

const accountNum = 1;
const apiKey = process.env[`ACCOUNT1_API_KEY`];
const apiSecret = process.env[`ACCOUNT1_API_SECRET`];

(async() => {
    const binanceManager = new BinanceManager(apiKey, apiSecret);

    // 1. 测试queryAssets函数
    if (false) {
        const result = await binanceManager.querySpotAccount(accountNum);
        if (result.success) {
            const assetsList = result.assets;
            assetsList.forEach(asset => {console.log(asset.asset, asset.free);});
            } else {
            console.log(result.message);
        }
    }

    // 2. 测试queryMarginAccount函数
    if (false) {
        const result = await binanceManager.queryMarginAccount();
        // if (result.success) {
        //     console.log(result.marginAccountInfo);
        // } else {
        //     console.log(result.message);
        // }
    }

    // 3. 测试cancelOrder函数
    if (true) {
        const result = await binanceManager.cancelOrder(accountNum, 'BTCUSDT');
    }
})()