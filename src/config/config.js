require('dotenv').config();

// 从环境变量加载账户信息
const loadAccounts = () => {
    const accounts = [];
    let accountIndex = 1;
    while (true) {
        const accountNum = process.env[`ACCOUNT${accountIndex}_NUM`];
        const apiKey = process.env[`ACCOUNT${accountIndex}_API_KEY`];
        const apiSecret = process.env[`ACCOUNT${accountIndex}_API_SECRET`];
        
        if (!apiKey || !apiSecret) break;
        
        accounts.push({
            accountNum,
            apiKey,
            apiSecret
        });
        accountIndex++;
    }
    
    return accounts;
};

const accountsList = loadAccounts();
const symbol = process.env.SYMBOL;

// 使用的配置信息
const config = {
    coin:{      // 需要操作的币种
            symbol: symbol,
            tradTime: null  // 格式'2025-03-14 15:15'，可选，无则填null
        }
};

module.exports = { config, accountsList };