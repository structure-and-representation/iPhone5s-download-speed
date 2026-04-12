var n1n9 = {};


/*
  Data Manager
*/

n1n9.dataManager = function module() {

  var exports = {},
    dispatch = d3.dispatch('geoReady', 'dataReady', 'dataLoading'),
    data, speedtestDataLocal,
    location;

  exports.loadCsvData = function(_file, _cleaningFunc) {

    var loadCsv = d3.csv(_file);

    loadCsv.on('progress', function() { dispatch.dataLoading(d3.event.loaded);});

    loadCsv.get(function (_err, _response) {
      _response.forEach(function (d) {
        _cleaningFunc(d);
      });
      data = _response;
      dispatch.dataReady(_response);
    });
  };

  exports.getCleanedData = function () {
    return data;
  };

  exports.loadJson = function(_file, _callback, _color) {

    d3.json(_file, function (_err, _data) {
      speedtestDataLocal = _data;
      _callback(_data, _color);
    });
  };

  exports.loadLocalData = function (_callback, _color) {
      _callback( speedtestDataLocal, _color );
  };

  // https://github.com/mbostock/d3/wiki/Internals#wiki-rebind
  d3.rebind(exports, dispatch, 'on');

  return exports;
};





/*
  Map Module.
*/

n1n9.map = function module() {

  var dispatch = d3.dispatch('hover', 'stopsEnd', 'routesEnd', 'mapsEnd', 'trainsEnd', 'dataEnd'),
    projection, path, t, s, svg, center, scale, size;
  var trainData = new Array(8);

  function exports(_selection) {

      svg = svg || _selection;
      svg.datum([]);

      projection = projection || d3.geo.mercator()
        .scale(scale)
        .center(center)
        .translate([size[0]/2, size[1]/2]);

      path = path || d3.geo.path()
        .projection(projection);
  };

  exports.center = function(_coords) {
    if (!arguments.length) return center;
    center = _coords;
    return this;
  };

  exports.scale = function(_scale) {
    if (!arguments.length) return scale;
    scale = _scale;
    return this;
  };

  exports.size = function(_size) {
    if (!arguments.length) return size;
    size = _size;
    return this;
  };

  exports.drawMaps = function(_data) {

    svg.append("svg:g")
      .selectAll('path')
      .data( _data.features)
      .enter().append('svg:path')
      .attr("d", path)
      .attr("stroke-width", 1)
      .attr("stroke", "#bbb")
      .attr("fill", "#eee");
      dispatch.mapsEnd();
  };


  exports.drawTrains = function(_data) {

        var lineFunction = d3.svg.line()
           .x(function(d) { 
              return projection([d.lon, d.lat])[0];
            })
           .y(function(d) { 
              return projection([d.lon, d.lat])[1];
            })
           .interpolate("cardinal-closed");

        for (var i=0; i<_data.length; i++ ){

            trainData[i] = svg.append("svg:g")
                    .attr("class", function(d) {
                        return _data[i].line_cd;
                    });

            trainData[i].append("path")
                .attr("d", lineFunction( _data[i].station_l ))
                .attr("stroke", "#80c241")
                .attr("stroke-width", 2)
                .attr("fill", "none");
            
            svg.append("svg:g")
                 .attr("class", function(d) {
                        return _data[i].line_cd + "-station";
                    })
                 .selectAll("circle")
                 .data( _data[i].station_l )
                 .enter()
                 .append("circle")
                 .attr("cx", function(d) {
                   return projection([d.lon, d.lat])[0];
                 })
                 .attr("cy", function(d) {
                   return projection([d.lon, d.lat])[1];
                 })
                 .attr("r", 1)
                 .style("fill", "#666")
                 .style("opacity", 1);

            dispatch.trainsEnd();
        }
  };



      exports.drawData = function(_data, _color) {

          svg.append("svg:g")
               .attr("width", 300)
               .attr("height", 300)
               .attr("class", function(d) {
                      return _data[index_num].media_name;
                })
               .selectAll("circle")
               .data( _data[index_num].spot )
               .enter()
               .append("circle")
               .attr("cx", function(d) {
                 return projection([d.lon, d.lat])[0];
               })
               .attr("cy", function(d) {
                 return projection([d.lon, d.lat])[1];
               })
               .attr("r", function(d) {
                 return rScale(d.speed_download);
               })
               .style("fill", _color)
               .style("opacity", 0.6);

          dispatch.dataEnd();
      };



      exports.reDrawData = function(_data, _color) {

            var circles = svg.select(".engadget")
                             .selectAll("circle")
                             .data( _data[index_num].spot );

            //Enter
            circles.enter()
                   .append("circle")
                   .attr("cx", function(d) {
                     return projection([d.lon, d.lat])[0];
                   })
                   .attr("cy", function(d) {
                     return projection([d.lon, d.lat])[1];
                   })
                   .attr("r", 0)
                   .style("fill", _color)
                   .style("opacity", 0.6)
                   .transition()
                   .duration(1000)
                   .attr("r", function(d) {
                     return rScale(d.speed_download);
                   })
 
            //Update
            circles.transition()
                  .transition()
                  .duration(1000)
                 .attr("cx", function(d) {
                   return projection([d.lon, d.lat])[0];
                 })
                 .attr("cy", function(d) {
                   return projection([d.lon, d.lat])[1];
                 })
                 .attr("r", function(d) {
                   return rScale(d.speed_download);
                 })
                //.transition()
                //.duration(1000)
                .style("fill", _color)
                .style("opacity", 0.6);

            //Exit
            circles.exit()
                .transition()
                .duration(1000)
                //.transition()
                //.duration(1000)
                .attr("r", 0)
                .remove();

      };

  dispatch.stopsEnd();
  d3.rebind(exports, dispatch, 'on');
  return exports;
};





