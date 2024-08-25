var map;

function createMap(){
    //create the map
    map = L.map('map', {
        center: [43, -75],
        zoom: 7
    });

     //add tile layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    //call getData function
    getData();

};

//adds popup for WMU symbol
function createPropSymbols(data){
        var unitlayer = L.geoJson(data, {
        onEachFeature: function (feature, layer) {
            //console.log(feature.properties);
            content = feature.properties.UNIT 
            layer.bindTooltip(content);
        }
    }).addTo(map);
};

 //Leaflet plugin to add a styled sidepanel
 const sidepanelLeft = L.control.sidepanel('mySidepanelLeft', {
    tabsPosition: 'left',
    startTab: 'tab-1'
}).addTo(map);

//function to retrieve the data and place it on the map
function getData(){
    //load the data
    fetch("data/wmuNY8222024.json")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            //create a Leaflet GeoJSON layer and add it to the map
            L.geoJson(json).addTo(map);
            createPropSymbols(json)
        })
   
};








document.addEventListener('DOMContentLoaded',createMap)
