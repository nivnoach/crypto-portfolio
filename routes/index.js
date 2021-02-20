var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  // get portfolio
  global.storage.portfolio(function(err, portfolio) {
    if (err) {
      return res.status(500).send(err);
    }
      global.storage.transactions.all(function(err, transactions) {
        if (err) {
          return res.status(500).send(err);
        }
        res.render('portfolio', { name: 'portfolio', portfolio: portfolio, /*history: history,*/ transactions: transactions });
      });
  })

});

router.get('/history', function(req, res, next) {
  global.storage.history.get(function(err, history) {
    if (err) {
      res.status(500).send(err);
    }
    res.json(history);
  });
});

module.exports = router;
