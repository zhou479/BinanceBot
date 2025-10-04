const logger = require('../utils/SetLogger');
const { MainClient } = require('binance');

/**
 * 币安API管理器类
 * 提供与币安API交互的底层方法集合
 */
class BinanceManager {
    /**
     * 构造函数
     * @param {string} apiKey - 币安API密钥
     * @param {string} apiSecret - 币安API密钥
     */
    constructor(apiKey, apiSecret) {
        this.client = new MainClient({
            api_key: apiKey,
            api_secret: apiSecret
        });
    }

    /* --- 账户信息查询相关函数 --- */
    
    /**
     * 1. 查询现货账户持仓
     * @param {string} accountNum - 账户编号(用于日志记录)
     * @param {string} asset - 币种，不传则查询全部币种
     * @returns {Object} 包含success状态和assets数据的对象
     */
    async querySpotAccount(accountNum, asset = '') {
        try {
            // 检查是否传入了asset参数  
            const querySpotAccountParams = asset ? {asset: asset} : {};
            const querySpotAccountResult = await this.client.getUserAsset(querySpotAccountParams);
            return {
                success: true,
                spotAccountInfo: querySpotAccountResult
            }
        } catch (error) {
            logger.error(`Account ${accountNum} | querySpotAccount函数错误: ${error.message}`);
            return {success: false, assets: null}
        }
    }

    /**
     * 2. 查询全仓杠杆账户信息
     * @param {string} accountNum - 账户编号(用于日志记录)
     * @returns {Object} 包含success状态和marginAccountInfo数据的对象
     */
    async queryMarginAccount(accountNum) {
        try {   
            const queryMarginAccountResult = await this.client.queryCrossMarginAccountDetails();
            return {
                success: true,
                marginAccountInfo: queryMarginAccountResult
            }
        } catch (error) {
            logger.error(`Account ${accountNum} | queryMarginAccount函数错误: ${error.message}`);
            return {success: false, marginAccountInfo: null}
        }
    }

    /**
     * 3. 查询资金账户信息  
     * @param {string} accountNum - 账户编号(用于日志记录)
     * @returns {Object} 包含success状态和queryFundingAccount数据的对象
     */
    async queryFundingAccount(accountNum, asset = '') {
        try {
            // 检查是否传入了asset参数
            const queryFundingAccountParams = asset ? {asset: asset} : {};
            const queryFundingAccountResult = await this.client.getFundingAsset(queryFundingAccountParams);
            return {
                success: true,
                fundingAccountInfo: queryFundingAccountResult
            }
        } catch (error) {
            logger.error(`Account ${accountNum} | queryFundingAccount函数错误: ${error.message}`);  
            return {success: false, queryFundingAccount: null}
        }
    }

    /**
     * 3. 查询交易对信息
     * @param {string} accountNum - 账户编号(用于日志记录)
     * @param {string} symbol - 交易对名称，例如"BTCUSDT"
     * @returns {Object} 包含success状态和querySymbolInfo数据的对象
     */
    async querySymbolInfo(accountNum, symbol) {
        try {   
            const querySymbolInfoResult = await this.client.getExchangeInfo({symbol: symbol});
            return {
                success: true,
                querySymbolInfo: querySymbolInfoResult
            }
        } catch (error) {
            logger.error(`Account ${accountNum} | querySymbolInfo函数错误: ${error.message}`);
            return {success: false, querySymbolInfo: null}
        }
    }
    
    /**
     * 4. 查询服务器时间戳
     * @param {string} accountNum - 账户编号(用于日志记录)
     * @returns {Object} 包含success状态和serverTime数据的对象
     */
    async queryServerTime(accountNum) {
        try {
            const queryServerTimeResult = await this.client.getServerTime();
            return {success: true, serverTime: queryServerTimeResult}
        } catch (error) {
            logger.error(`Account ${accountNum} | queryServerTime函数错误: ${error.message}`);
            return {success: false, serverTime: null}
        }
    }
    
    /**
     * 5. 查询质押借贷订单信息
     * @param {string} accountNum - 账户编号(用于日志记录)
     * @returns {Object} 包含success状态和queryLoanOrderInfo数据的对象
     */
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


