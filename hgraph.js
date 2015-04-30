/**
 * Created by andres on 4/23/15.
 */

var dataset = groups; // how many measurements per group

var pie = d3.layout.pie().value(function (d) {
    return d.measurements.length;
}).sort(null);

pie.padAngle(Math.PI / 105);

var w = 800;
var h = 800;

var outerRadius = w * 0.25;
var innerRadius = w * 0.165;
var labelRadius = w * 0.32;

var arc = d3.svg.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

var svg = d3.select("div#hgraph-container")
    .append("svg")
    .attr("viewBox", "0 0 " + w + " " + h);

var pieObjects = pie(dataset);

var hgraphWrapper = svg.append("g").attr("class", "hgraph-wrapper");

var hgraph = hgraphWrapper.append("g").attr("class", "hgraph");

var points = [];

var angleUnit = function (startAngle, padAngle, endAngle, n) {
    var start = startAngle + padAngle/2;
    var end = endAngle - padAngle/2;

    var space = end - start;
    var unit = space / (n + 1);

    return unit;
};

var arcs = hgraph.selectAll("g.arc")
    .data(pieObjects)
    .enter()
    .append("g")
    .attr("class", "arc");

var pointsPerSection = [];
var dataByAngles = [];

arcs.append("path")
    .attr({
        "fill": "#74c476",
        //"stroke": "#74c476",
        "stroke": "none",
        "d": arc
    });

arcs.each(function (d, i) {

    dataByAngles.push({
        groupValues: dataset[i],
        startAngle: d.startAngle,
        endAngle: d.endAngle,
        padAngle: d.padAngle,
        labelAngle: getAngleAtSlice(d.startAngle, d.endAngle, d.padAngle, 2)
    });

    pointsPerSection = generatePoints(i, d.startAngle, d.padAngle, d.endAngle);
    points = points.concat(pointsPerSection);
});

var groupLabels = hgraph.selectAll("g.groupLabels")
    .data(dataByAngles)
    .enter()
    .append("g")
    .attr("class", "groupLabels");

var groupLabelsText = groupLabels.append("text")
    .text(function(d){
        return d.groupValues.label;
    })
    .attr("text-anchor", "middle")
    .attr("x", function(d){
        return Math.cos(d.labelAngle) * labelRadius;
    })
    .attr("y", function(d){
        return (Math.sin(d.labelAngle) * labelRadius * -1) + yRadius(d.labelAngle, w)/2;

    })
    .attr("font-size", w * 0.0275)
    .each(function (d) {
        var bbox = this.getBBox()
        d.bbox = bbox;
    });

var groupLabelsFrame = groupLabels.append("rect")
    .attr("x", function(d){
        return d.bbox.x - 5;
    })
    .attr("y", function (d) {
        return d.bbox.y;
    })
    .attr("height", function (d) {
        return d.bbox.height;
    })
    .attr("width", function (d) {
        return d.bbox.width + 10;
    })
    .attr({
        "rx": 5,
        "ry": 5,
        "stroke": "grey",
        // "fill": "#d5f5d5",
        "fill": "none",
        "stroke-width": 1.5
    })
    .each(function (d) {
        var dx = Math.cos(d.labelAngle) > 0 ? 0: this.getBBox().width;
        var dy = this.getBBox().height/2;
        d.line = [{
            x: this.getBBox().x + dx,
            y: this.getBBox().y + dy
        }];
    });


// move them out of the background circle
groupLabels.attr("transform", function(d, i){
    var w = this.getBBox().width * 1.065;
    var h = this.getBBox().height * 1.065;

    w *= Math.cos(d.labelAngle) > 0 ? 1: -1;
    h *= Math.sin(d.labelAngle) > 0 ? -1: 1;

    d.line.push({
        x: (Math.cos(d.labelAngle) * outerRadius) - (w/2),
        y: (Math.sin(d.labelAngle) * outerRadius * -1) - (h/2)
    });

    return "translate(" + (w/2) + ", " + (h/2) + ")";
});

var lineFunction = d3.svg.line()
    .x(function (d) {
        return d.x;
    })
    .y(function (d) {
        return d.y;
    })
    .tension(0)
    .interpolate("cardinal-closed");

groupLabels.append("path")
    .attr("d", function (d) {
        return lineFunction(d.line);
    })
    .attr({
        "stroke": "grey",
        "stroke-width": 2,
        "fill": "none"
    })
    .attr("stroke-dasharray", function(d){
        return 3 + " " + 3;
    })
    .each(function (d) {
        d.direction = true;
    });

