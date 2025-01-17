const logger = require('./SetLogger');
const { MainClient } = require('binance');

class BinanceManager {
    constructor(apiKey, apiSecret) {
        this.client = new MainClient({
            api_key: apiKey,
            api_secret: apiSecret
        });
    }
    
    // 1. 查询现货持仓
    async querySpotAccount(accountNum, coin = '') {
        try {
            const queryAssetsResult = await this.client.getUserAsset({asset: coin});
            return {
                success: true,
                assets: queryAssetsResult
            }
        } catch (error) {
            logger.error(`Account ${accountNum} | queryAssets函数错误: ${error.message}`);
            return {success: false, assets: null}
        }
    }

    // 2. 查询杠杆账户信息
    async queryMarginAccount(accountNum) {
        try {   
            const queryMarginAccountResult = await this.client.queryCrossMarginAccountDetails();
            // console.log(queryMarginAccountResult);
            return {
                success: true,
                marginAccountInfo: queryMarginAccountResult
            }
        } catch (error) {
            logger.error(`Account ${accountNum} | queryMarginAccount函数错误: ${error.message}`);
            return {success: false, marginAccountInfo: null}
        }

    }

    // 3. 质押借贷
    async flexibleLoan(accountNum,loanCoin, loanAmount=0, collateralCoin, collateralAmount=0) {
        try {
            if (loanAmount === 0 && collateralAmount === 0) {
                throw new Error(`质押借贷中借款数量和抵押数量不能同时为0`);
            }

            const params = {
                loanCoin: loanCoin,
                collateralCoin: collateralCoin,
                ...(loanAmount !== 0 && { loanAmount }),
                ...(collateralAmount !== 0 && { collateralAmount })
            }

            const flexibleLoanResult = await this.client.borrowCryptoLoanFlexible(params);
            return {
                success: true,
                flexibleLoanResult: flexibleLoanResult
            }
        } catch (error) {
            logger.error(`Account ${accountNum} | flexibleLoan函数错误: ${error.message}`);
            return {success: false, flexibleLoanResult: null}
        }
    }

    // 4. 查询借贷订单信息
    async queryLoanOrderInfo(accountNum) {
        try {
            const queryLoanOrderInfoResult = await this.client.getCryptoLoanFlexibleOngoingOrders();
            return {
                success: true,
                queryLoanOrderInfo: queryLoanOrderInfoResult.rows
            }
        } catch (error) {
            logger.error(`Account ${accountNum} | queryLoanOrderInfo函数错误: ${error.message}`);
            return {success: false, queryLoanOrderInfo: null}
        }
    }

    // 3. 万向划转资金
    async universalTransfer(asset, amount, fromAccount, toAccount) {
        const params = {
            asset: asset,
            amount: amount,
            fromAccount: fromAccount,
            toAccount: toAccount
        }
        const universalTransferResult = await this.client.submitUniversalTransfer(params);
        
    }

    // 4. 现货市价挂单
    async placeMarketOrder(accountNum, symbol, side, quantity) {
        // 挂单参数
        const params = {
            symbol: symbol,
            side: side,
            type: 'MARKET',
            quantity: quantity,
        }
        
        try {
            const placeMarketOrderResult = await this.client.submitNewOrder(params);
            return {
                success: true,
                placeMarketOrderResult: placeMarketOrderResult
            }
        } catch (error) {
            logger.error(`Account ${accountNum} | placeMarketOrder函数错误: ${error.message}`);
            return {success: false, placeMarketOrderResult: null}
        }
    }

    // 5. 现货限价挂单
    async placeLimitOrder(accountNum, symbol, side, quantity, price) {
        const params = {
            symbol: symbol,
            side: side,
            type: 'LIMIT',
            timeInForce: 'GTC',
            quantity: quantity,
            price: price
        }
        try {
            const placeLimitOrderResult = await this.client.submitNewOrder(params);
            return {
                success: true,
                placeLimitOrderResult: placeLimitOrderResult
            }
        } catch (error) {
            logger.error(`Account ${accountNum} | placeLimitOrder函数错误: ${error.message}`);
            return {success: false, placeLimitOrderResult: null}
        }   
    }

    // 6. 取消挂单
    async cancelOrder(accountNum, symbol) {
        try {
            const cancelOrderResult = await this.client.cancelAllSymbolOrders({symbol: symbol});
            return {
                success: true,
                cancelOrderResult: cancelOrderResult
            }
        } catch (error) {
            if (error.code && error.code == '-2011') {
                logger.warn(`Account ${accountNum} | 暂无订单可以取消`);
                return {success: false, errorCode: error.code}
            } else {
                logger.error(`Account ${accountNum} | cancelOrder函数错误: ${error.message}`);
            }
            return {success: false, cancelOrderResult: null}
        }
    }

    // 7. 查询交易对信息
    async querySymbolInfo(accountNum, symbol) {
        try {   
            const querySymbolInfoResult = await this.client.getExchangeInfo({symbol: symbol});
            // console.log(querySymbolInfoResult);
            return {
                success: true,
                querySymbolInfo: querySymbolInfoResult
            }
        } catch (error) {
            logger.error(`Account ${accountNum} | querySymbolInfo函数错误: ${error.message}`);
            return {success: false, querySymbolInfoResult: null}
        }
    }
    // 6. 操作launchpool
    // 7. 质押和杠杆借贷
    // 8. 提现功能

}

module.exports = BinanceManager;