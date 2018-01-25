CREATE DATABASE IF NOT EXISTS portfolio;

USE portfolio;

CREATE TABLE IF NOT EXISTS transactions(
	t_id INT(11) NOT NULL AUTO_INCREMENT,
    coin VARCHAR(32) NOT NULL,
    date DATE NOT NULL,
    action varchar(8) NOT NULL DEFAULT 'buy', /* 1 = buy; 2 = sell; 3 = exchange */
    amount DOUBLE NOT NULL,
    price_usd DOUBLE NOT NULL,
    source VARCHAR(20),
    
    PRIMARY KEY (t_id)
);

CREATE TABLE IF NOT EXISTS profile_history(
	h_id INT(11) NOT NULL AUTO_INCREMENT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    value_usd DOUBLE NOT NULL,
    total_cost DOUBLE NOT NULL,
    profit DOUBLE NOT NULL,
    profit_percent DOUBLE NOT NULL,
    source VARCHAR(20),
    PRIMARY KEY (h_id)
);


CREATE TABLE IF NOT EXISTS coins_history(
    ID int NOT NULL AUTO_INCREMENT,
	cid varchar(16),
    name varchar(32),
    symbol varchar(16),
    rank int,
    price_usd double,
    private_btc double,
    vol_usd_24h double,
    market_cap_usd double,
    available_supply double,
    
    total_supply double,
    max_supply double,
    percent_change_1h double,
    percent_change_24h double,
    percent_change_7d double,
    last_updated long,
    
    source varchar(20),
    primary key (id)
);

/*
TRUNCATE TABLE transactions;

INSERT INTO transactions(coin,date,action,amount,price_usd,source) VALUES
	('iota',       '2017-12-06', 'buy', 102, 3.853140, 'initial'),
	('ripple',     '2017-12-07', 'buy', 1107.762, 0.24, 'initial'),
	('stellar',    '2017-12-12', 'buy', 1000, 0.2, 'initial'),
	('digibyte',   '2017-12-15', 'buy', 1000, 0.02, 'initial'),
	('verge',      '2017-12-15', 'buy', 1000, 0.019, 'initial'),
	('cardano',    '2017-12-15', 'buy', 1065, 0.35, 'initial'),
	('omisego',    '2017-12-16', 'buy', 3.136845, 13.77, 'initial'),
	('siacoin',    '2017-12-29', 'buy', 1000, 0.03, 'initial'),
	('dogecoin',   '2017-12-29', 'buy', 5000, 0.009, 'initial'),
	('lisk',       '2017-12-29', 'buy', 2.361690, 21.440001, 'initial'),
	('substratum', '2017-12-29', 'buy', 189.81, 1.330000, 'initial'),
	('tron',       '2017-12-29', 'buy', 2997, 0.08, 'initial'),
	('reddcoin',   '2017-12-29', 'buy', 10000, 0.02, 'initial'),
	('potcoin',    '2017-12-29', 'buy', 500, 0.36, 'initial');
*/