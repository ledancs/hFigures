/**
 * Created by andres on 4/23/15.
 */

// each circle has
// name of the measurement
// angle
// optimal range
// yellow ?
// red ?
// array of samples
// selected sample
// given a timestamp
// each circle computes: radius, x, y, color
// functions: first, last, next, previous, goto(timestamp)

/**
 *
 * @param name
 * @param units
 * @param angle
 * @param min
 * @param max
 * @param samples
 * @param r0
 * @param r1
 * @constructor
 */
function HealthMeasurement(measurement, angle, r0, r1){

    this.name = measurement.label,
        this.r = 4, // this is the radius of the svg circle element
        this.units = measurement.units,
        this.angle = angle,
        this.min = measurement.min,
        this.max = measurement.max,
        this.samples = measurement.samples,
        this.sample = 0,
        this.r0 = r0,// inner radius
        this.r1 = r1,// outer radius
        this.additionalRanges = false,
        this.scale = d3.scale.linear()
            .domain([this.min, this.max])
            .range([this.r0, this.r1]);

    this.x = this.y = this.radius = 0;
    this.color = "white";
    // check for yellow and red ranges
    var ranges = HealthMeasurement.additionalRanges; // shorthand
    for(var i = 0; i < ranges.length; i++){
        if (typeof measurement[ranges[i]] != 'undefined'){
            this.additionalRanges = true;
            this[ranges[i]] = measurement[ranges[i]];
        }
    }
    // compute the position and color
    this.computePosition();
}
/**
 * Computes the position and sets the x, y and radius based on the selected sample.
 */
HealthMeasurement.prototype.computePosition = function () {
    var sample = this.samples[this.sample];
    var value = sample.value;
    this.radius = this.scale(value);
    this.x = Math.cos(this.angle) * this.radius;
    this.y = Math.sin(this.angle) * this.radius * -1;

    this.color = this.additionalRanges ? "#73D651": "white";

    if(this["yellow_max"] && value >= this.max){
        this.color = "gold";
    }
    if(this["red_max"] && value >= this["red_max"]){
        this.color = "tomato";
    }

    if(this["yellow_min"] && value <= this.min){
        this.color = "gold";
    }
    if(this["red_min"] && value <= this["red_min"]){
        this.color = "tomato";
    }

};

HealthMeasurement.additionalRanges = ["yellow_min", "yellow_max", "red_min", "red_max"];

function toDistanceString(healthMeasurements){
    var arr = [];
    for(var i = 0; i < healthMeasurements.length; i ++){
        arr.push([healthMeasurements[i].x, healthMeasurements[i].y]);
    }
    return [arr];
}

/**
 *
 * @param margin
 * @param border
 * @constructor
 */
function LabelFixer(margin, border){
    this.margin = margin;
    this.border = border;
}
/**
 * Adjusts the y coordinate to avoid overlapping for a set of measurements in a quadrant.
 * @param i
 * @param angle
 * @param y
 * @param height
 * @param yOffset
 * @returns {number|*}
 */
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
/**
 * Resets the border before the next calculation begins.
 */
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

var outerRadius = w * 0.27;
var innerRadius = w * 0.17;
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

var arcsG = hgraph.append("g").attr("class", "arcs");

var points = [];

function angleUnit(startAngle, padAngle, endAngle, n) {
    var start = startAngle + padAngle/2;
    var end = endAngle - padAngle/2;

    var space = end - start;
    return space / (n + 1);
}

var arcs = arcsG.selectAll("g.arc")
    .data(pieObjects)
    .enter()
    .append("g")
    .attr("class", "arc");

var pointsPerSection = [];
var dataByAngles = [];
var pointsBySection = [];
var hGraphMeasurements = [];

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

    // experiment
    hGraphMeasurements = hGraphMeasurements.concat(
        hGraphMeasurementsBuilder(i, d.startAngle, d.padAngle, d.endAngle)
    );
});

function labelCentroid(box, angle){
    var w = box.width * 1.065;
    var h = box.height * 1.065;

    var cos = Math.cos(angle);
    var sin = Math.sin(angle);

    w *= cos > 0 ? 1: -1;
    h *= sin > 0 ? -1: 1;

    return {
        x: w/2,
        y: h/2
    };
}

