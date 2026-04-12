var n1n9 = {};


/*
  Data Manager
*/

n1n9.dataManager = function module() {

  var exports = {},
    speedtestDataLocal;

  exports.loadJson = function (_file, _callback, _color) {
    d3.json(_file, function (_err, _data) {
      speedtestDataLocal = _data;
      _callback(_data, _color);
    });
  };

  exports.loadLocalData = function (_callback, _color) {
    _callback(speedtestDataLocal, _color);
  };

  return exports;
};





/*
  Map Module.
*/

n1n9.map = function module() {

  var dispatch = d3.dispatch('mapsEnd', 'trainsEnd', 'dataEnd'),
    projection, path, svg, center, scale, size;
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
      .x(function(d) { return projection([d.lon, d.lat])[0]; })
      .y(function(d) { return projection([d.lon, d.lat])[1]; })
      .interpolate("cardinal-closed");

    for (var i = 0; i < _data.length; i++) {
      var line = _data[i];

      trainData[i] = svg.append("svg:g").attr("class", line.line_cd);

      trainData[i].append("path")
        .attr("d", lineFunction(line.station_l))
        .attr("stroke", "#80c241")
        .attr("stroke-width", 2)
        .attr("fill", "none");

      svg.append("svg:g")
        .attr("class", line.line_cd + "-station")
        .selectAll("circle")
        .data(line.station_l)
        .enter()
        .append("circle")
        .attr("cx", function(d) { return projection([d.lon, d.lat])[0]; })
        .attr("cy", function(d) { return projection([d.lon, d.lat])[1]; })
        .attr("r", 1)
        .style("fill", "#666")
        .style("opacity", 1);
    }

    dispatch.trainsEnd();
  };



  var dataLayerDrawn = false;

  exports.drawData = function(_data, _color) {

    var layer = svg.select('g.data-layer');
    if (layer.empty()) {
      layer = svg.append('svg:g').attr('class', 'data-layer');
    }

    var cx = function(d) { return projection([d.lon, d.lat])[0]; };
    var cy = function(d) { return projection([d.lon, d.lat])[1]; };
    var r  = function(d) { return rScale(d.speed_download); };

    var circles = layer.selectAll('circle').data(_data[index_num].spot);

    circles.enter()
      .append('circle')
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', 0)
      .style('fill', _color)
      .style('opacity', 0.6)
      .transition()
      .duration(1000)
      .attr('r', r);

    circles.transition()
      .duration(1000)
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('r', r)
      .style('fill', _color)
      .style('opacity', 0.6);

    circles.exit()
      .transition()
      .duration(1000)
      .attr('r', 0)
      .remove();

    if (!dataLayerDrawn) {
      dataLayerDrawn = true;
      dispatch.dataEnd();
    }
  };

  d3.rebind(exports, dispatch, 'on');
  return exports;
};



n1n9.histogram = function module() {

  var svg, x, y;

  function exports(_selection) {
      svg = svg || _selection;
      svg.datum([]);
  };

  var axisDrawn = false;

  exports.drawData = function(_data, _color) {

    var margin = {top: 10, right: 10, bottom: 10, left: 10},
        g_width = 280 - margin.left - margin.right,
        g_height = 100 - margin.top - margin.bottom;

    var spots = _data[index_num].spot;
    var m_data = spots.map(function (s) { return parseInt(s.speed_download); });

    x = d3.scale.linear().domain([0, 60]).range([0, g_width]);

    var data = d3.layout.histogram().bins(x.ticks(20))(m_data);

    y = d3.scale.linear()
        .domain([0, d3.max(data, function(d) { return d.y; })])
        .range([g_height, 0]);

    svg.attr("class", "histogram")
       .attr("width", g_width)
       .attr("height", 130);

    var barWidth = x(data[0].dx) - 1;
    var translate = function(d) {
      return "translate(" + (x(d.x) + margin.left) + "," + (y(d.y) + margin.top) + ")";
    };
    var barHeight = function(d) { return g_height - y(d.y); };

    var bar = svg.selectAll("rect.bar").data(data);

    bar.enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", 1)
      .attr("width", barWidth)
      .style("opacity", 0.6);

    svg.selectAll("rect.bar")
      .transition()
      .duration(500)
      .attr("transform", translate)
      .attr("width", barWidth)
      .attr("height", barHeight)
      .style("fill", _color);

    bar.exit()
      .transition()
      .duration(500)
      .remove();

    if (!axisDrawn) {
      axisDrawn = true;
      svg.append("g")
         .attr("class", "x axis")
         .attr("transform", "translate(" + margin.left + "," + (g_height + margin.top) + ")")
         .call(d3.svg.axis().scale(x).orient("bottom"))
         .style("fill", "#999");
    }
  };

  return exports;
};


