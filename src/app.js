require('file?name=[name].[ext]!../node_modules/neo4j-driver/lib/browser/neo4j-web.min.js');
var drawing = require('./drawing.js')

window.addEventListener('DOMContentLoaded', function () {
  clearGraph().then(
    createGraph().then(
      refresh()
    )
  )


  document.getElementById("delete").addEventListener('click', deleteEdge)


}, false);

var sp = []
var betweeness = {}
var refresh = function () {
  return shortestPaths().then(_ => {
    groupPaths();
    //print();
    calculateBetweenes();
    drawGraph();
  })
}


var neo4j = window.neo4j.v1;
var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "matneomat"));
var _ = require('lodash');

function search() {
  var session = driver.session();
  return session
    .run(
      'match path=(n:Loc)-[]-(n1:Loc) \
        unwind nodes(path) as p unwind rels(path) as r \
        return {nodes: collect(distinct p), links: collect(DISTINCT {source: id(startNode(r)), target: id(endNode(r)), id: id(r)})}'
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
      betweeness =  {}
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


var groupPaths = function () {
  sp = _.groupBy(sp, function (b) {
    return b.from + " " + b.to
  });
}



var print = function () {
  for (var key in sp) {
    if (sp.hasOwnProperty(key)) {
      console.log(key)
      sp[key].forEach(p => {
        //console.log(p.path.nodes.map(n => n))
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


function getGraph() {
  var session = driver.session();
  return session.run(
    'MATCH (m:Movie)<-[:ACTED_IN]-(a:Person) \
    RETURN m.title AS movie, collect(a.name) AS cast \
    LIMIT {limit}', { limit: 100 })
    .then(results => {
      session.close();
      var nodes = [], rels = [], i = 0;
      results.records.forEach(res => {
        nodes.push({ title: res.get('movie'), label: 'movie' });
        var target = i;
        i++;

        res.get('cast').forEach(name => {
          var actor = { title: name, label: 'actor' };
          var source = _.findIndex(nodes, actor);
          if (source == -1) {
            nodes.push(actor);
            source = i;
            i++;
          }
          rels.push({ source, target })
        })
      });

      return { nodes, links: rels };
    });
}

var drawGraph = function () {
  search()
    .then(graph => {
      graph = neo4jDataToD3Data(graph)
      var maxBetweeness = getMaxBetweeness()
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

var createGraph = function () {
  var session = driver.session();
  return session
    .run(
      `CREATE (a:Loc{name:'A'}), (b:Loc{name:'B'}), (c:Loc{name:'C'}),
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