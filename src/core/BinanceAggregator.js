const { default: Decimal } = require('decimal.js');
const BinanceManager = require('./BinanceManager');
const logger = require('../utils/SetLogger');
const { config } = require('../config/config');
/**
 * 币安交易聚合器类
 * 将BinanceManager提供的基础功能组合成更高级的业务功能
 */
class BinanceAggregator {
    /**
     * 构造函数
     * @param {Object} accountConfig - 账户配置信息
     * @param {string} accountConfig.accountNum - 账户编号
     * @param {string} accountConfig.apiKey - 币安API密钥
     * @param {string} accountConfig.apiSecret - 币安API密钥
     */
    constructor(accountConfig) {
        this.accountNum = accountConfig.accountNum;
        this.binanceManager = new BinanceManager(
            accountConfig.apiKey,
            accountConfig.apiSecret,
        );
    }

    /**
     * 获取账户中资产信息 包括现货、资金、杠杆账户
     * @param {string} asset - 币种
     */
    async queryAsset(targetAsset) {
        try {
            if (!targetAsset) {
                throw new Error('币种名称不能为空');
            }
            
            // 存储各账户中的资产信息
            const assetInfo = {
                spot: '无',
                funding: '无',
                margin: '无'
            };

            // 查询现货账户
            const spotResult = await this.binanceManager.querySpotAccount(this.accountNum, targetAsset);
            // console.log(spotResult.spotAccountInfo);
            if (spotResult.success && spotResult.spotAccountInfo.length > 0) {
                assetInfo.spot = spotResult.spotAccountInfo[0].free;
            } else if (spotResult.success && spotResult.spotAccountInfo.length === 0) {
                assetInfo.spot = '0';
            } else {
                assetInfo.spot = '现货账户查询失败';
            }
            
            // 查询资金账户
            const fundingResult = await this.binanceManager.queryFundingAccount(this.accountNum, targetAsset);
            if (fundingResult.success && fundingResult.fundingAccountInfo.length > 0) {
                assetInfo.funding = fundingResult.fundingAccountInfo[0].free;
            } else if (fundingResult.success && fundingResult.fundingAccountInfo.length === 0) {
                assetInfo.funding = '0';
            } else {
                assetInfo.funding = '资金账户查询失败';
            }
            
            // 查询杠杆账户
            const marginResult = await this.binanceManager.queryMarginAccount(this.accountNum);
            if (marginResult.success && marginResult.marginAccountInfo.userAssets.find(asset => asset.asset === targetAsset)) {
                assetInfo.margin = marginResult.marginAccountInfo.userAssets.find(asset => asset.asset === targetAsset).free;
            } else {
                assetInfo.margin = '杠杆账户查询失败';
            }

            // 使用更灵活的表格生成方案，根据内容自动调整表格宽度
            function getStringDisplayWidth(str) {
                let width = 0;
                for (const char of str) {
                    width += /[\u4e00-\u9fa5]/.test(char) ? 2 : 1;
                }
                return width;
            }
            
            // 计算每列需要的最小宽度
            const titles = ['现货账户', '资金账户', '杠杆账户'];
            const values = [assetInfo.spot.toString(), assetInfo.funding.toString(), assetInfo.margin.toString()];
            
            // 计算每列所需的最小宽度（标题宽度和值宽度中的较大值，再加上左右边距）
            const colWidths = titles.map((title, index) => {
                const titleWidth = getStringDisplayWidth(title);
                const valueWidth = getStringDisplayWidth(values[index]);
                // 每列至少需要的宽度 = max(标题宽度, 值宽度) + 左右边距(4)
                return Math.max(titleWidth, valueWidth) + 4;
            });
            
            // 生成表格边框和分隔线
            function generateLine(char1, char2, char3, widths, char4) {
                return char1 + widths.map(w => char2.repeat(w)).join(char3) + char4;
            }
            
            // 生成表格内容行
            function generateRow(contents, widths, alignment = 'center') {
                return '│' + contents.map((content, i) => {
                    const displayWidth = getStringDisplayWidth(content);
                    const padding = widths[i] - displayWidth;
                    
                    if (alignment === 'center') {
                        // 居中对齐
                        const leftPadding = Math.floor(padding / 2);
                        const rightPadding = padding - leftPadding;
                        return ' '.repeat(leftPadding) + content + ' '.repeat(rightPadding);
                    } else if (alignment === 'left') {
                        // 左对齐
                        return ' ' + content + ' '.repeat(padding - 1);
                    } else {
                        // 右对齐
                        return ' '.repeat(padding - 1) + content + ' ';
                    }
                }).join('│') + '│';
            }
            
            // 生成表格
            const topLine = generateLine('┌', '─', '┬', colWidths, '┐');
            const midLine = generateLine('├', '─', '┼', colWidths, '┤');
            const bottomLine = generateLine('└', '─', '┴', colWidths, '┘');
            
            // 标题行和数据行都使用居中对齐
            const headerRow = generateRow(titles, colWidths, 'center');
            const dataRow = generateRow(values, colWidths, 'center');
            
            const table = [
                `Account ${this.accountNum} | 币种 ${targetAsset} 资产情况:`,
                topLine,
                headerRow,
                midLine,
                dataRow,
                bottomLine
            ].join('\n');
            
            // 打印整个表格
            logger.info(table);
        } catch (error) {
            logger.error(`Account ${this.accountNum} | 查询资产信息失败: ${error.message}`);
        }
    }

