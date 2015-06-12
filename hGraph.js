/**
 * Created by andres on 4/23/15.
 */


/**
 *
 * @param measurement
 * @param angle
 * @param r0
 * @param r1
 * @param r
 * @param groupName
 * @constructor
 */
function HealthMeasurement(measurement, angle, r0, r1, r, groupName){

    this.label = measurement.label;
    this.r = r; // this is the radius of the svg circle element
    this.units = measurement.units;
    this.angle = angle;

    // recommended minimum and maximum (mandatory)
    this.min = measurement.min;
    this.max = measurement.max;

    // add the group to which this measurement belongs to
    this.groupName = groupName;

    // the array of samples
    this.samples = measurement.samples;

    // the selected sample
    // this.sample = this.samples.length - 1;
    this.sample = 0;

    // the hGraph minimum and maximum radii
    this.r0 = r0; // inner radius
    this.r1 = r1; // outer radius

    // by default we have no additional ranges
    this.additionalRanges = false;

    // compute the scale
    this.scale = d3.scale.linear()
        .domain([measurement.min, measurement.max])
        .range([r0, r1]);


    // initially the radius of the circle, as well as the x and y points are set to zero
    this.x = this.y = this.radius = 0;

    // the color by default is white
    this.color = "white";

    // check for yellow and red ranges
    var ranges = HealthMeasurement.additionalRanges; // shorthand

    // add additional ranges when needed
    for(var i = 0; i < ranges.length; i++){
        if (typeof measurement[ranges[i]] != 'undefined'){
            this.additionalRanges = true;
            this[ranges[i]] = measurement[ranges[i]];
        }
    }

    // compute the position and color
    // that is the radius, x and y values
    this.calculatePosition();
}
/**
 * Computes the position and sets the x, y and radius based on the selected sample.
 */
