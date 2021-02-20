
const { info } = require('console');
const { _portfolio } = require('./config');
const os = require('os');
const fs = require('fs');
const jsonfile = require('jsonfile');

const historyfile = 'coins.history.json';

/* the name of the file does not disclose what it does. Perhaps fix it? */

// fetch coins data source
var coinsmarketcap = global.coin_data_source;

// interface implementation
var that = module.exports = {
        history: {
            get: function(cb) {
                var h = JSON.parse(fs.readFileSync(historyfile));
                var result = h.map(
                    e => [
                        e.timestamp,
                        e.coins.map(ee => ee.amount * ee.info.price_usd).reduce((a, b) => a + b, 0),
                    ]
                );
                cb ? cb(null, result) : null;
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
            }
        },

        transactions: {
            all: function(cb) {
                cb ? cb(null ,[]) : null;
            },

            add: function(t, cb) {
                cb(new Error('not allowed on statis storage'));
            },

            delete: function(t_id, cb) {
                cb(new Error('not allowed on statis storage'));
            }
        },

        portfolio: function(cb) {
            cb ? cb(null, _state) : null;
        }
}


global.coin_data_source.register_for_updates(_coin_data => {
    _portfolio.forEach(c =>  {
        _info = global.coin_data_source.coin_info(c.code);

        if (_info === null) {
            return;
        }

        // Update the line item in portfolio
        c.info = {
            name: _info.name,
            price_usd: _info.price,
            image_link: _info.logo_url,
            symbol: _info.symbol
        };

        c.value = (_info.status !== "active") ? 0 : _info.price * c.amount;
        c.profit = c.value - c.cost;
        c.profit_percent = (c.value / c.cost) * 100;
        c.avg_buy_price = c.cost / c.amount;
    });


    var total_cost = _portfolio.map(a => a.cost).reduce((a, b) => a+b, 0);
    var profit = _portfolio.map(a => a.profit).reduce((a, b) => a+b, 0);
    _state = {
        coins: _portfolio,
        value_usd: _portfolio.map(a => a.value).reduce((a, b) => a+b, 0),
        total_cost: total_cost,
        profit: profit,
        profit_percent: (profit / total_cost) * 100,
        timestamp: (new Date()).getTime(),
    };

    // persist history
    fs.stat(historyfile, function(err, stats)  {
        var history = [];
        if (!err) {
            history = JSON.parse(fs.readFileSync(historyfile));
            fs.unlinkSync(historyfile);
            console.log("cache file found and was deleted");
        } else {
            console.log("cache file not found. error details: " + err);
        }

        history.push(_state);
        jsonfile.writeFileSync(historyfile, history);
        console.log("successfully updated history file with " + history.length + ' entries');
    });
});
