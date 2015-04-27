var pzlib = { };

pzlib.delta = {
    x: null,
    y: null
};
// direction of the zoom
pzlib.direction = 0;
// prevent zooming if needed
pzlib.allowZoom = true;
// maximum factor of zoom in
pzlib.zoomLimit = 5;
// find a way to always follow the mouse and use those coordinates
// to zoom into that direction
pzlib.mousePressed = false;
// keep track of the zoom level
// and adjust the panning speed
pzlib.zoomLevel = 0;
// initial scale
pzlib.scale = 1;
// scale factor
pzlib.deltaS = 0.10;
// callback after zooming
pzlib.afterZoom = function(){};
// callback after panning
pzlib.afterPan = function(){};

// in this script we get the full dimensions of the svg
pzlib.width = 100; // current view box width
pzlib.height = 100; // view box height

// the svg DOM element
pzlib.svgDOM = null;

pzlib.setup = function(divId){
    //document.onmousemove = showCoords;
    pzlib.container = document.getElementById(divId);

    pzlib.svgDOM = pzlib.container.getElementsByTagName("svg")[0];
    // get the dimensions of the svg
    var originalViewBox = pzlib.getViewBoxArray(pzlib.svgDOM);
    pzlib.width = originalViewBox[2];
    pzlib.height = originalViewBox[3];

    pzlib.container.addEventListener("mousedown", pzlib.mouseDown);
    pzlib.container.addEventListener("mouseup", pzlib.mouseUp);
    pzlib.container.addEventListener("mousewheel", pzlib.zooming, false); // chrome
    pzlib.container.addEventListener("DOMMouseScroll", pzlib.zooming, false); // firefox
    pzlib.container.addEventListener("mousemove", pzlib.mouseMoving);
};

pzlib.mouseDown = function(event){
    // otherwise the mouse will attempt to mve the svg element or select text
    // it is important to prevent the default behavior
    event.preventDefault();
    pzlib.mousePressed = true;
};

pzlib.mouseUp = function(event){
    pzlib.mousePressed = false;
    event.preventDefault();
    // clean the delta object
    pzlib.delta = {
        x: null,
        y: null
    };
};

pzlib.getMouseCoordinates = function (event) {
    var x = event.pageX - this.container.offsetLeft;

    var y = event.pageY - this.container.offsetTop;

    return {x:x, y:y};
}

// print the coordinates
pzlib.mouseMoving = function(event) {
    event.preventDefault(); // prevent default action
    // get current coordinates
    var mouseCoordinates = pzlib.getMouseCoordinates(event);
    var x = mouseCoordinates.x;
    var y = mouseCoordinates.y;

    // var coords = "X coords: " + x + ", Y coords: " + y;
    // console.log(coords);
    // check if there were previous coordinates stored in the variables
    if(pzlib.delta.x && pzlib.delta.y){
        // here we already have the comple set of coordinates
        // so we can move the viewBox using the previous
        // coordinates and the ones found in variables x and y
        var moveX = x - pzlib.delta.x;
        var moveY = y - pzlib.delta.y;
        // moveX = moveX * 0.65 ;
        // moveY = moveY * 0.65 ;
        // only move the viewBox if the mouse is down
        if(pzlib.mousePressed){
            pzlib.panning(moveX, moveY);
        }
    }
    // update the value of the previous coordinates
    // to continue with the calculations
    pzlib.delta.x = x;
    pzlib.delta.y = y;
}

// update the values of the viewBox
pzlib.moveViewBox = function(svgDOM, viewBoxArray){
    var viewBoxAttr = viewBoxArray.join(" ");
    svgDOM.setAttribute("viewBox", viewBoxAttr);
};

// cast the values of the SVG viewBox into integers
pzlib.getViewBoxArray = function(){
    var viewBoxAttr = pzlib.svgDOM.getAttribute("viewBox");
    var viewBoxArrayRaw = viewBoxAttr.split(" ");
    var viewBoxArray = [];
    // very important to make them integers
    for(var i = 0; i < viewBoxArrayRaw.length; i ++)
        viewBoxArray[i] = parseInt(viewBoxArrayRaw[i]);
    return viewBoxArray;
}

// get the height considering the browser compatibility
pzlib.getDocHeight = function() {
    var height = Math.max(this.container.clientHeight, this.container.offsetHeight, this.container.scrollHeight);
    if(!height){
        var D = document;
        return Math.max(
            Math.max(D.body.scrollHeight, D.documentElement.scrollHeight),
            Math.max(D.body.offsetHeight, D.documentElement.offsetHeight),
            Math.max(D.body.clientHeight, D.documentElement.clientHeight)
        );
    }
    return height;
}

// same for the width
pzlib.getDocWidth = function() {
    return Math.max(this.container.clientWidth, this.container.offsetWidth, this.container.scrollWidth);
}

