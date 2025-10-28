const map = new ol.Map({
  target: 'map',
  layers: [new ol.layer.Tile({ source: new ol.source.OSM() })],
  view: new ol.View({
    center: ol.proj.fromLonLat([-72.2518, 41.8084]),
    zoom: 8
  })
});

const points = [];
const vectorSource = new ol.source.Vector();
const vectorLayer = new ol.layer.Vector({ source: vectorSource });
map.addLayer(vectorLayer);

map.on('click', function (event) {
  if (points.length >= 2) {
    points.length = 0;
    vectorSource.clear();
    document.getElementById('distance').textContent = '0';
  }

  const coord = ol.proj.toLonLat(event.coordinate);
  points.push(coord);

  const feature = new ol.Feature({ geometry: new ol.geom.Point(event.coordinate) });
  vectorSource.addFeature(feature);

  if (points.length === 2) {
    const line = new ol.geom.LineString([
      ol.proj.fromLonLat(points[0]),
      ol.proj.fromLonLat(points[1])
    ]);
    vectorSource.addFeature(new ol.Feature({ geometry: line }));

    const length = ol.sphere.getLength(line) / 1000;
    document.getElementById('distance').textContent = length.toFixed(2);
  }
});