var svg
var positions = {}

var colors = {
    'red': 'darkorange'
}

var clearGraph = function (graph) {
    if (graph && graph.nodes) {
        graph.nodes.forEach(n => {
            positions[n.title] = {}
            positions[n.title].x = n.x
            positions[n.title].y = n.y
        })
    }
}

var renderGraph = function (graph, maxBetweeness) {
    var width = 800, height = 800; radius = 25;

    var color = d3.scale.category20();

    var force = d3.layout.force()
        .charge(-100)
        .linkDistance(200)
        .gravity(0)
        .size([width, height]);

    if (!svg) {
        svg = d3.select("#graph").append("svg")
            .attr("width", "100%").attr("height", "100%")
            .attr("pointer-events", "all");


    }
    else {
        d3.selectAll("svg > *").remove();
        graph.nodes.forEach(n => {
            n.x = positions[n.title].x
            n.y = positions[n.title].y
        })
    }


    force.nodes(graph.nodes).links(graph.links).start();



    var link = svg.selectAll(".link")
        .data(graph.links)
        .enter()
        .append("line")
        .attr("id", function (d, i) { return 'edge' + i })
        .attr("marker-end", function (d, i) {
            return 'url(#marker_' + (maxBetweeness && d.id == maxBetweeness.key ? colors.red : 'gray') + ')'
        })
        .style("stroke-width", '1.5px')
        .style('stroke', function (d, i) {
            return maxBetweeness && d.id == maxBetweeness.key ? colors.red : '#ccc'
        })
        .style("pointer-events", "none");

    var edgepaths = svg.selectAll(".edgepath")
        .data(graph.links)
        .enter()
        .append('path')
        .attr({
            'd': function (d) { return 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y },
            'class': 'edgepath',
            'fill-opacity': 0,
            'stroke-opacity': 0,
            'fill': 'blue',
            'stroke': colors.red,
            'id': function (d, i) { return 'edgepath' + i }
        })
        .style("pointer-events", "none");

    var edgelabels = svg.selectAll(".edgelabel")
        .data(graph.links)
        .enter()
        .append('text')
        .style("pointer-events", "none")
        .attr({
            'class': 'edgelabel',
            'id': function (d, i) { return 'edgelabel' + i },
            'dx': 90,
            'dy': 11,
            'font-size': 12,
            "user-serlect": "none",
            'fill': function (d, i) {
                return maxBetweeness && d.id == maxBetweeness.key ? colors.red : '#aaa'
            }
        });

    edgelabels.append('textPath')
        .attr('xlink:href', function (d, i) { return '#edgepath' + i })
        .attr("user-serlect", "none")
        .style("pointer-events", "none")
        .text(function (d, i) { return Math.round(d.betweeness * 100) / 100 });


    var node = svg.selectAll(".node")
        .data(graph.nodes)


    var node = svg.selectAll(".node")
        .data(graph.nodes).enter()
        .append("circle")
        .attr("fill", "rgb(104, 189, 246)")
        .attr("stroke", "rgb(92, 168, 219)")
        .attr("class", d => {
            return "node " + d.label
        })
        .attr("r", radius)
        .call(force.drag);


    var nodelabels = svg.selectAll(".nodelabel")
        .data(graph.nodes)
        .enter()
        .append("text")
        .attr({
            "x": function (d) { return d.x - 14; },
            "y": function (d) { return d.y - 200; },
            "class": "nodelabel",
            "stroke": "white",
            "fill": "white",
            "user-serlect": "none"
        })
        .text(function (d) { return d.title; });
    // html title attribute
    node.append("title")
        .text(d => {
            return d.title;
        });

    var arrowColors = [{name: colors.red, color: colors.red }, {name:"gray", color: "#ccc" }]
    svg
        .append('defs')
        .selectAll('marker')
        .data(arrowColors)
        .enter()
        .append('marker')
        .attr({
            'id': function (d) { return 'marker_' + d.name },
            'viewBox': '-0 -5 10 10',
            'refX': 40,
            'refY': 0,
            //'markerUnits':'strokeWidth',
            'orient': 'auto',
            'markerWidth': 6,
            'markerHeight': 6,
            'xoverflow': 'visible'
        })
        .append('svg:path')
        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
        .attr('stroke', function (d, i) { return d.color })
        .attr('fill', function (d, i) { return d.color })


    // force feed algo ticks
    force.on("tick", function () {

        link.attr({
            "x1": function (d) { return d.source.x; },
            "y1": function (d) { return d.source.y; },
            "x2": function (d) { return d.target.x; },
            "y2": function (d) { return d.target.y; }
        });




        node
            .attr("cx", function (d) { return d.x = Math.max(radius, Math.min(width - radius, d.x)); })
            .attr("cy", function (d) { return d.y = Math.max(radius, Math.min(height - radius, d.y)); });



        nodelabels
            .attr("x", function (d) { return d.x - 5; })
            .attr("y", function (d) { return d.y + 5; });

        edgepaths.attr('d', function (d) {
            var path = 'M ' + d.source.x + ' ' + d.source.y + ' L ' + d.target.x + ' ' + d.target.y;
            //console.log(d)
            return path
        });

        edgelabels.attr('transform', function (d, i) {
            if (d.target.x < d.source.x) {
                var bbox = this.getBBox();
                var rx = bbox.x + bbox.width / 2;
                var ry = bbox.y + bbox.height / 2;
                return 'rotate(180 ' + rx + ' ' + ry + ')';
            }
            else {
                return 'rotate(0)';
            }
        });
    });


}

exports.clearGraph = clearGraph;
exports.renderGraph = renderGraph