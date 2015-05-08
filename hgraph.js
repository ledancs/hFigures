/**
 * Created by andres on 4/23/15.
 */

function LabelFixer(margin, border){
    this.margin = margin;
    this.border = border;
}

LabelFixer.prototype.adjustLabel = function (i, angle, y, height, yOffset){
    var delta = 0,
        upper = Math.sin(angle) >= 0;

    var collision = upper ?
        y + height + this.margin >= this.border :
        y <= this.border;

    if(collision && i > 0)
        delta = upper ?
            this.border - y - height - this.margin : // negative to move it up
            this.border - y; // positive to move it down

    yOffset += delta;

    this.border = upper ?
        y + delta :
        y + height + this.margin + delta; // add the height and the margin plus possible delta

    return yOffset;
};

LabelFixer.prototype.resetBorder = function () {
    this.border = 0;
};

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

function angleUnit(startAngle, padAngle, endAngle, n) {
    var start = startAngle + padAngle/2;
    var end = endAngle - padAngle/2;

    var space = end - start;
    return space / (n + 1);
}

var arcs = hgraph.selectAll("g.arc")
    .data(pieObjects)
    .enter()
    .append("g")
    .attr("class", "arc");

var pointsPerSection = [];
var dataByAngles = [];
var pointsBySection = [];

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
    pointsBySection.push(pointsPerSection);
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
        return (Math.sin(d.labelAngle) * labelRadius * -1);

    })
    .attr("font-size", w * 0.0275)
    .each(function (d) {
        d.bbox = getBox(this);
    });

var pathData = [];

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
        var box = getBox(this);
        var dx = Math.cos(d.labelAngle) > 0 ? 0: box.width;
        var dy = box.height/2;
        d.line = [{
            x: box.x + dx,
            y: box.y + dy
        }];
    });


