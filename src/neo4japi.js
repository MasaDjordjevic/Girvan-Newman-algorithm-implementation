var neo4j = window.neo4j.v1;
var driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "matneomat"));
var data = require('./data.js')

var runQuery = function (query) {
    return function () {
        var session = driver.session();
        return session
            .run(query)
            .then(result => {
                session.close();
                return result;
            })
            .catch(error => {
                session.close();
                throw error;
            });
    }

}

var getGraphQuery =
    `match path=(n:Loc)-[]-(n1:Loc)
match (k:Loc)
unwind nodes(path) as p unwind rels(path) as r
return {nodes: collect(distinct k), links: collect(DISTINCT {source: id(startNode(r)), target: id(endNode(r)), id: id(r)})}`

var getGraph = runQuery(getGraphQuery)

var shortestPathsQuery =
    `MATCH (n1:Loc),(n2:Loc) 
WHERE n1<>n2 
MATCH p=allShortestPaths((n1:Loc)-[*]-` +
    (undirected ? '' : '>') +
    `(n2:Loc)) WITH  p, n1, n2, 
reduce(s="",x in nodes(p) | s+" "+x.name) AS path, 
reduce(s="",x in relationships(p) | s+" "+ id(x)) AS edges  
ORDER BY LENGTH(p) DESC return n1, n2, path, edges`
var shortestPaths = runQuery(shortestPathsQuery)


var deleteEdge = function (edgeId) {
    const query = 'match (n:Loc)-[r]-(k:Loc) \
    where id(r)=' +
        edgeId +
        ' delete r'
    return runQuery(query)()
}

var clearGraphQuery = `MATCH (n:Loc)
OPTIONAL MATCH (n)-[r]-()
DELETE n,r`
var clearGraph = runQuery(clearGraphQuery)


var createGraph = function (nodesNo, edgesNo) {
    return runQuery(data.generateGraphQuery(nodesNo, edgesNo))()
}
exports.getGraph = getGraph
exports.shortestPaths = shortestPaths
exports.deleteEdge = deleteEdge
exports.clearGraph = clearGraph
exports.createGraph = createGraph