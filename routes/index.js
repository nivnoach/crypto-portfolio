var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('coins', { name: 'coins' });
});

/* other pages */
router.get('/coins', function(req, res, next) {
  res.render('coins', { name: 'coins' });
});

router.get('/transactions', function(req, res, next) {
  global.storage.transactions.all(function(err, transactions) {
    if (err) {
      return res.status(500).send(err);
    }

    return res.render('transactions', { name: 'transactions', transactions: transactions });
  });
});

router.get('/portfolio', function(req, res, next) {
  // get portfolio
  global.storage.portfolio(function(err, portfolio) {
    if (err) {
      return res.status(500).send(err);
    }

    // get history
    global.storage.history.get(function(err, history) {
      if (err) {
        return res.status(500).send(err);
      }
  
      global.storage.transactions.all(function(err, transactions) {
        if (err) {
          return res.status(500).send(err);
        }
        res.render('portfolio', { name: 'portfolio', portfolio: portfolio, history: history, transactions: transactions });
      });
    });
  })
  
});

router.get('/whats-new', function(req, res, next) {
  return res.render('whats-new', { name: 'whats-new' });
});


module.exports = router;
