require('file?name=[name].[ext]!../node_modules/neo4j-driver/lib/browser/neo4j-web.min.js');
var _ = require('lodash');
var drawing = require('./drawing.js')
var api = require('./neo4japi.js')
var data = require('./data.js')


window.addEventListener('DOMContentLoaded', function () {

  handleGenerate()

  document.getElementById("delete").addEventListener('click', deleteEdge)
  document.getElementById("undirected").addEventListener('click', handleUndirected)
  document.getElementById("refresh").addEventListener('click', handleRefresh)
  document.getElementById("generate").addEventListener('click', handleGenerate)

  document.getElementById("elaboration").addEventListener('DOMSubtreeModified', function () {
    var span = document.getElementById("elaboration")
    span.style.color = "tomato"
    setTimeout(function () {
      span.style.color = "gray"
    }, 1000);
  })
}, false);

var sp = []
var betweeness = {}
var elaboration = {}
var undirected = false;


var refresh = function (fresh = false) {
  document.getElementById("delete").disabled = false
  return shortestPaths().then(_ => {
    groupPaths();
    //print();
    calculateBetweenes();
    drawGraph(fresh)
  })
}


var shortestPaths = function (queryString) {
  return new Promise((resolve, reject) => {
    api.shortestPaths(undirected)
      .then(result => {
        sp = []
        betweeness = {}
        resolve(result.records.map(record => {
          var res = {};
          res.from = (record._fields[0].properties.name);
          res.to = (record._fields[1].properties.name);
          res.path = {}
          res.path.nodes = (record._fields[2].trim().split(" "))
          res.path.edges = (record._fields[3].trim().split(" "))
          //console.log(res)

          sp.push(res)

          res.path.edges.forEach(edge => betweeness[edge] = 0)
          res.path.edges.forEach(edge => elaboration[edge] = '')
         
        }))
      })
  })
}


var groupPaths = () => {
  sp = _.groupBy(sp, function (b) {
    return b.from + " " + b.to
  });
}



var print = function () {
  for (var key in sp) {
    if (sp.hasOwnProperty(key)) {
      console.log(key)
      sp[key].forEach(p => {
        console.log(p.path.nodes.map(n => n))
        console.log(p.path.edges.map(n => n))
      });
    }
  }
}


var calculateBetweenes = function () {
  for (var key in sp) {
    if (sp.hasOwnProperty(key)) {
      sp[key].forEach(p => {
        p.path.edges.forEach(edge => {
          betweeness[edge] += 1 / sp[key].length
          elaboration[edge] += (1 / sp[key].length).toString() + "(" + p.from + ":" + p.to + ") + "
          //console.log(betweeness)
        });

      });
    }
  }

  //remove last + from elaboration
  for (var key in elaboration) {
    if (elaboration.hasOwnProperty(key)) {
      elaboration[key] = elaboration[key].substring(0, elaboration[key].length - 2)
    }
  }

  //console.log(elaboration)
}

var getMaxBetweeness = function () {
  var a = Object.keys(betweeness).map((key) => { return { key: key, betweeness: betweeness[key] } })
  var max = _.maxBy(a, o => o.betweeness)
  return max
}

var disableDeleteButton = function(graph) {
  console.log(graph.links.length)
  if(graph.links.length == 0) {
    document.getElementById("delete").disabled = true

  }
}


var graphGlobal
var drawGraph = function (fresh = false) {
  return api.getGraph()
    .then(graph => {
      graph = data.neo4jDataToD3Data(graph, betweeness, elaboration)
      graph.undirected = undirected

      var maxBetweeness = getMaxBetweeness()
      if (graphGlobal) {
        drawing.clearGraph(graphGlobal, fresh)
      }
      graphGlobal = graph
      drawing.renderGraph(graph, maxBetweeness)
      disableDeleteButton(graph)
    })
}

var deleteEdge = function () {
  var edgeToDelete = getMaxBetweeness()
  api.deleteEdge(edgeToDelete.key)
    .then(result => {
      refresh()
      return result;
    })
}


var handleUndirected = function () {
  var current = document.getElementById("undirected").innerHTML;
  document.getElementById("undirected").innerHTML = current == "Undirected" ? "Directed" : "Undirected";
  undirected = !undirected;
  refresh()
}

var handleRefresh = function () {
  refresh(true)
}

var handleGenerate = function (e) {
  if (e) { e.preventDefault() }
  nodesNo = parseInt(document.querySelector("#form input[name='nodesno']").value)
  edgesNo = parseInt(document.querySelector("#form input[name='edgesno']").value)

  return api.clearGraph().then(_ => {
    api.createGraph(nodesNo, edgesNo).then(_ => {
      refresh(true)
    })
  })
}

