const BinanceAggregator = require('../core/BinanceAggregator');
const { config, accountsList } = require('../config/config');

(async () => {
    try {
        console.log("开始测试 BinanceAggregator...");
        const binanceAggregator = new BinanceAggregator(accountsList[0]);
        
        // 测试查询资产
        if (false) {
            const assetInfo = await binanceAggregator.queryAsset('BTC');
            // console.log(assetInfo);
        }

        // 测试交易准备工作
        if (false) {
            const tradePreparation = await binanceAggregator.tradePreparation('USDC');
            console.log(tradePreparation.tradeAmount);
        }

        // 测试现货市价挂单交易
        if (false) {
            const submitMarketOrder = await binanceAggregator.submitMarketOrder('USDC', 'SELL', '6');
            console.log(submitMarketOrder);
        }

        // 测试现货限价挂单交易
        if (false) {
            const submitLimitOrder = await binanceAggregator.submitLimitOrder('USDC', 'SELL', '1', '6');
        }

        // 测试质押借贷
        if (false) {
            await binanceAggregator.continuousFlexibleLoan('USDC', 8, 'USDT');
        }
    } catch (error) {
        console.error("测试过程中发生错误:", error);
    }
})();
