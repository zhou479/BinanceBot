const { default: Decimal } = require('decimal.js');
const BinanceManager = require('./BinanceManager');
const logger = require('./SetLogger');

class BinanceAggregator {
    constructor(accountConfig) {
        this.accountNum = accountConfig.accountNum;
        this.binanceManager = new BinanceManager(
            accountConfig.apiKey,
            accountConfig.apiSecret,
        );
    }

    // 查询现货账户持仓
    async querySpotAssets() {
        try {
            const queryAssetsResult = await this.binanceManager.querySpotAccount(this.accountNum);
            if (queryAssetsResult.success) {
                const assetsList = queryAssetsResult.assets;
                assetsList.forEach(asset => {
                    logger.success(`Account ${this.accountNum} | 现货账户币种 ${asset.asset} 余额 ${asset.free}`);
                });
            } else {
                throw new Error(`查询现货账户持仓失败`);
            }
        } catch (error) {
            logger.error(`Account ${this.accountNum} | 查询现货账户持仓失败: ${error.message}`);
        }
    }

    // 持续进行质押借贷, 待测试...
    async continuousFlexibleLoan(loanCoin, initialLoanAmount=0, collateralCoin, collateralAmount=0, loanTargetAmount=10) {
        // 常量配置
        const QUERY_INTERVAL = 5; // 每5次借贷操作查询一次
        const LOAN_AMOUNT_ADJUST_RATE = 1.2; // 成功时增加20%
        const MIN_LOAN_AMOUNT = initialLoanAmount * 0.5; // 最小借贷数量
        const NEAR_TARGET_THRESHOLD = loanTargetAmount * 0.1; // 接近目标值的阈值（剩余10%时）
        
        let currentLoanAmount = initialLoanAmount;
        let queryCounter = 0;
        let lastKnownDebt = 0;
        let consecutiveErrors = 0; // 连续错误计数

        while (true) {
            try {
                // 每QUERY_INTERVAL次借贷操作或首次运行时查询当前借贷情况
                if (queryCounter % QUERY_INTERVAL === 0 || queryCounter === 0) {
                    const queryLoanOrderInfoResult = await this.binanceManager.queryLoanOrderInfo(this.accountNum);
                    if (!queryLoanOrderInfoResult.success) {
                        throw new Error(`查询借贷订单信息失败`);
                    }
                    
                    const loanOrderInfoList = queryLoanOrderInfoResult.queryLoanOrderInfo;
                    if (loanOrderInfoList.length === 0) {
                        logger.warn(`Account ${this.accountNum} | 目前没有正在进行的借贷订单`);
                        lastKnownDebt = 0;
                    } else {
                        const loanCoinInfo = loanOrderInfoList.find(coin => coin.loanCoin === loanCoin);
                        lastKnownDebt = loanCoinInfo ? loanCoinInfo.totalDebt : 0;
                        logger.info(`Account ${this.accountNum} | 币种 ${loanCoin} 当前借贷数量为 ${lastKnownDebt}`);
                        
                        if (lastKnownDebt >= loanTargetAmount) {
                            logger.info(`Account ${this.accountNum} | 已达到目标借贷数量 ${loanTargetAmount}`);
                            return;
                        }
                    }
                }

                // 计算剩余需要借贷的数量
                const remainingAmount = loanTargetAmount - lastKnownDebt;

                // 如果接近目标值，直接借出差值
                if (remainingAmount <= NEAR_TARGET_THRESHOLD) {
                    currentLoanAmount = remainingAmount;
                    logger.info(`Account ${this.accountNum} | 接近目标值，直接借出差值: ${remainingAmount}`);
                }

                // 执行借贷操作
                await this.binanceManager.flexibleLoan(
                    this.accountNum, 
                    loanCoin, 
                    currentLoanAmount, 
                    collateralCoin, 
                    collateralAmount
                );

                // 借贷成功，重置错误计数并增加借贷数量
                consecutiveErrors = 0;
                currentLoanAmount = Math.min(
                    currentLoanAmount * LOAN_AMOUNT_ADJUST_RATE,
                    remainingAmount
                );
                logger.info(`Account ${this.accountNum} | 借贷成功，下次借贷数量: ${currentLoanAmount}`);

                // 添加随机延时，避免请求过于频繁
                await this.sleep(1000 + Math.random() * 1000);

            } catch (error) {
                consecutiveErrors++;
                logger.error(`Account ${this.accountNum} | 执行出错 (${consecutiveErrors}次): ${error.message}`);

                // 根据连续错误次数增加等待时间
                const waitTime = Math.min(consecutiveErrors * 2000, 30000);
                logger.info(`等待 ${waitTime/1000} 秒后重试...`);
                await this.sleep(waitTime);

                // 减少借贷数量
                currentLoanAmount = Math.max(
                    currentLoanAmount * 0.8,
                    MIN_LOAN_AMOUNT
                );
                logger.warn(`Account ${this.accountNum} | 调整借贷数量为: ${currentLoanAmount}`);
            }

            queryCounter++;
        }
    }

