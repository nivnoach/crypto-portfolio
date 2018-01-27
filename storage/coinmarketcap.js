const request = require('request');
const jsonfile = require('jsonfile');
const fs = require('fs');

const cachefile = 'coins.cache.json';

// load cache if exists
var _cached_data = [];
if(fs.existsSync(cachefile))
{
    _cached_data = jsonfile.readFileSync(cachefile);
    console.log("loaded " + _cached_data.length + " coins data from cache");
}

var self = module.exports = {
    // last date data was updated
    _last_updated: new Date(0),
    
    // array of coins
    _data: _cached_data,

    name: function() {
        return "coinmarketcap.com";
    },

    // returns 
    get: function(start, limit) {
        start = +start ? +start : 0;
        limit = +limit ? +limit : this._data.length;
        var result = {
            last_update: this._last_updated,
            coins: this._data.slice(start, start + limit),
            start: start,
            limit: limit,
            has_more: (start + limit < this._data.length)
        };
        return result;
    },

    coin_info: function(symbol_or_id) {
        for (var idx = 0; idx < this._data.length; idx++) {
            if (this._data[idx].symbol === symbol_or_id ||
                this._data[idx].id === symbol_or_id ||
                this._data[idx].cid === symbol_or_id)
            {
                return this._data[idx];
            }
        }
        return null;
    },

    refresh: function() {
        console.log("requesting coins info from coinmarketcap.com...")
        request(
            "https://api.coinmarketcap.com/v1/ticker/?limit=9999",
            { json: true },
            function(err, res, body) {
                // set timer again
                refreshTimer = setTimeout(module.exports.refresh, 10000);

                // handle errors
                if(err) {
                    console.log("error refreshing the data from the server " + err);
                    return;
                }

                // update L1 cache (RAM)
                if (typeof body === "string") {
                    console.log("got invalid JSON data");
                    return;
                }

                self._data = body;
                self._last_updated = new Date();

                // update image link
                for(var idx = 0; idx < self._data.length; idx++) {
                    self._data[idx].image_link = 'https://files.coinmarketcap.com/static/img/coins/64x64/' + self._data[idx].id + '.png';
                }
                
                // update L2 cache (file)
                fs.stat(cachefile, function(err, stats)  {
                    if (!err) {
                        fs.unlinkSync(cachefile);
                        console.log("cache file found and was deleted");
                    } else {
                        console.log("cache file not found. error details: " + err);
                    }

                    jsonfile.writeFileSync(cachefile, self._data);
                    console.log("successfully updated coins rates from coinmarketcap");
            });
            }
        );
    }
};

// refresh and start time
var refreshTimer = setTimeout(module.exports.refresh, 10000);
