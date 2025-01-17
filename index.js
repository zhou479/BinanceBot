const BinanceAggregator = require('./src/BinanceAggregator');
const { config, accountsList } = require('./src/config');

async function main() {
    try {
        const accountPromises = accountsList.map(async (accountConfig) => {
            const binanceAggregator = new BinanceAggregator(accountConfig);

            // 取消订单
            // await binanceAggregator.cancelOrders(config.coin.symbol);

            // 市价卖出
            await binanceAggregator.submitMarketOrder(config.coin.symbol, 'SELL');

            // 限价卖出(可等待交易开启, 自行设置限价单的价格)。如需多次执行限价挂单，建议把【取消订单】的注释解除，因为执行限价单会占用对应币种
            // await binanceAggregator.submitLimitOrder(config.coin.symbol, 'SELL', '1.05');    // 1.05 是限价单的价格

            // 查询现货账户持仓
            await binanceAggregator.querySpotAssets();

        });
        await Promise.all(accountPromises);
    } catch (error) {
        console.error("交易执行失败:", error);
    }
}

main();