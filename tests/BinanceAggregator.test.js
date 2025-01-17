const BinanceAggregator = require('../src/BinanceAggregator');
const { config, accountsList } = require('../src/config');

(async () => {
    const binanceAggregator = new BinanceAggregator(accountsList[0]);
    // await binanceAggregator.continuousFlexibleLoan('FDUSD', 100, 'USDT');

    const spotBalance = await binanceAggregator.tradePreparation('USUAL');
    // console.log(spotBalance);
})();
