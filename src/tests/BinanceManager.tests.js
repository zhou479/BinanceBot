const { loggers } = require('winston');
const BinanceManager = require('../core/BinanceManager');
require('dotenv').config();

const accountNum = 1;
const apiKey = process.env[`ACCOUNT${accountNum}_API_KEY`];
const apiSecret = process.env[`ACCOUNT${accountNum}_API_SECRET`];

(async() => {
    const binanceManager = new BinanceManager(apiKey, apiSecret);
    const targetAsset = 'USDC';
    // 1. 查询现货账户资产
    if (false) {
        const spotResult = await binanceManager.querySpotAccount(accountNum, targetAsset);
        console.log(spotResult.spotAccountInfo);
    }

    // 2. 查询杠杆账户信息
    if (false) {
        const marginResult = await binanceManager.queryMarginAccount(accountNum);
        const assetsInfo = marginResult.marginAccountInfo.userAssets;
        const assetInfo = assetsInfo.find(asset => asset.asset === targetAsset);
        console.log(assetInfo);
    }

    // 3. 查询资金账户信息
    if (false) {
        const fundingResult = await binanceManager.queryFundingAccount(accountNum, targetAsset);
        console.log(fundingResult.fundingAccountInfo);
    }

    // 4. 查询交易对信息
    if (false) {
        const symbolInfoResult = await binanceManager.querySymbolInfo(accountNum, 'BTCUSDT');
        console.log(symbolInfoResult);
    }

    // 5. 查询服务器时间戳
    if (false) {
        const serverTimeResult = await binanceManager.queryServerTime(accountNum);
        console.log(serverTimeResult);
    }

    // 5. 查询贷款订单信息
    if (false) {
        const loanResult = await binanceManager.queryLoanOrderInfo(accountNum);
        console.log(loanResult);
    }

    // 6. 万向资金划转
    if (false) {
        const transferResult = await binanceManager.universalTransfer(accountNum, 'BTC', 0.001, 'SPOT', 'FUTURES');
        console.log(transferResult);
    }

    // 7. 质押借贷
    if (false) {
        const loanApplyResult = await binanceManager.flexibleLoan(accountNum, 'BTC', 0.001, 'USDT');
        console.log(loanApplyResult);
    }

    // 8. 市价挂单
    if (false) {
        const marketOrderResult = await binanceManager.placeMarketOrder(accountNum, 'BTCUSDT', 'BUY', 0.001);
        console.log(marketOrderResult);
    }

    // 9. 限价挂单
    if (false) {
        const limitOrderResult = await binanceManager.placeLimitOrder(accountNum, 'BTCUSDT', 'BUY', 0.001, 10000);
        console.log(limitOrderResult);
    }

    // 10. 取消订单
    if (false) {
        const cancelResult = await binanceManager.cancelOrder(accountNum, 'BTCUSDT');
        console.log(cancelResult);
    }

    // 11. Launchpool质押
    if (false) {
        const launchpoolResult = await binanceManager.stakeLaunchpool(accountNum, '1', 0.001);
        console.log(launchpoolResult);
    }

    // 12. 杠杆借贷
    if (false) {
        const marginBorrowResult = await binanceManager.marginBorrow(accountNum, 'BTC', 0.001, 'LOAN');
        console.log(marginBorrowResult);
    }

    // 13. 提现
    if (false) {
        const withdrawResult = await binanceManager.withdraw(accountNum, 'BTC', 0.001, '1234567890', 'TRC20');
        console.log(withdrawResult);
    }
    // 14. 获取链上赚币产品
    if(false) {
        try{
            while(true) {
                await binanceManager.getOnChainInfo();
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch(error) {
            loggers.error('循环执行出错，继续')
        }
    }

    // 15. 提现测试
    if(false) {
        try{
            const address = 'xxx';
            const withdrawResult = await binanceManager.binanceWithdraw(accountNum, 'USDT', 1, address);
            console.log(withdrawResult);
        } catch(error) {
            console.log(error);
        }
    }
    // 16. 获取币种信息
    if(false) {
        const symbolBalanceResult = await binanceManager.getSymbolBalance(accountNum, 'USDT');
        // console.log(symbolBalanceResult);
    }
})();