    /* --- 资金操作相关函数 --- */

    /**
     * 6. 万向资金划转
     * @param {string} accountNum - 账户编号(用于日志记录)
     * @param {string} type - 划转类型，例如'SPOT_MARGIN'
     * @param {string} asset - 划转的资产名称
     * @param {string|number} amount - 划转数量
     * @param {string} fromAccount - 源账户类型，例如'SPOT'
     * @param {string} toAccount - 目标账户类型，例如'MARGIN'
     * @returns {Object} 包含success状态和universalTransferResult数据的对象
     */
    async universalTransfer(accountNum, asset, amount, fromAccount, toAccount) {
        try {
            // 参数验证
            if (!asset || !amount || !fromAccount || !toAccount) {
                throw new Error('划转参数不完整，请确保资产、数量、源账户和目标账户都已提供');
            }

            // MAIN_MARGIN 现货钱包转向杠杆全仓钱包
            // MARGIN_MAIN 杠杆全仓钱包转向现货钱包
            // MAIN_FUNDING 现货钱包转向资金钱包
            // FUNDING_MAIN 资金钱包转向现货钱包
            let type = '';
            if (fromAccount === 'SPOT' && toAccount === 'MARGIN') {
                type = 'MAIN_MARGIN';
            } else if (fromAccount === 'MARGIN' && toAccount === 'SPOT') {
                type = 'MARGIN_MAIN';
            } else if (fromAccount === 'SPOT' && toAccount === 'FUNDING') {
                type = 'MAIN_FUNDING';
            } else if (fromAccount === 'FUNDING' && toAccount === 'SPOT') {
                type = 'FUNDING_MAIN';
            }

            const params = {
                type: type,
                asset: asset,
                amount: amount,
            }
            const universalTransferResult = await this.client.submitUniversalTransfer(params);
            return {
                success: true,
                universalTransferResult: universalTransferResult
            }
        } catch (error) {
            logger.error(`Account ${accountNum} | universalTransfer函数错误: ${error.message}`);
            return {success: false, universalTransferResult: null}
        }
    }

    /**
     * 7. 质押借贷
     * @param {string} accountNum - 账户编号(用于日志记录)
     * @param {string} loanCoin - 借贷币种
     * @param {string|number} loanAmount - 借贷数量，0表示不指定
     * @param {string} collateralCoin - 抵押币种
     * @param {string|number} collateralAmount - 抵押数量，0表示不指定
     * @returns {Object} 包含success状态和flexibleLoanResult数据的对象
     */
    async flexibleLoan(accountNum, loanCoin, loanAmount=0, collateralCoin, collateralAmount=0) {
        try {
            // 参数验证
            if (!loanCoin || !collateralCoin) {
                throw new Error('借贷币种和抵押币种不能为空');
            }
            
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
            if (flexibleLoanResult.status === 'Succeeds') {
                return {
                    success: true,
                    flexibleLoanResult: flexibleLoanResult
                }
            } else {
                return {success: false, flexibleLoanResult: null}
            }
        } catch (error) {
            logger.error(`Account ${accountNum} | flexibleLoan函数错误: ${error.message}`);
            return {success: false, flexibleLoanResult: null}
        }
    }

    /**
     * 8. 杠杆借贷实现 done
     * @param {string} accountNum - 账户编号
     * @param {string} asset - 借贷资产
     * @param {string|number} amount - 借贷数量
     * @returns {Object} 包含success状态和结果数据的对象
     */
    async marginBorrow(accountNum, asset, amount, type) {
        try {
            // 参数验证
            if (!asset || !amount) {
                throw new Error('借贷资产和数量不能为空');
            }
            
            const params = {
                asset: asset,
                isIsolated: false,  // false为全仓借贷, true为逐仓借贷
                amount: amount,
                type: type
            };
            
            const marginBorrowResult = await this.client.submitMarginAccountBorrowRepay(params);
            return {
                success: true,
                marginBorrowResult: marginBorrowResult
            };
        } catch (error) {
            logger.error(`Account ${accountNum} | marginBorrow函数错误: ${error.message}`);
            return {success: false, marginBorrowResult: null};
        }
    }
    