pzlib.panning = function(moveX, moveY){

    var viewBoxArray = pzlib.getViewBoxArray();

    var width = pzlib.width;
    var widthMax = (width * pzlib.scale) - viewBoxArray[2];

    var height = pzlib.height;
    var heightMax = (height * pzlib.scale) - viewBoxArray[3];

    moveX *= -1; // change the sign
    moveY *= -1;

    viewBoxArray[0] += moveX;
    viewBoxArray[1] += moveY;

    // make sure we do not pass the limits
    if(viewBoxArray[0] < 0)
        viewBoxArray[0] = 0;

    if(viewBoxArray[1] < 0)
        viewBoxArray[1] = 0;

    if(viewBoxArray[0] > widthMax)
        viewBoxArray[0] = widthMax;

    if(viewBoxArray[1] > heightMax)
        viewBoxArray[1] = heightMax;

    pzlib.moveViewBox(pzlib.svgDOM, viewBoxArray);
    pzlib.afterPan();
};

pzlib.zooming = function(event){
    event.preventDefault(); // prevent any actions
    // check if the zooming is allowed
    if(!pzlib.allowZoom){
        return 0;
    }
    // get the svg dom
    var svgDOM = pzlib.container.getElementsByTagName("svg")[0]; // first svg element
    // TODO: we need to find a better way to get the svg element
    // same here with the group
    var g = svgDOM.getElementsByTagName("g")[0];

    // direction indicates zoom out or in
    pzlib.direction = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
    // now we check if it is possible to zoom in or out
    // maybe we reached the limit
    if( ( pzlib.direction > 0 && pzlib.scale > pzlib.zoomLimit ) || ( pzlib.direction < 0 && pzlib.scale < ( 1 + (pzlib.deltaS/2) ) ) ){
        return 0;
    }

    // get the view box
    var viewBoxArray = pzlib.getViewBoxArray();
    // get the total width of the svg

    // the dimensions should be taken from the view box
    // and only in the beginning of the script


    var width = pzlib.width;
    // get the total height of the svg
    var height = pzlib.height;
    // check the position of the mouse on the svg before scaling
    // mouse position proportional to the whole svg document
    // we translate window coordinates to svg coordinates
    var mouseCoordinates = pzlib.getMouseCoordinates(event);
    var mouseX = mouseCoordinates.x;
    var mouseY = mouseCoordinates.y;
    var mouseSVGxPreScale = (mouseX * width) / pzlib.getDocWidth();
    mouseSVGxPreScale += viewBoxArray[0]; // add the offset from the viewBox
    // same for the height
    var mouseSVGyPreScale =  (mouseY * height) / pzlib.getDocHeight();
    mouseSVGyPreScale += viewBoxArray[1];
    // consider the scale so that everything is in the same dimensions
    var mouseSVGx0 = mouseSVGxPreScale / pzlib.scale;
    var mouseSVGy0 = mouseSVGyPreScale / pzlib.scale;
    // console.log(mouseSVGx0);
    // change the scale according to the direction of the mouse wheel movement
    pzlib.scale += (pzlib.direction * pzlib.deltaS);
    // compute the new position of the mouse pointer in the svg and according to the scale
    var mouseSVGx1 = mouseSVGxPreScale / pzlib.scale;
    var mouseSVGy1 = mouseSVGyPreScale / pzlib.scale;
    // calculate the difference ( delta )
    var deltaMouseSVGx = mouseSVGx0 - mouseSVGx1;
    var deltaMouseSVGy = mouseSVGy0 - mouseSVGy1;
    // now adjust the viewbox
    // it is very important to translate this into the proper scale!
    viewBoxArray[0] += deltaMouseSVGx * pzlib.scale;
    viewBoxArray[1] += deltaMouseSVGy * pzlib.scale;
    // transform the svg
    g.setAttribute("transform", "scale(" + pzlib.scale + ")");
    // we still get out of the svg
    // because the allowed vieBox sometimes exceeds the svg's limits
    if(viewBoxArray[0] + viewBoxArray[2] > width * pzlib.scale) // always consider the scale!
        viewBoxArray[0] = (width * pzlib.scale) - viewBoxArray[2];
    if(viewBoxArray[1] + viewBoxArray[3] > height * pzlib.scale)
        viewBoxArray[1] = (height * pzlib.scale) - viewBoxArray[3];
    // never allow the viewBox to pass the svg
    if(viewBoxArray[0] < 0)
        viewBoxArray[0] = 0;
    if(viewBoxArray[1] < 0)
        viewBoxArray[1] = 0;
    // update the viewBox
    pzlib.moveViewBox(svgDOM, viewBoxArray);
    // update zoom level
    pzlib.zoomLevel += pzlib.direction;
    // callback
    pzlib.afterZoom();
    // one means that we were able to zoom
    return 1;
};