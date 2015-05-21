/**
 * Created by ledesmaf on 19.5.2015.
 */

// testing
function d3zoom(w, h, hGraphInstance, className){
    var prevScale = 1;
    var zoomedIn = false;

    function zoomIn(scale1, scale2){
        return scale1 > 1.7 && scale1 > scale2 && !zoomedIn;
    }

    function zoomOut(scale1, scale2){
        return scale1 <= 1.7 && scale1 < scale2 && zoomedIn;
    }

    function toggle(){
        zoomedIn = !zoomedIn;
        groupLabels.attr("opacity", zoomedIn ? 0.2: 1);
        measurementLabels.attr("opacity", zoomedIn ? 1: 0);
    }

    function zoomed() {
        if(zoomIn(d3.event.scale, prevScale) || zoomOut(d3.event.scale, prevScale))
            toggle();

        hGraphWrapper.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        prevScale = d3.event.scale;
    }

    var zoom = d3.behavior.zoom()
        .scaleExtent([1, 3])
        .on("zoom", zoomed);

    var svg = d3.select("div." + className)
        .select("svg");

    svg.attr("viewBox", "" + 0 + " " + 0 + " " + w + " " + h)
        .call(zoom);

    var hGraphWrapper = hGraphInstance.hGraphWrapper;
    var groupLabels = hGraphWrapper.select("g.labels").selectAll("g.groupLabel");

    groupLabels.selectAll("rect")
        .attr({
            "stroke-width": 1
        });

    groupLabels.selectAll("line")
        .attr({
            "stroke-width": 1
        });

    var measurementLabels = hGraphWrapper.select("g.labels").selectAll("g.measurementLabel");

    // show and hide
    measurementLabels.attr("opacity", 0);
    groupLabels.attr("opacity", 1);
}