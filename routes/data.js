var express = require('express');
var router = express.Router();

/* data api */

/* */
router.get('/coins', function(req, res, next) {
  global.storage.coins.get(req.query.filter, req.query.start, req.query.limit, function(err, coins) {
    if(err) {
      console.log("error reading coins from storage: " + err);
      return res.status(500).send(err);
    }
    console.log("returning " + coins.length + " coins (filter: " + req.query.filter + " | start: " + req.query.start + " | limit: " + req.query.limit + ")");
    res.json(coins);
  });
});

router.get('/portfolio', function(req, res, next) {
  global.storage.portfolio(function(err, portfolio) {
    if(err) {
      return res.status(500).send(err);
    }
    res.json(portfolio);
  });
});

router.get('/history', function(req, res, next) {
  global.storage.history.get(+req.query.count, function(err, history) {
    if(err) {
      return res.status(500).send(err);
    }
    res.json(history);
  });
});

router.get('/transactions', function(req, res, next) {
  global.storage.transactions.all(function(err, transactions) {
    if(err) {
      return res.status(500).send(err);
    }
    res.json(transactions);
  });
});

router.post('/transactions', function(req, res, next) {
  global.storage.transactions.add(req.body, function(err) {
    if(err) {
      return res.status(400).send(err);
    }

    res.status(200).send();
  });
});

router.delete('/transactions/:t_id', function(req, res, next) {
  global.storage.transactions.delete(req.params.t_id, function(err) {
    if(err) {
      return res.status(500).send(err);
    }

    res.status(200).send();
  });
});

module.exports = router;