    /**
     * 查询借贷订单信息
     * @param {string} loanCoin - 借贷币种
     * @returns {string|number|null} 返回总借贷数量，如无则返回null
     */
    async queryLoanOrderInfo(loanCoin) {
        try {
            const queryLoanOrderInfoResult = await this.binanceManager.queryLoanOrderInfo(this.accountNum);
            if (!queryLoanOrderInfoResult.success) {
                throw new Error(`查询借贷订单信息失败`);
            }

            const loanOrderInfoList = queryLoanOrderInfoResult.queryLoanOrderInfo;
            const loanCoinInfo = loanOrderInfoList.find(coin => coin.loanCoin === loanCoin);
            if (!loanCoinInfo) {
                return {success: true, loanOrderInfo: 0};
            } else {
                return {success: true, loanOrderInfo: loanCoinInfo.totalDebt};
            }
        } catch (error) {
            logger.error(`Account ${this.accountNum} | 查询借贷订单信息失败: ${error.message}`);
            return {success: false, loanOrderInfo: null};
        }
    }

    /**
     * 持续进行质押借贷
     * @param {string} loanCoin - 借贷币种
     * @param {string|number} loanTargetAmount - 目标借贷数量
     * @param {string} collateralCoin - 抵押币种
     */
    async continuousFlexibleLoan(loanCoin, loanTargetAmount, collateralCoin) {
        try {
            // 参数验证
            if (!loanCoin || !loanTargetAmount || !collateralCoin) {
                throw new Error('参数不完整，请确保借贷币种、目标数量和抵押币种都已提供');
            }
            
            // 使用Decimal进行精确计算
            let needBorrowAmount = new Decimal(0);
            let loanAmount = new Decimal(100);   // loanAmount 为每次借贷数量

            // 查询借贷订单信息，获取当前账户借贷数量
            const loanOrderInfo = await this.queryLoanOrderInfo(loanCoin);
            if (!loanOrderInfo.success) {
                logger.error(`Account ${this.accountNum} | 查询借贷订单信息失败: ${loanOrderInfo.error}`);
            } else {
                logger.info(`Account ${this.accountNum} | 币种 ${loanCoin} 当前借贷数量: ${loanOrderInfo.loanOrderInfo}`);
                needBorrowAmount = new Decimal(loanTargetAmount).minus(loanOrderInfo.loanOrderInfo);
            }

            // 计算需要借贷的数量，每次借贷成功后减去本次循环中借贷的数量，直到达到目标借贷数量
            while (true) {
                if (needBorrowAmount.lte(0)) {
                    logger.success(`Account ${this.accountNum} | 币种 ${loanCoin} 已达到目标借贷数量`);
                    break;
                }
                
                // 如果剩余借贷量小于设定的单次借贷量，调整为剩余量
                let currentLoanAmount = loanAmount;
                if (needBorrowAmount.lt(loanAmount) && needBorrowAmount.gt(0)) {
                    currentLoanAmount = needBorrowAmount;
                    // 对数值进行处理，保留到适当精度，避免过小的小数
                    currentLoanAmount = currentLoanAmount.toDecimalPlaces(8);
                    logger.info(`Account ${this.accountNum} | 调整最后一次借贷数量为: ${currentLoanAmount}`);
                }
                
                // 确保借贷金额有效 (不是极小值)
                if (currentLoanAmount.lt(0.00001)) {
                    logger.warn(`剩余借贷金额太小 (${currentLoanAmount})，视为已完成借贷`);
                    break;
                }
                
                const loanCoinResult = await this.binanceManager.flexibleLoan(this.accountNum, loanCoin, currentLoanAmount.toString(), collateralCoin, 0);
                if (!loanCoinResult.success) {
                    logger.warn(`本次借贷失败, 进行下一次借贷....`);
                } else {
                    logger.success(`Account ${this.accountNum} | 币种 ${loanCoin} 本次借贷数量: ${currentLoanAmount}`);
                    needBorrowAmount = needBorrowAmount.minus(currentLoanAmount);
                }
                // 添加延迟，避免API请求过于频繁
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error){
            logger.error(`Account ${this.accountNum} | 循环质押借贷失败: ${error.message}`);
        }
    }

    /**
     * 实现杠杆借贷功能
     * 根据目标借贷数量进行杠杆账户借贷
     * @param {string} loanCoin - 借贷币种
     * @param {string|number} loanTargetAmount - 目标借贷数量
     * @param {string} collateralCoin - 抵押币种
     */
    async continuousMarginLoan(loanCoin, loanTargetAmount, collateralCoin) {
        try {
            // 参数验证
            if (!loanCoin || !loanTargetAmount || !collateralCoin) {
                throw new Error('参数不完整，请确保借贷币种、目标数量和抵押币种都已提供');
            }
            
            // 查询现有杠杆账户信息
            const marginAccountInfo = await this.binanceManager.queryMarginAccount(this.accountNum);
            if (!marginAccountInfo.success) {
                throw new Error('查询杠杆账户失败');
            }
            
            // 获取现有借贷信息
            const borrowedAssets = marginAccountInfo.marginAccountInfo.userAssets.filter(
                asset => asset.asset === loanCoin && parseFloat(asset.borrowed) > 0
            );
            
            let currentBorrowed = new Decimal(0);
            if (borrowedAssets.length > 0) {
                currentBorrowed = new Decimal(borrowedAssets[0].borrowed);
            }
            
            logger.info(`Account ${this.accountNum} | 币种 ${loanCoin} 杠杆账户当前借贷数量: ${currentBorrowed}`);
            
            // 计算剩余需要借贷的数量
            const remainingToBorrow = new Decimal(loanTargetAmount).minus(currentBorrowed);
            
            if (remainingToBorrow.lte(0)) {
                logger.success(`Account ${this.accountNum} | 币种 ${loanCoin} 已达到目标杠杆借贷数量`);
                return;
            }
            
            // 实现杠杆借贷逻辑
            logger.info(`Account ${this.accountNum} | 需要继续借贷的数量: ${remainingToBorrow}`);
            
            // 设置单次借贷最大数量
            const maxSingleBorrow = new Decimal(5); // 单次最多借5个
            
            // 循环借贷直到达到目标数量
            let amountToGo = remainingToBorrow;
            while (amountToGo.gt(0)) {
                const thisBorrowAmount = Decimal.min(maxSingleBorrow, amountToGo).toString();
                
                // 调用杠杆借贷API
                const borrowResult = await this.binanceManager.marginBorrow(
                    this.accountNum,
                    loanCoin,
                    thisBorrowAmount
                );
                
                if (!borrowResult.success) {
                    logger.error(`Account ${this.accountNum} | 杠杆借贷失败，暂停操作`);
                    return;
                }
                
                logger.success(`Account ${this.accountNum} | ${loanCoin} 杠杆借贷成功，数量: ${thisBorrowAmount}`);
                
                // 更新剩余数量
                amountToGo = amountToGo.minus(thisBorrowAmount);
                
                // 避免过快请求
                await this.sleep(1000);
            }
            
            logger.success(`Account ${this.accountNum} | ${loanCoin} 杠杆借贷已完成，达到目标数量`);
        } catch (error) {
            logger.error(`Account ${this.accountNum} | 杠杆持续借贷失败: ${error.message}`);
        }
    }

    /**
     * 计算交易数量
     * 根据账户余额和交易对精度要求，计算实际可下单数量
     * @param {string|number} spotAssetBalance - 现货账户余额
     * @param {string|number} stepSize - 下单数量精度
     * @returns {string} 计算后的交易数量
     */
    async calTradeAmount(spotAssetBalance, stepSize) {
        try {
            const balance = new Decimal(spotAssetBalance);
            const precision = new Decimal(stepSize);
            
            // 如果余额为0，直接返回0
            if (balance.isZero()) {
                return '0';
            }
            
            const tradeAmount = new Decimal(balance).div(precision).floor().mul(precision).toString();
            return tradeAmount;
        } catch (error) {
            logger.error(`Account${this.accountNum} | calTradeAmount出现错误: ${error.message}`);
            return '0';
        }
    }


    /**
     * 交易前准备工作:
     * 1 检查资产并设置资金账户转现货账户
     * 2 计算并设置下单数量
     * 
     * @param {string} symbol - 交易币种，如"BTC"（不含USDT）
     * @param {string|number} [tradeAmount] - 可选的指定交易数量
     * @returns {Object} 包含success状态和tradeAmount数据的对象
     */
    async tradePreparation(coin) {
        try {
            // 1 检查资金账户是否有待交易资产，有则划转至现货账户
            const assetFundingAccount = await this.binanceManager.queryFundingAccount(this.accountNum, coin);
            if (!assetFundingAccount.success) {
                throw new Error(`查询资金账户是否有 ${coin} 资产失败`);
            }
            if (assetFundingAccount.fundingAccountInfo.length === 0) {
                logger.info(`Account ${this.accountNum} | 资金账户中无 ${coin} 资产`);
            } else {
                const assetBalance = assetFundingAccount.fundingAccountInfo[0].free;
                if (assetBalance !== 0) {
                    // 资金账户有待交易资产，则划转至现货账户
                    const transferResult = await this.transferFunds(coin, assetBalance, 'FUNDING', 'SPOT');
                    if (!transferResult.success) {
                        throw new Error(`资金账户划转至现货账户失败`);
                    }
                    logger.success(`Account ${this.accountNum} | 资金账户划转至现货账户成功，数量: ${assetBalance} ${coin}`);
                }
            }

            // 2 检查现货账户是否有待交易资产
            const querySpotAssetsResult = await this.binanceManager.querySpotAccount(this.accountNum, coin);
            if (!querySpotAssetsResult.success) {
                throw new Error(`现货账户持仓失败`);
            }

            if (querySpotAssetsResult.spotAccountInfo.length === 0) {
                throw new Error(`现货账户无 ${coin} 资产, 无法下单交易!`);
            }
            const spotAssetBalance = querySpotAssetsResult.spotAccountInfo[0].free;


            // 3 获取交易对信息中的字段
            const symbolInfo = await this.binanceManager.querySymbolInfo(this.accountNum, `${coin}USDT`);
            if (!symbolInfo.success) {
                throw new Error(`获取交易对 ${coin}USDT 信息失败`);
            }
            const symbolFilters = symbolInfo.querySymbolInfo.symbols[0].filters;
            const LOT_SIZE_Filter = symbolFilters.find(filter => filter.filterType === 'LOT_SIZE');
            const minQty = LOT_SIZE_Filter.minQty;          // 最小下单数量
            const stepSize = LOT_SIZE_Filter.stepSize;      // 下单数量精度

            // 4 计算账户最大可下单数量，并判断是否大于系统最小下单值
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

    /**
     * 现货市价挂单交易
     * @param {string} symbol - 交易币种，如"BTC"（不含USDT）
     * @param {string} side - 交易方向，"BUY"或"SELL"
     */
    async submitMarketOrder(symbol, side, tradeAmount) {
        try{
            let tradeAmountParam = '';
            // 参数验证
            if (side == 'BUY') {
                if (!tradeAmount) {
                    throw new Error('需要指定买单数量才能进行交易');
                }
                tradeAmountParam = tradeAmount;
            }

            if (side == 'SELL') {
                if (!tradeAmount) {
                    const tradePreparationResult = await this.tradePreparation(symbol, tradeAmount);
                    if (!tradePreparationResult.success) {
                        throw new Error(`现货挂单交易前准备工作失败`);
                    }
                    tradeAmountParam = tradePreparationResult.tradeAmount;
                } else {
                    tradeAmountParam = tradeAmount;
                }
            }

            const submitMarketOrderResult = await this.binanceManager.placeMarketOrder(
                this.accountNum, 
                `${symbol}USDT`, 
                side, 
                tradeAmountParam
            );

            if (!submitMarketOrderResult.success) {
                throw new Error(`现货挂单交易失败`);
            }

            logger.success(`Account ${this.accountNum} | 现货市价挂单交易成功，币种: ${symbol}，方向: ${side}，数量: ${tradeAmountParam}`);
        } catch(error) {
            logger.error(`Account ${this.accountNum} | ${error.message}`);
        }
    }

    /**
     * 现货限价挂单交易
     * @param {string} symbol - 交易币种，如"BTC"（不含USDT）
     * @param {string} side - 交易方向，"BUY"或"SELL"
     * @param {string|number} price - 限价价格
     * @param {string|number} [tradeAmount] - 可选的指定交易数量
     */
    async submitLimitOrder(symbol, side, price, tradeAmount) {
        try {
            let tradeAmountParam = '';

            if (side == 'BUY') {
                if (!tradeAmount) {
                    throw new Error('需要指定买单数量才能进行交易');
                }
                tradeAmountParam = tradeAmount;
            }

            if (side == 'SELL') {
                if (!tradeAmount) {
                    const tradePreparationResult = await this.tradePreparation(symbol, tradeAmount);
                    if (!tradePreparationResult.success) {
                        throw new Error(`现货挂单交易前准备工作失败`);
                    }
                    tradeAmountParam = tradePreparationResult.tradeAmount;
                } else {
                    tradeAmountParam = tradeAmount;
                }
            }

            // 执行现货限价挂单交易
            const submitLimitOrderResult = await this.binanceManager.placeLimitOrder(
                this.accountNum,
                `${symbol}USDT`,
                side,
                tradeAmountParam,
                price
            );
            
            if (!submitLimitOrderResult.success) {
                throw new Error(`现货限价挂单交易失败`);
            }

            logger.success(`Account ${this.accountNum} | 现货限价挂单交易成功，币种: ${symbol}，方向: ${side}，数量: ${tradeAmountParam}，价格: ${price}`);
        } catch(error) {
            logger.error(`Account ${this.accountNum} | 现货限价挂单交易失败: ${error.message}`);
        }
    }

    /**
     * 取消某个交易对的所有订单
     * @param {string} symbol - 交易币种，如"BTC"（不含USDT）
     */
    async cancelOrders(symbol) {
        try {
            // 参数验证
            if (!symbol) {
                throw new Error('交易币种不能为空');
            }
            
            const cancelOrderResult = await this.binanceManager.cancelOrder(this.accountNum, `${symbol}USDT`);
            if (!cancelOrderResult.success && cancelOrderResult.errorCode == '-2011') {
                logger.warn(`Account ${this.accountNum} | 暂无订单可以取消`);
            }
            else if (!cancelOrderResult.success) {
                throw new Error(`取消订单失败`);
            } else {
                logger.success(`Account ${this.accountNum} | 取消 ${symbol}USDT 订单成功`);
            }
        } catch(error) {
            logger.error(`Account ${this.accountNum} | 取消订单失败: ${error.message}`);
        }
    }


    /**
     * 资金万向划转
     * 支持在现货、杠杆、资金账户之间进行资金划转
     * @param {string} asset - 划转的资产名称，如"BTC"
     * @param {string|number} amount - 划转数量
     * @param {string} fromAccount - 源账户类型，支持'SPOT'、'MARGIN'、'FUNDING'
     * @param {string} toAccount - 目标账户类型，支持'SPOT'、'MARGIN'、'FUNDING'
     * @returns {Object} 划转结果
     */
    async transferFunds(asset, amount, fromAccount, toAccount) {
        try {
            // 参数验证
            if (!asset || !amount || !fromAccount || !toAccount) {
                throw new Error('划转参数不完整，请确保资产、数量、源账户和目标账户都已提供');
            }
            
            // 验证账户类型
            const validAccountTypes = ['SPOT', 'MARGIN', 'FUNDING'];
            if (!validAccountTypes.includes(fromAccount)) {
                throw new Error(`无效的源账户类型: ${fromAccount}，支持的类型: ${validAccountTypes.join(', ')}`);
            }
            
            if (!validAccountTypes.includes(toAccount)) {
                throw new Error(`无效的目标账户类型: ${toAccount}，支持的类型: ${validAccountTypes.join(', ')}`);
            }
            
            if (fromAccount === toAccount) {
                throw new Error('源账户和目标账户不能相同');
            }
            
            // 检查源账户是否有足够的资产余额
            let hasEnoughBalance = false;
            const amountToTransfer = parseFloat(amount);
            
            if (fromAccount === 'SPOT') {
                // 检查现货账户余额
                const spotAccount = await this.binanceManager.querySpotAccount(this.accountNum, asset);
                if (spotAccount.success && spotAccount.assets.length > 0) {
                    const assetBalance = parseFloat(spotAccount.assets[0].free);
                    if (assetBalance >= amountToTransfer) {
                        hasEnoughBalance = true;
                    } else {
                        throw new Error(`现货账户 ${asset} 余额不足，当前可用: ${assetBalance}, 需要: ${amountToTransfer}`);
                    }
                } else {
                    throw new Error(`查询现货账户 ${asset} 余额失败`);
                }
            } else if (fromAccount === 'MARGIN') {
                // 检查杠杆账户余额
                const marginAccount = await this.binanceManager.queryMarginAccount(this.accountNum);
                if (marginAccount.success) {
                    const assetInfo = marginAccount.marginAccountInfo.userAssets.find(item => item.asset === asset);
                    if (assetInfo) {
                        const freeBalance = parseFloat(assetInfo.free);
                        if (freeBalance >= amountToTransfer) {
                            hasEnoughBalance = true;
                        } else {
                            throw new Error(`杠杆账户 ${asset} 余额不足，当前可用: ${freeBalance}, 需要: ${amountToTransfer}`);
                        }
                    } else {
                        throw new Error(`杠杆账户中未找到 ${asset} 资产`);
                    }
                } else {
                    throw new Error(`查询杠杆账户信息失败`);
                }
            } else if (fromAccount === 'FUNDING') {
                // 资金账户余额查询
                const assetFundingAccount = await this.binanceManager.queryFundingAccount(this.accountNum, asset);  
                if (assetFundingAccount.success) {
                    const assetBalance = assetFundingAccount.fundingAccountInfo[0].free;
                    if (assetBalance >= amountToTransfer) {
                        hasEnoughBalance = true;
                    }
                } else {
                    throw new Error(`查询资金账户信息失败`);
                }
            }   
            
            // 只有在确认有足够余额时才执行划转
            if (!hasEnoughBalance) {
                throw new Error(`${fromAccount} 账户中没有足够的 ${asset} 进行划转`);
            }
            
            // 调用底层API进行资金划转
            const transferResult = await this.binanceManager.universalTransfer(
                this.accountNum,
                asset,
                amount,
                fromAccount,
                toAccount
            );
            
            if (!transferResult.success) {
                throw new Error('资金划转失败');
            }
            return transferResult;
        } catch (error) {
            logger.error(`Account ${this.accountNum} | 资金划转失败: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * 快速限价挂单 - 针对高竞争场景优化
     * @param {string} symbol - 交易币种，如"RED"
     * @param {string|number} quantity - 交易数量
     * @param {string|number} price - 限价价格
     */
    async fastLimitOrder(symbol, quantity, price) {
        try {
            // 直接构建最小化的请求参数
            const params = {
                symbol: `${symbol}USDT`,
                side: 'BUY',
                type: 'LIMIT',
                timeInForce: 'GTC',
                quantity: quantity,
                price: price
            };
            
            // 跳过常规验证，直接调用API
            const result = await this.binanceManager.client.submitNewOrder(params);
            
            return {
                success: true,
                result: result
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }   
    }
}

module.exports = BinanceAggregator;