    // 辅助函数：睡眠
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 计算交易数量
    async calTradeAmount(spotAssetBalance, stepSize) {
        try {
            const balance = new Decimal(spotAssetBalance);
            const precision = new Decimal(stepSize);
            const tradeAmount = new Decimal(balance).div(precision).floor().mul(precision).toString();
            return tradeAmount;
        } catch (error) {
            logger.error(`Account${this.accountNum} | calTradeAmount出现错误: ${error.message}`);
        }
    }

    // 交易前准备工作
    async tradePreparation(symbol) {
        try {
            // 查询现货账户持仓
            const querySpotAssetsResult = await this.binanceManager.querySpotAccount(this.accountNum, symbol);
            if (!querySpotAssetsResult.success) {
                throw new Error(`查询现货账户持仓失败`);
            }

            if (querySpotAssetsResult.assets.length === 0) {
                throw new Error(`现货账户 ${symbol} 持仓为空`);
            }
            const spotAssetBalance = querySpotAssetsResult.assets[0].free;
            
            // 币安默认为现货账户，不进行划转操作

            // 查询该币种交易对信息，获取下单数量精度和最小值
            const querySymbolInfoResult = await this.binanceManager.querySymbolInfo(this.accountNum, `${symbol}USDT`);
            if (!querySymbolInfoResult.success) {
                throw new Error(`查询交易对信息失败`);
            }
            const symbolInfo = querySymbolInfoResult.querySymbolInfo.symbols[0];
            const symbolFilters = symbolInfo.filters;
            const LOT_SIZE_Filter = symbolFilters.find(filter => filter.filterType === 'LOT_SIZE');
            const minQty = LOT_SIZE_Filter.minQty;          // 最小下单数量
            const stepSize = LOT_SIZE_Filter.stepSize;      // 下单数量精度
            
            // 计算账户最大可下单数量，并判断是否大于系统最小下单值
            const tradeAmount = await this.calTradeAmount(spotAssetBalance, stepSize);
            if (new Decimal(tradeAmount).lessThan(new Decimal(minQty))) {
                throw new Error(`余额不足最小下单数量, 余额: ${tradeAmount}, 最小下单量: ${minQty}`);
            }
            return {success: true, tradeAmount: tradeAmount};

        } catch(error) {
            logger.error(`Account ${this.accountNum} | 挂单交易前准备工作失败: ${error.message}`);
            return {success: false, tradeAmount: null}
        }
    }

    // 进行现货市价挂单交易
    async submitMarketOrder(symbol, side) {
        try{
            // 下单前准备工作
            const tradePreparationResult = await this.tradePreparation(symbol);
            if (!tradePreparationResult.success) {
                throw new Error(`现货挂单交易前准备工作失败`);
            }

            const submitMarketOrderResult = await this.binanceManager.placeMarketOrder(this.accountNum, `${symbol}USDT`, side, tradePreparationResult.tradeAmount);
            if (!submitMarketOrderResult.success) {
                throw new Error(`现货挂单交易失败`);
            }

            logger.success(`Account ${this.accountNum} | 现货挂单交易成功`);
        } catch(error) {
            logger.error(`Account ${this.accountNum} | 现货挂单交易失败: ${error.message}`);
        }
    }

    // 现货限价挂单交易
    async submitLimitOrder(symbol, side, price) {
        try {
            // 下单前准备工作
            const tradePreparationResult = await this.tradePreparation(symbol);
            if (!tradePreparationResult.success) {
                throw new Error(`现货挂单交易前准备工作失败`);
            }

            // 执行现货限价挂单交易
            const submitLimitOrderResult = await this.binanceManager.placeLimitOrder(this.accountNum, `${symbol}USDT`, side, tradePreparationResult.tradeAmount, price);
            if (!submitLimitOrderResult.success) {
                throw new Error(`现货限价挂单交易失败`);
            }

            logger.success(`Account ${this.accountNum} | 现货限价挂单交易成功`);
        } catch(error) {
            logger.error(`Account ${this.accountNum} | 现货限价挂单交易失败: ${error.message}`);
        }
    }

    // 取消订单
    async cancelOrders(symbol) {
        try {
            const cancelOrderResult = await this.binanceManager.cancelOrder(this.accountNum, `${symbol}USDT`);
            if (!cancelOrderResult.success && cancelOrderResult.errorCode == '-2011') {
                logger.warn(`Account ${this.accountNum} | 暂无订单可以取消`);
            }

            else if (!cancelOrderResult.success) {
                throw new Error(`取消订单失败`);
            } else {
                logger.success(`Account ${this.accountNum} | 取消订单成功`);
            }
        } catch(error) {
            logger.error(`Account ${this.accountNum} | 取消订单失败: ${error.message}`);
        }
    }
}

module.exports = BinanceAggregator;
