
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
  
  
    var edges = []
    function checkDuplicates(firstNode, secondNode) {
      return -1 != _.findIndex(edges, function (e) {
        return (e.from == firstNode && e.to == secondNode) || (e.to == firstNode && e.from == secondNode)
      });
    }
  
    Array.apply(null, Array(numEdges)).forEach(function (_, i) {
      var rand = Math.floor(Math.random() * numNodes)
      const firstNode = nodes[rand]
      var secondNode
      var limit = 0
      do {
        rand = Math.floor(Math.random() * numNodes)
        secondNode = nodes[rand]
        limit++
      }
      while (limit < 100 && (secondNode == firstNode || checkDuplicates(firstNode, secondNode)))
      if (secondNode == firstNode || checkDuplicates(firstNode, secondNode)) {
          return;
      }
      edges.push({ from: firstNode, to: secondNode })
      ret += "(" + firstNode + ")-[:ROAD]->(" + secondNode + ")"
      ret += i == numEdges - 1 ? ";" : ","
      return
    });
  
    if (ret[ret.length -1]== ',') {
        ret = ret.substring(0, ret.length - 1); // remove last , 
      }
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
  
    // //console.log("-----")
    // var nodes = data.records[0]._fields[0].nodes
    // var links = data.records[0]._fields[0].links
    var nodes = data.nodes
    var links = data.links

    //console.log(links)
    nodes && nodes.forEach(node => {
      graph.nodes.push({ title: node.properties.name, label: "Loc" })
    })
    links && links.forEach(link => {
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