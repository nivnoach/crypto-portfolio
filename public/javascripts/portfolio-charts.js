
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

function create_pf_distribution(coins, percents) {
    // For a pie chart
    return new Chart(document.getElementById("distribution"), {
        type: 'pie', /* 'doughnut' */
        data: { 
            datasets: [{ data: percents, backgroundColor: randomizeColors(coins) }],
            labels: coins
        },
        options: {
            title: {
                display: true,
                text: 'Portfolio by Value'
            },
            legend: {
                display: false,
                position: 'right',
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}
