//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

    var attrArray = ["Total Adult Male","Total Fawn Male","Total Adult Female","Total Fawn Female"]
    var expressed = attrArray[0]; //initial attribute


    //chart frame dimensions
    var chartWidth = (window.innerWidth * .95) ,
        chartHeight = 475,
        leftPadding = 45,
        rightPadding = 2,
        topBottomPadding = 6,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";


    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([20000, 135000]);


    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap(){
        //map frame dimensions
        var width = window.innerWidth * .95,
            height = window.innerHeight * .50;
    
        //create container div for the map and chart
        var container = d3.select("body")
            .append("div")
            .attr("class", "svg-container");
        
        //create new svg container for the map
        var map = container.append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height)

        //Example 2.1 line 15...create Albers equal area conic projection centered on France
        var projection = d3.geoAlbers()
            .center([0, 43]) // Centered on the latitude of New York
            .rotate([76, 0]) // Rotated to the longitude of New York; note the sign inversion
            .parallels([41, 44]) // Roughly the latitudinal extent of New York State
            .scale(6000) // Adjust scale as needed for your visualization
            .translate([width / 2, height / 2]);

        var path = d3.geoPath()
            .projection(projection);


        //use Promise.all to parallelize asynchronous data loading
        var promises = [];    
            promises.push(d3.csv("data/deer_totals_1988_2023.csv")); //load attributes from csv    
            promises.push(d3.json("data/WMU_NY_WGS84.topojson")); //load chlropleth spatial data 
            promises.push(d3.json("data/US_State_Boundaries.topojson")); //load background data
            promises.push(d3.json("data/Canada.topojson")); //load background data
    
            Promise.all(promises).then(callback);

        function callback(data) {
            var csvData = data[0], ny = data[1]; usa = data[2];ca = data[3]

            //place graticule on the map
            setGraticule(map, path);

            //translate TopoJSONs
            var usastates = topojson.feature(usa, usa.objects.US_State_Boundaries),
                canada = topojson.feature(ca, ca.objects.Canada),
                newyorkWMU = topojson.feature(ny, ny.objects.WMU_NY_WGS84).features;
            
            //add US States to map
            var states = map.append("path")
                .datum(usastates)
                .attr("class", "usa")
                .attr("d", path); 

            //add Canada to map
            var canprov = map.append("path")
                .datum(canada)
                .attr("class", "ca")
                .attr("d", path); 
        
            //join csv
            newyorkWMU = joinData(newyorkWMU,csvData);

            //create the color scale
            var colorScale = makeColorScale(csvData);
        
            //add enumeration units to map
            setEnumerationUnits(newyorkWMU, map, path, colorScale);

                //set graticules
        function setGraticule(map, path){
            //create graticule generator
            var graticule = d3.geoGraticule()
            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

            //create graticule background
            var gratBackground = map.append("path")
                .datum(graticule.outline()) //bind graticule background
                .attr("class", "gratBackground") //assign class for styling
                .attr("d", path) //project graticule

            //create graticule lines
            var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
                .data(graticule.lines()) //bind graticule lines to each element to be created
                .enter() //create an element for each datum
                .append("path") //append each element to the svg as a path element
                .attr("class", "gratLines") //assign class for styling
                .attr("d", path); //project graticule lines
            };

                //add coordinated visualization to the map
                setChart(csvData, colorScale);  
                createDropdown(csvData)
                
        };

    }; //end setMap

    function joinData(newyorkWMU, csvData){
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<csvData.length; i++){
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.UNIT; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a=0; a<newyorkWMU.length; a++){
                                                
                var geojsonProps = newyorkWMU[a].properties; //the current region geojson properties
                //console.log(geojsonProps)
                
                var geojsonKey = geojsonProps.UNIT; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){

                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties       
                    });
                };
            };
        }
        return newyorkWMU;
    };

    function setEnumerationUnits(newyorkWMU, map, path, colorScale){
        
        //add surrounding countries to map
        var countries = map.append("path")
            .datum(usa)
            .attr("class", "usa")
            .attr("d", path);

        //add NY WMUs regions to map
        //labels werent appearing on both the chart and the map
        // adding + "u" + fixed it. because the numbers infront in the UNIT field break the css
        var wmus = map.selectAll(".wmus")
            .data(newyorkWMU)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "regions " + "u" + d.properties.UNIT
            })
            .attr("d", path)
            .style("fill", function(d){
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            })            
            .on("mouseover", function(event, d){
                highlight(d.properties);
            })
            .on("mouseout", function(event, d){
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);

        //dehighlight
        var desc = wmus.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.5px"}');

    }

 //function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#EADDCA",
        "#E1C16E",
        "#B87333",
        "#814141",
        "#8B0000"];

    //create color scale generator
    var colorScale = d3.scaleThreshold()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    //reset domain array to cluster minimums
    domainArray = clusters.map(function(d){
        return d3.min(d);
    });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();

    //assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);

    return colorScale;
};
     //function to create a dropdown menu for attribute selection
     function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };









    //dropdown change event handler
    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var regions = d3.selectAll(".regions")
            .transition()
            .duration(1000)
            .style("fill", function(d){            
                var value = d.properties[expressed];            
                if(value) {                
                    return colorScale(value);           
                } else {                
                    return "#ccc";            
                }    
            });

        //Sort, resize, and recolor bars
        var bars = d3.selectAll(".bar")
            //Sort bars
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(500);
        

        updateChart(bars, csvData.length, colorScale);
    }; //end of changeAttribute()


    //function to create coordinated bar chart
    function setChart(csvData, colorScale){

        // Calculate the vertical position for the chart
        var chartYPosition = window.innerHeight - chartHeight - 39;

        //select the container div
        var container = d3.select(".svg-container");
        
        //create a second svg element to hold the bar chart
        var chart = container.append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart")
            .style("position", "absolute")
            .style("left", "30px")
            .style("top", chartYPosition + "px");

        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //set bars for each province
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar " + "u" + d.UNIT;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .on("mouseover", function(event, d){
                highlight(d)
            })
            .on("mouseout", function(event, d){
                dehighlight(d);
            })
            .on("mousemove", moveLabel);

        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');
        
        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 400)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Estimated Harvests: by Year " + expressed);
        
        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale)       

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);


    
        //set bar positions, heights, and colors
        updateChart(bars, csvData.length, colorScale);
    }; //end of setChart()

    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale){
        //position bars
        bars.attr("x", function(d, i){
                return i * (chartInnerWidth / n) + leftPadding;
            })
            //size/resize bars
            
            .attr("height", function(d, i){
               // console.log(d[expressed])
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
        
            .style("fill", function(d){            
                var value = d[expressed];            
                if(value) {                
                    return colorScale(value);            
                } else {                
                    return "#ccc";            
                }    
        });

    
        //at the bottom of updateChart()...add text to chart title
        var chartTitle = d3.select(".chartTitle")
            .text("Total White Tailed Deer Harvests: " + expressed);
    }; //end of updateChart

    //function to highlight enumeration units and bars
    function highlight(props){
        
        //change stroke
        //labels werent appearing on both the chart and the map
        /// adding + "u" + fixed it. because the numbers infront in the UNIT field break the css
        var selected = d3.selectAll("." + "u" + props.UNIT)
            .style("stroke", "brown")
            .style("stroke-width", "2");
        setLabel(props);
    };

    //function to reset the element style on mouseout
    function dehighlight(props){
        //labels werent appearing on both the chart and the map
        // adding + "u" + fixed it. because the numbers infront in the UNIT field break the css
        var selected = d3.selectAll("." + "u" + props.UNIT)
        //console.log(selected)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });

        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
        d3.select(".infolabel")
            .remove();
    };

    //function to create dynamic label
    function setLabel(props){
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", "u" + props.UNIT + "_label")
            .html(labelAttribute);

        var wmuLabel = infolabel.append("div")
            .attr("class", "labelname")
            .html("Wildlife Management Unit (WMU) "+ ": " + props.UNIT);
    };

    //function to move info label with mouse
    function moveLabel(event){
        //get width of label
        var labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;

        //use coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;

        //horizontal label coordinate, testing for overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        //vertical label coordinate, testing for overflow
        var y = event.clientY < 75 ? y2 : y1; 

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
};

})(); //last line of main.js
