const request = require('request');
const jsonfile = require('jsonfile');
const fs = require('fs');
const { _portfolio, _nomics_api_key } = require('./config');
const { SSL_OP_EPHEMERAL_RSA } = require('constants');

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

    _cb: [],

    name: function() {
        return "nomics";
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

    register_for_updates: function(cb) {
        this._cb = this._cb ? this._cb : [];
        this._cb.push(cb);
    },

    refresh: function() {
        console.log("requesting coins info from nomics")
        var ids = _portfolio.map(p => p.code).reduce((a, b) => a + "," + b, 0);

        request(
            "https://api.nomics.com/v1/currencies/ticker?key=" + _nomics_api_key + "&ids=" +
            ids +
            "&interval=1d,30d&convert=USD&per-page=100&page=1",
            { json: true },
            function(err, res, body) {
                // set timer again
                refreshTimer = setTimeout(module.exports.refresh, 60 * 60 * 1000 /* every hour */);

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
                    self._data[idx].image_link = self._data[idx].logo_url;
                }

                // call all registered callbacks
                if (self._cb) {
                    console.log("calling " + self._cb.length + " registered callbacks");
                    self._cb.forEach(cb => cb());
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
                    console.log("successfully updated coins rates from nomics");
                });
            }
        );
    }
};

// refresh and start time
var refreshTimer = setTimeout(module.exports.refresh, 1000);
