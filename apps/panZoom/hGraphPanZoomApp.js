/**
 * Created by ledesmaf on 15.5.2015.
 */

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

function endAll(transition, callback) {
    if (transition.size() === 0) { callback() }
    var n = 0;
    transition
        .each(function() { ++n; })
        .each("end", function() { if (!--n) callback.apply(this, arguments); });
}

// there are several groups that are being animated each with different elements so we
// need to make sure that all the groups and their elements have finished the animation
GroupedAnimation.prototype.check = function () {
    this.elementsDone++;
    if(this.elementsDone === this.n){
        this.elementsDone = 0;
        this.callback();
    }
};

GroupedAnimation.prototype.isVisible = function(d3element){
    var opacity = d3element.attr("opacity");
    var intOpacity = parseInt(opacity);
    return intOpacity != 0;
};

GroupedAnimation.prototype.show = function(d3element){
    if(!this.isVisible(d3element))
        this.animateOpacity(d3element, 1);
};

GroupedAnimation.prototype.dim = function(d3element){
    if(this.isVisible(d3element))
        this.animateOpacity(d3element, 0.3);
};

GroupedAnimation.prototype.hide = function(d3element){
    if(this.isVisible(d3element))
        this.animateOpacity(d3element, 0);
};

function hGraphPanZoomApp(hGraph, w, h){
    var svg = d3.select("div#hGraph-container")
        .select("svg");
    svg.attr("viewBox", "" + 0 + " " + 0 + " " + w + " " + h);
    // show and hide
    var groupLabels = hGraph.select("g.labels").selectAll("g.groupLabel");
    groupLabels.selectAll("rect")
        .attr({
            "stroke-width": 1
        });
    groupLabels.selectAll("line")
        .attr({
            "stroke-width": 1
        });
    var measurementLabels = hGraph.select("g.labels").selectAll("g.measurementLabel");

    // show and hide
    measurementLabels.attr("opacity", 0);
    groupLabels.attr("opacity", 1);

    // this is app specific code
    // pan and zoom lib
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
    pzlib.setup("hGraph-container");
    pzlib.deltaS = 0.50;
    pzlib.zoomLimit = 2.50;

    pzlib.afterZoom = function () {
        pzlib.zoomLevel > 1 ? zoomInAction(): zoomOutAction();
    };

    function zoomInAction(){
        ga.show(measurementLabels);
        ga.dim(groupLabels);
    }

    function zoomOutAction(){
        ga.show(groupLabels);
        ga.hide(measurementLabels);
    }
}