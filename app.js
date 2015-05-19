var app = angular.module('treparkin', []);

app
.run(function() {
  FastClick.attach(document.body);
})
.constant('API','http://tampere.navici.com/tampere_wfs_geoserver/opendata/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=opendata:KESKUSTAN_PYSAKOINTI_VIEW&outputFormat=json&srsName=EPSG:4326')
.controller('MainCtrl', function($scope,$timeout,API,$interval) {

    // variables
    var interval = 10000;
    var map,marker,geoLoc,refresh,radius=[];
    var meIcon = {
      url: 'green.png',
      size: new google.maps.Size(22,22),
      origin: new google.maps.Point(0,0),
      anchor: new google.maps.Point(11, 11)
    },
    parkIcon = {
      url: 'parkin.png',
      size: new google.maps.Size(24,24),
      origin: new google.maps.Point(0,0),
      anchor: new google.maps.Point(12, 12)
    }
    var infowindow = new google.maps.InfoWindow({});

    
    // init map
    function initialize() {
        var mapOptions = {
         center: { lat: 61.4986166, lng: 23.7570118},
         zoom: 15,
         disableDefaultUI: true,
         backgroundColor: "#2d2d2d",
         styles: [{"featureType":"all","elementType":"labels.text.fill","stylers":[{"saturation":36},{"color":"#000000"},{"lightness":40}]},{"featureType":"all","elementType":"labels.text.stroke","stylers":[{"visibility":"on"},{"color":"#000000"},{"lightness":16}]},{"featureType":"all","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"administrative","elementType":"geometry.fill","stylers":[{"color":"#000000"},{"lightness":20}]},{"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#000000"},{"lightness":17},{"weight":1.2}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":20}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":21}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#000000"},{"lightness":17}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#000000"},{"lightness":29},{"weight":0.2}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":18}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":16}]},{"featureType":"transit","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":19}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#000000"},{"lightness":17}]}]
        };
       map = new google.maps.Map(document.getElementById('map'),
            mapOptions);
      
      map.data.loadGeoJson(API);

      var featureStyle = {
            fillColor: 'orange',
            fillOpacity:0.6,
            strokeWeight: 1,
            strokeColor:'tomato',
            strokeOpacity:0.6,
            icon:parkIcon
          }
      map.data.setStyle(featureStyle);
      
      addLayerHandlers(map);
    }
    

    initialize();
  
    
    // Locate
    $scope.locateMe = function() {
      ga('send', 'event', 'geo', 'btn')
      $scope.loading = true;
      if(!marker||!marker.getMap()){
        ga('send', 'event', 'geo', 'on')
        getLocation(showPosition);
        //refresh = $interval(function() {
        //   getLocation(showPosition);
        //},interval)
      }else {
        ga('send', 'event', 'geo', 'off')
        marker.setMap(null);
        _.map(radius,function(r){
          r.setMap(null)
        })
        if(angular.isDefined(refresh) && angular.isDefined(geoLoc)){
          geoLoc.clearWatch(refresh)
          //$interval.cancel(refresh);
          //refresh=undefined;
        }
        delete $scope.active
        delete $scope.loading 
      }
    }
  

  function error() {
    console.log('enable geolocation')
    delete $scope.loading 
    delete $scope.active 
    ga('send', 'event', 'geo', 'disabled')
  }

  // get geolocation
  function getLocation(cb) {
      if (navigator.geolocation) { 
          geoLoc = navigator.geolocation;
          refresh = geoLoc.watchPosition(cb,error,{ enableHighAccuracy: true,timeout: 10000,maximumAge: 0});
      } else { 
         console.log("Geolocation is not supported by this browser." );
         delete $scope.loading 
         delete $scope.active 
         ga('send', 'event', 'geo', 'not-supported')
      }
      
  }
  
  // Callback for getLocation
  function showPosition(position) {
    console.log(position)
    var coords = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
    map.setCenter(coords)
    createMe(coords);
    ga('send', 'event', 'geo', 'locate')
    $timeout(function() {
      $scope.active = true;
      delete $scope.loading
    },2000)
  }
  
  // Show on map
  function createMe(myLatlng) {
    
    var radiusOptions = {
      strokeColor: '#aaa',
      strokeOpacity: 0.24,
      strokeWeight: 1,
      fillColor: '#eee',
      fillOpacity: 0,
      map: map,
      center: myLatlng,
      radius: 35
    };
    
    // radius circles
    if(radius[0] && radius[0].getMap()){
      _.map(radius,function(item){
        item.setCenter(myLatlng);
      })

    } else {
      var radiusOptionsIn = radiusOptions,
          radiusIn = radiusOptions.radius,
          opacityIn = radiusOptions.strokeOpacity;
      _.times(5,function(i){
        radiusOptionsIn.radius =  radiusIn * (i+1);
        radiusOptionsIn.strokeOpacity =  opacityIn / (i+1);
        radius.push(
          new google.maps.Circle(radiusOptionsIn)
        )
      })
       
    }
    
    //marker
    if(marker&&marker.getMap()){
      marker.setPosition(myLatlng)
    } else {
      marker = new google.maps.Marker({
        position: myLatlng,
        map: map,
        title: 'Sijaintisi',
        icon:meIcon
      });
    }

  }
  
  
  function addLayerHandlers(m) {
    console.log('adding event handlers')
    m.data.addListener('click', function(event) {
      //event.feature.getProperty('MUUTA')
      showInfoWindow(
        event.latLng,
        event.feature.getProperty('MUUTA'),
        event.feature.getProperty('PAIKKOJEN_LUKUMAARA'),
        event.feature.getProperty('HINTA'),
        event.feature.getProperty('KOHDETYYPPI') == 'P'
        )
    });
    
  }
  
  
  function showInfoWindow(position,title,count,price,showTitle) {
    infowindow.setPosition(position)
    var content = '<div class="infowin">';
    if(showTitle) content +='<h3>'+title+'</h3>';
    content += '<span class="ion-android-car"> '+count+'</span>';
    if(!showTitle) {
      content += '<br /><span class="price">';
      content += price? '<span>€/h</span> '+price : 'Ilmainen';
      content += '</span>';
    } ;
    content += '</div>';
    
    infowindow.setContent(content)
    infowindow.open(map)
  }

  
})




/* Depr */
/*
.constant('APIURL','http://tampere.navici.com/tampere_wfs_geoserver/opendata/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=opendata:KESKUSTAN_PYSAKOINTI_VIEW')
.value('corsURL', '//cors-anywhere.herokuapp.com/')
.factory('GeoJSON', function($http, $q,corsURL) {
  
  return function(url){
      var deferred = $q.defer();
      $http.get(corsURL+url,{
        params:{
          srsName:'EPSG:4326',
          outputFormat:'json'
        }
      })
      .success(function(data, status , header, config){
      
        deferred.resolve(data)
      })
      
      return deferred.promise;
  } 
})
.service('Stops', function(GeoJSON,APIURL) {
  return {
    get:function(cb) {
      GeoJSON(APIURL).then(function(data){
        
        delete data.totalFeatures;delete data.crs;
        
        data.features = data.features.slice(0,20);
        
        data.features = _.map(data.features, function(feature) {
          delete feature.geometry_name; delete feature.id; delete feature.properties;
        
          return feature;
        })
        
        
        
        console.log(data)
        cb(data);
      })
      
    }
  }

})
*/