function drawLegend() {

  function createLegendSvg(selector) {
    var svg = d3.select(selector).append("svg").attr("width", 120).attr("height", 38);
    svg.appendText = function (x, y, text) {
      svg.append("text")
        .attr("x", x).attr("y", y).text(text)
        .attr("font-family", "sans-serif")
        .attr("font-size", "10px")
        .attr("fill", "#333");
      return svg;
    };
    return svg;
  }

  function appendRefCircle(svg, cy, speed, lineY, labelY) {
    svg.append("circle")
      .attr("cx", 40).attr("cy", cy).attr("r", rScale(speed))
      .style("stroke-dasharray", "2, 1")
      .style("fill", "#eee")
      .style("stroke", "#333");
    svg.append("line")
      .attr("x1", 40).attr("y1", lineY).attr("x2", 60).attr("y2", lineY)
      .style("stroke-width", 1)
      .style("stroke", "#999");
    svg.appendText(63, labelY, speed + "Mbps");
  }

  var mapLegend = createLegendSvg('#descMap');
  mapLegend.appendText(3, 10, "Map");
  appendRefCircle(mapLegend, 20, 60, 5, 10);
  appendRefCircle(mapLegend, 25, 10, 20, 23);

  var histLegend = createLegendSvg('#descHistogram');
  histLegend.appendText(3, 10, "Histogram");
  histLegend.appendText(15, 23, "amount of spots");
  histLegend.appendText(15, 33, "per 5Mbps");
}


/*
  initialise
*/

var index_num = 0;
var careerColor = ["#be0027", "#eb5505", "#a8adb0"];

var rScale = d3.scale.sqrt()
  .domain([0, 60.0])
  .range([0, 15]);

var mediaOptions = ["Engadget(18〜24時)", "週刊アスキー(13:05〜18:40)", "bcnランキング(16〜20時)"];
var selectedMedia = mediaOptions[0];

function updateMenus() {
  d3.select('#media-menu')
    .selectAll('li')
    .classed('selected', function(d) { return d === selectedMedia; });
}

d3.select('#media-menu')
  .selectAll('li')
  .data(mediaOptions)
  .enter()
  .append('li')
  .text(function(d) { return d; })
  .classed('selected', function(d) { return d === selectedMedia; })
  .on('click', function(d) {
    selectedMedia = d;
    index_num = mediaOptions.indexOf(selectedMedia);
    updateMenus();

    carriers.forEach(function (car) {
      car.dataManager.loadLocalData(car.map.drawData, car.config.color);
      car.dataManager.loadLocalData(car.histogram.drawData, car.config.color);
    });
  });


/* ------------------
  carriers
------------------ */

var MAP_CENTER = [139.738772, 35.679898];
var MAP_SCALE = 90000;
var MAP_SIZE = [300, 300];
var SVG_MAP_SIZE = [280, 280];
var SVG_HIST_SIZE = [280, 100];

var carrierConfigs = [
  { key: 'docomo', mapSel: '#dMap', histSel: '#dHistogram', dataFile: 'data/docomo.json', color: careerColor[0] },
  { key: 'au',     mapSel: '#aMap', histSel: '#aHistogram', dataFile: 'data/au.json',     color: careerColor[1] },
  { key: 'sb',     mapSel: '#sMap', histSel: '#sHistogram', dataFile: 'data/sb.json',     color: careerColor[2] }
];

var carriers = carrierConfigs.map(function (cfg) {
  var map = n1n9.map().center(MAP_CENTER).scale(MAP_SCALE).size(MAP_SIZE);
  d3.select(cfg.mapSel)
    .append('svg')
    .attr('width', SVG_MAP_SIZE[0])
    .attr('height', SVG_MAP_SIZE[1])
    .call(map);

  var histogram = n1n9.histogram();
  d3.select(cfg.histSel)
    .append('svg')
    .attr('width', SVG_HIST_SIZE[0])
    .attr('height', SVG_HIST_SIZE[1])
    .call(histogram);

  return {
    config: cfg,
    dataManager: n1n9.dataManager(),
    map: map,
    histogram: histogram
  };
});

carriers.forEach(function (car, idx) {
  car.dataManager.loadJson('data/tokyo.geojson', car.map.drawMaps, '#eee');

  car.map.on('mapsEnd', function () {
    car.dataManager.loadJson('data/train-yamanote.json', car.map.drawTrains);
  });

  car.map.on('trainsEnd', function () {
    car.dataManager.loadJson(car.config.dataFile, car.map.drawData, car.config.color);
  });

  car.map.on('dataEnd', function () {
    if (idx === 0) drawLegend();
    car.dataManager.loadLocalData(car.histogram.drawData, car.config.color);
  });
});