n1n9.histogram = function module() {

  var svg, x, y;

  function exports(_selection) {
      svg = svg || _selection;
      svg.datum([]);
  };

  exports.drawData = function(_data, _color) {

      var margin = {top: 10, right: 10, bottom: 10, left: 10},
          g_width = 280 - margin.left - margin.right,
          g_height = 100 - margin.top - margin.bottom;

      var formatCount = d3.format(",.0f");

      var m_data = new Array( _data[index_num].spot.length );

      for (var i = 0; i < _data[index_num].spot.length; i++) {
          m_data[i] = parseInt( _data[index_num].spot[i].speed_download );
      }

      x = d3.scale.linear()
          .domain([0, 60])
          .range([0, g_width]);

      var data = d3.layout.histogram()
          .bins(x.ticks(20))
          (m_data);

      y = d3.scale.linear()
          .domain([0, d3.max(data, function(d) { return d.y; })])
          .range([g_height, 0]);  

      var xAxis = d3.svg.axis()
          .scale(x)
          .orient("bottom");

       svg.attr("class", "histogram")
          .attr("width", g_width)
          .attr("height", 130);

      var bar = svg.selectAll(".bar")
          .data( data );

            bar.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("transform", function(d) { return "translate(" + parseFloat( x(d.x) + margin.left ) + "," + parseFloat( y(d.y) + margin.top ) + ")"; })
            .attr("x", 1 )
            .attr("width", x(data[0].dx) - 1)
            .attr("height", function(d) { return g_height - y(d.y); })
            .style("fill", _color)
            .style("opacity", 0.6);

            bar.transition()
            .duration(500)
            .attr("class", "bar")
            .attr("transform", function(d) { return "translate(" + parseFloat( x(d.x) + margin.left ) + "," + parseFloat( y(d.y) + margin.top ) + ")"; })
            .attr("x", 1 )
            .attr("width", x(data[0].dx) - 1)
            .attr("height", function(d) { return g_height - y(d.y); })
            .style("fill", _color)
            .style("opacity", 0.6);

            bar.exit()
            .transition()
            .duration(500)
            .remove();

            svg.append("g")
              .attr("class", "x axis")
              .attr("transform", function(d) { return "translate(" + margin.left + "," + parseFloat(g_height + margin.top ) + ")"; })
              .call(xAxis)
              .style("fill", "#999");

  }
  //dispatch.histReady();
  //d3.rebind(exports, dispatch, 'on');
  return exports;
};