HealthMeasurement.prototype.calculatePosition = function () {
    var sample; // the selected sample
    var value; // the value of the selected sample

    sample = this.samples[this.sample];
    value = sample.value;

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



/**
 * The types of ranges
 * @type {string[]}
 */
HealthMeasurement.additionalRanges = ["yellow_min", "yellow_max", "red_min", "red_max"];


/**
 *
 * @param groups
 * @param w
 * @param h
 * @param className
 * @constructor
 */
function HealthGraph(groups, w, className){

    /*
     function angle(startAngle, endAngle) {
     var centroidAngle = (startAngle + endAngle)/2;
     // Math.PI (rad) = 180 (deg)
     // centroidAngle (rad) = x (deg)
     // return a > 90 ? a - 180 : a;
     return (centroidAngle * 180) / Math.PI;
     }
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


    // Here we begin to build the hGraph instance
    // all the functions used are inside this scope.

    // TODO: adjust depending on the number of healthMeasurements along with the zoom and font size

    // Other options
    var outerRadius = w * 0.4; // check a scale function from d3
    var innerRadius = w * 0.3;
    var defaultLabelRadius = w * 0.45;

    var groupLabelFontSize = 12;
    var measurementLabelFontSize = 8;

    var circleRadius = 5;

    var padAngle = Math.PI / 256;

    var numberOfMeasurementsInEachGroup = []; // how many healthMeasurements in each group

    var svg;
    var hGraph; // and SVG group

    var arc;
    var pie;

    var measurementsDataset = [];
    var measurementsDataObjects;

    var polygonData = [];

    var timestamp = 0;

    function createSVG(className, w){
        var svg;

        svg = d3.select("body")
            .append("div")
            .attr("class", className)
            .append("svg")
            .attr("width", w)
            .attr("height", w);

        return svg;
    }

    function createHGraph(svg){
        var hGraph;

        hGraph = svg.append("g")
            .attr("class", "hGraph-wrapper")
            .append("g")
            .attr("class", "hGraph");

        return hGraph;
    }

    function getMeasurementsInEachGroup(dataset){
        var group;
        var total = [];
        var measurements;

        for(var i = 0; i < dataset.length; i ++){
            group = dataset[i];
            measurements = group.measurements;
            total.push(measurements.length);
        }

        return total;
    }

    function createZones(d3target, sizeOfEachZone, pieFunction, arcFunction){
        var zones;

        zones = d3target.append("g")
            .attr("class", "arcs")
            .selectAll("g.arc")
            .data(pieFunction(sizeOfEachZone))
            .enter()
            .append("g")
            .attr("class", "arc")
            .append("path")
            .attr({
                "fill": "#74c476",
                //"stroke": "#74c476",
                "stroke": "none",
                "opacity": 0.3,
                "d": arcFunction
            });

        return zones;
    }

    function getAllMeasurementsFromDataset(dataset){
        var group;
        var measurements;
        var total = [];

        for(var i = 0; i < dataset.length; i ++){
            group = dataset[i];
            measurements = group.measurements;
            total = total.concat(measurements);
        }

        return total;
    }

    // how to update the polygon
    function updatePolygon(timestamp){
        polygonData = [];

        hGraph.selectAll("g.activeGraph")
            .selectAll("g.measurement")
            .each(function (d) {
                polygonData.push(getArc(d.data, timestamp).centroid(d));
            });


        hGraph.selectAll("g.activeGraph")
            .selectAll("g.polygon")
            .selectAll("polygon")
            .data(function () {
                return [polygonData];
            })
            .transition()
            .attr("points", function(d) {
                // compute the coordinates
                return [d].join(" ");
            });
    }

    // how to update the circles
    function updateMeasurements(timestamp){
        hGraph.selectAll("g.activeGraph")
            .selectAll("g.measurement")
            .selectAll("circle")
            .transition()
            .attr("cx", function (d) {
                return getArc(d.data, timestamp).centroid(d)[0];
            })
            .attr("cy", function (d) {
                return getArc(d.data, timestamp).centroid(d)[1];
            })
            .attr("fill", function (d) {
                return getColor(d.data, timestamp);
            });
    }

    // get the arc object to calculate the centroid
    function getArc(measurement, timestamp){
        var arc;
        var radius;

        // needs a radius that is calculated using the scale
        radius = getRadius(measurement, timestamp);

        arc = d3.svg.arc()
            .innerRadius(radius)
            .outerRadius(radius);

        return arc;
    }

    // creates the radius using the scale of min and max
    function getRadius(measurement, timestamp){

        var scale;
        var index;
        var samples;
        var selectedSample;
        var radius;

        scale = d3.scale.linear()
            .domain([measurement.min, measurement.max])
            .range([innerRadius, outerRadius]);

        samples = measurement.samples;
        index = getSampleIndex(timestamp, samples);

        selectedSample = measurement.samples[index];

        radius = scale(selectedSample.value);

        return radius;
    }

    // get the arc object to calculate the centroid for the labels
    // this one needs to check the largest radius to avoid overlaps with the circles
    function getLabelArc(d3graphs, label, defaultRadius){
        var arc;

        arc = d3.svg.arc()
            .innerRadius(defaultRadius)
            .outerRadius(defaultRadius);

        return arc;
    }

    // get the final x and y for the label groups
    function getLabelTranslateCorrdinates(d3graphs, label, defaultRadius){

        // get the max radius from all the measurements plotted that have the same label

        // move the labels horizontally outside the radius (x)

        // move the labels vertically to avoid overlapping (y)

        //return the final [x, y]


    }

    // selects the sample closest to the timestamp provided but before that not after
    function getSampleIndex(timestamp, samples){

        // TODO: get the actual index of the sample closest to the given timestamp

        return timestamp;
    }

    function getColor(measurement, timestamp){
        var color = "white"; // by default
        var yellowMin = "yellow_min";
        var yellowMax = "yellow_max";
        var redMin = "red_min";
        var redMax = "red_max";
        var samples = measurement.samples;
        var hasAdditionalRanges = false;
        var sample;
        var index;


        index = getSampleIndex(timestamp, samples);
        sample = measurement.samples[index];

        // checking now for less than the recommended
        if (typeof measurement[yellowMin] != 'undefined'){
            hasAdditionalRanges = true;
            if(sample.value <= measurement[yellowMin]){
                color = "gold";
            }
        }

        if (typeof measurement[redMin] != 'undefined'){
            hasAdditionalRanges = true;
            if(sample.value <= measurement[redMin]){
                color = "tomato";
            }
        }
        // checking for more than the recommended
        if (typeof measurement[yellowMax] != 'undefined'){
            hasAdditionalRanges = true;
            if(sample.value >= measurement[yellowMax]){
                color = "gold";
            }
        }

        if (typeof measurement[redMax] != 'undefined'){
            hasAdditionalRanges = true;
            if(sample.value >= measurement[redMax]){
                color = "tomato";
            }
        }

        if (hasAdditionalRanges && color === "white"){
            color = "#73D651";
        }

        return color;
    }

    function createSvgMeasurementGroups(d3target, data){
        var svgGroups;

        svgGroups = d3target.selectAll("g.measurement")
            .data(data)
            .enter()
            .append("g")
            .attr("class", "measurement");

        return svgGroups;

    }

    function createSvgPolygon(d3target, data){
        var polygonGroup;

        polygonGroup = d3target.append("g")
            .attr("class", "polygon")
            .selectAll("polygon")
            .data(function () {
                return [data];
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
                // "fill-opacity": 0.15,
                "vector-effect": "non-scaling-stroke"
            });

        return polygonGroup;
    }

    function createMeasurementCircles(d3target, circleRadius){
        var circles;

        circles = d3target.append("circle")
            .attr({
                "stroke": "black",
                "stroke-width": "1",
                "fill": "white",
                "r": circleRadius,
                "cx": 0,
                "cy": 0
            });

        return circles;
    }

    /**
     * begin the main code
     */

    svg = createSVG(className, w);
    hGraph = createHGraph(svg);

    arc = d3.svg.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius);

    pie = d3.layout.pie().sort(null); // no ordering to preserve the order from the data source

    pie.padAngle(padAngle);

    createZones(hGraph, getMeasurementsInEachGroup(groups), pie, arc);

    // a pie chart for the measurements

    pie = d3.layout.pie()
        .value(function (d) {
            // all the measurements will have the same space of the donut 
            return 1;
        })
        .sort(null); // no ordering to preserve the order from the data source

    pie.padAngle(padAngle);

    measurementsDataObjects = pie(getAllMeasurementsFromDataset(groups));

    // create the graph container
    hGraph.append("g")
        .attr("class", "graphs");

    // create the active graph
    hGraph.selectAll("g.graphs")
        .append("g")
        .attr("class", "graph activeGraph");

    // create the measurements container
    // create each measurement with the data
    hGraph.selectAll("g.activeGraph")
        .append("g")
        .attr("class", "measurements");

    // create the measurement groups
    createSvgMeasurementGroups(hGraph.selectAll("g.measurements"), measurementsDataObjects)
        .each(function (d) {
            polygonData.push([0, 0]);
        });

    // create the circles in each of the SVG group with the class "measurement"

    createMeasurementCircles(
        hGraph.selectAll("g.activeGraph")
            .selectAll("g.measurement"), circleRadius);

    // create a polygon
    createSvgPolygon(hGraph.selectAll("g.activeGraph"), polygonData);

    // move the circles and their containing groups to the front
    // appending them to the parent makes them go to the bottom of the list
    // thus moving them to the front
    hGraph.selectAll("g.activeGraph")
        .selectAll("g.measurements")
        .each(function () {
            d3.select(this).node().parentNode.appendChild(d3.select(this).node());
        });

    // now the labels

    // create label container
    hGraph.append("g")
        .attr("class", "labels");

    // create all the labels
    hGraph.selectAll("g.labels")
        .selectAll("g.label")
        .data(measurementsDataObjects)
        .enter()
        .append("g")
        .attr("class", "label");

    // create the text
    hGraph.selectAll("g.label")
        .append("text")
        .text(function (d) {
            // use the timestamp to fetch the value from the samples
            return d.data.label;
        })
        .attr({
            "text-anchor": "middle",
            "x": 0,
            "y": 0,
            "font-size": 12,
            "fill": "grey"
        })
        .each(function(d){
            // IMPORTANT: we need to add here the size of the text for the rectangle's dimensions!
            d.box = this.getBBox();
        });

    // create the rectangle
    hGraph.selectAll("g.label")
        .append("rect")
        .attr("x", function(d){
            return d.box.x - 10;
        })
        .attr("y", function (d) {
            return d.box.y;
        })
        .attr("height", function (d) {
            return d.box.height;
        })
        .attr("width", function (d) {
            return d.box.width + 20;
        })
        .attr({
            "vector-effect": "non-scaling-stroke",
            "rx": 0.5,
            "ry": 0.5,
            // "fill": "#d5f5d5",
            "fill": "white"
        })
        .attr("stroke", "grey")
        .attr("stroke-width", 1);

    // move the text in front
    hGraph.selectAll("g.label")
        .selectAll("text")
        .each(function (d) {
            d3.select(this).node().parentNode.appendChild(d3.select(this).node());
        });

    // move them to the default label radius
    hGraph.selectAll("g.label")
        .transition()
        .attr("transform", function (d) {

            // TODO: call the wrapper routine that calculates the final coordinates of the labels

            return "translate (" +
                getLabelArc(
                    hGraph.selectAll("g.graphs"),
                    d.data.label,
                    defaultLabelRadius)
                    .centroid(d).join(",") +
                ")";
        });


    // here we can call the update functions
    updatePolygon(0); // testing the methods
    updateMeasurements(0); // testing the methods

    /*
    setTimeout(function () {
        updatePolygon(1); // testing the methods
        updateMeasurements(1); // testing the methods
    }, 2000);
    */

    /*
    // var labelData = [];
    // var healthMeasurements = []; // hGraph healthMeasurements
    // var pieAngleData = []; // an array to save the start, pad and end angles of each section

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


    var groupHealthMeasurementLabel;
    var groupOfMeasurements;
    var dataMeasurements;
    var pieData;
    var middleAngle;

    for(var i = 0; i < groupedMeasurements.length; i ++) {

        groupOfMeasurements = groupedMeasurements[i];

        dataMeasurements = groupOfMeasurements.healthMeasurements;

        pieData = pieAngleData[i];
        middleAngle = getAngleCenter(pieData.startAngle, pieData.endAngle, pieData.padAngle);

        groupHealthMeasurementLabel = {
            "label": groupOfMeasurements.label,
            "text": groupOfMeasurements.label,
            "fontSize": groupLabelFontSize,
            "angle": middleAngle,
            "r0": outerRadius,
            "r1": defaultLabelRadius,
            "r": 0,
            "lineColor": "#74c476",
            "lineWidth": 3,
            "className": "groupLabel"
        };

        // push it to the array of health measurement labels
        labelData.push(groupHealthMeasurementLabel);


        healthMeasurements = healthMeasurements.concat(
            this.createHealthMeasurementsFromDataGroup(
                dataMeasurements,
                pieData.startAngle,
                pieData.endAngle,
                innerRadius,
                outerRadius,
                measurementCircleRadius,
                groupedMeasurements.label
            )
        );



    }

    // assign the values of the instance
    this.hGraphWrapper = hGraphWrapper;
    this.healthMeasurements = healthMeasurements;
    // now the labels
    var healthMeasurementLabel;

    for(var i = 0; i < healthMeasurements.length; i ++){
        var m = healthMeasurements[i],
            text = m.label + ": " + m.samples[m.sample].value + " " + m.units,
            r1 = Math.max(m.radius + 20, defaultLabelRadius);

        healthMeasurementLabel = {
            "label": m.label,
            "text": text,
            "fontSize": measurementLabelFontSize,
            "angle": m.angle,
            "r0": m.radius,
            "r1": r1,
            "r": measurementCircleRadius,
            "lineColor": "#5b5b5b",
            "lineWidth": 1,
            "className": "measurementLabel"
        };

        // push it to the array of health measurement labels
        labelData.push(healthMeasurementLabel);
    }
    // an svg group containing all the labels
    this.labelGroupContainer = hGraphD3Group.append("g").attr("class", "labels");
    // append a group for each label containing the label, the frame and the line to the circle
    // call the function that build all the labels and adjusts for any collision
    this.labelData = labelData;
    var self = this;
    this.mouseHighlight(self.plotLabels(labelData));
    this.defaultLabelRadius = defaultLabelRadius;

    hGraphD3Group.append("g").attr("class", "graphs"); // a group to hold all the graphs
    // render the polygon and the circles
    this.graphs = this.hGraphWrapper.select("g.hGraph").select("g.graphs");

    var graph = this.renderPolygonAndCircles(healthMeasurements);

    this.graphs.node().appendChild(graph.node());
    var hCircles = graph.selectAll("circle");
    this.mouseHighlight(hCircles);
    */

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

    var translate = "translate(" + (w * 0.5) + ", " + (w * 0.5) + ")";
    hGraph.attr("transform", translate);

}


