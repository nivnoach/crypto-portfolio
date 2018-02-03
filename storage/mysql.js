
const os = require('os');

//
// Configuration (TODO: move to file)
//

var mysql_host = "localhost";

////////////// sequalize
const Sequelize = require('sequelize');
const sequelize = new Sequelize('portfolio', 'root', 'portfolio', {
  host: mysql_host,
  dialect: 'mysql',

  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },

  // http://docs.sequelizejs.com/manual/tutorial/querying.html#operators
  operatorsAliases: false
});

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

const CoinSampling = sequelize.define('coin_samplings', {
        id:            { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        cid:           { type: Sequelize.STRING },
        name:          { type: Sequelize.STRING },
        symbol:        { type: Sequelize.STRING },
        rank:          { type: Sequelize.INTEGER },
        price_usd:     { type: Sequelize.DOUBLE },
        price_btc:     { type: Sequelize.DOUBLE },
        vol_usd_24h:   { type: Sequelize.DOUBLE },
        market_cap_usd:       { type: Sequelize.DOUBLE },
        avialability_supply:  { type: Sequelize.DOUBLE },
        total_supply:         { type: Sequelize.DOUBLE },
        max_supply:           { type: Sequelize.DOUBLE },
        percent_change_1h:    { type: Sequelize.DOUBLE },
        percent_change_24h:   { type: Sequelize.DOUBLE },
        percent_change_7d:    { type: Sequelize.DOUBLE },
        last_updated:         { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    }
);

const ProfileSampling = sequelize.define('profile_history', {
    h_id:           { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    date:           { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    value_usd:      { type: Sequelize.DOUBLE },
    total_cost:     { type: Sequelize.DOUBLE },
    profit:         { type: Sequelize.DOUBLE },
    profit_percent: { type: Sequelize.DOUBLE },
    source:         { type: Sequelize.STRING },
});

const Transaction = sequelize.define('transactions', {
    t_id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
    coin: { type: Sequelize.STRING },
    date: { type: Sequelize.DATE },
    action: { type: Sequelize.STRING },
    amount: { type: Sequelize.DOUBLE },
    price_usd: { type: Sequelize.DOUBLE },
    source: { type: Sequelize.STRING }
});

// fetch coins data source
var coinsmarketcap = global.coin_data_source;

// interface implementation
var that = module.exports = {
        history: {
            add_entry: function(cb) {
                that.portfolio(function(err, portfolio) {
                    if (err) {
                        console.log('failed getting portfolio: ' + err)
                        return cb(err);
                    }
                    
                    ProfileSampling.sync().then(() => {
                        portfolio.source = os.hostname();
                        ProfileSampling.create( portfolio )
                                       .then( function() { cb(null); }, function(err) { cb(err); });
                    });

                });
            },

            get: function(cb) {
                ProfileSampling.findAndCountAll()
                .then(results => {
                    cb(null, results.rows);
                }).error(err => { 
                    console.log('failed getting history: ' + err);
                    return cb(err);
                 });
            }
        },

        coins: {
            get: function(filter, start, limit, cb) {
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

            persist: function(coins_data) {
                if (!coins_data) {
                    coins_data = coinsmarketcap.get();
                }
        
                console.log("persisting coin info...");

                // process coins data
                coins_data.coins = coins_data.coins.map(s => {
                    s.cid = s.id;
                    s.last_updated = new Date();
                    delete s.id;
                    return s;
                });

                CoinSampling
                    .bulkCreate(coins_data.coins)
                    .then(() => {
                        console.log("created " + coins_data.coins.length + " coin sampling points");
                    });
            }
        },

        transactions: {
            all: function(cb) {
                // run a query against db
                Transaction.findAndCountAll()
                .then(results => {
                    results = results.rows;

                    // enrich transactions
                    for(var t_idx in results) {
                        var t = results[t_idx];

                        if (!t.coin_info) {
                            t.coin_info = coinsmarketcap.coin_info(t.coin);
                        }
                    }

                    cb(null, results);
                }).error(err => { 
                    console.log('failed getting history: ' + err);
                    return cb(err);
                });
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
                Transaction.sync().then(() => {
                    Transaction.create( t )
                                   .then( function() { cb(null); }, function(err) { cb(err); });
                });
            },

            delete: function(t_id, cb) {
                // run a query against db
                Transaction.destroy({
                    where: {
                        t_id: t_id
                    }
                })
                .then( 
                    function() { 
                        console.log('transaction deleted');
                        cb(null); 
                    }, 
                    function(err) { cb(err); }
                );
            }

        },

        portfolio: function(cb) {
            var result = { 
                coins: {}, 
                total_cost: 0,
                value_usd: 0
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

                    result.value_usd += (t.amount * +t.coin_info.price_usd);
                }

                result.profit = result.value_usd - result.total_cost;
                result.profit_percent = (result.profit / result.total_cost) * 100;

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