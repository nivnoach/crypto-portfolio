var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const nunjucks = require('nunjucks');

// is dev?
global.isDev = !(process.env.env === 'production');
console.log("environment: " + process.env.env + " ,is dev? " + global.isDev)

// add nunjucks filter
var env = new nunjucks.Environment();

env.addFilter('fmtdate', function(value) {
  var m = { 0: "Jan", 1: "Feb", 2: "Mar", 3: "Apr", 4: "May", 5: "Jun", 6: "Jul", 7: "Aug", 8: "Sep", 9: "Oct", 10: "Nov", 11: "Dec"  };
  var d = new Date(value);

  var month = m[d.getMonth()] ? m[d.getMonth()] : (d.getMonth() + 1);
  return d.getDate() + "-" + (month) + "-" + d.getUTCFullYear();
});

env.addFilter('round', function(value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
});

env.addFilter('transaction_coin_name', function(value) {
  if (!Array.isArray(value)) {
    throw new Error("value must be an array");
  }

  return value.map(function(t) { return '"' + t.coin_info.name + '"'; });
});

env.addFilter('transaction_value', function(value) {
  if (!Array.isArray(value)) {
    throw new Error("value must be an array");
  }

  return value.map(function(t) { return t.amount * t.price_usd; });
});

env.addFilter('nthElement', function(arr, n) {
  var result = [];
  for (var i = 0; i < arr.length; i++) 
    if (i%n === 0)
      result.push(arr[i]);
  return result;
});


env.addFilter('portfolioDivision', function(portfolio) {
  var result = [];
  for(var c_idx in portfolio.coins) {
    var c = portfolio.coins[c_idx];
    result.push("{x:'" + c.info.name + "', y:" + c.value + "}");
  }
  return result;
});


const expressNunjucks = require('express-nunjucks');

// routes 
var index = require('./routes/index');
var data = require('./routes/data');

// data sources and database
// NOT: mysql depends on coinmarketcap, so must be loaded after it.
global.coin_data_source = require('./storage/coinmarketcap');
global.storage = require('./storage/mysql');

// create the app
var app = express();

// connect nunjucks env
nunjucks.configure('views', {
  autoescape: true,
  express: app,
  watch: true,
  noCache: true
});

env.express(app);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'njk');

const njk = expressNunjucks(app, {
  watch: global.isDev,
  noCache: global.isDev
});

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/data', data);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// start task to periodically save portfolio history point
save_portfolio_sampling();
const history_entry_timer = setInterval(save_portfolio_sampling, 60000);

function save_portfolio_sampling() {
  global.storage.history.add_entry(function(err) {
    if (err) {
      return;
    }
    console.log("saved portfolio history entry to database");
  });
}

module.exports = app;