/**
 *
 * @param measurements
 * @param startAngle
 * @param endAngle
 * @param innerRadius
 * @param outerRadius
 * @param measurementCircleRadius
 * @param measurementGroupName
 * @returns {Array}
 */
HealthGraph.prototype.createHealthMeasurementsFromDataGroup = function(
    measurements,
    startAngle,
    endAngle,
    innerRadius,
    outerRadius,
    measurementCircleRadius,
    measurementGroupName) {

    var angleIncrement;
    var angleForHealthMeasurement, measurementFromData;
    var healthMeasurements = [];
    var healthMeasurement;

    angleIncrement = (endAngle - startAngle) / measurements.length;


    for(var j = 0; j < measurements.length; j ++){

        measurementFromData = measurements[j];

        angleForHealthMeasurement = startAngle + (j * angleIncrement) + (angleIncrement / 2);

        // move the result so it goes clockwise
        angleForHealthMeasurement = Math.PI / 2 - angleForHealthMeasurement;

        healthMeasurement = new HealthMeasurement(
            measurementFromData,
            angleForHealthMeasurement,
            innerRadius,
            outerRadius,
            measurementCircleRadius,
            measurementGroupName);

        healthMeasurements.push(healthMeasurement);
    }

    // return the points in the whole section as an array
    return healthMeasurements;
};