// move the frame to the foreground
groupLabelsFrame.each(function(){
    this.parentNode.appendChild(this);
});
// move the labels on top of the rectangles
groupLabelsText.each(function(){
    this.parentNode.appendChild(this);
});

// polygon

var polygon = hgraph.append("g").attr("class", "polygon").selectAll("polygon")
    .data(function () {
        var coords = [];
        for(var x in points){
            coords.push(points[x].coords);
        }
        return [coords];
    })
    .enter()
    .append("polygon")
    .attr("points", function(d) {
        // compute the coordinates
        return d.join(" ");
    }).attr({
        "stroke": "#5b5b5b",
        "stroke-width": 1,
        "fill": "grey",
        "fill-opacity": 0.35
    });

var pointsGroup = hgraph.append("g").attr("class", "pointsGroup");

var pointsSection = pointsGroup.selectAll("g.pointsSection")
    .data(pieObjects)
    .enter()
    .append("g")
    .attr("class", "pointsSection");

// select the sample as well
pointsSection.selectAll("circle")
    .data(points)
    .enter()
    .append("circle")
    .attr({
        "fill": "white",
        "stroke": "#5b5b5b",
        "stroke-width": 1,
        "r": 3
    })
    .attr("cx", function (d) {
        return d.coords[0];
    })
    .attr("cy", function (d) {
        return d.coords[1];
    });

// labels for the circles

var labels = hgraph.selectAll("g.labels")
    .data(points)
    .enter()
    .append("g")
    .attr("class", "labels");

var labelsText = labels.append("text")
    .text(function(d){
        return d.measurement.label + ": " + d.sample.value + " " + d.measurement.units;
    })
    .each(function(d){
        d.r = Math.max(d.radius + 10, outerRadius + 10);
    })
    .attr("text-anchor", "middle")
    .attr("x", function(d){
        return Math.cos(d.labelAngle) * d.r;
    })
    .attr("y", function(d){
        return (Math.sin(d.labelAngle) * d.r * -1) + yRadius(d.labelAngle, w);
    })
    .attr("font-size", w * 0.0125)
    .each(function (d) {
        var bbox = this.getBBox()
        d.bbox = bbox;
    });

var labelsFrame = labels.append("rect")
    .attr("x", function(d){
        return d.bbox.x - 5;
    })
    .attr("y", function (d) {
        return d.bbox.y;
    })
    .attr("height", function (d) {
        return d.bbox.height;
    })
    .attr("width", function (d) {
        return d.bbox.width + 10;
    })
    .attr({
        "rx": 3,
        "ry": 3,
        "stroke": "grey",
        // "fill": "#d5f5d5",
        "fill": "white",
        "stroke-width": 0.75
    })
    .each(function (d) {
        var dx = Math.cos(d.labelAngle) > 0 ? 0: this.getBBox().width;
        var dy = this.getBBox().height/2;
        d.line = [{
            x: this.getBBox().x + dx,
            y: this.getBBox().y + dy
        }];
    });


// move them out of the background circle
labels.attr("transform", function(d, i){
    var w = this.getBBox().width * 1.065;
    var h = this.getBBox().height * 1.065;

    w *= Math.cos(d.labelAngle) > 0 ? 1: -1;
    h *= Math.sin(d.labelAngle) > 0 ? -1: 1;

    d.line.push({
        x: (Math.cos(d.labelAngle) * (d.radius + 5)) - (w/2),
        y: (Math.sin(d.labelAngle) * (d.radius + 5) * -1) - (h/2)
    });

    return "translate(" + (w/2) + ", " + (h/2) + ")";
});
labels.append("line")
    .attr("x1", function (d) {
        return d.line[0].x;
    })
    .attr("y1", function (d) {
        return d.line[0].y;
    })
    .attr("x2", function (d) {
        return d.line[1].x;
    })
    .attr("y2", function (d) {
        return d.line[1].y;
    })
    .attr({
        "stroke": "grey",
        "stroke-width": 1
    })
    .style("stroke-dasharray", ("1, 1"));