function drawLegend() {

    var _descMap = d3.select('#descMap')
                    .append("svg")
                    .attr("width", 120)
                    .attr("height", 38);

      _descMap.append("text")
                 .attr("x", 3)
                 .attr("y", 10)
                 .text("Map")
                 .attr("font-family", "sans-serif")
                 .attr("font-size", "10px")
                 .attr("fill", "#333");

      /* large circle */
      _descMap.append("circle")
              .attr("cx", 40)
              .attr("cy", 20)
             .attr("r", rScale(60))
              .style("stroke-dasharray", ("2, 1"))
             .style("fill", "#eee")
              .style("stroke", "#333");

      _descMap.append("line")
              .attr("x1", 40)
              .attr("y1", 5)
              .attr("x2", 60)
              .attr("y2", 5)
              .style("stroke-width", 1)
              .style("stroke", "#999");

      _descMap.append("text")
                 .attr("x", 63)
                 .attr("y", 10)
                 .text( "60Mbps")
                 .attr("font-family", "sans-serif")
                 .attr("font-size", "10px")
                 .attr("fill", "#333");

      /* small circle */
      _descMap.append("circle")
              .attr("cx", 40)
              .attr("cy", 25)
             .attr("r", rScale(10))
              .style("stroke-dasharray", ("2, 1"))
             .style("fill", "#eee")
              .style("stroke", "#333");

      _descMap.append("line")
              .attr("x1", 40)
              .attr("y1", 20)
              .attr("x2", 60)
              .attr("y2", 20)
              .style("stroke-width", 1)
              .style("stroke", "#999");

      _descMap.append("text")
                 .attr("x", 63)
                 .attr("y", 23)
                 .text( "10Mbps")
                 .attr("font-family", "sans-serif")
                 .attr("font-size", "10px")
                 .attr("fill", "#333");

      /* histogram */
      var _descMap = d3.select('#descHistogram')
                      .append("svg")
                      .attr("width", 120)
                      .attr("height", 38);

        _descMap.append("text")
                   .attr("x", 3)
                   .attr("y", 10)
                   .text("Histogram")
                   .attr("font-family", "sans-serif")
                   .attr("font-size", "10px")
                   .attr("fill", "#333");       

        _descMap.append("text")
                   .attr("x", 15)
                   .attr("y", 23)
                   .text("amount of spots")
                   .attr("font-family", "sans-serif")
                   .attr("font-size", "10px")
                   .attr("fill", "#333");   

        _descMap.append("text")
                   .attr("x", 15)
                   .attr("y", 33)
                   .text("per 5Mbps")
                   .attr("font-family", "sans-serif")
                   .attr("font-size", "10px")
                   .attr("fill", "#333");  

}


/*
  initialise
*/

var index_num = 0;
var dataToDraw;
var rScale;

var careerColor = ["#be0027", "#eb5505", "#a8adb0"];

rScale = d3.scale.sqrt()
            .domain([0, 60.0]) 
            .range([0, 15]);

var xAxis = 'Engadget(18〜24時)'

var xAxisOptions = ["Engadget(18〜24時)", "週刊アスキー(13:05〜18:40)", "bcnランキング(16〜20時)"];

function updateMenus() {
  d3.select('#media-menu')
    .selectAll('li')
    .classed('selected', function(d) {
      return d === xAxis;
    });
}