/**
 *
 * @param d
 */
HealthGraph.prototype.labelFrameBox = function(d){

    var box;
    d.frameBox = {};
    d.offset = {};

    box = this.getBBox();

    // add the extra space to the frameBox
    d.frameBox.x = box.x - 10;
    d.frameBox.y = box.y - 2;
    d.frameBox.width = box.width + 20;
    d.frameBox.height = box.height + 4;

    d.offset.x = (Math.cos(d.angle) > 0)? d.frameBox.width/2: -d.frameBox.width/2;
    d.offset.y = 0;

};


/**
 *
 * @param labelData
 * @returns {D3._Selection<U>}
 */
HealthGraph.prototype.plotLabels = function(labelData){

    var labelGroups;
    var textElements;
    var rectElements;
    var labelOverlappingFixer;
    var lines;
    var groupLines;
    var measurementLines;
    var self = this;

    labelGroups = this.labelGroupContainer.selectAll("g")
        .data(labelData)
        .enter()
        .append("g");


    textElements = labelGroups.append("text")
        .text(function(d) {
            return d.text;
        })
        .attr("text-anchor", "middle")
        .attr("x", function(d){
            return Math.cos(d.angle) * d.r1;
        })
        .attr("y", function(d){
            return (Math.sin(d.angle) * d.r1 * -1);
        })
        .attr("font-size", function(d){
            return d.fontSize;
        });

    textElements.each(self.labelFrameBox);

    // add the frame around
    rectElements = labelGroups.append("rect")
        .attr("x", function(d){
            return d.frameBox.x;
        })
        .attr("y", function (d) {
            return d.frameBox.y;
        })
        .attr("height", function (d) {
            return d.frameBox.height;
        })
        .attr("width", function (d) {
            return d.frameBox.width;
        })
        .attr({
            "vector-effect": "non-scaling-stroke",
            "rx": 0.5,
            "ry": 0.5,
            // "fill": "#d5f5d5",
            "fill": "white"
        })
        .attr("stroke", function(d){
            return d.lineColor;
        })
        .attr("stroke-width", 1);

    // fix the overlapping labels
    labelOverlappingFixer = new HealthGraphLabelFix(3, 0);
    labelOverlappingFixer.adjustOverlappingLabels(labelGroups);

    // move the labels
    labelGroups.attr("transform", function(d){
        return "translate(" + d.offset.x + ", " + d.offset.y + ")";
    });

    // append a line to each label group
    lines = labelGroups.append("line")
        .attr({
            "vector-effect": "non-scaling-stroke",
            "stroke-width": 1,
            "stroke-dasharray": "10, 5"
        })
        .attr("stroke", function(d){
            return d.lineColor;
        })
        .attr("x1", function (d) {
            d.x1 = Math.cos(d.angle) > 0 ? d.frameBox.x: d.frameBox.x + d.frameBox.width;
            return d.x1;
        })
        .attr("y1", function (d) {

            d.y1 = d.frameBox.y + d.frameBox.height/2;

            if(d.angle > Math.PI / 2 - 1/3 * Math.PI || d.angle < Math.PI / 2 - Math.PI - 2/3 * Math.PI)
                d.y1 = d.frameBox.y + d.frameBox.height;

            if(d.angle < Math.PI / 2 - 2/3 * Math.PI && d.angle > Math.PI / 2 - Math.PI - 1/3 * Math.PI)
                d.y1 = d.frameBox.y;

            return d.y1;
        })
        .attr("x2", function (d) {
            return d.x1;
        })
        .attr("y2", function (d) {
            return d.y1;
        });

    groupLines = lines.filter(function (d) {
        return d.className == "groupLabel";
    });

    groupLines
        .attr("x2", function (d) {
            return Math.cos(d.angle) * (d.r0 + d.r) - d.offset.x;
        })
        .attr("y2", function (d) {
            return (Math.sin(d.angle) * (d.r0 + d.r) * - 1) - d.offset.y;
        })
        .attr("stroke-width", 2)
        .attr("opacity", 0.3);

    measurementLines = lines.filter(function (d) {
        return d.className == "measurementLabel";
    });

    measurementLines.transition()
        .attr("x2", function (d) {
            return Math.cos(d.angle) * (d.r0 + d.r) - d.offset.x;
        })
        .attr("y2", function (d) {
            return (Math.sin(d.angle) * (d.r0 + d.r) * - 1) - d.offset.y;
        });


    // move to lines to the front
    lines.each(function(){
        this.parentNode.appendChild(d3.select(this).node());
    });

    // then move to frames to the front
    rectElements.each(function(){
        this.parentNode.appendChild(d3.select(this).node());
    });

    // finally move the text to the front
    textElements.each(function(){
        this.parentNode.appendChild(d3.select(this).node());
    });

    return labelGroups;
};


