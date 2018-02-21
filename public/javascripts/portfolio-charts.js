
function create_pf_value(history, annotations) {
        // history
        var history = new Dygraph(document.getElementById("history"),
                    history,
                    {
                      labels: [ "", "$" ],
                      showRangeSelector: true,
                      title: "Portfolio Value (USD)",
                      digitsAfterDecimal: 2,
                      drawGrid: true,
                      animatedZooms: true,
                      legend: "always"
                    });

      // annotate with purchases
      history.setAnnotations(annotations);    
}

String.prototype.hashCode = function() {
    var hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
      chr   = this.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  };
  
function randomizeColors(coins) {
    var colors = [
    "#3366CC", "#DC3912", "#FF9900", "#109618", "#990099", "#3B3EAC", "#0099C6",
    "#DD4477", "#66AA00", "#B82E2E", "#316395", "#994499", "#22AA99", "#AAAA11",
    "#6633CC", "#E67300", "#8B0707", "#329262", "#5574A6", "#3B3EAC" ];
    
    var idx = 0;
    return coins.map(function(c) { 
        var res = colors[idx++];
        idx = idx % colors.length;
        return res;
    });
}

function to_pf_chart_points(history) {
    function compare(h1, h2) {
      if (h1.date > h2.date) return 1;
      if (h1.date < h2.date) return -1;
      return 0;
    }

    history.sort(compare);

    var result = [];
    for(var h_idx in history) {
      var d = history[h_idx].date;
      result.push([ new Date(d)/*.getTime()*/, history[h_idx].value_usd ]);
    }
    return result;
}

function create_pf_distribution(coins, values) {

    // calculate the sum of all portfolio
    var total = 0;
    for (var i = 0; i < values.length; i++) { total += values[i]; }

    // convert to %
    percents = values.map(function(v) { return Math.floor(10000 * v / total) / 100; })

    // For a pie chart
    return new Chart(document.getElementById("distribution"), {
        type: 'doughnut', /* 'doughnut' */
        data: { 
            datasets: [{ data: percents, backgroundColor: randomizeColors(coins) }],
            labels: coins
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            title: {
                display: true,
                text: 'Portfolio Value Distribution'
            },
            legend: {
                display: false,
                position: 'right',
            },
            animation: {
                animateScale: true,
                animateRotate: true
            },
            tooltips: {
                padding: "15px",
                custom: function(tooltipModel) {
                    tooltipModel.text += "%";
                    return tooltipModel;
                }
            }
        }
    });
}