d3.select('#media-menu')
  .selectAll('li')
  .data(xAxisOptions)
  .enter()
  .append('li')
  .text(function(d) {return d;})
  .classed('selected', function(d) {
    return d === xAxis;
  })
  .on('click', function(d) {
    xAxis = d;
    //alert(xAxisOptions);
    updateMenus();
    index_num = xAxisOptions.indexOf(xAxis);
    //alert(index);

      docomoDataManager.loadLocalData(  docomoMap.reDrawData, careerColor[0] );
      auDataManager.loadLocalData(      auMap.reDrawData, careerColor[1] );
      sbDataManager.loadLocalData(      sbMap.reDrawData, careerColor[2] );

      docomoDataManager.loadLocalData(  docomoHistogram.drawData, careerColor[0] );
      auDataManager.loadLocalData(  auHistogram.drawData, careerColor[1] );
      sbDataManager.loadLocalData(  softbankHistogram.drawData, careerColor[2] );   
  });


/* ------------------
  docomo
------------------ */

var docomoDataManager = n1n9.dataManager();

var docomoMap = n1n9.map()
  .center([139.738772, 35.679898])
  .scale(90000)
  .size([300, 300]);

d3.select('#dMap')
  .append('svg')
    .attr('width', 280)
    .attr('height', 280)
    .call(docomoMap);

var docomoHistogram = n1n9.histogram();

d3.select('#dHistogram')
  .append('svg')
    .attr('width', 280)
    .attr('height', 100)
    .call(docomoHistogram);


/* ------------------
  au
------------------ */

var auDataManager = n1n9.dataManager();

var auMap = n1n9.map()
  .center([139.738772, 35.679898])
  .scale(90000)
  .size([300, 300]);

d3.select('#aMap')
  .append('svg')
    .attr('width', 280)
    .attr('height', 280)
    .call(auMap);

var auHistogram = n1n9.histogram();

d3.select('#aHistogram')
  .append('svg')
    .attr('width', 280)
    .attr('height', 100)
    .call(auHistogram);


/* ------------------
  softbank
------------------ */

var sbDataManager = n1n9.dataManager();

var sbMap = n1n9.map()
  .center([139.738772, 35.679898])
  .scale(90000)
  .size([300, 300]);

d3.select('#sMap')
  .append('svg')
    .attr('width', 280)
    .attr('height', 280)
    .call(sbMap);

var softbankHistogram = n1n9.histogram();

d3.select('#sHistogram')
  .append('svg')
    .attr('width', 280)
    .attr('height', 100)
    .call(softbankHistogram);


/* ------------------
  docomo
------------------ */

docomoDataManager.loadJson('data/tokyo.geojson', docomoMap.drawMaps, "#eee");


docomoMap.on('mapsEnd', function () {
    docomoDataManager.loadJson('data/train-yamanote.json', docomoMap.drawTrains);
});

docomoMap.on('trainsEnd', function () {
    docomoDataManager.loadJson('data/docomo.json', docomoMap.drawData, careerColor[0]);
});

docomoMap.on('dataEnd', function () {
    drawLegend();
    docomoDataManager.loadLocalData(  docomoHistogram.drawData, careerColor[0] );
});


/* ------------------
  au
------------------ */

auDataManager.loadJson('data/tokyo.geojson', auMap.drawMaps, "#eee");

auMap.on('mapsEnd', function () {
    auDataManager.loadJson('data/train-yamanote.json', auMap.drawTrains);
});

auMap.on('trainsEnd', function () {
    auDataManager.loadJson('data/au.json', auMap.drawData, careerColor[1]);
});

auMap.on('dataEnd', function () {
    auDataManager.loadLocalData(  auHistogram.drawData, careerColor[1] );
});


/* ------------------
  sb
------------------ */

sbDataManager.loadJson('data/tokyo.geojson', sbMap.drawMaps, "#eee");

sbMap.on('mapsEnd', function () {
    sbDataManager.loadJson('data/train-yamanote.json', sbMap.drawTrains);
});

sbMap.on('trainsEnd', function () {
    sbDataManager.loadJson('data/sb.json', sbMap.drawData, careerColor[2]);
});

sbMap.on('dataEnd', function () {
    sbDataManager.loadLocalData(  softbankHistogram.drawData, careerColor[2] );
});
