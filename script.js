//please save
let useMiles = false;

const map = new ol.Map({
  target: 'map',
  layers: [new ol.layer.Tile({ source: new ol.source.OSM() })],
  view: new ol.View({
    center: ol.proj.fromLonLat([-73.935242, 40.730610]),
    zoom: 6
  })
});

const vectorSource = new ol.source.Vector();
const vectorLayer = new ol.layer.Vector({ source: vectorSource });
map.addLayer(vectorLayer);

document.getElementById("search-origin").addEventListener("click", () => searchPlace("origin"));
document.getElementById("search-destination").addEventListener("click", () => searchPlace("destination"));
document.getElementById("get-route").addEventListener("click", getRoute);
document.getElementById("toggle-units").addEventListener("click", () => {
  useMiles = !useMiles;
  const km = parseFloat(document.getElementById("distance").dataset.km);
  document.getElementById("distance").textContent = useMiles ? `${(km * 0.621371).toFixed(2)} mi` : `${km.toFixed(2)} km`;
});
document.getElementById("use-location").addEventListener("click", () => {
  navigator.geolocation.getCurrentPosition(pos => {
    const coords = `${pos.coords.longitude},${pos.coords.latitude}`;
    const originSelect = document.getElementById("origin-options");
    originSelect.innerHTML = "";
    const option = document.createElement("option");
    option.value = coords;
    option.text = "Current Location";
    originSelect.appendChild(option);
    originSelect.selectedIndex = 0;
  }, () => alert("Unable to get location"));
});

async function searchPlace(type) {
  const query = document.getElementById(type).value;
  const select = document.getElementById(`${type}-options`);
  const loading = document.getElementById("loading");
  select.innerHTML = "";
  loading.textContent = `Searching ${type}...`;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  const data = await res.json();

  loading.textContent = "";

  if (data.length === 0) return alert(`No matches found for ${type}`);

  data.forEach(place => {
    const option = document.createElement("option");
    option.value = `${place.lon},${place.lat}`;
    option.text = place.display_name;
    select.appendChild(option);
  });
}

function formatTime(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h} hr ${m} min`;
}

async function getRoute() {
  vectorSource.clear();
  const origin = document.getElementById("origin-options").value;
  const destination = document.getElementById("destination-options").value;
  const mode = document.getElementById("halfway-mode").value;

  if (!origin || !destination) return alert("Select both origin and destination.");

  const url = `https://router.project-osrm.org/route/v1/driving/${origin};${destination}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.code !== "Ok") return alert("Routing failed");

  const route = data.routes[0];
  const line = new ol.geom.LineString(route.geometry.coordinates).transform('EPSG:4326', 'EPSG:3857');
  vectorSource.addFeature(new ol.Feature({ geometry: line }));

  const km = route.distance / 1000;
  const min = route.duration / 60;
  document.getElementById("distance").dataset.km = km;
  document.getElementById("distance").textContent = useMiles ? `${(km * 0.621371).toFixed(2)} mi` : `${km.toFixed(2)} km`;
  document.getElementById("duration").textContent = formatTime(min);

  map.getView().fit(line.getExtent(), { padding: [50, 50, 50, 50] });

  const halfway = getHalfwayCoord(route, mode);
  addHalfwayMarker(halfway);
  searchNearbyPlaces(halfway);

  console.log("Route saved:", { origin, destination, halfway });
}

function getHalfwayCoord(route, mode) {
  const coords = route.geometry.coordinates;
  const target = mode === "distance" ? route.distance / 2 : route.duration / 2;
  let acc = 0;

  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    const p1 = ol.proj.fromLonLat([lon1, lat1]);
    const p2 = ol.proj.fromLonLat([lon2, lat2]);
    const segment = new ol.geom.LineString([p1, p2]);
    const len = ol.sphere.getLength(segment);
    const dur = (len / route.distance) * route.duration;
    acc += mode === "distance" ? len : dur;
    if (acc >= target) return [lon2, lat2];
  }
  return coords[0];
}

function addHalfwayMarker(coord) {
  const halfwayPoint = new ol.Feature({
    geometry: new ol.geom.Point(ol.proj.fromLonLat(coord))
  });

  halfwayPoint.setStyle(new ol.style.Style({
    image: new ol.style.Circle({
      radius: 6,
      fill: new ol.style.Fill({ color: 'blue' }),
      stroke: new ol.style.Stroke({ color: 'white', width: 2 })
    })
  }));

  vectorSource.addFeature(halfwayPoint);
}

function searchNearbyPlaces(coord) {
  const radius = parseFloat(document.getElementById('radius').value);
  const unit = document.getElementById('radius-unit').value;
  const amenity = document.getElementById('amenity-type').value;
  if (isNaN(radius)) return;

  const radiusKm = unit === "mi" ? radius * 1.60934 : radius;
  const [lon, lat] = coord;
  const amenityFilter = amenity ? `[amenity=${amenity}]` : "[amenity]";
  const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:${radiusKm * 1000},${lat},${lon})${amenityFilter};out;`;

  fetch(overpassUrl)
    .then(res => res.json())
    .then(data => {
      data.elements.forEach(el => {
        const feature = new ol.Feature({
          geometry: new ol.geom.Point(ol.proj.fromLonLat([el.lon, el.lat]))
        });

        const label = el.tags && el.tags.name ? el.tags.name : amenity || "Amenity";
        feature.setStyle(new ol.style.Style({
          image: new ol.style.Circle({
            radius: 4,
            fill: new ol.style.Fill({ color: 'green' }),
            stroke: new ol.style.Stroke({ color: 'white', width: 1 })
          }),
          text: new ol.style.Text({
            text: label,
            offsetY: -15,
            font: '12px Arial',
            fill: new ol.style.Fill({ color: '#000' }),
            stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
          })
        }));

        vectorSource.addFeature(feature);
      });
    });
}
