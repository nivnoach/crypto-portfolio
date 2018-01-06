var mysql = require('mysql');
const os = require('os');

// config (TODO: move to file)
var pool = mysql.createPool({
    poolSize: 4,
    host:     'localhost',
    user:     'root',
    password: 'portfolio',
    database: 'portfolio'
});

var coinsmarketcap = require('./coinmarketcap');

var that = module.exports = {
        history: {
            add_entry: function(cb) {
                that.portfolio(function(err, portfolio) {
                    if (err) {
                        console.log('failed getting portfolio: ' + err)
                        return cb(err);
                    }

                    pool.query(
                        'INSERT INTO profile_history(value_usd, total_cost, profit, profit_percent, source) VALUES(?,?,?,?,?)',
                        [portfolio.current_value, portfolio.total_cost, portfolio.total_profit, portfolio.total_profit_percent, os.hostname()],
                        function (err, results, fields) {
                            if (err) {
                                console.log('failed adding history point: ' + err)
                                return cb(err);
                            }
                            cb(null);
                        }
                    );
                });
            },

            get: function(cb) {
                pool.query(
                    'SELECT * FROM profile_history',
                    function (err, results, fields) {
                        if (err) {
                            console.log('failed getting history: ' + err)
                            return cb(err);
                        }
                        cb(null, results);
                    }
                );
            }
        },

        coins: function(filter, start, limit, cb) {
            if (!cb) return;
            
            // get all coins' data from cache
            var market_info = coinsmarketcap.get(+start, +limit);
            if (!filter) {
                return cb(null, market_info.coins);
            }

            // filter
            var result = [];
            filter = filter.toLowerCase();
            for(var coin_idx in market_info.coins) {
                var coin = market_info.coins[coin_idx];
                if ((coin.id.toLowerCase().indexOf(filter) !== -1) ||
                    (coin.symbol.toLowerCase().indexOf(filter) !== -1) ||
                    (coin.name.toLowerCase().indexOf(filter) !== -1))
                {
                    result.push(coin);
                    if (result.length == limit) {
                        break;
                    }
                }
            }
            cb(null, result);
        },

        transactions: {
            all: function(cb) {
                // run a query against db
                pool.query(
                    'SELECT * FROM transactions',
                    function (error, results, fields) {
                        if (!cb) return;
                        if (error) return cb(error, null);

                        // enrich transactions
                        for(var t_idx in results) {
                            var t = results[t_idx];

                            if (!t.coin_info) {
                                t.coin_info = coinsmarketcap.coin_info(t.coin);
                            }
                        }
                        
                        return cb(null, results);
                    }
                );
            },

            add: function(t, cb) {
                const pre = 'failed to add new transaction: ';

                // verify input
                if (!cb) return;
                if (!t.coin) return cb(new Error(pre + 'missing coin type'));
                if (!t.date) return cb(new Error(pre + 'missing date'));
                if (!t.action) return cb(new Error(pre + 'missing action'));
                if (!t.amount) return cb(new Error(pre + 'missing amount'));
                if (!t.price_usd) return cb(new Error(pre + 'missing purchase price in usd'));
                t.source = os.hostname();

                // run a query against db
                pool.query(
                    'INSERT INTO transactions(coin,date,action,amount,price_usd,source) VALUES(?,?,?,?,?,?)',
                    [t.coin, t.date, t.action, t.amount, t.price_usd, t.source],
                    function (error, results, fields) {
                        if (error) return cb(error);
                        console.log('transaction added');
                        cb(null);
                    }
                );
            },

            delete: function(t_id, cb) {
                // run a query against db
                pool.query(
                    'DELETE FROM transactions WHERE t_id = ?',
                    [t_id],
                    function (error, results, fields) {
                        if (error) cb(error);
                        console.log('transaction deleted');
                        cb(null);
                    }
                );                
            }

        },

        portfolio: function(cb) {
            var result = { 
                coins: {}, 
                total_cost: 0,
                current_value: 0
            };

            if (!cb) return;

            // get transactions
            that.transactions.all(function(err, transactions) {
                /**
                 * statistics
                 */
                for (var idx = 0; idx < transactions.length; idx++) {
                    var t = transactions[idx];

                    // compute total cost
                    result.total_cost += (t.amount * +t.price_usd);

                    // compute current value
                    if (!t.coin_info) {
                        t.coin_info = coinsmarketcap.coin_info(t.coin);

                        if (t.coin_info == null) {
                            console.log("FAILED TO FIND INFO ON COIN " + t.coin);
                        }
                    }

                    result.current_value += (t.amount * +t.coin_info.price_usd);
                }

                result.total_profit = result.current_value - result.total_cost;
                result.total_profit_percent = (result.total_profit / result.total_cost) * 100;

                /**
                 * coins
                 */
                // iterate and enrich from source
                for (var idx = 0; idx < transactions.length; idx++) {
                    var t = transactions[idx];

                    // currently we only support 'buy'
                    if (t.action != 'buy') continue;

                    // get curren
                    var coin = result.coins[t.coin];
                    if (!coin)
                    {
                        coin = result.coins[t.coin] = {
                            info: t.coin_info,
                            amount: 0,
                            avg_buy_price: 0,
                            cost: 0,
                            value: 0
                        };
                    }

                    if (t.action === "buy") {
                        // apply changes
                        coin.avg_buy_price = ((coin.avg_buy_price * coin.amount) + (t.price_usd * t.amount)) / (coin.amount + t.amount);
                        coin.amount += t.amount;
                        coin.cost += (t.price_usd * t.amount);
                        coin.value += (coin.info.price_usd * t.amount);
                    } else {
                        throw new Error("illegal transaction '" + t.action + "'");
                    }
                }

                // array-ify coins :)
                var coins_array = [];
                for(var index in result.coins) { 
                    if (result.coins.hasOwnProperty(index)) {
                        coins_array.push(result.coins[index]);
                    }
                }

                result.coins = coins_array;

                // update profit for each coin
                for (var idx = 0; idx < result.coins.length; idx++) {
                    var coin = result.coins[idx];
                    coin.profit = coin.value - coin.cost;
                    coin.profit_percent = 100 * (coin.profit / coin.cost);
                }

                cb(null, result);
            });
        }
}