HealthGraph.prototype.moveLabels = function () {
    var healthMeasurements;
    var d3MeasurementLabelGroups;
    var healthMeasurement;
    var selectedSample;
    var self = this;
    var labelOverlappingFixer;
    var labelGroups;

    healthMeasurements = this.healthMeasurements;
    labelGroups = this.labelGroupContainer.selectAll("g");
    d3MeasurementLabelGroups = this.labelGroupContainer.selectAll("g.measurementLabel");

    function getHealthMeasurementByLabel(label){
        for(var i = 0; i < healthMeasurements.length; i ++){
            if(healthMeasurements[i].label === label)
                return healthMeasurements[i];
        }
        return null;
    }


    d3MeasurementLabelGroups.selectAll("text")
        .text(function (d) {

            healthMeasurement = getHealthMeasurementByLabel(d.label);
            selectedSample = healthMeasurement.samples[healthMeasurement.sample];

            d.r1 = Math.max(healthMeasurement.radius + 20, self.labelRadius);

            return healthMeasurement.label + ": " + selectedSample.value + " " + healthMeasurement.units;

        })
        .attr("x", function(d){
            return Math.cos(d.angle) * d.r1;
        })
        .attr("y", function(d){
            return (Math.sin(d.angle) * d.r1 * -1);
        })
        .each(self.labelFrameBox);

    d3MeasurementLabelGroups.selectAll("rect")
        .attr("x", function(d){
            return d.frameBox.x;
        })
        .attr("y", function (d) {
            return d.frameBox.y;
        })
        .attr("height", function (d) {
            return d.frameBox.height;
        })
        .attr("width", function (d) {
            return d.frameBox.width;
        });


    //


    // fix the overlapping labels
    labelOverlappingFixer = new HealthGraphLabelFix(3, 0);
    labelOverlappingFixer.adjustOverlappingLabels(labelGroups);

    // move the labels
    labelGroups.attr("transform", function(d){
        return "translate(" + d.offset.x + ", " + d.offset.y + ")";
    });
    /*
    // append a line to each label group
    labelGroups.selectAll("line")
        .attr("x1", function (d) {
            d.x1 = Math.cos(d.angle) > 0 ? d.frameBox.x: d.frameBox.x + d.frameBox.width;
            return d.x1;
        })
        .attr("y1", function (d) {

            d.y1 = d.frameBox.y + d.frameBox.height/2;

            if(d.angle > Math.PI / 2 - 1/3 * Math.PI || d.angle < Math.PI / 2 - Math.PI - 2/3 * Math.PI)
                d.y1 = d.frameBox.y + d.frameBox.height;

            if(d.angle < Math.PI / 2 - 2/3 * Math.PI && d.angle > Math.PI / 2 - Math.PI - 1/3 * Math.PI)
                d.y1 = d.frameBox.y;

            return d.y1;
        })
        .attr("x2", function (d) {
            return d.x1;
        })
        .attr("y2", function (d) {
            return d.y1;
        });

    */

};