function addFrameBox(labels){
    return labels.append("rect")
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
            "rx": 1,
            "ry": 1,
            "stroke": "grey",
            // "fill": "#d5f5d5",
            "fill": "white",
            "stroke-width": 0.75
        });
}

function addLabelText(groups, funcText, funcAngle, fontSize){
    return groups.append("text")
        .text(funcText) // get the text for each element
        .attr("text-anchor", "middle")
        .each(funcAngle) // get the angle
        .attr("x", function(d){
            return Math.cos(d.labelAngle) * d.labelRadius;
        })
        .attr("y", function(d){
            return (Math.sin(d.labelAngle) * d.labelRadius * -1);
        })
        .attr("font-size", fontSize)
        .each(function (d) {
            d.bbox = getBox(this);
        });
}

function addLabelLines(labels){
    return labels.append("line")
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
}

var groupLabelsG = hgraph.append("g").attr("class", "groupLabels");
var groupLabels = groupLabelsG.selectAll("g.groupLabel")
    .data(dataByAngles)
    .enter()
    .append("g")
    .attr("class", "groupLabel");
buildLabels(groupLabels, function (d) {
    return d.groupValues.label;
}, function (d) {
    d.labelRadius = labelRadius;
    // group labels do not have a value associated
    // so we set the outer radius as the reference ( the big circle )
    d.radius = outerRadius;
}, w * 0.0275);

var labelsG = hgraph.append("g").attr("class", "labels");
var labels = labelsG.selectAll("g.label")
    .data(points)
    .enter()
    .append("g")
    .attr("class", "label");

buildLabels(labels, function (d) {
        return d.measurement.label + ": " + d.sample.value + " " + d.measurement.units;
    }, function (d) {
        d.labelRadius = Math.max(d.radius + 10, outerRadius + 10);
    }, w * 0.0125);

function buildLabels(labels, funcText, funcAngle, fontSize){
    var labelsText = addLabelText(labels, funcText, funcAngle, fontSize);
    var labelsFrame = addFrameBox(labels);
    // move them out of the background circle
    labelsFrame.each(function (d) {
        d.frameBox = getBox(this);
        var center = labelCentroid(d.frameBox, d.labelAngle);
        d.xOffset = center.x;
        d.yOffset = center.y;
    });
    collisionFix(labels);
    labels.attr("transform", function(d){
        return "translate(" + d.xOffset + ", " + d.yOffset + ")";
    });
    addLabelLines(labels);
    labelsFrame.each(function(){
        this.parentNode.appendChild(this);
    });
    // move the labels on top of the rectangles
    labelsText.each(function(){
        this.parentNode.appendChild(this);
    });

}
function between(x, min, max) {
    return x >= min && x <= max;
}

function ascending(a, b){
    return a.labelAngle - b.labelAngle;
}
function descending(a, b){
    return b.labelAngle - a.labelAngle;
}

function collisionFix(labels){
    var angle = 0,
        className = "";
    labels.attr("class", function(d){
        // since we shift the angles as a clock
        // 12 o'clock we begin
        // from there it is clockwise
        // so 1st quadrant begins from 12 o'clock
        // then quadrant 4rd, 3rd and we end in the 2nd.
        className = d3.select(this).attr("class");
        angle = Math.PI / 2 - d.labelAngle;
        return between(angle, 0, Math.PI/2) ? "q1" :
            between(angle, Math.PI/2, Math.PI) ? "q4" :
                between(angle, Math.PI, 3/2*Math.PI) ? "q3" : "q2";
    });

    // collisions
    var lf = new LabelFixer(7, 0);
    var quadrants = [];

    // First quadrant
    // sort by ascending
    quadrants.push(hgraph.selectAll("g.q1").sort(ascending));
    // Third quadrant
    quadrants.push(hgraph.selectAll("g.q3").sort(ascending));
    // Second quadrant
    // descending order
    quadrants.push(hgraph.selectAll("g.q2").sort(descending));
    // Fourth quadrant
    quadrants.push(hgraph.selectAll("g.q4").sort(descending));
    // loop through the quadrants
    for(var e = 0; e < quadrants.length; e++){
        quadrants[e].each(function (d, i) {
            d.yOffset = lf.adjustLabel(i, d.labelAngle, d.frameBox.y, d.frameBox.height, d.yOffset);
        });
        lf.resetBorder(); // reset the border
    }
    labels.attr("class", className);
}