labelsFrame.each(function(){
    this.parentNode.appendChild(this);
});
// move the labels on top of the rectangles
labelsText.each(function(){
    this.parentNode.appendChild(this);
});
// move the hgraph
var translate = "translate(" + (w/2) + ", " + (h/2) + ")";
// flip the y axis
var scale = "scale(1, -1)";
// rotate
var rotate = "rotate(90)";
// all the transformations
var transformations = [scale, rotate];
// apply
arcs.attr("transform", transformations.join(" "));
//pointsGroup.attr("transform", scale + " " + rotate);
//polygon.attr("transform", scale + " " + rotate);
hgraph.attr("transform", translate);

// console.log(points.join(" "));

function generatePoints(i, startAngle, padAngle, endAngle) {
    var g = dataset[i];
    // console.log(g.label);
    // console.log(startAngle);
    var ms = g.measurements;
    var n = ms.length;
    var delta = angleUnit(startAngle, padAngle, endAngle, n);
    var angle, m, scale, s, v, x, y, r;
    var pointsInSection= [];
    for(var j = 0; j < n; j ++){
        m = ms[j];
        s = m.samples[1];
        v = s.value;
        angle = startAngle + padAngle + ((j + 1) * delta);
        scale = d3.scale.linear()
            .domain([m.min, m.max])
            .range([innerRadius, outerRadius]);
        r = scale(v);
        x = Math.cos(angle) * r;
        y = Math.sin(angle) * r * -1;
        pointsInSection.push({
            coords: [x, y],
            radius: r,
            labelAngle: angle,
            measurement: m,
            sample: s
    });
    }
    return pointsInSection;
}

function getAngleAtSlice(startAngle, endAngle, padAngle, slice){
    var start = startAngle + padAngle/2;
    var end = endAngle - padAngle/2;
    var space = end - start;
    return startAngle + padAngle + (space / slice);
}

function angle(startAngle, endAngle) {
    var centroidAngle = (startAngle + endAngle)/2;
    // Math.PI (rad) = 180 (deg)
    // centroidAngle (rad) = x (deg)
    var a = (centroidAngle * 180) / Math.PI;
    // return a > 90 ? a - 180 : a;
    return a;
}

function yRadius(angle, width){
    var offset = 0;

    var steps = [
        {fraction: 4,  value: 0.0050},
        {fraction: 6,  value: 0.0075},
        {fraction: 8,  value: 0.0100},
        {fraction: 10, value: 0.0075},
        {fraction: 16, value: 0.0050},
        {fraction: 24, value: 0.0050},
        {fraction: 32, value: 0.0075}
    ];

    var rangeA, rangeB, adjustedAngle;

    for(var i = 0; i < steps.length; i++){

        rangeA = Math.PI/2 - Math.PI/steps[i].fraction;
        rangeB = Math.PI/2 + Math.PI/steps[i].fraction;
        adjustedAngle = Math.abs(angle % Math.PI);

        if(adjustedAngle > rangeA && adjustedAngle < rangeB){
            offset -= Math.sin(angle) * width * steps[i].value;
        }
    }
    return offset;
}

function isVisible(d3element){
    var opacity = parseInt(d3element.attr("opacity"));
    if(opacity == 0)
        return false;
    return true;
}

var done = 0;

function animateOpacity(d3element, val){
    pzlib.allowZoom = false;
    d3element
        .transition()
        .attr("opacity", val)
        .duration(1300)
        .call(endAll, function() {
            done++;
            if(done === 2){
                done = 0;
                pzlib.allowZoom = true;
            }
        });
}

function endAll(transition, callback) {
    if (transition.size() === 0) { callback() }
    var n = 0;
    transition
        .each(function() { ++n; })
        .each("end", function() { if (!--n) callback.apply(this, arguments); });
}

// show and hide
labels.attr("opacity", 0);
groupLabels.attr("opacity", 1);

// zoom and pan
pzlib.setup("hgraph-container");
pzlib.deltaS = 0.50;
pzlib.zoomLimit = 2.50;

pzlib.afterZoom = function () {

    if(pzlib.zoomLevel > 1){
        console.log("trigger!");
        if(isVisible(groupLabels)){
            animateOpacity(groupLabels, 0.1);
        }
        if(!isVisible(labels)){
            animateOpacity(labels, 1);
        }
    }

    else {
        if(!isVisible(groupLabels)){
            animateOpacity(groupLabels, 1);
        }
        if(isVisible(labels)){
            animateOpacity(labels, 0);
        }
    }

    console.log("zoom level " + this.zoomLevel)
};

// testing git