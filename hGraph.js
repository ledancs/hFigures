/**
 * Created by andres on 4/23/15.
 */

/**
 *
 * @param groupedMeasurements
 * @param w
 * @param h
 * @param className
 * @constructor
 */
function HealthGraph(groupedMeasurements, w, h, className){

    /**
     *
     * @param label
     * @param text
     * @param fontSize
     * @param angle
     * @param r0
     * @param r1
     * @param r
     * @param lineColor
     * @param lineWidth
     * @constructor
     */
    function LabelText(label, text, fontSize, angle, r0, r1, r, lineColor, lineWidth){
        this.label = label;
        this.text = text;
        this.fontSize = fontSize;
        this.angle = angle;
        this.r0 = r0;
        this.r1 = r1;
        this.r = r;
        this.frameBox = null;
        this.className = "";
        this.lineColor = lineColor;
        this.lineWidth = lineWidth;
    }
    /**
     *
     * @param x
     * @param y
     * @param width
     * @param height
     * @constructor
     */
    function LabelFrame(x, y, width, height){
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    /**
     *
     * @param x
     * @param y
     * @constructor
     */
    function LabelOffset(x, y){
        this.x = x;
        this.y = y;
    }


    /**
     *
     * @param d2root
     * @param labels
     */
    function buildLabels(d2root, labels){
        // add the text
        var labelsText = addLabelText(labels);
        // add the frame around
        var labelsFrame = addFrameBox(labels);
        // fix the collisions
        collisionFix(d2root, labels);
        // move the labels
        labels.attr("transform", function(d){
            return "translate(" + d.offset.x + ", " + d.offset.y + ")";
        });
        // append the line
        addLabelLines(labels);
        // move to frames to the front
        labelsFrame.each(function(){
            this.parentNode.appendChild(d3.select(this).node());
        });
        // move the text to the front
        labelsText.each(function(){
            this.parentNode.appendChild(d3.select(this).node());
        });

    }

    /**
     *
     * @param labels
     * @returns
     */
    function addLabelText(labels){
        return labels.append("text")
            .text(function(d) {return d.text;})
            .attr("text-anchor", "middle")
            .attr("x", function(d){return Math.cos(d.angle) * d.r1;})
            .attr("y", function(d){return (Math.sin(d.angle) * d.r1 * -1);})
            .attr("font-size", function(d){
                return d.fontSize;
            })
            .each(function (d) {
                var box = getBox(this);
                d.frameBox = new LabelFrame(box.x, box.y, box.width, box.height);
            });
    }

    /**
     *
     * @param box
     * @param angle
     * @returns {{x: number, y: number}}
     */
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

    /**
     *
     * @param labels {D3._Selection}
     * @returns {D3._Selection}
     */
    function addFrameBox(labels){
        return labels.append("rect")
            .attr("x", function(d){return d.frameBox.x - 6;})
            .attr("y", function (d) {return d.frameBox.y - 1;})
            .attr("height", function (d) {return d.frameBox.height + 2;})
            .attr("width", function (d) {return d.frameBox.width + 12;})
            .attr({
                "rx": 1,
                "ry": 1,
                // "fill": "#d5f5d5",
                "fill": "white",
                "vector-effect": "non-scaling-stroke"
            })
            .attr("stroke", function(d){ return d.lineColor; })
            .attr("stroke-width", function(d){ return d.lineWidth; })
            .each(function (d) {
                var box = getBox(this);
                // override the frame box
                d.frameBox = new LabelFrame(box.x, box.y, box.width, box.height);
                var center = labelCentroid(d.frameBox, d.angle);
                // add the offsets
                d.offset = new LabelOffset(center.x, 0);
            });
    }

    /**
     *
     * @param labels {D3._Selection}
     * @returns {D3._Selection}
     */
    function addLabelLines(labels){
        return labels.append("line")
            .attr("x1", function (d) {
                return Math.cos(d.angle) > 0 ? d.frameBox.x: d.frameBox.x + d.frameBox.width;
            })
            .attr("y1", function (d) {
                if(d.angle > Math.PI / 2 - 1/3 * Math.PI || d.angle < Math.PI / 2 - Math.PI - 2/3 * Math.PI)
                    return d.frameBox.y + d.frameBox.height;
                if(d.angle < Math.PI / 2 - 2/3 * Math.PI && d.angle > Math.PI / 2 - Math.PI - 1/3 * Math.PI)
                    return d.frameBox.y;
                return d.frameBox.y + d.frameBox.height/2;
                // return Math.sin(d.angle) > 0 ? d.frameBox.y + d.frameBox.height: d.frameBox.y;
            })
            .attr("x2", function (d) {
                return Math.cos(d.angle) * (d.r0 + d.r) - d.offset.x;
            })
            .attr("y2", function (d) {
                return (Math.sin(d.angle) * (d.r0 + d.r) * - 1) - d.offset.y;
            })
            .attr({
                "vector-effect": "non-scaling-stroke"
            })
            .attr("stroke", function(d){ return d.lineColor; })
            .attr("stroke-width", function(d){ return d.lineWidth; });
        // .style("stroke-dasharray", ("1, 1"));
    }

    /**
     *
     * @param d3root {D3._Selection}
     * @param labels {D3._Selection}
     */
    function collisionFix(d3root, labels){

        function ascending(a, b){
            return a.angle - b.angle;
        }

        function descending(a, b){
            return b.angle - a.angle;
        }

        function between(x, min, max) {
            return x >= min && x <= max;
        }

        /**
         * Uses the angle to give the selection a class for later filtering.
         * @param angle
         * @returns {*}
         */
        function getQuadrant(angle){
            if(between(angle, 0, Math.PI/2))
                return "q1";
            if(between(angle, Math.PI/2, Math.PI))
                return "q4";
            if(between(angle, Math.PI, 3/2*Math.PI))
                return "q3";
            return "q4";
        }

        var angle = 0;
        var lf = new LabelFixer(3, 0); // fix label overlapping

        labels.attr("class", function(d){
            // since we shift the angles as a clock
            // 12 o'clock we begin
            // from there it is clockwise
            // so 1st quadrant begins from 12 o'clock
            // then quadrant 4rd, 3rd and we end in the 2nd.
            d.className = d3.select(this).attr("class");
            angle = Math.PI / 2 - d.angle;
            return getQuadrant(angle);
        });
        // collisions
        lf.adjust(d3root.selectAll("g.q1").sort(ascending));
        lf.adjust(d3root.selectAll("g.q3").sort(ascending));
        lf.adjust(d3root.selectAll("g.q2").sort(descending));
        lf.adjust(d3root.selectAll("g.q4").sort(descending));
        // restore the class of the selection
        labels.attr("class", function(d){ return d.className; }); // reset the style
    }

    /**
     *
     * @param measurements
     * @param startAngle
     * @param padAngle
     * @param endAngle
     * @param innerRadius
     * @param outerRadius
     * @param measurementCircleRadius
     * @returns {Array}
     */
    function buildMeasurements(measurements, startAngle, padAngle, endAngle, innerRadius, outerRadius, measurementCircleRadius) {
        var angleDelta = getAngleDelta(startAngle, padAngle, endAngle, measurements.length);
        var angle, dataM;
        var hGraphMs = [];
        var hGraphM = null;
        for(var i = 0; i < measurements.length; i ++){
            dataM = measurements[i];
            angle = startAngle + padAngle + ((i + 1) * angleDelta);
            // move the result so it goes clockwise
            angle = Math.PI / 2 - angle;
            hGraphM = new HealthMeasurement(dataM, angle, innerRadius, outerRadius, measurementCircleRadius);
            hGraphMs.push(hGraphM);
        }
        // return the points in the whole section as an array
        return hGraphMs;
    }


    /**
     *
     * @param startAngle
     * @param endAngle
     * @param padAngle
     * @returns {number}
     */
    function getAngleCenter(startAngle, endAngle, padAngle){
        var start = startAngle + padAngle/2;
        var end = endAngle - padAngle/2;
        var space = end - start;
        var result = startAngle + (space / 2);
        // move the result so it goes clockwise
        return Math.PI / 2 - result;
    }

    /*
     function angle(startAngle, endAngle) {
     var centroidAngle = (startAngle + endAngle)/2;
     // Math.PI (rad) = 180 (deg)
     // centroidAngle (rad) = x (deg)
     // return a > 90 ? a - 180 : a;
     return (centroidAngle * 180) / Math.PI;
     }
     */

    /**
     *
     * @param startAngle
     * @param padAngle
     * @param endAngle
     * @param n
     * @returns {number}
     */
    function getAngleDelta(startAngle, padAngle, endAngle, n) {
        var start = startAngle + padAngle/2;
        var end = endAngle - padAngle/2;

        var space = end - start;
        return space / (n + 1);
    }


    /**
     *
     * @param svgElement
     * @returns {*}
     */
    function getBox(svgElement){
        return svgElement.getBBox();
    }

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
     * @param measurement
     * @param angle
     * @param r0
     * @param r1
     * @param r
     * @constructor
     */
    function HealthMeasurement(measurement, angle, r0, r1, r){

        this.label = measurement.label;
        this.r = r; // this is the radius of the svg circle element
        this.units = measurement.units;
        this.angle = angle;
        this.min = measurement.min;
        this.max = measurement.max;
        this.samples = measurement.samples;
        this.sample = this.samples.length - 1;
        this.r0 = r0; // inner radius
        this.r1 = r1; // outer radius
        this.additionalRanges = false;

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
        var delta = i === 0 ? this.margin: 0,
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

    /**
     * Runs the collision detection for each element in the d3 group
     * @param d3group {D3._Selection}
     */
    LabelFixer.prototype.adjust = function (d3group){
        var self = this;
        d3group.each(function (d, i) {
            d.offset.y = self.adjustLabel(i, d.angle, d.frameBox.y, d.frameBox.height, d.offset.y);
        });
        self.resetBorder();
    };





    // Here we begin to build the hGraph instance
    // all the functions used are inside this scope.

    var outerRadius = w * 0.20;
    var innerRadius = w * 0.14;
    var labelRadius = w * 0.25;

    var groupLabelFontSize = 12;
    var measurementLabelFontSize = 8;
    var measurementCircleRadius = 4;

    var arc = d3.svg.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    var inGroup = []; // how many measurements in each group
    for(var i = 0; i < groupedMeasurements.length; i ++)
        inGroup.push(groupedMeasurements[i].measurements.length);

    var pie = d3.layout.pie()
        .value(function (d) { return d; })
        .sort(null); // no ordering to preserve the order from the data source

    pie.padAngle(Math.PI / 256); // TODO: adjust as well depending on the number of measurements

    var svg = d3.select("body")
        .append("div")
        .attr("class", className)
        .append("svg")
        .attr("width", w)
        .attr("height", h);

    var pieObjects = pie(inGroup); // build the pie chart using the number of measurements in each group
    var hGraphWrapper = svg.append("g") // needed for custom pan zoom library
        .attr("class", "hGraph-wrapper");
    var hGraphD3Group = hGraphWrapper.append("g").attr("class", "hGraph");
    var arcsG = hGraphD3Group.append("g").attr("class", "arcs");
    var arcs = arcsG.selectAll("g.arc")
        .data(pieObjects)
        .enter()
        .append("g")
        .attr("class", "arc");
    var labelData = [];
    var hGraphMs = []; // hGraph measurements
    var pieAngleData = []; // an array to save the start, pad and end angles of each section

    arcs.append("path")
        .attr({
            "fill": "#74c476",
            //"stroke": "#74c476",
            "stroke": "none",
            "opacity": 0.3,
            "d": arc
        })
        .each(function (d) {
            pieAngleData.push({
                startAngle: d.startAngle,
                padAngle: d.padAngle,
                endAngle: d.endAngle
            })
        });

    for(var i = 0; i < groupedMeasurements.length; i ++){
        var group = groupedMeasurements[i];
        var ms = group.measurements;
        var pieData = pieAngleData[i];
        var angleCenter = getAngleCenter(pieData.startAngle, pieData.endAngle, pieData.padAngle);

        labelData.push(new LabelText(group.label, group.label, groupLabelFontSize, angleCenter, outerRadius, labelRadius, 0, "#74c476", 2));

        hGraphMs = hGraphMs.concat(
            buildMeasurements(ms, pieData.startAngle, pieData.padAngle, pieData.endAngle, innerRadius, outerRadius, measurementCircleRadius)
        );
    }


    // assign the values of the instance
    this.hGraphWrapper = hGraphWrapper;
    this.measurements = hGraphMs;
    hGraphD3Group.append("g").attr("class", "graphs"); // a group to hold all the graphs
    // render the polygon and the circles
    this.graphs = [];
    this.graphs.push(this.renderPolygonAndCircles());

    // now the labels
    for(var i = 0; i < hGraphMs.length; i ++){
        var m = hGraphMs[i],
            text = m.label + ": " + m.samples[m.sample].value + " " + m.units,
            r1 = Math.max(m.radius + 20, labelRadius);
        labelData.push(new LabelText(m.label, text, measurementLabelFontSize, m.angle, m.radius, r1, measurementCircleRadius, "grey", 1));
    }
    var labelsG = hGraphD3Group.append("g").attr("class", "labels");
    var labels = labelsG.selectAll("g.label")
        .data(labelData)
        .enter()
        .append("g")
        .attr("class", "label");

    buildLabels(labelsG, labels); // font-size: w * 0.0125
    labels.attr("class", function (d) {
        return d.fontSize > measurementLabelFontSize ? "groupLabel" : "measurementLabel";
    });

    // flip the y axis
    // var scale = "scale(1, -1)";
    // rotate
    // var rotate = "rotate(90)";
    // all the transformations
    // var transformations = [scale, rotate];
    // apply
    // arcs.attr("transform", transformations.join(" "));
    // pointsGroup.attr("transform", scale + " " + rotate);
    // polygon.attr("transform", scale + " " + rotate);
    // move the hGraph
    var translate = "translate(" + (w * 0.5) + ", " + (h * 0.5) + ")";
    hGraphD3Group.attr("transform", translate);

}

/**
 *
 * @param index {number}
 * @returns {D3._Selection}
 */
HealthGraph.prototype.plotSamplesAt = function(index){
    this.selectSample(index);
    var graph = this.renderPolygonAndCircles();
    this.graphs.push(graph);
    // make sure to have the last one at the bottom
    // the newest is at the top
    var g;
    for(var i = this.graphs.length - 1; i > -1; i --){
        g = this.graphs[i];
        g.each(function(){
            this.parentNode.appendChild(d3.select(this).node());
        });
    }

    return graph;
};

/**
 * Sets all the measurements to the selected index or the last one if not found.
 * @param index
 */
HealthGraph.prototype.selectSample = function (index) {
    var hgm, samples;
    for(var i = 0; i < this.measurements.length; i ++){
        hgm = this.measurements[i];
        samples = hgm.samples;
        hgm.sample = index < samples.length? index: samples.length - 1;
        hgm.computePosition();
    }
};

/**
 * Render the polygon and the circles representing the measurements.
 * @returns {D3._Selection}
 */
HealthGraph.prototype.renderPolygonAndCircles = function(){

    /**
     * Builds a distance string for svg elements.
     * @param measurements [HealthMeasurement]
     * @returns {*[]}
     */
    function toDistanceString(measurements){
        var arr = [];
        for(var i = 0; i < measurements.length; i ++){
            arr.push([measurements[i].x, measurements[i].y]);
        }
        return [arr];
    }

    /**
     *
     * @param label {string}
     * @returns {D3._UpdateSelection}
     */
    function getLabelGroup(label){
        return wrapper
            .select("g.hGraph")
            .select("g.labels")
            .selectAll("g.measurementLabel")
            .filter(function (d) {
                return d.label == label;
            });
    }

    /**
     *
     * @param label
     * @returns {D3._UpdateSelection}
     */
    function getCircleMeasurement(label){

        return graphs
            .selectAll("g.hGraphMeasurements circle")
            .filter(function (d) {
                if(d) return d.label == label;
            return false;
            });
    }

    var wrapper = this.hGraphWrapper;
    var graphs = wrapper.select("g.hGraph").select("g.graphs");
    var graph = graphs.append("g")
        .attr("class", "graph");

    // add the polygon in a group
    var distanceString = toDistanceString(this.measurements);
    graph.append("g")
        .attr("class", "polygon")
        .selectAll("polygon")
        .data(function () {
            return [distanceString];
        })
        .enter()
        .append("polygon")
        .attr("points", function(d) {
            // compute the coordinates
            return d.join(" ");
        }).attr({
            "stroke": "#5b5b5b",
            "stroke-width": 1,
            "fill": "none",
            // "fill-opacity": 0.5,
            "vector-effect": "non-scaling-stroke"
        });

    // add all the circles representing the measurements in a group
    graph.append("g")
        .attr("class", "hGraphMeasurements")
        .selectAll("circle")
        .data(this.measurements)
        .enter()
        .append("circle")
        .attr("r", function(d){return d.r;})
        .attr("cx", function(d){return d.x;})
        .attr("cy", function(d){return d.y;})
        .attr("fill", function(d){return d.color;})
        .attr({
            "stroke": "#5b5b5b",
            "stroke-width": 1,
            "vector-effect": "non-scaling-stroke"
        })
        .on("mouseover", function(d) {
            // d3.select(this).attr("stroke-width", 4); // redundant since now we are selecting all circles
            var g = getLabelGroup(d.label);
            g.select("line").attr("stroke-width", 3);
            g.select("rect").attr("stroke-width", 3);
            getCircleMeasurement(d.label).attr("stroke-width", 4);
        })
        .on("mouseout", function(d) {
            // d3.select(this).attr("stroke-width", 1);
            var g = getLabelGroup(d.label);
            g.select("line").attr("stroke-width", 1);
            g.select("rect").attr("stroke-width", 1);
            getCircleMeasurement(d.label).attr("stroke-width", 1);
        });
    return graph;
};