// polygon
var polygonGroup = hgraph.append("g").attr("class", "polygon");
polygonGroup.selectAll("polygon")
    .data(function () {
        return [toDistanceString(hGraphMeasurements)];
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

var hGraphMeasurementsGroup = hgraph.append("g").attr("class", "hGraphMeasurements");
hGraphMeasurementsGroup.selectAll("circle")
    .data(hGraphMeasurements)
    .enter()
    .append("circle")
    .attr("r", function(d){return d.r;})
    .attr("cx", function(d){return d.x;})
    .attr("cy", function(d){return d.y;})
    .attr("fill", function(d){return d.color;})
    .attr({
        "stroke": "#5b5b5b",
        "stroke-width": 1
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
    // how many points in each section
    // the angles of the points increase by the delta var
    var delta = angleUnit(startAngle, padAngle, endAngle, n);
    var angle, m, scale, s, v, x, y, r;
    var pointsInSection= [];
    for(var j = 0; j < n; j ++){
        m = ms[j];
        s = m.samples[0];
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
    // return the points in the whole section as an array
    return pointsInSection;
}

function hGraphMeasurementsBuilder(index, startAngle, padAngle, endAngle) {
    var group = dataset[index];
    var measurements = group.measurements;
    var angleStepsPerMeasurement = angleUnit(startAngle, padAngle, endAngle, measurements.length);
    var angle, dataM;
    var hGraphMs = [];
    var hGraphM = null;
    for(var i = 0; i < measurements.length; i ++){
        dataM = measurements[i];
        angle = startAngle + padAngle + ((i + 1) * angleStepsPerMeasurement);
        // move the result so it goes clockwise
        angle = Math.PI / 2 - angle;
        hGraphM = new HealthMeasurement(dataM, angle, innerRadius, outerRadius);
        hGraphMs.push(hGraphM);
    }
    // return the points in the whole section as an array
    return hGraphMs;
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

/**
 *
 * @param {number} n - Number of groups to be animated
 * @param {function} entryCall - Function to call when the animation starts
 * @param {function} callback - Function to call when the animation ends
 * @constructor
 */
function GroupedAnimation(n, entryCall, callback){
    this.n = n;
    this.elementsDone = 0;
    this.entryCall = entryCall;
    this.callback = callback;
}

GroupedAnimation.prototype.animateOpacity = function (d3element, val) {
    this.entryCall();
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

GroupedAnimation.prototype.isVisible = function(d3element){
    var opacity = parseInt(d3element.attr("opacity"));
    return opacity != 0;
};

GroupedAnimation.prototype.show = function(d3element){
    if(!this.isVisible(d3element))
        ga.animateOpacity(d3element, 1);
};

GroupedAnimation.prototype.dim = function(d3element){
    if(this.isVisible(d3element))
        ga.animateOpacity(d3element, 0.1);
};

GroupedAnimation.prototype.hide = function(d3element){
    if(this.isVisible(d3element))
        ga.animateOpacity(d3element, 0);
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
var zoomEntryCall = function () {
    pzlib.allowZoom = false; // disable zoom
};
var zoomCallback = function () {
    pzlib.allowZoom = true; // enable zoom
};
// two groups, and function to call first and after the groups have finished the animation
var ga = new GroupedAnimation(2, zoomEntryCall, zoomCallback);
// zoom and pan
pzlib.setup("hgraph-container");
pzlib.deltaS = 0.50;
pzlib.zoomLimit = 2.50;

pzlib.afterZoom = function () {
    pzlib.zoomLevel > 1 ? zoomInAction(): zoomOutAction();
};

function zoomInAction(){
    ga.show(labels);
    ga.dim(groupLabels);
}

function zoomOutAction(){
    ga.show(groupLabels);
    ga.hide(labels);
}

// testing git again