/**
 *
 * @param margin
 * @param border
 * @constructor
 */
function HealthGraphLabelFix(margin, border){
    this.margin = margin;
    this.border = border;
}

/**
 *
 * @param i
 * @param angle
 * @param y
 * @param height
 * @param yOffset
 * @returns {number|*}
 */
HealthGraphLabelFix.prototype.fixOverlappingLabels = function(i, angle, y, height, yOffset){
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
 *
 * @param labels {D3._Selection}
 */
HealthGraphLabelFix.prototype.adjustOverlappingLabels = function(labels){

    var angle;
    var groupRoot;
    var quadrants = [];
    var self = this;

    // fetch all the labels
    groupRoot = d3.select(".labels");


    labels.attr("class", function(d){
        // since we shift the angles as a clock 12 o'clock we begin from there it is clockwise
        // so 1st quadrant begins from 12 o'clock then quadrant 4rd, 3rd and we end in the 2nd.
        angle = Math.PI / 2 - d.angle;
        return (angle >= 0 && angle <= Math.PI/2) ? "quadrantI" :
            (angle > Math.PI/2 && angle <= Math.PI) ? "quadrantIV" :
            (angle > Math.PI && angle <= 3/2*Math.PI) ? "quadrantIII" : "quadrantII";
    });

    // ascending
    quadrants.push(groupRoot.selectAll("g.quadrantI").sort(function (a, b) {
        return a.angle - b.angle;
    }));
    quadrants.push(groupRoot.selectAll("g.quadrantIII").sort(function (a, b) {
        return a.angle - b.angle;
    }));

    // descending
    quadrants.push(groupRoot.selectAll("g.quadrantII").sort(function (a, b) {
        return b.angle - a.angle;
    }));
    quadrants.push(groupRoot.selectAll("g.quadrantIV").sort(function (a, b) {
        return b.angle - a.angle;
    }));

    for(var i = 0; i < quadrants.length; i ++){
        quadrants[i].each(function (d, i) {
            d.offset.y = self.fixOverlappingLabels(i, d.angle, d.frameBox.y, d.frameBox.height, d.offset.y);
        });
    }

    // restore the class of the selection
    labels.attr("class", function(d){ return d.className; }); // reset the style
};

/**
 * Update the labels by changing the data value and then removing them from the plot
 * in order to plot them again
 */
HealthGraph.prototype.updateLabelPosition = function () {

    var measurements = this.healthMeasurements;

    function getLabelDatum(label){
        var datum;
        for(var i = 0; i < labelData.length; i++){
            datum = labelData[i];
            if(datum.label === label){
                return datum;
            }
        }
        return null;
    }

    var labelRadius = this.labelRadius;
    // save opacity properties for labels
    var measurementLabelsOpacity = this.labelGroupContainer.selectAll("g.measurementLabel").attr("opacity");
    var groupLabelsOpacity = this.labelGroupContainer.selectAll("g.groupLabel").attr("opacity");

    this.labelGroupContainer.selectAll("g").remove();
    var labelData = this.labelData;

    var measurement, datum;
    var circles;
    var maxRadiusForGroupLabels = 0;

    for(var i = 0; i < measurements.length; i ++){
        measurement = measurements[i];
        datum = getLabelDatum(measurement.label);

        datum.text = measurement.label + ": " + measurement.samples[measurement.sample].value + " " + measurement.units;

        // get all the radii from the circles associated to this measurement
        /*
        circles = this.getCircleMeasurement(measurement.label);

        circles.each(function (d) {

            // console.log(d.radius);

            datum.r1 = Math.max(d.radius + 30, labelRadius);

            maxRadiusForGroupLabels = Math.max(datum.r1, maxRadiusForGroupLabels);

        });
        */

        datum.r1 = Math.max(measurement.radius + 20, labelRadius); // TODO: extend this to the label creation
        datum.r0 = measurement.radius;
    }

    // adjust group labels as well
    this.labelGroupContainer
        .selectAll("g.groupLabel")
        .each(function (d) {

            // TODO: Find why the hell I am not getting the max radius

            d.r1 = maxRadiusForGroupLabels + 20;

        });

    var self = this;
    this.mouseHighlight(self.plotLabels(labelData));
    // set the opacity to the previous value
    this.labelGroupContainer.selectAll("g.measurementLabel").attr("opacity", measurementLabelsOpacity);
    this.labelGroupContainer.selectAll("g.groupLabel").attr("opacity", groupLabelsOpacity);

};

/**
 * Select a sample to plot
 * @param index
 */
HealthGraph.prototype.plotSamplesAt = function(index){
    var graphContainerDOM;
    var graph;

    graph = this.graphs.select("g.graph");

    this.selectSample(index);
    this.updatePolygonAndCircles(graph);
    // this.updateLabelPosition();

    this.moveLabels();

    graphContainerDOM = this.graphs.node();
    graphContainerDOM.parentNode.appendChild(graphContainerDOM);
};

/**
 * Plot an additional sample in the background
 * @param index
 * @returns {D3._Selection}
 */
HealthGraph.prototype.interpolateSamplesAt = function(index){
    // var originalSample;
    var hGraphMeasurements;
    var graphs;
    var d3Selection;
    var recentlyAddedGraph;
    var hCircles;

    // originalSample = this.healthMeasurements[0].sample;
    hGraphMeasurements = this.selectSample(index);

    graphs = this.graphs;
    d3Selection = graphs.selectAll("g.graph");

    recentlyAddedGraph = this.renderPolygonAndCircles(hGraphMeasurements);

    graphs.node().appendChild(recentlyAddedGraph.node());
    // move the previously existing graphs to the front
    d3Selection.each(function (d) {
        this.parentNode.appendChild(d3.select(this).node());
    });

    hCircles = recentlyAddedGraph.selectAll("circle");

    this.mouseHighlight(hCircles);

    this.updateLabelPosition();

    // restore the original sample
    // this.selectSample(originalSample);

    return recentlyAddedGraph;
};



/**
 * Sets all the healthMeasurements to the selected index or the last one if not found.
 * @param index
 * @returns {Array}
 */
HealthGraph.prototype.selectSample = function (index) {
    var hGraphMeasurement;
    var samples;
    var hGraphMeasurements = [];

    for(var i = 0; i < this.healthMeasurements.length; i ++){
        hGraphMeasurement = this.healthMeasurements[i];
        samples = hGraphMeasurement.samples;
        hGraphMeasurement.sample = index < samples.length? index: samples.length - 1;
        hGraphMeasurement.calculatePosition();
        hGraphMeasurements.push(hGraphMeasurement);
    }

    return hGraphMeasurements;
};


/**
 * Builds a distance string for svg elements.
 * @param measurements [HealthMeasurement]
 * @returns {*[]}
 */
HealthGraph.prototype.toDistanceString = function(measurements){
    var arr = [];
    for(var i = 0; i < measurements.length; i ++){
        arr.push([measurements[i].x, measurements[i].y]);
    }
    return [arr];
};

/**
 *
 * @param label {string}
 * @returns {D3._UpdateSelection}
 */
HealthGraph.prototype.getLabelGroup = function(label){
    return this.hGraphWrapper
        .select("g.hGraph")
        .select("g.labels")
        .selectAll("g.measurementLabel")
        .filter(function (d) {
            return d.label == label;
        });
};

/**
 *
 * @param label
 * @returns {D3._UpdateSelection}
 */
HealthGraph.prototype.getCircleMeasurement = function(label){
    return this.graphs
        .selectAll("g.hGraphMeasurements circle")
        .filter(function (d) {
            if(d) return d.label == label;
            return false;
        });
};


/**
 * Render the polygon and the circles representing the healthMeasurements.
 * @param measurementDataModels
 * @returns {D3._Selection<T>|*}
 */
HealthGraph.prototype.renderPolygonAndCircles = function(measurementDataModels){
    var graph;
    var distanceString;


    graph = this.svg.append("g")
        .attr("class", "graph");

    // add the polygon in a group
    distanceString = this.toDistanceString(measurementDataModels);

    // create group and add polygon
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
            // "fill-opacity": 0.15,
            "vector-effect": "non-scaling-stroke"
        });

    // add all the circles representing the healthMeasurements in a group
    graph.append("g")
        .attr("class", "hGraphMeasurements")
        .selectAll("circle")
        .data(measurementDataModels)
        .enter()
        .append("circle")
        .attr("r", function(d){
            return d.r;
        })
        .attr("cx", function(d){
            return d.x;
        })
        .attr("cy", function(d){
            return d.y;
        })
        .attr("fill", function(d){
            return d.color;
        })
        .attr({
            "stroke": "#5b5b5b",
            "stroke-width": 1,
            "vector-effect": "non-scaling-stroke"
        });

    // return the graph group containing the circles and the polygon
    return graph;
};
/**
 *
 * @param graph
 * @returns {*}
 */
