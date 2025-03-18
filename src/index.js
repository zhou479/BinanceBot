const BinanceAggregator = require('./core/BinanceAggregator');
const { config, accountsList } = require('./config/config');

async function main() {
    try {
        const accountPromises = accountsList.map(async (accountConfig) => {
            const binanceAggregator = new BinanceAggregator(accountConfig);

            // 市价卖出, 【参数为: 交易币种，交易方向，交易数量】
            // await binanceAggregator.submitMarketOrder(config.coin.symbol, 'SELL');

            // 取消订单并限价卖出, 建议开启取消订单。 【参数为: 交易币种，交易方向，限价单价格，交易数量】
            // await binanceAggregator.cancelOrders(config.coin.symbol);
            // await binanceAggregator.submitLimitOrder(config.coin.symbol, 'BUY', 50, 0.9);    // 1.05 是限价单的价格

            // 循环质押借贷 【参数为: 借贷币种, 需借贷数量, 抵押币种】
            // await binanceAggregator.continuousFlexibleLoan('FDUSD', 3, 'USDT');

            // 查询账户持仓
            await binanceAggregator.queryAsset('USDT');

        });
        await Promise.all(accountPromises);
    } catch (error) {
        console.error("交易执行失败:", error);
    }
}

main();