// move them out of the background circle
groupLabels.attr("transform", function(d){
    var box = getBox(this);

    var w = box.width * 1.065;
    var h = box.height * 1.065;

    var cos = Math.cos(d.labelAngle);
    var sin = Math.sin(d.labelAngle);

    w *= cos > 0 ? 1: -1;
    h *= sin > 0 ? -1: 1;

    d.line.push({
        x: (cos * outerRadius) - (w/2),
        y: (sin * outerRadius * -1) - (h/2)
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
    .attr("stroke-dasharray", function(){
        return 3 + " " + 3;
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

hgraph.append("g").attr("class", "polygon").selectAll("polygon")
    .data(function () {
        var coordinates = [];
        for(var i = 0; i < points.length; i ++)
            coordinates.push(points[i].coords);
        return [coordinates];
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
/*
var pointsSection = pointsGroup.selectAll("g.pointsSection")
    .data(pointsBySection)
    .enter()
    .append("g")
    .attr("class", "pointsSection");
*/
// select the sample as well
for(var i = 0; i < pointsBySection.length; i++){
    var g = pointsGroup.append("g").attr("class", "pointsInSection");
    g.selectAll("circle")
        .data(pointsBySection[i])
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
}

/*
pointsSection.selectAll("circle")
    .data(function (d, i) {

        return pointsBySection[i];
    })
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
*/
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
        return (Math.sin(d.labelAngle) * d.r * -1);
    })
    .attr("font-size", w * 0.0125)
    .each(function (d) {
        d.bbox = getBox(this);
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
        d.frameBox = getBox(this);
    });


// move them out of the background circle
labels.each(function (d) {
    var boxW = Math.cos(d.labelAngle) > 0 ? d.frameBox.width: -d.frameBox.width;
    d.xOffset = boxW / 2;
    var boxH = Math.sin(d.labelAngle) > 0 ? -d.frameBox.height: d.frameBox.height;
    d.yOffset = boxH / 2;
});

labels.attr("class", function(d){
    // since we shift the angles as a clock
    // 12 o'clock we begin
    // from there it is clockwise
    // so 1st quadrant begins from 12 o'clock
    // then quadrant 4rd, 3rd and we end in the 2nd.
    var angle = Math.PI / 2 - d.labelAngle;
    return between(angle, 0, Math.PI/2) ? "q1" :
        between(angle, Math.PI/2, Math.PI) ? "q4" :
        between(angle, Math.PI, 3/2*Math.PI) ? "q3" : "q2";
});

function between(x, min, max) {
    return x >= min && x <= max;
}

// collisions
var border = 0; // determines the border that the next element should not exceed
var margin = 7; // margin space
var lf = new LabelFixer(margin, border);
var quadrants = [];

// First quadrant
quadrants.push(hgraph.selectAll("g.q1").sort(function(a, b){
    return a.labelAngle - b.labelAngle; // specific to this quadrant sort by ascending
}));
// Second quadrant
quadrants.push(hgraph.selectAll("g.q2").sort(function(a, b){
    return b.labelAngle - a.labelAngle; // descending order
}));
// Third quadrant
quadrants.push(hgraph.selectAll("g.q3").sort(function(a, b){
    return a.labelAngle - b.labelAngle; // ascending order
}));
// Fourth quadrant
quadrants.push(hgraph.selectAll("g.q4").sort(function(a, b){
    return b.labelAngle - a.labelAngle; // ascending order
}));
// loop through the quadrants
for(var i = 0; i < quadrants.length; i++){
    quadrants[i].each(function (d, i) {
        d.yOffset = lf.adjustLabel(i, d.labelAngle, d.frameBox.y, d.frameBox.height, d.yOffset);
    });
    lf.resetBorder(); // reset the border
}

// get all the labels
// group by quadrants
// sort by distance to 0, PI and 2PI
// begin with shortest distance to PI
// move up or down
// adjust the next

labels.attr("transform", function(d){
    return "translate(" + d.xOffset + ", " + d.yOffset + ")";
});

labels.append("line")
    .attr("x1", function (d) {
        return Math.cos(d.labelAngle) > 0 ? d.frameBox.x: d.frameBox.x + d.frameBox.width;
    })
    .attr("y1", function (d) {
        return d.frameBox.y + d.frameBox.height/2;
    })
    .attr("x2", function (d) {
        return Math.cos(d.labelAngle) * (d.radius + 3) - d.xOffset;
    })
    .attr("y2", function (d) {
        return (Math.sin(d.labelAngle) * (d.radius + 3) * - 1) - d.yOffset;
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

// flip the y axis
// var scale = "scale(1, -1)";
// rotate
// var rotate = "rotate(90)";
// all the transformations
// var transformations = [scale, rotate];
// apply
// arcs.attr("transform", transformations.join(" "));
//pointsGroup.attr("transform", scale + " " + rotate);
//polygon.attr("transform", scale + " " + rotate);
// move the hgraph
var translate = "translate(" + (w/2) + ", " + (h/2) + ")";
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
        // move the result so it goes clockwise
        angle = Math.PI / 2 - angle;
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
    var result = startAngle + (space / slice);
    // move the result so it goes clockwise
    return Math.PI / 2 - result;
}

function angle(startAngle, endAngle) {
    var centroidAngle = (startAngle + endAngle)/2;
    // Math.PI (rad) = 180 (deg)
    // centroidAngle (rad) = x (deg)
    // return a > 90 ? a - 180 : a;
    return (centroidAngle * 180) / Math.PI;
}

function getBox(svgElement){
    return svgElement.getBBox();
}

function GroupedAnimation(n, callfirst, callback){
    this.n = n;
    this.elementsDone = 0;
    this.callfirst = callfirst;
    this.callback = callback;
}

GroupedAnimation.prototype.animateOpacity = function (d3element, val) {
    this.callfirst();
    var self = this;
    d3element
        .transition()
        .attr("opacity", val)
        .duration(1300)
        .call(endAll, function(){ self.check.apply(self); });
};

GroupedAnimation.prototype.check = function () {
    this.elementsDone++;
    if(this.elementsDone === this.n){
        this.elementsDone = 0;
        this.callback();
    }
};

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
// setup the group animations
var zoomCallfirst = function () {
    pzlib.allowZoom = false; // disable zoom
};
var zoomCallback = function () {
    pzlib.allowZoom = true; // enable zoom
};
// two groups, and function to call first and after the groups have finished the animation
var ga = new GroupedAnimation(2, zoomCallfirst, zoomCallback);
// zoom and pan
pzlib.setup("hgraph-container");
pzlib.deltaS = 0.50;
pzlib.zoomLimit = 2.50;

pzlib.afterZoom = function () {
    pzlib.zoomLevel > 1 ? zoomInAction(): zoomOutAction();
};

function zoomInAction(){
    show(labels);
    dim(groupLabels);
}

function zoomOutAction(){
    show(groupLabels);
    hide(labels);
}

function isVisible(d3element){
    var opacity = parseInt(d3element.attr("opacity"));
    return opacity != 0;
}

function show(d3element){
    if(!isVisible(d3element))
        ga.animateOpacity(d3element, 1);
}

function dim(d3element){
    if(isVisible(d3element))
        ga.animateOpacity(d3element, 0.3);
}

function hide(d3element){
    if(isVisible(d3element))
        ga.animateOpacity(d3element, 0);
}

// testing git