HealthGraph.prototype.updatePolygonAndCircles = function(graph){

    var distanceString;
    var measurements;


    distanceString = this.toDistanceString(this.healthMeasurements);
    measurements = this.healthMeasurements;

    graph.selectAll("polygon")
        .data(function () {
            return [distanceString];
        })
        .transition()
        .attr("points", function(d) {
            // compute the coordinates
            return d.join(" ");
        });


    graph.selectAll("circle")
        .data(measurements)
        .transition()
        .attr("r", function(d){
            return d.r;
        })
        .attr("cx", function(d){
            return d.x;
        })
        .attr("cy", function(d){
            return d.y;
        })
        .attr("fill", function(d){
            return d.color;
        })
        .attr({
            "stroke": "#5b5b5b",
            "stroke-width": 1,
            "vector-effect": "non-scaling-stroke"
        });

    return graph;
};

/**
 *
 * @param {D3._Selection<U>} d3Selection
 */
HealthGraph.prototype.mouseHighlight = function (d3Selection) {
    var self = this;
    d3Selection.on("mouseover", function(d) {



        // d3.select(this).attr("stroke-width", 4); // redundant since now we are selecting all circles
        var g = self.getLabelGroup(d.label);
        g.select("line").attr("stroke-width", 3);
        g.select("rect").attr("stroke-width", 3);

        // console.log(d3.select(this).selectAll("text"));

        // g.select("text").attr("font-size", 8.5);

        d3.select(this).selectAll("text")

        var c = self.getCircleMeasurement(d.label);
        c.attr("stroke-width", 3);
        c.attr("r", 6);

    }).on("mouseout", function(d) {

        // d3.select(this).attr("stroke-width", 1);
        var g = self.getLabelGroup(d.label);
        g.select("line").attr("stroke-width", 1);
        g.select("rect").attr("stroke-width", 1);
        g.select("rect").attr("r", 4);
        // g.select("text").attr("font-size", 8);


        var c = self.getCircleMeasurement(d.label);
        c.attr("stroke-width", 1);
        c.attr("r", 4);

    });
};