/**
 * Created by ledesmaf on 19.5.2015.
 */

// testing
function d3zoom(w, h){
    function zoomed() {
        hGraphWrapper.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

    var zoom = d3.behavior.zoom()
        .scaleExtent([1, 3])
        .on("zoom", zoomed);
    var svg = d3.select("div#hGraph-container")
        .select("svg");
    svg.attr("viewBox", "" + 0 + " " + 0 + " " + w + " " + h)
        .call(zoom);
    var hGraphWrapper = svg.select("g.hGraph-wrapper");
}