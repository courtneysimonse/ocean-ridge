mapboxgl.accessToken = 'pk.eyJ1IjoiY291cnRuZXlzaW1vbnNlIiwiYSI6ImNqZGozNng0NjFqZWIyd28xdDJ2MXduNTcifQ.PoSFtqfsq1di1IDXzlN4PA';
const startingOpts = {
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: [-78.489, 33.943],
    zoom: 14.5
}

const map = new mapboxgl.Map(startingOpts);

map.addControl(
    new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl
    })
);

map.addControl(new mapboxgl.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: true
    },
    trackUserLocation: true,
    showUserHeading: true
}));

const popup = new mapboxgl.Popup({
    offset: {
        'bottom': [0, -11],
        'top': [0, 11]
    }
});



map.on('load', () => {

    // https://docs.google.com/spreadsheets/d/1hEN4OK59Nuicj0Ct19Iyu0TFhCI6_squaxSthxJK7aY/edit?usp=sharing

    d3.csv('locations.csv', (d) => {
        return {
            type: "Feature",
            properties: {
                name: d.Name,
                category: d.Category,
                address: d.Address,
                symbol: d.Symbol,
                image: d.Image
            },
            geometry: {
                type: "Point",
                coordinates: [+d.Lng,+d.Lat]
            }
        }

    }).then((data) => {
        console.log(data);
        console.log(map.listImages());

        // add POI as source and layer
        map.addSource('featured-poi', {
            type: 'geojson',
            data: {
                "type": "FeatureCollection",
                features: data
            }
        }).addLayer({
            id: 'featured-poi',
            source: 'featured-poi',
            type: 'symbol',
            paint: {

            },
            layout: {
                'icon-image': ['get', 'symbol'],
                'icon-allow-overlap': true,
                'icon-size': 1.3
            }
        })

        map.on('mouseover', 'featured-poi', (e) => {
            console.log(e);
            map.getCanvas().style.cursor = 'pointer';
        })

        map.on('mouseleave', 'featured-poi', () => {
            map.getCanvas().style.cursor = '';
        })

        map.on('click', 'featured-poi', (e) => {
            const features = map.queryRenderedFeatures(e.point, {layers: ['featured-poi']});

            console.log(features);

            openPopup(features[0])

        })

        // control for Neighborhood Attractions list
        class listControl {
            onAdd(map) {
                this._map = map;
                this._container = d3.create('div')
                    .attr('class', 'map-list-ctrl')
                    .attr('id', 'map-list-ctrl');

                const listBtn = d3.create('button')
                    .attr('class', 'map-list-btn')
                    .attr('id', 'map-list-btn')
                    .html('&equiv; &nbsp; Show List')
                    .on('click', showPOIList);

                this._container.append(() => listBtn.node());

                const listDiv = d3.create('div')
                    .attr('class', 'map-list-div')
                    .attr('id', 'map-list-sidebar');
                
                // variable to save menu structure
                const menuData = [];

                // loop through categories
                const categories = ['Attractions', 'Hotels', 'Transit'];
                categories.forEach(cat => {
                    // create category for menuData
                    let catData = {
                        category: cat,
                        items: []
                    };

                    let items = data.filter(x => x.properties.category == cat);
                    items.forEach(poi => {
                        catData.items.push(poi.properties.name);
                    });

                    // push to menuData
                    menuData.push(catData);

                });

                const menu = d3.create('div')
                    .attr('id', 'map-list-sidebar');
                // Bind data to categories
                const category = menu.selectAll('.poi-category')
                    .data(menuData)
                    .enter()
                    .append('div')
                    .attr('class', 'poi-category');

                // Category header
                category.append('div')
                    .attr('class', 'map-header')
                    .text(d => d.category)
                    .on('click', toggleCategory);
                
                
                // Arrow icon
                category.append('span')
                    .attr('class', 'arrow')
                    .text('↓')
                    .on('click', toggleCategory);

                // Category items
                const itemList = category.append('ul')
                    .attr('class', 'item-list collapsed');

                itemList.selectAll('li')
                    .data(d => d.items)
                    .enter()
                    .append('li')
                    .attr('class', 'poi-listing')
                    .text(d => d)
                    .on('click', (e) => {
                        console.log(e.target.textContent);

                        let poi = data.find(x => x.properties.name == e.target.textContent);
                        console.log(poi);

                        openPopup(poi);
                    });

                // Toggle category
                function toggleCategory() {
                    const category = d3.select(this.parentNode);
                    const itemList = category.select('.item-list');
                    const arrow = category.select('.arrow');

                    const isCollapsed = itemList.classed('collapsed');

                    itemList.classed('collapsed', !itemList.classed('collapsed'));
                    arrow.text(itemList.classed('collapsed') ? '↓' : '↑');

                    // Animate height change
                    const itemListHeight = itemList.node().scrollHeight;

                    if (isCollapsed) {
                        itemList.style('max-height', '0')
                        .transition()
                        .duration(300)
                        .style('max-height', `${itemListHeight}px`);
                    } else {
                        itemList.style('max-height', `${itemListHeight}px`)
                        .transition()
                        .duration(300)
                        .style('max-height', '0');
                    }

                }

                this._container.append(() => menu.node());

                console.log(menuData);

                return this._container.node();
            }
            onRemove() {
                this._container.node().parentNode.removeChild(this._container);
                this._map = undefined;
            }
        }

        map.addControl(new listControl(), 'top-left');

        d3.select('.map-list-label')

        function showPOIList(e) {
            console.log(e.target);
            console.log(e.target.innerHTML);

            d3.select('#map-list-sidebar')
                .transition()
                .style("display", "block");

            d3.select('#map-list-ctrl')
                .style("background-color", '#fff');

            d3.select(this)
                .html('&#10005; &nbsp; Close List')
                .classed('map-close-list', true)
                .classed('map-list-btn', false)

            // switch click event functions
            e.target.removeEventListener('click', showPOIList);
            e.target.addEventListener('click', closePOIList);
        }

        function closePOIList(e) {
            console.log(e.target.innerHTML);

            d3.select('#map-list-sidebar')
            .transition()
            .style("display", "none");

            d3.select('#map-list-ctrl')
                .transition()
                .style("background-color", '');

            d3.select(this)
                .html('&equiv; &nbsp; Show List')
                .classed('map-close-list', false)
                .classed('map-list-btn', true)

            // switch click event functions
            e.target.addEventListener('click', showPOIList);
            e.target.removeEventListener('click', closePOIList);
        }

        function openPopup(feature) {
          
            // Copy coordinates array.
            const coordinates = feature.geometry.coordinates.slice();
            const name = feature.properties.name;
            const link = feature.properties.link;

            const popupHtml = `
                <img class="map-popup-img" src="images/${feature.properties.image}" />
                <div class="map-popup-text">
                    <h3>${name}</h3>
                    <a href="${link}" target="_blank">directions</a>
                </div>
            `
            
            popup.setLngLat(coordinates)
                .setHTML(popupHtml)
                .addTo(map);

            // draw the route to the POI
            const featureCoords = feature.geometry.coordinates;

            // // directions API request.
            // var reqUrl = "https://api.mapbox.com/directions/v5/mapbox/walking/" + empireCoords[0] + '%2C' + empireCoords[1] + '%3B' + featureCoords[0] + '%2C' + featureCoords[1] + "?alternatives=false&geometries=geojson&steps=false&access_token=" + mapboxgl.accessToken;


            // d3.json(reqUrl).then(function (d) {
            //     addRoute(d);
            // })

        }

    }) // end d3.csv 

    map.on('click', (e) => {
        console.log(map.queryRenderedFeatures(e.point));
    })

}); // end map on load


// class logoControl {
//     onAdd(map) {
//         this._map = map;
//         this._container = document.createElement('div');
//         this._container.className = 'mapboxgl-ctrl';
//         this._container.innerHTML = `<img width="61" height="70" src="LOGO FILE PATH">`

//         return this._container;
//     }
//     onRemove() {
//         this._container.parentNode.removeChild(this._container);
//         this._map = undefined;
//     }
// }

// map.addControl(new logoControl(), 'bottom-left');



function addRoute(d) {

    var route = d.routes[0].geometry;


    if (map.getLayer('route')) map.removeLayer('route');
    if (map.getSource('route')) map.removeSource('route');

    map.addSource('route', {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': route
        }
    });

    map.addLayer({
        'id': 'route',
        'type': 'line',
        'source': 'route',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#5C6972',
            'line-width': 2,
            'line-dasharray': [.1, 2]
        }
    });

    map.moveLayer('route', 'featured-poi');
}