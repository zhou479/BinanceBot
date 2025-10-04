const BinanceAggregator = require('./core/BinanceAggregator');
const { config, accountsList } = require('./config/config');

async function main() {
    try {
        const accountPromises = accountsList.map(async (accountConfig) => {
            const binanceAggregator = new BinanceAggregator(accountConfig);

            // 1. 市价卖出, 【参数为: 交易币种，交易方向，交易数量】
            // await binanceAggregator.submitMarketOrder(config.coin.symbol, 'SELL');

            // 2. 取消订单并限价卖出, 建议开启取消订单。 【参数为: 交易币种，交易方向，限价单价格，交易数量】
            // await binanceAggregator.cancelOrders(config.coin.symbol);
            // await binanceAggregator.submitLimitOrder(config.coin.symbol, 'BUY', 50, 0.9);    // 1.05 是限价单的价格

            // 3. 循环质押借贷 【参数为: 借贷币种, 需借贷数量, 抵押币种】
            // await binanceAggregator.continuousFlexibleLoan('FDUSD', 3, 'USDT');

            // 4. 查询账户持仓
            await binanceAggregator.queryAsset('USDT');

            // 5. 提现操作
            const withdrawParams = {
                coin: "USDT",
                network: 'BSC',     // 默认使用bsc提现
                amount: 0.1,          // 提现数量，设置为0时为提取账户全部资产即可
                address: accountConfig.withdrawToAddress,
                walletType: 1       // 提现账户类型，0为现货账户，1为资金账户
            }
            await binanceAggregator.binanceWithdraw(withdrawParams);

        });
        await Promise.all(accountPromises);
    } catch (error) {
        console.error("交易执行失败:", error);
    }
}

main();