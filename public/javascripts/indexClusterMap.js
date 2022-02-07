mapboxgl.accessToken = mapToken;
const map = new mapboxgl.Map({
    container: 'index-cluster-map',
    style: 'mapbox://styles/mapbox/light-v10',
    //North Pacific Ocean
    center: [-113.396468, 11.802888],
    zoom: 1.2
});

map.addControl(new mapboxgl.NavigationControl());

//Adding fullname for each of the profile, which popUpMarkUp will use to show popup message for unclustered-point
    //this puts pressure on client-side processing...)
for(let profile of profilesCluster.features){ 
     profile.properties.fullname = `${profile.account.firstname}, ${profile.account.lastname[0]}`;   
 } 

map.on('load', function () {
    // Add a new source from our GeoJSON data and
    // set the 'cluster' option to true. GL-JS will
    // add the point_count property to your source data.
    map.addSource('profilesCluster', {
        type: 'geojson',
        // Point to GeoJSON data. 
        // receives profilesCluster data as object under property 'features' from index.ejs 
        data: profilesCluster,
        cluster: true,
        clusterMaxZoom: 14, // Max zoom to cluster points on
        clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
    });

    map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'profilesCluster',
        filter: ['has', 'point_count'],
        paint: {
            // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
            // with three steps to implement three types of circles:
            'circle-color': [
                'step',
                ['get', 'point_count'],
                '#42DADD', //color of circle, if count is less than next line
                20,  //count
                '#2bbd7e', //color of circle, if count is more than prev line and less than next line
                40,  //count
                '#447ED9' //color of circle, if count is more than prev line
            ],
            'circle-radius': [
                'step',
                ['get', 'point_count'],
                13, //px of circle, if count is less than next line
                20, // count
                20, // px of circle, if count is more than prev line and less than next line
                40, //count
                25 //px of circle, if count is more than previous line
            ]
        }
    });

    map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'profilesCluster',
        filter: ['has', 'point_count'],
        layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12
        }
    });

    map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'profilesCluster',
        filter: ['!', ['has', 'point_count']],
        paint: {
            'circle-color': '#11b4da',
            'circle-radius': 4,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff'
        }
    });

    // inspect a cluster on click
    map.on('click', 'clusters', function (e) {
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['clusters']
        });
        const clusterId = features[0].properties.cluster_id;
        map.getSource('profilesCluster').getClusterExpansionZoom(
            clusterId,
            function (err, zoom) {
                if (err) return;

                map.easeTo({
                    center: features[0].geometry.coordinates,
                    zoom: zoom
                });
            }
        );
    });

    // When a click event occurs on a feature in an unclustered-point layer,
    // open a popup at the location of the feature with description HTML from its properties.
    map.on('click', 'unclustered-point', function (e) {
        const popUpMarkup  = `<strong>${e.features[0].properties.fullname}</strong> <br> ${e.features[0].properties.popUpMarkUp}`;
        const coordinates = e.features[0].geometry.coordinates.slice();

        // Ensure that if the map is zoomed out such that multiple copies of the feature are visible, 
        // the popup appears over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(popUpMarkup)
            .addTo(map);
    });

    map.on('mouseenter', 'clusters', function () {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', function () {
        map.getCanvas().style.cursor = '';
    });
});

