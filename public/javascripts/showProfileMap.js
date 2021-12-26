
// https://docs.mapbox.com/mapbox-gl-js/guides/install/
// will be referencing the mapboxToken variable created from the ejs
mapboxgl.accessToken = mapToken;
// profileCoordinate.split()

const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/streets-v11', // style URL
    center:  profileGeometry.coordinates, // starting position [lng, lat]
    zoom: 10 // starting zoom
});

map.addControl(new mapboxgl.NavigationControl());

// https://docs.mapbox.com/mapbox-gl-js/example/add-a-marker/
// dropping a marker on the map
new mapboxgl.Marker()
    .setLngLat(profileGeometry.coordinates)
    .setPopup(
        new mapboxgl.Popup({ offset: 25 })
            .setHTML(
                `<h5>${profileLocation}</h5>`
            )
    )
    .addTo(map);