    /* --- 交易相关函数 --- */

    /**
     * 8. 现货市价挂单
     * @param {string} accountNum - 账户编号(用于日志记录)
     * @param {string} symbol - 交易对名称，例如"BTCUSDT"
     * @param {string} side - 买卖方向，"BUY"或"SELL"
     * @param {string|number} quantity - 交易数量
     * @returns {Object} 包含success状态和placeMarketOrderResult数据的对象
     */
    async placeMarketOrder(accountNum, symbol, side, quantity) {
        try {
            // 参数验证
            if (!symbol || !side || !quantity) {
                throw new Error('交易参数不完整，请确保交易对、方向和数量都已提供');
            }
            
            if (side !== 'BUY' && side !== 'SELL') {
                throw new Error('交易方向必须为BUY或SELL');
            }
            
            // 挂单参数
            const params = {
                symbol: symbol,
                side: side,
                type: 'MARKET',
                quantity: quantity,
            }
            
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

    /**
     * 9. 现货限价挂单
     * @param {string} accountNum - 账户编号(用于日志记录)
     * @param {string} symbol - 交易对名称，例如"BTCUSDT"
     * @param {string} side - 买卖方向，"BUY"或"SELL"
     * @param {string|number} quantity - 交易数量
     * @param {string|number} price - 限价价格
     * @returns {Object} 包含success状态和placeLimitOrderResult数据的对象
     */
    async placeLimitOrder(accountNum, symbol, side, quantity, price) {
        try {
            // 参数验证
            if (!symbol || !side || !quantity || !price) {
                throw new Error('交易参数不完整，请确保交易对、方向、数量和价格都已提供');
            }
            
            if (side !== 'BUY' && side !== 'SELL') {
                throw new Error('交易方向必须为BUY或SELL');
            }
            
            const params = {
                symbol: symbol,
                side: side,
                type: 'LIMIT',
                timeInForce: 'GTC',
                quantity: quantity,
                price: price
            }
            
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

    /**
     * 10. 取消挂单
     * @param {string} accountNum - 账户编号(用于日志记录)
     * @param {string} symbol - 交易对名称，例如"BTCUSDT"
     * @returns {Object} 包含success状态和cancelOrderResult数据的对象
     */
    async cancelOrder(accountNum, symbol) {
        try {
            // 参数验证
            if (!symbol) {
                throw new Error('交易对不能为空');
            }
            
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

    /**
     * 11. 获取K线数据
    */
    async getKlines(accountNum, symbol, interval, limit) {
        try {
            const klines = await this.client.getKlines(symbol, interval, limit);
            return {success: true, klines: klines}
        } catch (error) {
            logger.error(`Account ${accountNum} | getKlines函数错误: ${error.message}`);
            return {success: false, klines: null}
        }   
    }

    /**
     * 12. 获取链上赚币产品
     */
    async getOnChainInfo() {
        try{
            // const onChainInfo = await this.client.getOnchainYieldsLockedProducts();
            const subscribeOnChainProduct = await this.client.subscribeOnchainYieldsLockedProduct({
                projectId: 'Plasma-USDT-60D',
                amount: 50000
                }
            );
            
            // console.log(onChainInfo.rows);
            console.log(subscribeOnChainProduct.success);
        } catch (error) {
            // console.log(error);
            logger.error(error.message);
        }
    }

    /**
     * 13. 提现操作
     */
    async binanceWithdraw(accountNum, withdrawParams) {
        try {
            
            const binanceWithdrawResult = await this.client.withdraw(withdrawParams);
            // console.log(binanceWithdrawResult);
            return {success: true, binanceWithdrawResult: binanceWithdrawResult}
        } catch (error) {
            logger.error(`Account ${accountNum} | binanceWithdraw函数错误: ${error.message}`);
            return {success: false, binanceWithdrawResult: null}
        }
    }

    /**
     * 14. 获取币种信息
     */
    async getSymbolBalance(accountNum, symbol) {
        const getSymbolBalanceResult = await this.client.getBalances();
        if(getSymbolBalanceResult.forEach(item => {
            if(item.coin === symbol) {
                console.log(item);
            }
        }));
    }
}
module.exports = BinanceManager;