require('file?name=[name].[ext]!../node_modules/neo4j-driver/lib/browser/neo4j-web.min.js');
var drawing = require('./drawing.js')

window.addEventListener('DOMContentLoaded', function () {

  handleGenerate()

  document.getElementById("delete").addEventListener('click', deleteEdge)

  document.getElementById("undirected").addEventListener('click', handleUndirected)
  document.getElementById("refresh").addEventListener('click', handleRefresh)
  document.getElementById("generate").addEventListener('click', handleGenerate)




}, false);

var sp = []
var betweeness = {}
var refresh = function (fresh = false) {
  return shortestPaths().then(_ => {
    groupPaths();
    //print();
    calculateBetweenes();
    drawGraph(fresh);
  })
}


var neo4j = window.neo4j.v1;
var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "matneomat"));
var _ = require('lodash');


function search() {
  var session = driver.session();
  return session
    .run(
      `match path=(n:Loc)-[]-(n1:Loc)
      match (k:Loc)
              unwind nodes(path) as p unwind rels(path) as r
              return {nodes: collect(distinct k), links: collect(DISTINCT {source: id(startNode(r)), target: id(endNode(r)), id: id(r)})}`
    )
    .then(result => {
      session.close();
      return result;
      return result.records.map(record => {
        //console.log(record);
        return record;
      });
    })
    .catch(error => {
      session.close();
      throw error;
    });
}


var shortestPaths = function (queryString) {
  var session = driver.session();
  return session
    .run(
      'MATCH (n1:Loc),(n2:Loc) \
	WHERE n1<>n2 \
	MATCH p=allShortestPaths((n1:Loc)-[*]->(n2:Loc)) WITH  p, n1, n2, \
	reduce(s="",x in nodes(p) | s+" "+x.name) AS path, \
	reduce(s="",x in relationships(p) | s+" "+ id(x)) AS edges  \
	ORDER BY LENGTH(p) DESC return n1, n2, path, edges'
    )
    .then(result => {
      session.close();
      sp = []
      betweeness = {}
      return result.records.map(record => {
        var res = {};
        res.from = (record._fields[0].properties.name);
        res.to = (record._fields[1].properties.name);
        res.path = {}
        res.path.nodes = (record._fields[2].trim().split(" "))
        res.path.edges = (record._fields[3].trim().split(" "))
        //console.log(res)

        sp.push(res)

        res.path.edges.forEach(edge => betweeness[edge] = 0)
        return record;
      });

    })
    .then(res => {
      return res
    })
    .catch(error => {
      session.close();
      throw error;
    });
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
          //console.log(betweeness)
        });

      });
    }
  }
  //console.log(betweeness)
}

var getMaxBetweeness = function () {
  var a = Object.keys(betweeness).map((key) => { return { key: key, betweeness: betweeness[key] } })
  var max = _.maxBy(a, o => o.betweeness)
  return max
}


var neo4jDataToD3Data = function (data) {
  var graph = {
    nodes: [],
    links: []
  };

  //console.log("-----")
  var nodes = data.records[0]._fields[0].nodes
  var links = data.records[0]._fields[0].links
  //console.log(links)
  nodes.forEach(node => {
    graph.nodes.push({ title: node.properties.name, label: "Loc" })
  })
  links.forEach(link => {
    var start = _.find(nodes, o => o.identity.low == link.source.low)
    var end = _.find(nodes, o => o.identity.low == link.target.low)
    //console.log(start, end)
    graph.links.push({
      source: _.find(graph.nodes, o => o.title == start.properties.name),
      target: _.find(graph.nodes, o => o.title == end.properties.name),
      id: link.id.low,
      betweeness: betweeness[link.id.low],
      label: "link"
    })
  })

  //console.log(graph)


  return graph;
}

var graphGlobal
var drawGraph = function (fresh = false) {
  search()
    .then(graph => {
      graph = neo4jDataToD3Data(graph)
      var maxBetweeness = getMaxBetweeness()
      if (graphGlobal) {
        drawing.clearGraph(graphGlobal, fresh)
      }
      graphGlobal = graph
      drawing.renderGraph(graph, maxBetweeness)
    })
}

var deleteEdge = function () {
  var edgeToDelete = getMaxBetweeness()
  console.log("Deleteing edge " + edgeToDelete.key)
  var session = driver.session();
  return session
    .run(
      'match (n:Loc)-[r]-(k:Loc) \
        where id(r)=' + edgeToDelete.key +
      ' delete r'
    )
    .then(result => {
      session.close();
      console.log("Edge deleted: ")
      console.log(result)
      refresh()
      return result;
    })
    .catch(error => {
      session.close();
      throw error;
    });

}

var generateGraphQuery = function (numNodes, numEdges) {
  const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
  var nodes = []
  var edges = []
  var ret = "CREATE ";
  Array.apply(null, Array(numNodes)).forEach(function (_, i) {
    const text = letters[i].toUpperCase() + (i > 26 ? i - 26 : '')
    ret += "(" + text + ":Loc{name:'" + text + "'}),"
    nodes.push(text)
    return
  });
  if (numEdges == 0) {
    ret = ret.substring(0, ret.length - 1); // remove last , 
  }

  Array.apply(null, Array(numEdges)).forEach(function (_, i) {
    const firstNode = nodes[Math.floor(Math.random() * numNodes)]
    var secondNode
    do {
      secondNode = nodes[Math.floor(Math.random() * numNodes)]
    }
    while (secondNode == firstNode)
    ret += "(" + firstNode + ")-[:ROAD]->(" + secondNode + ")"
    ret += i == numEdges - 1 ? ";" : ","
    return
  });


  //console.log(ret)
  return ret
}

var defaultGraph = `CREATE (a:Loc{name:'A'}), (b:Loc{name:'B'}), (c:Loc{name:'C'}),
(d:Loc{name:'D'}), (e:Loc{name:'E'}), (f:Loc{name:'F'}),
(a)-[:ROAD]->(b),
(a)-[:ROAD]->(c),
(a)-[:ROAD]->(d),
(a)-[:ROAD]->(d),
(b)-[:ROAD]->(d),
(c)-[:ROAD]->(d),
(c)-[:ROAD]->(e),
(d)-[:ROAD]->(e),
(d)-[:ROAD]->(f),
(e)-[:ROAD]->(f),
(e)-[:ROAD]->(f);`

var createGraph = function (nodesNo, edgesNo) {
  var session = driver.session();
  return session
    .run(
      generateGraphQuery(nodesNo, edgesNo)
    )
    .then(result => {
      session.close();
      //console.log("Graph created: " + result)
      return result;
    })
    .catch(error => {
      session.close();
      throw error;
    });

}

var clearGraph = function () {
  var session = driver.session();
  return session
    .run(
      `MATCH (n:Loc)
       OPTIONAL MATCH (n)-[r]-()
       DELETE n,r`
    )
    .then(result => {
      session.close();
      //console.log("Graph cleared: " + result)
      return result;
    })
    .catch(error => {
      session.close();
      throw error;
    });
}


var handleUndirected = function() {
  var current = document.getElementById("undirected").innerHTML 
  document.getElementById("undirected").innerHTML = current == "Undirected" ? "Directed" : "Undirected"  
}

var handleRefresh = function() {

  refresh(true)
}

var handleGenerate = function(e) {
  if (e) {e.preventDefault()}
  nodesNo = parseInt(document.querySelector("#form input[name='nodesno']").value)
  edgesNo = parseInt(document.querySelector("#form input[name='edgesno']").value)

  clearGraph().then(_ => {
    createGraph(nodesNo, edgesNo).then(_ => {
      refresh()
    })
  })
}