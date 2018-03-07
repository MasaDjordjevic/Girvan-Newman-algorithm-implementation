
var generateGraphQuery = function (numNodes, numEdges) {
    const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
    var nodes = []
    var ret = "CREATE ";
    Array.apply(null, Array(numNodes)).forEach(function (_, i) {
      const text = letters[i % 26].toUpperCase() + (i > 25 ? i - 25 : '')
      ret += "(" + text + ":Loc{name:'" + text + "'}),"
      nodes.push(text)
      return
    });
    if (numEdges == 0) {
      ret = ret.substring(0, ret.length - 1); // remove last , 
    }
  
    var edges = []
    function checkDuplicates(firstNode, secondNode) {
      return _.findIndex(edges, function (e) {
        return (e.from == fistNode && e.to == secondNode) || (e.to == fistNode && e.from == secondNode)
      });
    }
  
    Array.apply(null, Array(numEdges)).forEach(function (_, i) {
      const firstNode = fistNode = nodes[Math.floor(Math.random() * numNodes)]
      var secondNode
      var limit = 0
      do {
        secondNode = nodes[Math.floor(Math.random() * numNodes)]
        limit++
      }
      while (limit < 100 && (secondNode == firstNode || checkDuplicates))
      edges.push({ from: firstNode, to: secondNode })
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

var neo4jDataToD3Data = function (data, betweeness, elaboration) {
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
        elaboration: elaboration[link.id.low],
        label: "link"
      })
    })
  
    //console.log(graph)
  
  
    return graph;
  }

  exports.generateGraphQuery = generateGraphQuery
  exports.neo4jDataToD3Data = neo4jDataToD3Data