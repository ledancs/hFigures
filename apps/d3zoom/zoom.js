/**
 * Created by ledesmaf on 19.5.2015.
 */

// testing
function d3zoom(className){
    var prevScale = 1;
    var threshold = 1.2;
    var zoomedIn = false;

    function zoomIn(scale1, scale2){
        return scale1 > threshold && scale1 > scale2 && !zoomedIn;
    }

    function zoomOut(scale1, scale2){
        return scale1 <= threshold && scale1 < scale2 && zoomedIn;
    }

    function toggle(){
        zoomedIn = !zoomedIn;
        svg.selectAll("g.measurement").selectAll("g.label").attr("opacity", zoomedIn ? 1: 0.5);
        svg.selectAll("g.measurement").selectAll("path").attr("opacity", zoomedIn ? 1: 0.5);

        svg.selectAll("g.groupLabel").selectAll("g.label").attr("opacity", zoomedIn ? 0.5: 1);
    }

    function zoomed() {
        if(zoomIn(d3.event.scale, prevScale) || zoomOut(d3.event.scale, prevScale))
            toggle();

        svg.select("g.hGraph-wrapper")
            .attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");

        prevScale = d3.event.scale;
    }

    var zoom = d3.behavior.zoom()
        .scaleExtent([.5, 3])
        .on("zoom", zoomed);

    var svg = d3.select("div." + className)
        .select("svg");

    svg.call(zoom);

    // show and hide
    svg.selectAll("g.measurement").selectAll("g.label").attr("opacity", 0.5);
    svg.selectAll("g.measurement").selectAll("path").attr("opacity", 0.5);

    svg.selectAll("g.groupLabel").selectAll("g.label").attr("opacity", 1);
}