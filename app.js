var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const nunjucks = require('nunjucks');

// add nunjucks filter
var env = new nunjucks.Environment();

env.addFilter('fmtdate', function(value) {
  var d = new Date(value);
  return d.getDate() + "-" + d.getMonth() + "-" + d.getUTCFullYear();
});

env.addFilter('round', function(value, decimals) {
  return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
});

env.addFilter('historyData', function(history) {
  function compare(h1, h2) {
    if (h1.date > h2.date) return 1;
    if (h1.date < h2.date) return -1;
    return 0;
  }

  history.sort(compare);

  var result = [];
  for(var h_idx in history) {
    var d = history[h_idx].date;
    result.push("[ new Date(" + d.getTime() + "), " + history[h_idx].value_usd + " ]");
  }
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

// database
global.storage = require('./storage/mysql'); // load file-based storage

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

const isDev = app.get('env') === 'development';
const njk = expressNunjucks(app, {
  watch: isDev,
  noCache: isDev
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
const history_entry_timer = setInterval(function() {
  global.storage.history.add_entry(function(err) {
    if (err) {
      return;
    }
    console.log("saved history entry to database");
  });
  
}, 60000);

module.exports = app;
