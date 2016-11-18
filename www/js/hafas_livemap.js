/* Hafas Livemap for AJAX Maps (PTV / Google / Bing Maps (testing)) */




function initFocus(){
    /* do nothing */
}
function initFontsize(){
    /* do nothing */
}

function getDebugDate(){
   var now = new Date();
   var hours = now.getHours();
   var minutes = now.getMinutes();
   var seconds = now.getSeconds();
   hours = (parseInt(hours) < 10)? '0'+hours:hours;
   minutes = (parseInt(minutes) < 10)? '0'+minutes:minutes;
   seconds = (parseInt(seconds) < 10)? '0'+seconds:seconds;
   return hours + ":" + minutes + ":" + seconds;
}
/**
 * Hafas.Ajax.abort
 * extend the prototype.js Hafas.Ajax object so that it supports an abort method
 */
Hafas.Ajax.prototype.abort = function() {
    /* prevent and state change callbacks from being issued*/
    this.transport.onreadystatechange = Prototype.emptyFunction;
    /* abort the XHR */
    this.transport.abort();
    /* update the request counter*/
    Ajax.activeRequestCount--;
};

if( typeof Hafas.Livemap == 'undefined' ){
  /**
   * @brief Class Hafas.Livemap
   **/

  Hafas.Livemap = Class.create();
  Hafas.Livemap.prototype = {
    initialize: function(param) {
      /* livemap basic settings */
      this.serverTime = null;                                              // initial server time when livemap launches
      this.map = param.map;
      this.cookiename = 'db_livefahrplan_settings';                        // Cookie for DB Zugradar Settings
      this.guiVersion = param.guiVersion;                                  // guiVersion - anti-cache/reload livemap function
      this.maxTrains = param.maxTrains || null;                            // maximum amount of trains (serverlimit)
      this.logtrains = param.logTrain || false;                            // Log trains with unrealistic speed?
      this.name = param.name;                                              // Name of the livemap
      this.outdatedBrowser = param.outdatedBrowser || false;               // Is Browser up to date?
      this.build = null;
      this.productClassData = 0;
      this.stationManager = param.stationManager || null;

      this.prodclasses = 0;                                              // initially selected product classes
      this.imageSizePerZoomLevel = new Array(24,24,24,24,24,20,35,35,35,45,50,50,50,55,55,60,60,65,70,70,70,70,70,70);


      /* train visual settings */
      this.shownames = param.params.shownames || true;                    // show Trainnames
      this.showdestination = param.params.showdirection || false;          // show Traindestination
      this.showrealtimeinfo = param.params.showrealtimeinfo || true;       // show realtime information


      this.presentationTimer = param.params.presentationTimer || 10;

      this.currentTrainFollowId = null;                                    // Train ID of a train in track mode
	  this.currentTrainLaneId = null;                                      // Train ID of current shown track
      this.exclusiveTrainId = null;                                        // Train ID of an exclusive shown train

      this.minDelay = param.params.livemapSettingMinDelay || null;           // minimumDelay Filter
      this.limitOnDelay = false;                                           // Delayfilter true/false
      this.limitOnRealtime = false;                                        // Only trains with realtime true/false
      this.limitOnCustomerProduct = false;                                 // Only specific customer trains true/false
      this.adminCode = null;                                               // admin code
      this.useDataTiles = false;                                           // use data tiles for caching mechanism
      this.minimized = false;
      this.realtimeonly = false;
      this.showAgeOfReport = param.params.showAgeOfReport || false;
      this.showAsDelayMinimum = param.displayDelayAt || 5;
      this.overdueTrainsContradictionVal = param.overdueTrainsRuleValue || 80;
      this.showSBahnTrains = param.sBahnTrains || false;
      this.tagOverdueTrains = param.tagOverdueTrains || false;
      this.tagReplacementTrains = param.tagReplacementTrains || false;
      this.overdueMsgTime = param.overdueMsgTime;

      this.livemapBaseURL = Hafas.Config.protocol + "//"+document.domain;
      /*if(Hafas.Config.gUrlTravelPlannerJSON.indexOf("/") == 0) {
          this.basicUrl = this.livemapBaseURL + Hafas.Config.gUrlTravelPlannerJSON;
      }else{
          this.basicUrl = Hafas.Config.gUrlTravelPlannerJSON
      } */
      this.basicUrl = this.livemapBaseURL + Hafas.Config.gQuery_path + "/" + Hafas.Config.gLanguage + Hafas.Config.gBrowser + "y?";


      this.singleVehicleUrl = this.basicUrl  + 'tpl=singletrain2json&performLocating=8&look_nv=get_rtmsgstatus|yes|get_rtfreitextmn|yes|&';

      this.currentZoomLevel = this.map.map.getZoom();


      /* saves Server Time which will be sync each <x> Minutes */
      this.servertime = new Date();
      this.serverTimeDelta = null;

      /* Statistic */
      this.shownTrains = 0;
      this.shownRoutes = 0;

      /* Timer Rerences */
      this.trackTrainIntervalTimer = null;                                 // the interval reference for the tracking function
      this.useInactivityTimeout = false;
      this.shiftTrainPositionTimer = null;
      this.updateTrainArrayTimer = null;                                   // Timer for updating the trainarray
      this.firstTrainRequestTimer = null;                                  // Timer for initial Request
      this.admsUpdateTimeout = null;                                       // Time for adms update
      this.clockTimer = null;                                              // Timer for livemap clock
      this.clockIntervalRef = null;
      this.msec = 0;

      /* Linefilters */
      this.linefilter = false;
      this.linefiltervalue = 0;
      this.linefilters = new Hash();
      this.selectedLines = null;

      this.productCategories = new Object;
      this.productCategories[1] = false;                                   // ICE
      this.productCategories[2] = false;                                   // IC
      this.productCategories[4] = false;                                   // D/IR
      this.productCategories[8] = false;                                   // R
      this.productCategories[16] = false;                                  // S

      this.trainContainer = new Object();                                  // Holds data of all train objects visible in the map
      this.stopContainer = new Array();                                    // Holds data of all stops with information on trains currently stopping
      this.trainRoutes = new Object();                                     // Holds data of all routes that are visible in the map
      this.priorBoundingBox = null;
      this.trails = new Object();
      this.zoomlevel = param.zoomlevels;

      this.trainInfoStausWindowVis = false;
      this.intervalPerZoom = 1;                                             // zoom-dependent multiplier for the chosen interval
      this.ajaxrequestActive = false;                                       // Holds status if train ajax request is currently active
      this.setProductClassInterval = null;
      this.zugPosMode = 2;

      /* Historic Mode */
      this.historicMode = false;                                            // Status historic mode active: true/false
      this.historyTimeStamp = new Date();                                   // Timestamp of current historical date
      this.playBackSpeed = 1;                                               // determins play speed of the livemap

      this.inactivityTimeout = null;
      this.mindelaytimer = null;
      this.currentOpenInfoWindow = null;

      /* pre-determin positions relevant */
      this.interpolateJourneys = true;
      this.intervalstep = 2000;
      this.interval = 30000;

      this.positionCounter = 0;
      this.currentAddInfo = null;
      this.trainResultObj = new Array();
      this.canvasDrawTimer = new Array();
      this.updateTimerByMovement = null;
      this.lastDataTimeStamp = null;
      this.dataTile = null;
      this.currentDataTiles = new Array();                                 // holds bounding box information for each data tile
      this.currentMultiTrainPopup = null;

      this.currentDataTileDivider = null;
      this.previousDataTileDivider = null;

      // check if this is first request
      this.initialRequestDone = false;
      this.requestInProgress = false;

      /* Create Instance of TrainOverlay (browser dependent) */
	  if(typeof document.createElement('canvas').getContext == 'undefined'){
        this.trainOverlay = new ExCanvasTrainOverlay(this);
      }else{
		 //this.trainOverlay = new MultiCanvasTrainOverlay(this);
         this.trainOverlay = new CanvasTrainOverlay(this);
      }

      /* limit map boundaries and zoom level */
      this.setupMap();

      /* Timer detects idling of the user */
      if(this.presentationTimer != null) {
      Event.observe(document.body,"mousemove",function(){
              if(this.inactivityTimeout != null){
                   window.clearTimeout(this.inactivityTimeout);
                   this.inactivityTimeout = null;
              }
              this.inactivityTimeout = window.setTimeout(this.showInactivityPopup.bind(this),1000*60*this.presentationTimer);
          }.bind(this));
      }

      /* Set Timeout if user idles */
      this.inactivityTimeout = window.setTimeout(this.showInactivityPopup.bind(this),1000*60*this.presentationTimer);

      /* set checkboxes of products */
      this.setCheckBoxes();

      /*start the livemap after syncing with the hafas server */
      this.timeSync(function(){
          this.startanimation();
          this.startClockInterval();
      }.bind(this));
    },
    getOutdatedBrowser: function(){
      return this.outdatedBrowser;
    },
    getServerClientTimeDelta: function(){
      return this.serverTimeDelta;
    },
    getShowAgeOfReport: function(){
      return this.showAgeOfReport;
    },
    getInterpolateJourneys: function(){
      return this.interpolateJourneys;
    },
    getMaxTrains: function(){
      return this.maxTrains;
    },
    setupMap: function(){
      /*  update on mouse movement or zooming */
      this.map.setOnChange(function(){
           // No update when totally zoomed out
          if(this.map.getZoom("api") >= 9) {
              this.prodclasses = 1023;
          }else{
              this.prodclasses = 0;
          }

          //this.setCheckBoxes();


           /*if(this.map.map.getZoom() != 7 || this.currentZoomLevel != 7) {*/
               /*if(this.map.map.getZoom() != this.currentZoomLevel){
                   // start / stop animation on changing zoom levels
                  this.stopanimation();
                  this.startanimation();
               }else{*/
                  this.updateLiveMap(false,true);
                  this.updateRouteDisplay();
               //}
           /*}*/
           this.checkShowNames();
           this.currentZoomLevel = this.map.map.getZoom();
           if(document.getElementById('debugZoomLevel')) {
              document.getElementById('debugZoomLevel').innerHTML = this.currentZoomLevel;
           }
           //checkStopsStations(this.map,this);
           //this.drawDebugTileLayer();
      }.bind(this));

      if(this.stationManager != null){
         this.stationManager.setLivemap(this);
      }


      // setup first data tile nw, ne, se, sw
      this.dataTile = [new CCoord({lon:5866700 , lat: 55055600 }),   // nw
                       new CCoord({lon:15041900, lat: 55055600}),    // ne
                       new CCoord({lon: 15041900, lat: 47270300}),   // se
                       new CCoord({lon: 5866700, lat: 47270300}),    // sw
                       new CCoord({lon:5866700 , lat: 55055600 })]   // nw


  //    // Listen for the dragend event
  //    google.maps.event.addListener(this.map.map, 'drag', function() {
  //      if (this.allowedBounds.contains(this.map.map.getCenter())) return;
  //      // We're out of bounds - Move the map back within the bounds
  //      var c = this.map.map.getCenter(),
  //          x = c.lng(),
  //          y = c.lat(),
  //          maxX = this.allowedBounds.getNorthEast().lng(),
  //          maxY = this.allowedBounds.getNorthEast().lat(),
  //          minX = this.allowedBounds.getSouthWest().lng(),
  //          minY = this.allowedBounds.getSouthWest().lat();
  //
  //      if (x < minX) x = minX;
  //      if (x > maxX) x = maxX;
  //      if (y < minY) y = minY;
  //      if (y > maxY) y = maxY;
  //
  //      this.map.map.setCenter(new google.maps.LatLng(y, x));
  //    }.bind(this));
    },
    getVisibleTiles: function(array){
       var visTiles = new Array();
       for(var k=0; k < array.length;k++) {
           if(array[k].visible) {
               visTiles.push(k);
           }
       }
       return visTiles;
    },
    calculateDataTiles: function(){
      //this.drawDebugTileLayer();
      var zoom = this.map.map.getZoom();

      var oldDataTiles = this.currentDataTiles;

      this.currentDataTiles = new Array();

      if(zoom < 8) {
         var dataTileDivider = 1;
      }else if(zoom == 8){
         var dataTileDivider = 2;
      }else if(zoom >= 9){
         var dataTileDivider = 3;
      }
      this.previousDataTileDivider = this.currentDataTileDivider;
      this.currentDataTileDivider = dataTileDivider;

      for(var m=0; m < dataTileDivider; m++) {
          for(var j=0; j < dataTileDivider; j++) {
              var tileWidth = Math.abs(this.dataTile[1].getLon() - this.dataTile[0].getLon())/dataTileDivider;
              var tileHeight = Math.abs(this.dataTile[1].getLat() - this.dataTile[2].getLat())/dataTileDivider;
              var currentDataTile = new Array();

              var currentDataTileWest = this.dataTile[0].getLon() + j*tileWidth;
              var currentDataTileEast = currentDataTileWest + tileWidth;
              var currentDataTileNorth = this.dataTile[0].getLat() - m*tileHeight;
              var currentDataTileSouth = currentDataTileNorth - tileHeight;

              // check if data tile is relevant for current screen view
              var dataTile = {
                  ne: new CCoord({lon:currentDataTileEast,lat:currentDataTileNorth}),
                  sw: new CCoord({lon:currentDataTileWest,lat:currentDataTileSouth}),
                  nw: new CCoord({lon:currentDataTileWest,lat:currentDataTileNorth}),
                  se: new CCoord({lon:currentDataTileEast,lat: currentDataTileSouth})
              };
              dataTile.visible = this.isDataTileInViewPort(dataTile);
              // Bounding Box request
              this.currentDataTiles.push(dataTile);
         }
      }
      if(this.currentDataTileDivider != this.previousDataTileDivider) {
          return true;
      }else{

      }
    },
    isDataTileInViewPort: function(data){
        for(var m in data) {
            var bb = this.map.getBoundingBox();
            this.map.isPointInBoundingBox(data[m]);
            bb.nw = new CCoord({lon: bb.sw.getLon(),lat:bb.ne.getLat() });
            bb.se = new CCoord({lon: bb.ne.getLon(),lat:bb.sw.getLat() });

            //First bounding box, top left corner, bottom right corner
            var data_bb_nw_x = data.nw.getLon();
            var data_bb_nw_y = data.nw.getLat();
            var data_bb_se_x = data.se.getLon();
            var data_bb_se_y = data.se.getLat();

            //Second bounding box, top left corner, bottom right corner
            var bb_nw_x = bb.nw.getLon();
            var bb_nw_y = bb.nw.getLat();
            var bb_se_x = bb.se.getLon();
            var bb_se_y = bb.se.getLat();

            var rabx = Math.abs(parseInt(data_bb_nw_x) + parseInt(data_bb_se_x) - parseInt(bb_nw_x) - parseInt(bb_se_x));
            var raby = Math.abs(parseInt(data_bb_nw_y) + parseInt(data_bb_se_y) - parseInt(bb_nw_y) - parseInt(bb_se_y));

            //rAx + rBx
            var raxPrbx = parseInt(data_bb_se_x) - parseInt(data_bb_nw_x) + parseInt(bb_se_x) - parseInt(bb_nw_x);

            //rAy + rBy
            var rayPrby = parseInt(data_bb_nw_y) - parseInt(data_bb_se_y) + parseInt(bb_nw_y) - parseInt(bb_se_y);

            if((rabx <= raxPrbx) && (raby <= rayPrby)){
                return true;
            }
            return false;
        }
    },
    drawDebugTileLayer: function(){
      if(typeof this.debugTiles != "undefined") {
          for(var l=0; l < this.debugTiles.length;l++) {
              this.map.hideContent(this.debugTiles[l]);
              this.map.removeContent(this.debugTiles[l]);
          }
      }
      var colors = ["blue","red","yellow","gray","purple"];
      this.debugTiles = new Array();
      var zoom = this.map.map.getZoom();
      if(zoom < 8) {
         var dataTileDivider = 1;
      }else if(zoom == 8){
         var dataTileDivider = 2;
      }else if(zoom >= 9){
         var dataTileDivider = 3;
      }
      for(var m=0; m < dataTileDivider; m++) {
          for(var j=0; j < dataTileDivider; j++) {
              var tileWidth = Math.abs(this.dataTile[1].getLon() - this.dataTile[0].getLon())/dataTileDivider;
              var tileHeight = Math.abs(this.dataTile[1].getLat() - this.dataTile[2].getLat())/dataTileDivider;
              var currentDataTile = new Array();

              var currentDataTileWest = this.dataTile[0].getLon() + j*tileWidth;
              var currentDataTileEast = currentDataTileWest + tileWidth;
              var currentDataTileNorth = this.dataTile[0].getLat() - m*tileHeight;
              var currentDataTileSouth = currentDataTileNorth - tileHeight;

              var tmpCoords = [new CCoord({lon:currentDataTileWest,lat:currentDataTileNorth}),
                               new CCoord({lon:currentDataTileEast,lat:currentDataTileNorth}),
                               new CCoord({lon:currentDataTileEast,lat: currentDataTileSouth}),
                               new CCoord({lon:currentDataTileWest,lat:currentDataTileSouth }),
                               new CCoord({lon:currentDataTileWest, lat:currentDataTileNorth})];
              var tmp = this.map.createContent({
                 type:'polyline',
                 coords: tmpCoords,
                 color: colors[m],
                 width: 3
              });
              this.map.showContent(tmp);
              this.debugTiles.push(tmp);
          }
      }
    },
    showInactivityPopup: function(){
       this.stopanimation();
       document.getElementById('timeoutHintDiv').style.display = 'block';
    },
    hideInactivityPopup: function(){
       this.startanimation();
       document.getElementById('timeoutHintDiv').style.display = 'none';
    },
    hideOptionMenu : function(){
       document.getElementById('hideMainOptionsLink').style.display = 'none';
       document.getElementById('showMainOptionsLink').style.display = 'block';
       document.getElementById('bahnLivefahrplanMainMenu').style.display = 'none';
    },
    showOptionMenu : function(){
       document.getElementById('showMainOptionsLink').style.display = 'none';
       document.getElementById('hideMainOptionsLink').style.display = 'block';
       document.getElementById('bahnLivefahrplanMainMenu').style.display = 'block';
    },
    timeSync: function(callback){
       //var aUrl = Hafas.Config.gUrlTravelPlannerJSON + '&tpl=time2json&performLocating=512&look_nv=type|servertime&';
       var aUrl = this.basicUrl + '&tpl=time2json&performLocating=512&look_nv=type|servertime&';
       var clientTime = new Date();
       new Hafas.Ajax(aUrl,{
         method: 'get',
         onSuccess:function(o){
            var data = eval('(' + o.responseText + ')');
            if(typeof data.error == "undefined") {
                this.servertime = new Date(data[0].year, parseInt(data[0].month-1), data[0].day, data[0].hours, data[0].minutes, data[0].seconds);
                this.serverTimeDelta = this.servertime.getTime() - clientTime.getTime();
            this.build = data[0].DDMMYYYY.substr(4,4) + data[0].DDMMYYYY.substr(2,2) + data[0].DDMMYYYY.substr(0,2);
            callback();
            }else{

            }
         }.bind(this)
       });
    },
    stopClockInterval: function(){
         if(this.clockIntervalRef != null) {
            window.clearInterval(this.clockIntervalRef);
            this.clockIntervalRef = null;
        }
    },
    startClockInterval : function(){
        this.stopClockInterval();
        var now = new Date();
        var clock_result = this.convertTimeStamps(now.getHours()) + ":" + this.convertTimeStamps(now.getMinutes()) + ":" + this.convertTimeStamps(now.getSeconds());
        this.clockIntervalRef = window.setInterval(this.updateClock.bind(this),1000);
    },
    updateClock: function(){
        var now = new Date();
        var clock_result = this.convertTimeStamps(now.getHours()) + ":" + this.convertTimeStamps(now.getMinutes()) + ":" + this.convertTimeStamps(now.getSeconds());
        if(document.getElementById("timer")){
            document.getElementById("timer").innerHTML = clock_result;
        }
        if(document.getElementById("historicTimeVal")) {
            document.getElementById("historicTimeVal").innerHTML = clock_result;
        }
    },
    startClock: function(startDate){
        this.clock = startDate;
        var clock_result = this.convertTimeStamps(this.clock.getHours()) + ":" + this.convertTimeStamps(this.clock.getMinutes()) + ":" + this.convertTimeStamps(this.clock.getSeconds());
        document.getElementById("timer").innerHTML = clock_result;
        document.getElementById("historicTimeVal").innerHTML = clock_result;
        var next = new Date(startDate.getTime());
        this.historyTimeStamp = startDate;
        next.setMilliseconds(next.getMilliseconds()+(100*this.playBackSpeed));
        this.clockTimer = window.setTimeout(this.startClock.bind(this,next),100);
        // check whether historic time reached current time
        if(this.historicMode) {
           if(this.historyTimeStamp.getTime() > new Date().getTime()) {
              this.disableHistoricMode();
              this.startanimation();
           }
        }
    },
    stopClock: function(){
        window.clearTimeout(this.clockTimer);
        this.clockTimer = null;
    },
    checkShowNames:function(){
        if(this.map.map.getZoom() <= 7) {
            this.setShowNames(false);
            $(this.name+'_showTrainNames').disabled = true;
        }else{
            $(this.name+'_showTrainNames').disabled = false;
            this.setShowNames($(this.name+'_showTrainNames').checked);
        }
    },
    setCorrectTimeShiftPerZoom: function(){
         if((this.map.map.getZoom() >= 10) && (this.timeShiftSpeed < 16)) {
             this.intervalPerZoom = this.timeShiftSpeed;
         }else{
             this.intervalPerZoom = 1;
         }
    },
    checkDOMElement:function(elem){
       if(elem != null) {
           return true;
       }else{
           return false;
       }
    },
    saveMapSettings:function(){
       /* Load general filter settings */
       /* Format */
       /* <Zugnummer anzeigen>|<fernverkehr><nahv><sbahn><intermodal><ganzzuege><ewz><sonstige>|<ZugPosMode>|<MapCenterX>|<MapCenterY>|<MapScaling>
       /* Zugnummer anzeigen */
       var showTrainNames = (!this.shownames)?'0':'1';
       /* Produktsettings auslesen */
       var productSettings = '';
       for(var i=0; i < 10; i++) {
           if(this.checkDOMElement($(this.name+'_chb_'+i))) {
               productSettings += ($(this.name+'_chb_'+i).checked)?'1':'0';
           }
       }
       /* Zug Pos Mode */
       if(($('zugPosMode2') && $('zugPosMode2').checked) || ($('zugPosMode2ist') && $('zugPosMode2ist').checked)) {
          var zugPosMode = 2;
       }else{
          var zugPosMode = 3;
       }
       /* Map Center */
       var center = this.map.LonLat2CCoord(this.map.getCenter());
       var centerX = center.getLon();
       var centerY = center.getLat();
       /* Map Scaling */
       var zoom = this.map.getZoom();

       var cookiestring = showTrainNames+"|" + productSettings + '|' + zugPosMode + '|' + centerX + '|' + centerY + '|' + zoom ;

       var date = new Date();
       date.setTime(date.getTime()+(365*24*60*60*1000));
       //deleteCookie(this.cookiename);
       /*if(navigator.userAgent.toLowerCase().indexOf('msie') != -1) {
           setCookie(this.cookiename, cookiestring,date,this.cookiepath);
       }else{
           setCookie(this.cookiename, cookiestring,date,"/");
       }*/
    },
    showInactivityHint:function(){
       Effect.Appear("dimmerInactivity", {duration: 0.4, to: 0.7});
       Effect.Appear("dimmerInactivityicon", {duration: 0.4});
    },
    hideInactivityHint:function(){
         Effect.Fade("dimmerInactivity", {duration: 0.4});
         Effect.Fade("dimmerInactivityicon", {duration: 0.4});
    },
    continueRequests:function(){
        this.hideInactivityHint();
        this.startanimation();
    },
    createLightBox:function(){
       if(this.lightbox == null) {
          this.lightbox = document.createElement("div");
          this.lightbox.style.position = 'absolute';
       }
    },
    enableHistoricMode: function(timestamp,currentTime,clock){
       this.closeInfoWindow();
       this.historicMode = true;
       this.stopanimation();
       if(this.historicTimeStampInterval != null){
          window.clearInterval(this.historicTimeStampInterval);
       }
       this.historicInitialTimeStamp = timestamp;
       var newTimeValues = currentTime.split(":");
       this.historicInitialTimeStamp.setHours(newTimeValues[0]);
       this.historicInitialTimeStamp.setMinutes(newTimeValues[1]);
       this.historicInitialTimeStamp.setSeconds(newTimeValues[2]);
       this.historicClockDisplay = clock;
       this.startanimation();
    },
    disableHistoricMode: function(){
       if(this.historicTimeStampInterval != null){
            window.clearInterval(this.historicTimeStampInterval);
       }
       document.getElementById('playbackTool').style.display = 'none';
       document.getElementById('historyModeBtn').style.display = 'inline';
       this.historicMode = false;
       this.playBackSpeed = 1;
       this.intervalPerZoom = 1;
       this.stopanimation();
       this.stopClock();
       this.startClockInterval();
    },
    convertTimeStamps: function(Value){
      return (Value > 9) ? "" + Value : "0" + Value;
    },
    getHistoricTimer: function(){
       return this.historicInitialTimeStamp;
    },
    unload:function(){
       this.stopanimation(); // Animation anhalten wenn aktiv
       for (var key in this.singleJourneys){
           var id = key.replace("x","/");
           this.removeSingleJourney(id);
       }
       delete this;
    },
    setSelectedLines: function(arr){
       this.selectedLines = arr;
       this.updateLiveMap(false);
    },
    isLineSelected: function(line){
       for(var k=0; k < this.selectedLines.length;k++) {
           if((this.selectedLines[k] == line) || ((this.selectedLines[k] == 99) && (line == "(A)") )) {
              return true;
           }
       }
    },
    setExclusiveTrain: function(val){
         if(val == null) {
            this.hideExclTrainMenu(this.exclusiveTrainId);
         }else{
            this.showExclTrainMenu(val);
         }
         this.exclusiveTrainId = val;
    },
    showExclTrainMenu: function(val){
         document.getElementById('currentExclTrainIcon').innerHTML = Hafas.Config.ProductImagesHTML[this.trainContainer[val].getProductClass()];
         document.getElementById('currentExclTrainName').innerHTML = this.trainContainer[val].name;
         document.getElementById('exclusiveTrainInMapContainer').style.display = 'block';
    },
    hideExclTrainMenu: function(val){
         if(document.getElementById('train_' + val + 'exclusiveTrain')){
            document.getElementById('train_' + val + 'exclusiveTrain').checked = false;
         }
         document.getElementById('exclusiveTrainInMapContainer').style.display = 'none';
         document.getElementById('currentExclTrainName').innerHTML = "";
    },
    setCheckBoxes: function(noUpdate){
      var zoom = this.map.getZoom();
      var iteratorArray = this.zoomlevel;
      for(var i=0; i < iteratorArray.length; i++) {
          if((zoom > iteratorArray[i]) && ($(this.name +'_chb_'+i)!=null)) {
              $(this.name + '_chb_'+i).disabled =true;
              this.setProductClass(i+1,false,false);
          }else{
              if($(this.name + '_chb_'+i)!=null) {
                  $(this.name + '_chb_'+i).disabled = false;
                  if($(this.name + '_chb_'+i).checked) {
                     this.setProductClass(i+1,true,false);
                  }else{
                     this.setProductClass(i+1,false,false);
                  }
              }
          }
      }
      if(this.map.getZoom("api") >= 11) {
          document.getElementById(this.name + "_showTrainNames").disabled = false;
          if(document.getElementById(this.name + "_showTrainNames").checked) {
              this.shownames = true;
          }else{
              this.shownames = false;
          }
      }else{
          this.shownames = false;
          document.getElementById(this.name + "_showTrainNames").disabled = true;
      }
    },enableAll:function(){
      for(var i=0; i < this.zoomlevel.length; i++) {
          $(this.name + '_chb_'+i).checked = true;
          if($(this.name + '_chb_'+i).disabled == false){
             this.setProductClass(i+1,true,false);
          }
      }
      this.updateLiveMap(false);
    },disableAll:function(){
      for(var i=0; i < this.zoomlevel.length; i++) {
          $(this.name + '_chb_'+i).checked = false;
          this.setProductClass(i+1,false,false);
      }
      this.updateLiveMap(false);
    },
    setShowNames: function( boolval ){
      this.shownames = boolval;
      this.saveMapSettings();
    },
    setShowDestination: function( boolval ){
      this.showdestination = boolval;
      this.updateLiveMap(false);
    },
    setRealtimeInfo: function(boolval){
      this.showrealtimeinfo = boolval;
      this.updateLiveMap(false);
    },
    setProductClass: function( prodindex, prodboolval,update ){
      if( prodboolval == true ){
        this.prodclasses |= Math.pow(2,prodindex);
      }else{
        var prodclass = Math.pow(2,prodindex);
        this.prodclasses &= ~(Math.pow(2,prodindex));
        this.clearJourneysByProductClass(prodclass);
      }
      if(this.setProductClassInterval != null){
         window.clearTimeout(this.setProductClassInterval);
         this.setProductClassInterval = null;
      }
      //this.saveMapSettings();
      this.setProductClassInterval = window.setTimeout(function(){
          if((typeof update == 'undefined') || (update == true)) {
              this.stopanimation();
              this.trainOverlay.draw();
              this.startanimation();
          }
      }.bind(this),1000);
    },
    clearJourneysByProductClass: function(pclass){
        for (var key in this.trainContainer){
            this.trainContainer[key].updated = false;
            if((this.trainContainer[key].getProductClass() & pclass) == pclass){
                delete this.trainContainer[key];
            }
        }
    },
    setRealtime: function(boolval){
        this.limitOnRealtime = boolval;
        this.updateLiveMap(false);
    },
    excludeProducts:function(prodclass,boolval){
       this.limitOnCustomerProduct = boolval;
    },
    startanimation: function(){
      if( this.aktiv ){
        this.aktiv.stop();
        delete this.aktiv;
      }
      /// Initialen Request ausf�hren
      this.callback();

      // Server request
      var currentRequestBegin = this.getRequestTimeStamp();
      var correctedNow = this.getServerTime();
      var roundedSeconds = this.getRoundedTimeValue(correctedNow.getSeconds());

      var nextIntervalBegin = parseInt(roundedSeconds) + parseInt((this.interval)/1000);

      var nextIntervalBeginAJAXOffset = nextIntervalBegin - 5;
      var nextRequestInSeconds = nextIntervalBeginAJAXOffset - correctedNow.getSeconds();

      if(nextRequestInSeconds < 0) {
         var startInSec = 0;
      }else{
         var startInSec = nextRequestInSeconds*1000;
      }

      /*this.firstTrainRequestTimer = window.setTimeout(function(){
           this.callback();
           this.aktiv = new PeriodicalExecuterForObjects(this, (this.interval/1000));
      }.bind(this),startInSec);*/

      this.firstTrainRequestTimer = window.setTimeout(function () {
        this.callback();
        window.setInterval(Hafas.bind(this.callback, this), this.interval);
      }.bind(this), startInSec);


	  this.isAnimated = true;
    },
    callback: function(){
      this.updateLiveMap(false);
    },
    calcTrainVector: function(trainArray)
    {
        var dir_vec = { x:0, y:0 };
        if(typeof trainArray.poly == 'undefined')
        {
            return dir_vec;
        }
        var intervalStep = this.calculateIntervalStep()/1000;
        if(typeof trainArray.poly[1] != 'undefined'){
            dir_vec.x = (parseInt(trainArray.poly[1][0]) - parseInt(trainArray.poly[0][0]))/2;
            dir_vec.y = (parseInt(trainArray.poly[1][1]) - parseInt(trainArray.poly[0][1]))/2;
        }
        else if(typeof trainArray.poly[0] != 'undefined')
        {
            dir_vec.x = (parseInt(trainArray.poly[0][0]) - parseInt(trainArray.x))/2;
            dir_vec.y = (parseInt(trainArray.poly[0][1]) - parseInt(trainArray.y))/2;
        }
        return dir_vec;
    },
    calculateSpeed: function(poly){
        var dist = 0;
        for(var k=0; k < poly.length-1; k++) {
           var c1 = new CCoord({lon:poly[k][0],lat:poly[k][1]});
           var c2 = new CCoord({lon:poly[k+1][0],lat:poly[k+1][1]});
           dist += this.map.getDistance(c1,c2);
        }
        var kmh = (dist / this.interval) * 60 * 60;
        return parseInt(kmh/this.playBackSpeed);
    },
    stopanimation: function(deleteAllObj){
      // Interval for updating train Array (always shifting first position of the array)
      if( this.shiftTrainPositionTimer != null) {
           window.clearInterval(this.shiftTrainPositionTimer);
      }
      // Interval for obtaining train data from the server
      if( this.aktiv ){
        this.aktiv.stop();
        delete this.aktiv;
      }
      // Timeout for initial request
      if(this.firstTrainRequestTimer != null) {
          window.clearTimeout(this.firstTrainRequestTimer);
      }
      // Timeout for trainoverlay redrawing
      if( this.trainOverlay.updateTimeout != null){
          window.clearTimeout(this.trainOverlay.updateTimeout);
      }
      // Interval for updating Train Arrays
      if( this.updateTrainArrayTimer != null) {
          window.clearInterval(this.updateTrainArrayTimer);
      }
      // Intervals for interpolation steps
      for(var k=0;k < this.canvasDrawTimer.length;k++) {
          window.clearTimeout(this.canvasDrawTimer[k]);
      }
      if( this.interpolateTimer != null) {
          window.clearInterval(this.interpolateTimer);
      }
      this.initialRequestDone=false;
      if(typeof deleteAllObj != "undefined" && deleteAllObj) {
          this.trainContainer = new Object;
          this.stopContainer = new Object;
      }
      this.isAnimated = false;
    },
    prodclass2binary: function(prodval){
      var bitString = prodval.toString(2);
      bitString = bitString.split("").reverse().join("");
      return bitString;
    },
    getActivatedProducts: function(products){
       var result = new Array();
       for(var j=0; j < products.length; j++) {
           if((parseInt(products[j]) == 1) && (j != 2)) {
               if(j == 1) {
                   var prodclass = 6;
               }else{
                   var prodclass = Math.pow(2,j);
               }
               result.push(prodclass);
           }
       }
       return result;
    },
    updateLiveMap: function(chbox,onchangeReq){
      if(this.useDataTiles) {
               this.calculateDataTiles();
               var activeProducts = this.getActivatedProducts(this.prodclass2binary(this.prodclasses));
               if(this.prodclasses > 0){
                   for(var k=0; k < this.currentDataTiles.length;k++) {
                          if(this.currentDataTiles[k].visible) {
                              var updateReq = (typeof onchangeReq != "undefined")?onchangeReq:false;
                              this.ajaxrequestActive = true;
                              var myAjax = new Hafas.Ajax(
                                 this.getUrl(onchangeReq,this.currentDataTiles[k]),{
                                     method: 'get',
                                     onSuccess: this.handleLocatingResult.bind(this,updateReq,k),
                                     onFailure:function(){
                                         alert('an error has occured while retrieving bus positions');
                                     }
                                 });
                          }
                   }
               }
      }else{
          var myAjax = new Hafas.Ajax(
                       this.getUrl(onchangeReq),{
                           method: 'get',
                           onSuccess: this.handleLocatingResult.bind(this,updateReq,k),
                           onFailure:function(){
                               alert('an error has occured while retrieving bus positions');
                           }
                       });
      }
    },
    getDirectionImage:function(train,station){
	   if(typeof train.direction == "undefined"){
		  var directionVal = '01';
       }else if(train.direction.length == 1){
          var directionVal = '0' + train.direction;
       }else{
          var directionVal = train.direction;
       }
       if(station == false){
         var shadowimage = Hafas.Config.gImagePath + 'livemap/arrows/arrow-black/' + directionVal +'.png'
       }else{
         var shadowimage = Hafas.Config.gImagePath + 'livemap/arrows/arrow-black/' + directionVal +'.png';
       }
       return shadowimage;
    },
    setLineFilter:function(inputf){
       if(!isNaN(parseInt(inputf.value))){
           this.linefilter = true;
           this.linefiltervalue = inputf.value;
           this.setSelectedLines(new Array(inputf.value));
       }else{
           this.linefilter = false;
           this.linefiltervalue = 0;
           inputf.value = '';
           this.setSelectedLines(null);
       }
       this.updateLiveMap(false);
    },
    getTrainPosition: function(data){
       var aUrl = Hafas.Config.gUrlTravelPlannerJSON  + 'tpl=singletrain2json&performLocating=8&look_nv=get_rtmsgstatus|yes|get_rtfreitextmn|yes|get_rtstoptimes|yes|get_fstop|yes|get_pstop|yes|get_nstop|yes|get_lstop|yes|' + this.getZugPosMode() +'&look_trainid=' + data.trainLink + '&';
       new Hafas.Ajax(aUrl,{
           onSuccess:function(o){
              var resultObj = eval('(' + o.responseText + ')');
              if(typeof resultObj.look.singletrain[0] != "undefined") {
                 var productclass = Math.pow(2,parseInt(data.trainClass));
                 if(productclass == 2) {
                     this.setProductClass(2,this.checked,false);
                     this.setProductClass(3,this.checked);
                 }else{
                     this.setProductClass(parseInt(data.trainClass),this.checked);
                 }
                 document.getElementById('livefahrplan_chb_' + data.trainClass).checked = true;
                 this.map.centerToGeo(new CCoord({lon: resultObj.look.singletrain[0].x, lat: resultObj.look.singletrain[0].y }));
                 this.map.setZoom(5000);
              }else{

              }
           }.bind(this)
       })
    },
    singleRequest:function(trainId,prod){
       var hashTrainId = trainId.replace(new RegExp(/\//g),"x");
       if(typeof prod != 'undefined') {
          var image = Hafas.Config.ProductImages[parseInt(prod)];
       }else{
          var image = gImagePath + 'products/_pic.gif';
       }
       new Hafas.Ajax(this.singleVehicleUrl + trainId,{
           onSuccess:function(o){
               var train = eval('('+o.responseText+')');
               param = {
                    type:'location',
                    coord:new CCoord({lon:train.look.singletrain[0].x,lat:train.look.singletrain[0].y}),
                    imageurl: image,
                    imagewidth: 29,
                    imageheight:34,
                    hotspot:{x:15,y:34},
                    text:train.look.singletrain[0].name
               };
               if(typeof this.singleJourneys[hashTrainId].content == 'undefined') {
                  this.singleJourneys[hashTrainId].content = new Object;
                  this.singleJourneys[hashTrainId].content = this.map.createContent(param);
                  this.map.showContent(this.singleJourneys[hashTrainId].content);
               }else{
                  this.map.updateContent(this.singleJourneys[hashTrainId].content,null,param);
               }
           }.bind(this),onFailure:function(){
           }
       });
    },
    string2date: function(timeString){
        var date = new Date();
        var split = timeString.split(":");
        date.setHours(split[0]);
        date.setMinutes(split[1]);
        if(typeof split[2] != "undefined") {
        date.setSeconds(split[2]);
        }else{
            date.setSeconds(0);
        }

        date.setMilliseconds(0);
        return date;
    },
    handleLocatingResult: function(updateReq,indexNo,ajaxResponse){
      // date when answer was received
     // Interpret and deserialise response


      var response = eval('(' + ajaxResponse.responseText + ')');

      if(typeof response.error != "undefined"){
          document.getElementById('livemapErrorPopup').style.display = 'block';
          return;
      }

      document.getElementById('livemapErrorPopup').style.display = 'none';

	  var l = response;
      var trainArray = l[0];
      var stopArray = l[1];



      /* Check result for error ! */
      if(typeof l.error == "undefined") {
          var timeString = trainArray[trainArray.length-1][0];
          var dateString = trainArray[trainArray.length-1][5]
          this.livemapCurrentIntervalStep = trainArray[trainArray.length-1][3];
          this.livemapCurrentInterval = trainArray[trainArray.length-1][2];
          this.trainPositionsLeft = parseInt(this.livemapCurrentInterval)/parseInt(this.livemapCurrentIntervalStep);
              this.currentTime = new Date().getTime();
              this.lastDataTimeStamp = this.string2date(timeString);
              this.currentTrainArrayTimeStamp = new Date(this.lastDataTimeStamp.getTime());
              this.drawtrains( trainArray );
             this.stopContainer[indexNo] = stopArray;
          this.initStopContainer(this.stopContainer[indexNo],timeString,dateString);
          this.initialRequestDone=true;
      }else{
          /* Server delivers { "error":<code> }*/
          this.stopanimation();
      }
    },
    initStopContainer: function(container,time,date){
       // clean up no longer relevant stop information
       /*for(var j=0; j < container.length;j++) {
           for(var p=0; p < container[j].m.length;p++) {

           }
       }*/

       var timeBase = this.createTimeStampFromString(date, time);
       for(var j=0; j < container.length;j++) {
           for(var p=0; p < container[j].m.length;p++) {
               var tsBegin = new Date(timeBase.getTime()+parseInt(container[j].m[p].b));
               var tsEnd = new Date(timeBase.getTime()+parseInt(container[j].m[p].e));
               container[j].m[p].tsBegin = tsBegin;
               container[j].m[p].tsEnd = tsEnd;
           }
       }

    },
    createTimeStampFromString: function(date, time){
      //var dateSplit = date.split(".");
      var timeSplit = time.split(":");
      var day = date.substr(6,2);
      var month = parseInt(date.substr(4,2))-1;
      var year = date.substr(0,4);
      var hour = parseInt(timeSplit[0],10);
      var minute = parseInt(timeSplit[1],10);
      var seconds = parseInt(timeSplit[2],10);
      var date = new Date(year,month,day,hour,minute,seconds,0);
      return date;
    },
    clearNoLongerVisibleTrains: function(){
       var bb = this.map.getBoundingBox();
       for (var key in this.trainContainer){
        this.trainContainer[key].updated = false;
        if(this.map.isPointInBoundingBox(new CCoord({lon:this.trainContainer[key].getCalcX(),lat:this.trainContainer[key].getCalcY()})) == false){
           delete this.trainContainer[key];
        }
      }
    },
    showGraphicalTrainRoute: function(id){
       var realId = id.replace(new RegExp(/x/g),"/");
       var aUrl = Hafas.Config.gUrlTrainInfo + realId + '?L=vs_traindiagram&showWithoutHeader=1&rt=1&date=' + this.trainContainer[id].getReferenceDate() + '&graphical=1&';
       $('trainRouteContainerGraphicalFrame').src = aUrl;
       $('trainRouteContainer').style.display = 'none';
       $('trainRouteContainerGraphical').style.display = 'block';
    },
    showPolyLengthOfTrains: function(){
       for(var key in this.trainContainer) {
          var train = this.trainContainer[key];
       }
    },
    showErrorNotice: function(){
      //
    },
    drawtrains: function( trains ){
      // deleting elements no longer needed
      var count = 0;
      var debug = false;
      var bb = this.map.getBoundingBox();
      var len = this.trainContainer.length;
      this.clearNoLongerVisibleTrains();
	  var time = new Date().getTime();
      // new AjaxMap
      this.livemapRefDate = this.string2date(trains[trains.length-1][0]);
      this.livemapRefDataUntil = this.string2date(trains[trains.length-1][0]);
      this.livemapRefDataUntil = new Date(this.livemapRefDataUntil.getTime()+trains[trains.length-1][2]);

      var d = trains.length-1;
      for( var i=0; i < d; i++) {
            var hashTrainId = trains[i][3].replace(new RegExp(/\//g),"x");  // using 'X' as Seperator because '/' ist not allowed
              // Neuer Zug bisher noch nicht gezeichnet
             var ckv = 22222 + ((parseInt(trains[trains.length-1][5]) + d) % 22222);
              if(typeof this.trainContainer[hashTrainId] == 'undefined' ) {
                  this.trainContainer[hashTrainId] = new Hafas.Journey(trains[i],trains[d][0],ckv,this,trains[trains.length-1][5]);
              }else{
                  this.trainContainer[hashTrainId].updateData(trains[i],trains[d][0],ckv,trains[trains.length-1][5]);
              }
              if(this.currentAddInfo == hashTrainId){
                  this.getSingleTrain(hashTrainId,false,this.trainContainer[hashTrainId].getCalcX(),this.trainContainer[hashTrainId].getCalcY());
              }
      }
      this.shownTrains=d;
      this.ajaxrequestActive = false;


      if(typeof this.trainOverlay != "undefined") {
          this.trainOverlay.updateTrains();
      }
    },calcAbsolutePolyTimeVal: function(hashTrainId,refDate){
         var refDateSplit = refDate[0].split(":");
         var refDateObj = new Date();
         refDateObj.setHours(parseInt(refDateSplit[0],10));
         refDateObj.setMinutes(parseInt(refDateSplit[1],10));
         refDateObj.setSeconds(parseInt(refDateSplit[2],10));
         for(var k=0; k < this.trainContainer[hashTrainId].poly.length;k++){
             var tmpDate = new Date(refDateObj.getTime());
             tmpDate.setSeconds(tmpDate.getSeconds()+(this.trainContainer[hashTrainId].poly[k][2]/1000))
             this.trainContainer[hashTrainId].poly[k][4] = tmpDate;
         }
    },logTrain: function(info,trainData,speed){
       var aUrl = Hafas.Config.gBaseUrl + Hafas.Config.gUrlHelp + "tpl=trainlog&"
       var Jetzt = new Date();
       var Tag = Jetzt.getDate();
       var Monat = Jetzt.getMonth() + 1;
       var Jahr = Jetzt.getYear();
       if (Jahr < 999)
         Jahr += 1900;
       var Stunden = Jetzt.getHours();
       var Minuten = Jetzt.getMinutes();
       var Sekunden = Jetzt.getSeconds();
       var WoTag = Jetzt.getDay();
       var Vortag = (Tag < 10) ? "0" : "";
       var Vormon = (Monat < 10) ? ".0" : ".";
       var Vorstd = (Stunden < 10) ? "0" : "";
       var Vormin = (Minuten < 10) ? ":0" : ":";
       var Vorsek = (Sekunden < 10) ? ":0" : ":";
       var Datum = Vortag + Tag + Vormon + Monat + "." + Jahr;
       var Uhrzeit = Vorstd + Stunden + Vormin + Minuten + Vorsek + Sekunden;
       var logMessage = "LOGTRAI;" + Datum + ";" + Uhrzeit+";"+trainData.name+";"+speed+";"+trainData.prevstop+";"+trainData.prevstopno + ";"+trainData.nextstop+";" + trainData.nextstopno;
        new Hafas.Ajax(aUrl,{
           postBody: "logmessage="+logMessage+"&",
           onSuccess: function(o){
           },
           onFailure: function(){

           }
        });
    },drawTrainOverlay:function(){
       if(typeof this.trainOverlay != "undefined") {
           this.trainOverlay.draw(0);
       }
    }, attachLinkEvent:function(id) {
       return function() {
           return id;
       };
    },checkProductClass: function(productclass,products){
       // prÃ¼fen ob Produktklasse gesetzt ist!
        var productbits = products.toString(2).split("").reverse().join("");
        var pclass = (Math.log(productclass))/(Math.log(2));
        if( productbits[pclass] == '1' ) {
           return true;
        }else{
           return false;
        }
    },showTrainInfoStatusWindow:function(key){
         if(this.trainInfoStausWindowVis != true) {
             var obj = this.currentInfoBoxData.look.singletrain[0];
             var id= "";
             $('trainInfoBoxStatusWindow').innerHTML = '<table style="width:240px;margin-top:0px;" class="infoBoxPearl">'+
                                     '<tr class="infoBoxHeadline">'+
                                        '<td colspan="4"><div style="white-space:nowrap;">' + Hafas.Config.ProductImagesHTML[this.currentInfoBoxData.prodclass] +' <strong>' + obj.name + ' &bull; ' + obj.lstopname +'</strong></div></td>'+
                                     '</tr>'+
                                     '<tr class="infoBoxFunctions">'+
                                       '<td class="leftTd" colspan="2" style="width:50%;">'+
                                        '<div id="'+id+'follow" style="padding:3px;"><input class="radioBtnLivemap" type="checkbox" id="'+id+'followChbox"/> <label for="'+id+'followChbox"/>'+Hafas.Texts.Livemap["followjourney"]+'</label></div>'+
                                        '</td>'+
                                        '<td class="rightTd" colspan="2" style="width:50%;">'+
                                          '<div id="'+id+'follow" style="padding:3px;"><input checked="checked" class="radioBtnLivemap" type="checkbox" id="'+id+'routeChbox"/> <label for="'+id+'routeChbox"/>'+Hafas.Texts.Livemap["showroute"]+'</label> <span id="'+id+'_waitIcon" style="visibility:hidden;"><img style="vertical-align:middle;" src="'+Hafas.Config.gImagePath + 'livemap/ajax_loader_small.gif"/></span></div>'+
                                        '</td>'+
                                     '</tr>' +
                                     '</table>';
             Effect.Appear('trainInfoBoxStatusWindow',{duration:0.4});
         }
         this.trainInfoStausWindowVis = true;
    },closeTrainInfoStatusWindow:function(){
         $('trainInfoBoxStatusWindow').style.display = 'none';
         this.trainInfoStausWindowVis = false;
    },
    setZugPosMode: function(val,realtimeonly){
         this.zugPosMode = val;
         if(typeof realtimeonly == "undefined") {
             this.realtimeonly = false;
         }else{
             this.realtimeonly = realtimeonly;
         }
         this.updateLiveMap();
    },
    getZugPosMode:function(){
      // Zugposmode
      var str = '';
	  /*if($('zugPosMode2').checked){
	     str += 'zugposmode|2|';
	  }else if($('zugPosMode2ist').checked){
		 str += 'zugposmode|2|get_rtonly|yes|';
      }else if($('zugPosMode3').checked){
	     str += 'zugposmode|3|';
	  }else if($('onlymatched').checked){
         str += 'get_notmatched|yes|';
      }*/
      //return str;
      if(document.getElementById('livemapTrainPosModeSelect') != null) {
          var sel = document.getElementById('livemapTrainPosModeSelect');
          var val = sel.options[sel.selectedIndex].value;
          var zugposmode = 'zugposmode|' + val + '|';
          return zugposmode;
      }else{
          var zugposmode = 'zugposmode|' + this.zugPosMode + '|';
          if(this.realtimeonly){
              zugposmode += 'get_rtonly|yes|';
          }
          return zugposmode;
      }
    },
    createRouteMenuEntry:function(hashId){
         var newRouteMenuEntry = document.createElement("div");
         var self = this;
         var realId = hashId.replace(new RegExp(/x/g),"/");
         var currentColor = Hafas.Config.ProductColors[this.trainContainer[hashId].getProductClass()];
         newRouteMenuEntry.id = "routeMenuEntry_" + hashId;
         var checkBoxDiv = document.createElement("div");
         checkBoxDiv.className = 'floatLeft';
         var checkBox = document.createElement("input");
         checkBox.type = 'checkbox';
         checkBox.checked = true;
         checkBox.id = "routeMenuEntryChb_" + hashId;
         checkBox.onclick = function(){
             if(this.checked) {
                self.showRoute(realId);
             }else{
                self.hideRoute(hashId);
             }
         }
         checkBoxDiv.appendChild(checkBox);

         var colorDiv = document.createElement("div");
         colorDiv.className = 'routeMenuColorDiv';
         colorDiv.style.backgroundColor = '#' + currentColor;

         var trainNameDiv = document.createElement("div");
         var trainNameLabel = document.createElement("label");
         trainNameLabel.setAttribute("for","routeMenuEntryChb_" + hashId);
         trainNameLabel.innerHTML = this.trainContainer[hashId].name;
         trainNameDiv.appendChild(trainNameLabel);

         var clearerDiv = document.createElement("div");
         clearerDiv.style.clear = 'both';

         newRouteMenuEntry.appendChild(checkBoxDiv);
         newRouteMenuEntry.appendChild(colorDiv);
         newRouteMenuEntry.appendChild(trainNameDiv);
         newRouteMenuEntry.appendChild(clearerDiv);
    },
    checkBoundingBoxInBoundingBox:function(priorBB,bb2){
        var coord1 = this.checkPointInBoundingBox(new CCoord({lon:bb2.ne.lon,lat:bb2.ne.lat}),priorBB);
        var coord2 = this.checkPointInBoundingBox(new CCoord({lon:bb2.sw.lon,lat:bb2.sw.lat}),priorBB);
        return (coord1 && coord2);
    },
    showRoute:function(realId,newEntry){
		var hashId = realId.replace(/\//g,"x");
        if($('train_'+hashId + '_waitIcon') != null) {
            $('train_'+hashId + '_waitIcon').style.display = 'inline-block';
        }
        if($('train_'+hashId+'routeLoader') != null){
           $('train_'+hashId+'routeLoader').style.visibility = 'visible';
        }
       if($('train_'+hashId+'routeChbox') != null){
           $('train_'+hashId+'routeChbox').setAttribute("disabled",true);
        }
       if($('train_'+hashId+'routeChbox') != null){
           $('train_'+hashId+'routeChbox').setAttribute("checked",true);
        }
        $('routesInMapContainer').style.display = 'none';

        if(this.currentTrainLaneId != null)
        {
            this.hideRoute(this.currentTrainLaneId);
        }
        this.trainContainer[hashId].showroute = true;
        var route_url = this.basicUrl + 'look_trainid='+realId+ '&tpl=chain2json3&performLocating=16&format_xy_n&';
        new Hafas.Ajax(route_url,
        { method:"post",
           onSuccess: function(o){
           // reenable function elements
           if($('train_' + hashId+'routeChbox')) {
               $('train_' + hashId+'routeChbox').removeAttribute("disabled");
           }
           // hide loading icon
           if($('train_'+hashId+'routeLoader') != null){
              $('train_'+hashId+'routeLoader').style.visibility = 'hidden';
           }
           var JSONRes = eval('(' + o.responseText + ')');
           this.showTrainLane(JSONRes,realId);




           var hashTrainId = realId.replace(new RegExp(/\//g),"x");
           if((typeof newEntry != 'undefined') && (newEntry == true)) {
               this.createRouteMenuEntry(hashTrainId)
           }

          }.bind(this)
        });
    },hideDetailContainer:function(id){
         var rehashTrainId = id.replace(new RegExp(/\//g),"x");
         this.map.hideContent(this.trainContainer[rehashTrainId].detailContainer);
         this.trainContainer[rehashTrainId].addInfo = false;
         $(rehashTrainId+"chkbox").checked = false;

    },hideRoute:function(id){
       if(typeof this.trainRoutes[id+'line'] != 'undefined'){
            ///for (var key in this.trainRoutes[id+'line']) {
                this.map.hideContent(this.trainRoutes[id+'line']);
                this.map.removeContent(this.trainRoutes[id+'line']);
            //}

			if(typeof this.trainContainer[id] != 'undefined')
			{
				this.trainContainer[id].showroute = false;
				this.shownRoutes--;
				if($('showRouteLink'+id) != null) {
				   $('showRouteLink'+id).style.display = 'block';
				   $('hideRouteLink'+id).style.display = 'none';
				}
				if($('train_'+id+'r_chkbox') != null){
					$('train_'+id+'r_chkbox').checked = false;
				}
				if($('train_'+id+'routeChbox') != null) {
				   $('train_'+id+'routeChbox').checked = false;
				}
				if($("routeMenuEntry_" + id) != null) {
				   $("routeMenuEntry_" + id).parentNode.removeChild($("routeMenuEntry_" + id));
				}
			}
            if($('currentVisibleRoutes') != null) {
                if($('currentVisibleRoutes').firstChild != null){
                   $('currentVisibleRoutes').removeChild($('currentVisibleRoutes').firstChild);
                }

            }
            $('routesInMapContainer').style.display = 'none';
           this.currentTrainLaneId = null;
      }
    },getLineWidthPerZoomLevel:function(){
         var zoom = this.map.getZoom("api");
         switch(zoom){
             case 10: return 9;
             case 10: return 9;
             case 11: return 10;break;
             case 12: return 12;break;
             case 13: return 16;break;
             case 14: return 16;break;
             case 15: return 16;break;
             default: return 6;break;
         }
    },updateRouteDisplay: function(){
         if(this.currentTrainLaneId != null) {
             var lineWidth = this.getLineWidthPerZoomLevel();
             this.map.updateContent(this.trainRoutes[this.currentTrainLaneId+'line'],{
                    width:lineWidth
             });
         }
    },zoomToProduct:function(id){
      if( typeof this.trainContainer[id] != 'undefined' ) {
          this.map.centerToGeo(new CCoord({lon:this.trainContainer[id].x,lat:this.trainContainer[id].y}),true);
       }

    },checkPointInBoundingBox:function(coord,bb){
        if(coord.getLon() >= bb.sw.getLon() && coord.getLon() <= bb.ne.getLon() && coord.getLat() <= bb.ne.getLat() && coord.getLat() >= bb.sw.getLat()) {
            return true;
        }else{
            return false;
        }

    },calculateIntervalStep:function(){
         var zoomVal = 22-this.map.map.getZoom();
         var basicIntervalStep = this.intervalstep;
         if(zoomVal >= 20) {
            basicIntervalStep = basicIntervalStep * 7.5;
         }else if(zoomVal >= 15){
            basicIntervalStep = basicIntervalStep * 5;
         }else if(zoomVal >= 12){
            basicIntervalStep = basicIntervalStep * 2.5;
         }
         return basicIntervalStep;
    },
    getServerTime: function(){
       return new Date(new Date().getTime()+this.getServerClientTimeDelta());
    },
    getRequestTimeStamp: function(){
        var clientTimeStamp = new Date();
        var correctedTimeStamp = this.getServerTime();
        var resultString = '';
        var timeStampYYYYMMDD = null;

        // Historic Mode?
      if(this.historicMode){
          var selectedDate = document.getElementById('historyDateSelector').options[document.getElementById('historyDateSelector').selectedIndex].value;
           resultString += 'look_requestdate='+selectedDate+'&look_requesttime=' + this.convertTimeStamps(this.historyTimeStamp.getHours()) + ":" + this.convertTimeStamps(this.historyTimeStamp.getMinutes()) + ":" + this.convertTimeStamps(this.historyTimeStamp.getSeconds()) + '&';
           var ts = selectedDate.split(".");
           ts = ts[2] + ts[1] + ts[0];
           timeStampYYYYMMDD = ts;

      }else{
           // Normal mode?
         if(typeof mapMovement != "undefined") {
             correctedTimeStamp = this.currentTrainArrayTimeStamp;
             correctedTimeStamp.setSeconds(correctedTimeStamp.getSeconds()+(this.livemapCurrentIntervalStep/1000))
         }else if(this.initialRequestDone){
             correctedTimeStamp.setSeconds(parseInt(correctedTimeStamp.getSeconds()) + 5);
         }
         var normalizedSeconds = this.getRoundedTimeValue(correctedTimeStamp.getSeconds());
         resultString += 'look_requesttime=' + this.convertTimeStamps(correctedTimeStamp.getHours()) + ":" + this.convertTimeStamps(correctedTimeStamp.getMinutes()) + ":" + this.convertTimeStamps(normalizedSeconds) + '&';

           var ts_year = correctedTimeStamp.getFullYear()
           var ts_month = correctedTimeStamp.getMonth()+1;
           ts_month = (ts_month < 10)?'0'+ts_month:ts_month;
           var ts_day = correctedTimeStamp.getDate();
           ts_day = (ts_day < 10)?'0'+ts_day:ts_day;
           timeStampYYYYMMDD = ""+ts_year+""+ts_month+""+ts_day;
           var ts_hours = correctedTimeStamp.getHours();
           var ts_minutes = correctedTimeStamp.getMinutes();
           var ts_seconds = normalizedSeconds;

           var requestDate = new Date(ts_year, ts_month-1, ts_day, ts_hours, ts_minutes, ts_seconds);
        }
        return {looknv_param: resultString, ts: timeStampYYYYMMDD, date: requestDate};
    },getRoundedTimeValue: function(seconds){
       if(seconds < 30) {
          return 0;
       }else{
          return 30;
       }
    },getUrl: function(mapMovement,dataTile,product){
      var url = '';
      if(typeof dataTile != "undefined") {
          var boundingBox = 'look_minx=' + dataTile.sw.getLon() + '&look_maxx=' + dataTile.ne.getLon() + '&look_miny=' + dataTile.sw.getLat() + '&look_maxy=' + dataTile.ne.getLat() + '&';
      }else{
          var bb = this.map.getBoundingBox();
          var boundingBox = 'look_minx=' + bb.sw.getLon() + '&look_maxx=' + bb.ne.getLon() + '&look_miny=' + bb.sw.getLat() + '&look_maxy=' + bb.ne.getLat() + '&';
      }

      // Build train request
      var looknv = 'look_nv=';
      looknv += 'get_rtmsgstatus|yes|';  // Get realtime message status

      if(this.getShowAgeOfReport()) {
          looknv += 'get_ageofreport|yes|get_rtfreitextmn|yes|';   // Get last reporting point
      }
      looknv += 'get_zntrainname|no|';  // Do not get trainname from infotext
      looknv += this.getZugPosMode();   // Set train positioning mode

      // Use Javascript interpolation?
      if( this.getInterpolateJourneys() ) {
          var currentIntervalStep = this.calculateIntervalStep();
          var interval = (this.interval*this.playBackSpeed) + 5000; // + puffer
          var intervalStep = (currentIntervalStep*this.playBackSpeed);
          looknv +='interval|' + interval + '|intervalstep|' + intervalStep + '|';   // Set Interval and intervalstep for request
      }

      if( this.getMaxTrains() != null) {
          looknv += 'maxnumberoftrains|'+ this.getMaxTrains() + '|';  //
      }
      looknv += 'get_nstop|yes|';         // get infos for next stop
      looknv += 'get_pstop|yes|';         // get infos for previous stop
      looknv += 'get_fstop|yes|';         // get info for first stop
      looknv += 'get_stopevaids|yes|';    // get external ids for requested stops
      looknv += 'get_stoptimes|yes|';     // get rt times for selected stops
      looknv += 'get_rtstoptimes|yes|';   // get stop times for selected stops
      looknv += 'tplmode|trains2json3|';  // use optimized mode
      looknv += 'newrgmethod|yes|';       // use new realgraph
      if(this.historicMode == true){
          looknv += 'rgdensity|15|';      // use lower density for historic mode
      }
      looknv += 'correctunrealpos|no|';   // correct realgraph (off)
      looknv += 'livemapTrainfilter|yes|'; // trainfilter
      looknv += 'get_zusatztyp|yes|';
      looknv += 'get_infotext|yes|';

      if((this.adminCode != null) && (typeof administrationMapping[this.adminCode] != "undefined")) {
         looknv += 'adms|' + this.adminCode + '____';
      }


      /*if(this.minDelay != null){
          looknv += '|min_delay|' + this.minDelay;
      }*/

      //url = Hafas.Config.gUrlTravelPlannerJSON + boundingBox + 'tpl=trains2json3&look_productclass='+this.prodclasses+'&look_json=yes&performLocating=1&';



      var prodclass = this.prodclasses;
      //url = Hafas.Config.gUrlTravelPlannerJSON + boundingBox + 'tpl=trains2json3&look_productclass='+prodclass+'&look_json=yes&performLocating=1&';
      url = this.basicUrl + boundingBox + 'tpl=trains2json3&look_productclass='+prodclass+'&look_json=yes&performLocating=1&';



      var timeStampObj = this.getRequestTimeStamp();
      this.currentRequestTimeStamp = timeStampObj.date;
      url += timeStampObj.looknv_param;

      if( looknv != 'look_nv=' ) {
          url += looknv;
      }
      url += "&interval=" + interval + "&intervalstep=" + intervalStep + "&livemapRequest=yes&ts=" + timeStampObj.ts + "&";
      return url;
    },showTrainLane:function(obj,ids){
      var actObj = this;
      var hashTrainId = ids.replace(new RegExp(/\//g),"x");
      var stoparray=new Array;
      var allcoords=new Array;
      if($('currentVisibleRoutes') != null  && $('currentVisibleRoutes').firstChild != null) {
          $('currentVisibleRoutes').removeChild($('currentVisibleRoutes').firstChild);
      }
      this.currentTrainLaneId =	hashTrainId;

      actObj.trainRoutes[hashTrainId+'stop'] = new Object();

      for(var i=0; i < obj[1].length; i++){
          var coord = new CCoord({lat:parseInt(obj[0][obj[1][i][0]][1]),lon:parseInt(obj[0][obj[1][i][0]][0])});
		   allcoords[allcoords.length]=coord;
      }
      actObj.trainRoutes[hashTrainId+'line'] = new Object();
      var polylineCoordArray = new Array();
      for(var i=0; i < obj[0].length; i++){
        polylineCoordArray.push(new CCoord({lat:parseInt(obj[0][i][1]),lon:parseInt(obj[0][i][0])}));
      }


      actObj.trainRoutes[hashTrainId+'line'] = actObj.map.createContent({
                  type: "polyline",
                  coords:polylineCoordArray,
                  color: "#AF0002",
                  width: 6,
                  opacity:0.8});
      actObj.map.showContent(actObj.trainRoutes[hashTrainId+'line']);

	  if($('train_'+hashTrainId + '_waitIcon') != null) {
		  $('train_'+hashTrainId + '_waitIcon').style.display = 'none';
	  }
      this.addMenuEntryForRoute(hashTrainId);
    },
    restart: function(){
      this.stopanimation();
      this.startanimation();
    },
     addMenuEntryForRoute:function(id){
          var pclass = (Math.log(parseInt(this.trainContainer[id].prodclass))/(Math.log(2)));
          var currentRouteLink = document.createElement("a");
          currentRouteLink.id = 'routeChbox_' + id;
          currentRouteLink.className = 'linkButtonInfobox';
          currentRouteLink.innerHTML = Hafas.Texts.Livemap["hideroute"];
          currentRouteLink.href = 'javascript:void(0);';
          currentRouteLink.onclick = function(){
             this.hideRoute(id);
          }.bind(this);
          $('routewindow').style.display = 'block';
          $('routewindowId').innerHTML = '';
          var content = document.createElement("span");
          content.innerHTML = Hafas.Config.ProductImagesLivemap[this.trainContainer[id].getProductClass()] + " " + this.trainContainer[id].getName() + " ";
          $('routewindowId').appendChild(content);
          $('routewindowId').appendChild(currentRouteLink);
          $('routesInMapContainer').style.display = 'block';
    },
    setCurrentTrackId:function(trackid){
       this.stopTracking();
       this.currentTrainFollowId = trackid;
       if($(this.currentTrainFollowId+'followChbox') != null) {
           $(this.currentTrainFollowId+'followChbox').checked = true;
       }
       this.zoomToProduct(trackid);
       if($('trackwindowId')!=null){
          $('trackwindowId').innerHTML = this.trainContainer[trackid].name;
          $('trackwindow').style.display = 'block';
       }
       this.followProduct(true);
       this.trackTrainIntervalTimer = new PeriodicalExecuter(this.followProduct.bind(this),4);
    },
    drawRouteFromStboard:function(id){
         this.showRoute(id);
    },
    setAdditionalInfoWindowByTrainId: function(id,boolval){
        if(typeof this.trainContainer[id] != "undefined") {
           this.trainContainer[id].addInfo = boolval;
           if(boolval == false) {
               this.currentAddInfo = null;
           }else{
           this.currentAddInfo = id;
        }
        }
    },
    stopTracking:function(){
       if( typeof this.trackTrainIntervalTimer != 'undefined' && this.trackTrainIntervalTimer != null) {
           this.trackTrainIntervalTimer.stop();
           if($(this.currentTrainFollowId+'followChbox') != null) {
               $(this.currentTrainFollowId+'followChbox').checked = false;
           }
           if($('trackwindowId')!=null){
              $('trackwindowId').innerHTML = '';
              $('trackwindow').style.display = 'none';
           }
           this.currentTrainFollowId = null;
           this.trackTrainIntervalTimer = null;
       }
    },
    createHistoryDateSelector: function(){
        var dateSelector = document.getElementById('historyDateSelector');
        dateSelector.length = 0;
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate()-1);
        var yesterdayString = this.convertTimeStamps(yesterday.getDate()) + "." + (this.convertTimeStamps(yesterday.getMonth()+1)) + "." + this.convertTimeStamps(yesterday.getFullYear());
        dateSelector.options[dateSelector.length] = new Option( yesterdayString,yesterdayString );
        var today = new Date();
        var todayString = this.convertTimeStamps(today.getDate()) + "." + (this.convertTimeStamps(today.getMonth()+1)) + "." + this.convertTimeStamps(today.getFullYear(), true, true);
        dateSelector.options[dateSelector.length] = new Option(todayString,todayString);
        dateSelector.options[dateSelector.length-1].selected = true;
    },
    switchToHistoryMode: function(){
        /* Stop current live animation */
        document.getElementById('historyModeBtn').style.display = 'none';
        this.stopClockInterval();
        this.stopanimation();
        this.historicMode = true;
        this.historyTimeStamp = new Date();

        this.createHistoryDateSelector();

        document.getElementById('playbackTool').style.display = 'block';
        // History
        this.historyTimeStamp.setHours(this.historyTimeStamp.getHours()-1);
        for(var k=0; k < document.getElementById('historyHours').options.length;k++) {
            if(document.getElementById('historyHours').options[k].value == this.historyTimeStamp.getHours()){
               document.getElementById('historyHours').selectedIndex = k;
            }
        }
        var initString = this.convertTimeStamps(this.historyTimeStamp.getHours()) + ":" + this.convertTimeStamps(this.historyTimeStamp.getMinutes()) + ":" + this.convertTimeStamps(this.historyTimeStamp.getSeconds());
        //document.getElementById('historyHours').selectedIndex = this.historyTimeStamp.getHours();
        document.getElementById('historyMinutes').selectedIndex = (Math.round(this.historyTimeStamp.getMinutes()/5)*5)/5;
        this.historyTimeStamp.setHours(this.historyTimeStamp.getHours());
        this.historyTimeStamp.setMinutes(Math.round(this.historyTimeStamp.getMinutes()/5)*5);
        this.historyTimeStamp.setSeconds(this.historyTimeStamp.getSeconds());

        this.timeDeltaBetweenNowAndPast = this.historyTimeStamp.getTime() - new Date().getTime();

        // Uhr anhalten
        this.stopClock();
        this.startClock(this.historyTimeStamp);
        this.setPlayBackSpeed(this.playBackSpeed);
        this.enableHistoricMode(this.historyTimeStamp,initString,document.getElementById('historicTimeVal'));
    },
    focusStation: function(data){
        this.hideTrainRouteOverlay();
        this.map.centerToGeo(new CCoord({lon:data.x,lat:data.y }));
        this.map.setZoom(20000);
    },
    setPlayBackSpeed: function(speed){
        this.stopanimation();
        this.playBackSpeed = speed;
        for(var m=0; m < document.getElementById('playbackSpeedList').children.length; m++){
            document.getElementById('playbackSpeedList').children[m].className = '';
        }
        document.getElementById('playbackSpeed' + speed).className = 'selected';
        this.startanimation();
    },
    changeTimeViaSelectBox: function(){
       this.stopanimation();
       this.stopClock();
       var selIndexHours = document.getElementById('historyHours').selectedIndex;
       var selIndexMinutes = document.getElementById('historyMinutes').selectedIndex;
       this.historyTimeStamp.setHours(document.getElementById('historyHours').options[selIndexHours].value);
       this.historyTimeStamp.setMinutes(document.getElementById('historyMinutes').options[selIndexMinutes].value);
       this.historyTimeStamp.setSeconds(0);
       this.startClock(this.historyTimeStamp);
       this.startanimation();
    },
    hideUserHint: function(id){
       if($(id)) {
          $(id).style.display = 'none';
       }
    },
	showStboard:function(par){
        $('stboardTickerFrame').src = Hafas.Config.gBaseUrl + Hafas.Config.gUrlStationQuery + '&widget=yes&showJourneys=15&evaId=' + par.extId;
        $('stboardDep').style.display = 'block';
        $('deleteCurrentSearch').style.display = 'inline';
	},
    deleteStboard:function(){
         $('stboardTickerFrame').src = '';
         $('stboardDep').style.display = 'none';
         $('mapSearchField').value = '';
         $('deleteCurrentSearch').style.display = 'none';
    },
    focusJourney: function(trainId,pclass){
       var aUrl = Hafas.Config.gUrlTravelPlannerJSON + "tpl=singletrain2json&performLocating=8&look_nv=get_rtmsgstatus|yes|get_rtfreitextmn|yes|get_rtstoptimes|yes|get_fstop|yes|get_pstop|yes|get_nstop|yes|get_lstop|yes|zugposmode|2|&look_trainid="+trainId + "&";
       new Hafas.Ajax(aUrl,{
          onSuccess:function(o){
             var data = eval('(' + o.responseText + ')');
             var train = data.look.singletrain[0];
             var coord = new CCoord({lon:train.x,lat:train.y});
             this.map.centerToGeo(coord);
          }.bind(this)
       });
    },
    followProduct:function(zoom){
       //if( typeof this.aktiv != 'undefined') {
           var train = this.trainContainer[this.currentTrainFollowId];
           if( (typeof train != 'undefined') && (train != null) ) {
                this.map.centerToGeo(new CCoord({lon:train.getCalcX(),lat:train.getCalcY()}));
                if((typeof zoom != "undefined") && (zoom == true)) {
                    this.map.setZoom(20000);
                }
                /*this.map.map.panBy(-150,-140);*/
           }
       //}
    },
    getCurrentTimeString:function(t,format,minuteOffset){
      var now;
      if((typeof t!='undefined') && (t!=null)){
           now=t;
      }else{
           now = new Date();
           var timeStampInit = this.getServerTime().getTime();
           if(typeof minuteOffset != "undefined") {
               timeStampInit += (minuteOffset * 1000 * 60);
           }
           now = new Date(timeStampInit);
      }
      var seconds,minutes,hours;
      if(now.getSeconds() < 10)
         seconds = '0' + now.getSeconds();
      else
         seconds = now.getSeconds();
      if(now.getMinutes() < 10)
         minutes = '0' + now.getMinutes();
      else
         minutes = now.getMinutes();
      if(now.getHours() < 10)
         hours = '0' + now.getHours();
      else
         hours = now.getHours();
      if(typeof format == "undefined") {
      var now_str = hours + ':' + minutes + ':' + seconds;
      }else if(format == "hh:mm"){
          var now_str = hours + ':' + minutes;
      }
      return now_str;
    },delay2class:function(delay){
         if((!isNaN(delay)) && (delay != '')){
            if(delay > 0) {
                var delayclass = 'delayed';
                var delayvalue = '+ ' + delay;
            }else if(delay == 0){
                var delayclass = 'ontime';
                var delayvalue = '<img style="vertical-align:middle;" src="' + Hafas.Config.gImagePath + 'livemap/ontime.png"/> ' + Hafas.Texts.Livemap["ontime"];
            }else{
			    var delayclass = 'ontime';
                var delayvalue = delay;
			}
         }else{
            var delayclass = '';
            var delayvalue = '';
         }
         return {css:delayclass,delay:delayvalue}
    },setFernverkehr:function(boolval){
		 this.setProductClass(1,boolval,false);
		 this.setProductClass(2,boolval,false);
		 this.setProductClass(3,boolval,true);
		 //this.updateLiveMap(false);
    },setNahverkehr:function(boolval){
		 this.setProductClass(4,boolval,true);
		 //this.updateLiveMap(false);
    },setSBahn:function(boolval){
		 this.setProductClass(5,boolval,true);
		 //this.updateLiveMap(false);
    },showTopDelayList:function(){
         //$('dimmerFullScreen').style.display = 'block';
         $('topDelayOverlayFullScreen').style.display = 'block';
         var aUrl = Hafas.Config.gBaseUrl + Hafas.Config.gUrlHelp + '&L=vs_rtstat&tpl=rtstatistic_main&staType=trains';
         $('topDelayContainer').src = aUrl;
    },hideTopDelayOverlay:function(){
        //$('dimmerFullScreen').style.display = 'none';
         $('topDelayOverlayFullScreen').style.display = 'none';
    },setMinDelay: function(value){
         if(value.length == 0) {
             this.minDelay = null;
         }else{
             this.minDelay = parseInt(value);
         }

    },setAdminCode: function(value){
         this.adminCode = value;
         if(this.admsUpdateTimeout != null){
             window.clearTimeout(this.admsUpdateTimeout);
         }
         this.admsUpdateTimeout = window.setTimeout(function(){
           this.trainContainer = new Object;
           this.updateLiveMap();
         }.bind(this),1000);
    },openTrainRouteOverlay:function(id){
          var realId = id.replace(new RegExp(/x/g),"/");
		 $('dimmerFullScreen').style.display = 'block';
		 $('trainRouteOverlayFullScreen').style.display = 'block';
		 var date = new Date();
		 var datestring = date.getDate() + "." + (parseInt(date.getMonth())+1) + "." + date.getFullYear();
		 var aUrl = Hafas.Config.gLivemapBaseUrl + Hafas.Config.gTraininfo_path + "/" + Hafas.Config.gLanguage + Hafas.Config.gBrowser + "/" + realId + '?showWithoutHeader=1&date=' + datestring + '&' + Hafas.Config.gCatenateLayout + '&';
         if((typeof this.trainContainer[id].infotexts[0] != "undefined") || (typeof this.trainContainer[id].infotexts[1] != "undefined")) {
             var trainname = this.trainContainer[id].infotexts[0].OC + " " + this.trainContainer[id].infotexts[1].RT;
         }else{
             var trainname = this.trainContainer[id].getName();
         }
         aUrl += "customerTrainName=" + this.trainContainer[id].infotexts[0].OC + " " + this.trainContainer[id].infotexts[1].RT + " " + this.trainContainer[id].fstop.fdep + " " + this.trainContainer[id].fstop.fname + " " + Hafas.Texts.Livemap['destination'] + " "+ this.trainContainer[id].getLastStopName();
		 $('trainRouteContainer').innerHTML = '';
		 new Hafas.Ajax(aUrl,{
			onSuccess:function(o){
				$('trainRouteContainer').scrollTop = 0;
				$('trainRouteContainer').innerHTML = o.responseText;
			}
		 });
    },hideTrainRouteOverlay:function(){
		 $('trainRouteOverlayFullScreen').style.display = 'none';
    },isRealtimeAvailable:function(fDelay,pDelay,nDelay,dDelay){
        if((fDelay == '') && (pDelay == '') && (nDelay == '') && (dDelay == '')) {
            return false;
        }else{
            return true;
        }
    },closeInfoWindow:function(){
        if((this.currentOpenInfoWindow != null) && (typeof this.trainContainer[this.currentOpenInfoWindow] != "undefined")){
            if(typeof this.trainContainer[this.currentOpenInfoWindow].infobox != "undefined") {
                this.trainContainer[this.currentOpenInfoWindow].infobox.close();
                this.trainContainer[this.currentOpenInfoWindow].infobox = null;
            }
            this.setAdditionalInfoWindowByTrainId(this.currentOpenInfoWindow,false);
            this.currentOpenInfoWindow = null;

        }
    },getInfoBoxContentForJourney:function(result,id){
        /* delay values */
        var firstStopDepartureDelay = result.look.singletrain[0].fdep_d || '';
        var prevStopDepartureDelay = result.look.singletrain[0].pdep_d || '';
        var nextStopArrivalDelay = result.look.singletrain[0].narr_d || '';
        var destinationArrivalDelay = result.look.singletrain[0].larr_d || '';

        var firstStopDelayClass = this.delay2class(firstStopDepartureDelay);
        var prevStopDelayClass = this.delay2class(prevStopDepartureDelay);
        var nextStopDelayClass = this.delay2class(nextStopArrivalDelay);
        var ArrivalDelayClass = this.delay2class(destinationArrivalDelay);

        /* Route wird aktuell eingeblendet! */
        if((this.currentTrainLaneId != null) && (this.currentTrainLaneId == id)) {
           var routeCheckBoxStatus = 'checked="checked"';
        }else{
           var routeCheckBoxStatus = '';
        }

        if(this.trackerid == id) {
            var followChecked = 'checked="true"';
        }else{
            var followChecked = ' ';
        }


        /* �berpr�fen wo rote Linie gezeichnet werden soll */
        if((result.look.singletrain[0].fstopname == result.look.singletrain[0].pstopname) && (result.look.singletrain[0].nstopname == result.look.singletrain[0].lstopname)){
            var firstStopTRClass = "infoBoxPearlRow separatorLinePopup";
            var sndStopTRClass = "infoBoxPearlRow";
        }else{
            var firstStopTRClass = "infoBoxPearlRow";
            var sndStopTRClass = "infoBoxPearlRow separatorLinePopup";
        }

        result.look.singletrain[0].name.match(/(\d+)/g);
        //var displayedName = RegExp.$1;
        //var displayedName = this.trainContainer[id].getName();
        if((typeof this.trainContainer[id].infotexts[0] != "undefined") && (typeof this.trainContainer[id].infotexts[1] != "undefined")) {
            var displayedName = this.trainContainer[id].infotexts[0].OC + " " + this.trainContainer[id].infotexts[1].RT;
        }else{
            var displayedName = this.trainContainer[id].getName();
        }


        var html = '<div style="padding:0px;min-width:270px;">'+
                               '<table class="infoBoxPearl" cellspacing="0">'+
                                 '<tr class="infoBoxHeadline">'+
            /*<div class="hfsLivemapRouteLink"><a class="linkButtonInfobox" id="'+id+'trainRoute" href="javascript:void(0);">' + Hafas.Texts.Livemap["showroutetextual"] + '</a></div>*/
                                    '<td colspan="4"><div class="livemapInfoBoxProductIcon" style="white-space:nowrap;font-size:14px;">' + Hafas.Config.ProductImagesLivemap[this.trainContainer[id].getProductClass()] +' <strong><span>' + displayedName + '</span> ' + Hafas.Texts.Livemap["directionlabel"] +' ' + result.look.singletrain[0].lstopname +'</strong></div></td>'+
                                 '</tr>'+
                                 '<tr><td colspan="1"></td><td colspan="3"><div style="margin-top:5px;margin-bottom:5px;">'+Hafas.Texts.Livemap["lastReporting_1"] + ' ' +  this.trainContainer[id].getAgeOfReport() + ' ' + Hafas.Texts.Livemap["lastReporting_2"]+ '</div></td></tr>' +

                                 '<tr class="infoBoxPearlRow">'+
                                    '<th class="leftTd">&nbsp;</th><th>'+Hafas.Texts.Livemap["stopstation"]+'</th><th></th>'+
                                     '<th class="scheduledColumn">'+Hafas.Texts.Livemap["scheduled"]+'</th>'+
                                     '<th class="realtimeColumn">'+Hafas.Texts.Livemap["realtime"]+'</th>'+
                                 '</tr>'+
                                 '<tr class="'+firstStopTRClass+'">'+
                                    '<td class="leftTd popupDeparture"></td><td style="width:150px;">' + result.look.singletrain[0].fstopname + '</td><td>&nbsp;</td>'+
                                    '<td class="scheduledColumn" style="width:40px;">' +result.look.singletrain[0].fdep + '</td>'+
                                    '<td class="realtimeColumn" style="width:40px;"><span class="'+ firstStopDelayClass.css +'">' + firstStopDelayClass.delay + '</span></td>'+
                                 '</tr>'+
                                  '<tr class="infoBoxPearlRow" style="height:3px;">' +
                                       '<td class="leftTd popupMiddleSegment" style="height:3px;"></td><td style="height:3px;" class="rightTd" colspan="3"></td>'+
                                   '</tr>';

                                  if((result.look.singletrain[0].fstopname != result.look.singletrain[0].pstopname) && (result.look.singletrain[0].pstopname != result.look.singletrain[0].lstopname)){
                                     html+='<tr class="'+sndStopTRClass+'">'+
                                         '<td class="leftTd popupMiddleSegment"></td><td>' + result.look.singletrain[0].pstopname + '</td><td>&nbsp;</td>'+
                                         '<td class="scheduledColumn">' + result.look.singletrain[0].pdep + '</td>'+
                                         '<td class="realtimeColumn" style="width:40px;"><span class="'+ prevStopDelayClass.css +'">' + prevStopDelayClass.delay + '</span></td>'+
                                         '</tr>';
                                  }
                                  html += '<tr class="infoBoxPearlRow"><td class="popupMiddleSegment" style="border-bottom:1px solid #165E98;"></td><td style="border-bottom:1px solid #165E98;" colspan="4"></td></tr>';
                                 if(((typeof result.look.singletrain[0].nstopname != "undefined") && (result.look.singletrain[0].nstopname != result.look.singletrain[0].lstopname))){
                                   html+='<tr class="infoBoxPearlRow">'+
                                      '<td class="leftTd popupMiddleSegment"></td><td>' + result.look.singletrain[0].nstopname + '</td><td>&nbsp;</td>'+
                                       '<td class="scheduledColumn">' + ((typeof result.look.singletrain[0].narr != "undefined")?result.look.singletrain[0].narr:'') + '</td>'+
                                        '<td class="realtimeColumn" style="width:40px;"><span class="'+ nextStopDelayClass.css +'">' + nextStopDelayClass.delay + '</span></td>'+
                                   '</tr>'+
                                  '<tr class="infoBoxPearlRow" style="height:3px;">' +
                                       '<td class="leftTd popupMiddleSegment" style="height:3px;"></td><td style="height:3px;" class="rightTd" colspan="3"></td>'+
                                   '</tr>';
                                 }
                                 html+= '<tr class="infoBoxPearlRow">'+
                                    '<td class="leftTd popupArrival"></td><td>' + result.look.singletrain[0].lstopname + '</td><td></td>'+
                                     '<td class="scheduledColumn">' + result.look.singletrain[0].larr + '</td>'+
                                     '<td class="realtimeColumn" style="width:40px;"><span class="'+ ArrivalDelayClass.css +'">' + ArrivalDelayClass.delay + '</span></td>'+
                                 '</tr>'+
                                 '<tr class="infoBoxFunctions">'+
                                   '<td class="leftTd" colspan="4">'+
                                    '<div id="'+id+'follow" style="padding:3px;"><input ' + followChecked + ' class="radioBtnLivemap" type="checkbox" id="'+id+'followChbox"/> <label for="'+id+'followChbox"/>'+Hafas.Texts.Livemap["followjourney"]+'</label><br/><input ' + routeCheckBoxStatus + ' class="radioBtnLivemap" type="checkbox" id="'+id+'routeChbox"/> <label for="'+id+'routeChbox"/>'+Hafas.Texts.Livemap["showroute"]+'</label> </div>'+
                                    '</td>'+
                                 '</tr>' +
                               '</table>'+
                               '</div>';
                 return html;
    },generateRequest:function(id,click,x,y){
        var actObj = this;
        var realId = id.replace(new RegExp(/x/g),"/");
        var showRouteLinkVis = 'display:block';
        var hideRouteLinkVis = 'display:none';
        var aUrl = this.singleVehicleUrl + '&look_nv=get_rtstoptimes|yes|get_fstop|yes|get_pstop|yes|get_nstop|yes|get_lstop|yes|' + this.getZugPosMode() +'&look_trainid=' + realId + '&';
        if(this.historicMode){
               aUrl += 'look_requesttime=' + convertTimeStamps(this.historicInitialTimeStamp.getHours()) + ":" + convertTimeStamps(this.historicInitialTimeStamp.getMinutes()) + ":" + convertTimeStamps(this.historicInitialTimeStamp.getSeconds()) + '&';
        }
        var myAjax = new Hafas.Ajax(
                aUrl,{
                method: 'post',
                onUninitialized: function(){

                },
                onSuccess: function(o){
                   var result = eval('(' + o.responseText + ')');
                   var trainIndex = result.look.singletrain[0].name.replace(/\s+/g, "");
                   if(typeof productColors != "undefined") {
                       var fontcolor = '#' + productColors.get(trainIndex);
                   }else{
                       var fontcolor = '#333333';
                   }
                   if(actObj.trackerid == id) {
                       var followChecked = 'checked="true"';
                       var followExtraClass = 'class="follow"';
                   }else{
                       var followChecked = ' ';
                       var followExtraClass = '';
                   }
                   if(this.trainContainer[id].showroute == true) {
                       var routeChecked = 'checked="true"';
                       var routeExtraClass = 'class="follow"';
                   }else{
                       var routeChecked = '';
                       var routeExtraClass = '';
                   }
                   var html = this.getInfoBoxContentForJourney(result,id);
                   if((!this.trainContainer[id].addInfo) ||  ($(id+'outerInfoBoxWrap') == null)) {
                      if((this.currentOpenInfoWindow != null) && (typeof this.trainContainer[this.currentOpenInfoWindow] != 'undefined')) {
						if(typeof this.trainContainer[id] != 'undefined')
						{
							this.trainContainer[this.currentOpenInfoWindow].addInfo = false;
						}
                      }
                      //var currentInfoBox = actObj.map.showInfoboxGeo(new CCoord({lon:result.look.singletrain[0].x,lat:result.look.singletrain[0].y}),null ,'<div id="'+id+'outerInfoBoxWrap">'+ html + '</div>',null,function(){
					  var currentInfoBox = actObj.map.showInfoboxGeo(new CCoord({lon:actObj.trainContainer[id].getCalcX(),lat:actObj.trainContainer[id].getCalcY()}),'','<div id="'+id+'outerInfoBoxWrap">'+ html + '</div>',{
                          oninfocontentshow: function(){
						  /*$(id+'trainRoute').onclick = function(){
							  actObj.openTrainRouteOverlay(id);
						  }*/
                          $(id+'followChbox').onclick = function(){
                             if(this.checked) {
                                 actObj.setCurrentTrackId(id);
                             }else{
                                 actObj.stopTracking();
                             }
                          }
                          $(id+'routeChbox').onclick = function(){
                              if(this.checked) {
                                  actObj.showRoute(realId,true);
                              }else{
                                  actObj.hideRoute(id);
                              }
                          }
                      },onclose:function(){
                         if(typeof this.trainContainer[id] != "undefined") {
                             this.trainContainer[id].addInfo = false;
                             delete this.trainContainer[id].infobox;
                         }
                         //this.hideRoute(id);
                      }.bind(this)
                      });
                      this.trainContainer[id].infobox = currentInfoBox;
                      this.trainContainer[id].addInfo = true;
                   }else{
                       actObj.map.updateInfoBoxPosition(this.trainContainer[id].infobox,new CCoord({lon:result.look.singletrain[0].x,lat:result.look.singletrain[0].y}));
                       //this.trainContainer[id].infobox.setContent(html);
                       $(id+'outerInfoBoxWrap').innerHTML = html;
                    /*   $(id+'trainRoute').onclick = function(){
                           actObj.openTrainRouteOverlay(id);
                       }*/
                       $(id+'followChbox').onclick = function(){
                            if(this.checked) {
                                 actObj.setCurrentTrackId(id);
                             }else{
                                 actObj.stopTracking();
                             }
                       }
                       $(id+'routeChbox').onclick = function(){
                              if(this.checked) {
                                  actObj.showRoute(realId);
                              }else{
                                  actObj.hideRoute(id);
                              }
                       }
                   }
                   this.currentOpenInfoWindow = id;
                  }.bind(this)
               }
           );
   }
   ,togglePopupTabs: function(id,trainId){
        if(typeof currentActiveTab != "undefined") {
                document.getElementById(currentActiveTab).className = '';
                document.getElementById(currentActiveTab+"Content").style.display = 'none';
        }
        document.getElementById(id+"Content").style.display = 'block';
        document.getElementById(id).className = 'active';
        currentActiveTab = id;
        this.trainContainer[trainId].activePopupTab = id;
    },getMultiInfoBoxContent:function(trains,x,y){
        var html = '';
        for(var m=0; m < trains.length;m++) {
            var hashId = trains[m].id.replace(new RegExp(/\//g),"x");
            var train_icon = Hafas.Config.ProductImagesHTML[this.trainContainer[hashId].getProductClass()];
            html += '<div class="multiInfoBoxEntry">'+train_icon+'<strong>' + trains[m].n + '</strong> <a class="linkButton" href="javascript:Livemap_map.getSingleTrain(\''+hashId+'\',null,'+x+','+y+');">Details</a></div>';
        }
        return html;
    },getMultiTrain:function(obj,id){
        if(this.currentOpenInfoWindow) {
           this.setAdditionalInfoWindowByTrainId(this.currentOpenInfoWindow,false);
        }
        var html = "<div style='width:300px;'>";
           html += "<div><strong>" + obj.name + "</strong></div>";
           for(var k=0; k < obj.reference.length;k++) {
             var hashTrainId = obj.reference[k].id.replace(new RegExp(/\//g),"x");
             html  += "<div><a class='livemapMultiTrainLink' href='javascript:void(0);' onclick='javascript:Livemap_livefahrplan.getSingleTrain(\""+hashTrainId+"\",null,"+x+","+y+");'>" + obj.reference[k].n + "</a> <a style='padding-left:15px !important;' href='javascript:void(0);' onclick='javascript:Livemap_livefahrplan.getSingleTrain(\""+hashTrainId+"\",null,"+x+","+y+");' class='linkButton'>" + this.trainContainer[hashTrainId].getLastStopName() + "</a></div>";
           }
        html += "</div>";
        var x = obj.x;
        var y = obj.y;

        this.currentMultiTrainPopup = {
            popup: this.map.showInfoboxGeo(new CCoord({lon:x,lat:y}),null , html ,null,function(){}),
            stopCount: obj.sc
        };

    },isTrainFollowed:function(id){
         if((this.currentTrainFollowId != null) && (this.currentTrainFollowId == id)) {
            return true;
         }
         return false;
    },isTrainRouteShown: function(id){
         if((this.currentTrainLaneId != null) && (this.currentTrainLaneId == id)) {
            return true;
         }
         return false;
    },isTrainExclusivelySelected: function(id){
         if((this.exclusiveTrainId != null) && (this.exclusiveTrainId == id)) {
            return true;
         }
         return false;
    },setPopupStatus:function(id){
         var realId = id.replace(new RegExp(/x/g),"/");
         var actObj = this;
         /* Check if route is displayed? */
         if($('train_'+id+'trainRoute')) {
             $('train_'+id+'trainRoute').onclick = function(){
                 this.openTrainRouteOverlay(id);
                 $('currentTrainPosLabel').innerHTML = actObj.trainContainer[id].name;
             }
         }
         if($('train_'+id+'routeChbox') && this.isTrainRouteShown(id)) {
            $('train_'+id+'routeChbox').checked = "checked";
         }
         if($('train_'+id+'followChbox') && this.isTrainFollowed(id)){
            $('train_'+id+'followChbox').checked = "checked";
         }

         if($('train_'+id+'exclusiveTrain') && this.isTrainExclusivelySelected(id)){
            $('train_'+id+'exclusiveTrain').checked = "checked";
         }

         if($('train_'+id+'exclusiveTrain')) {
            $('train_'+id+'exclusiveTrain').onclick = function(){
                if(this.checked) {
                    actObj.setExclusiveTrain(id);
                }else{
                    actObj.setExclusiveTrain(null);
                }
            }
         }
         if($('train_'+id+'followChbox')){
            $('train_'+id+'followChbox').onclick = function(){
               if(this.checked) {
                   actObj.setCurrentTrackId(id);
               }else{
                   actObj.stopTracking();
               }
            }
         }
         if($('train_'+id+'routeChbox')) {
             $('train_'+id+'routeChbox').onclick = function(){
                 if(this.checked) {
                     actObj.showRoute(realId,true);
                 }else{
                     actObj.hideRoute(id);
                 }
             }
         }
         currentActiveTab = 'train_'+id + 'tabInfo';
    },getTrainFunctionsHTML: function(id){
        if(parseInt(this.trainContainer[id].getAgeOfReport()) != -1) {
            var timeString = this.getCurrentTimeString(null,"hh:mm",-this.trainContainer[id].getAgeOfReport()) + " " + Hafas.Texts.Livemap["hour"];
        }else{
            var timeString = Hafas.Texts.Livemap["noReportingMsg"];
        }
        var html = '<div>' + Hafas.Texts.Livemap["lastReportingMsg"] + ' ' + timeString  + '</div>'+
            '<div class="trainLivemapFunctions">'+
            '<div style="float:left;">'+
            /* Follow Mode */
            '<div>'+
               '<input type="checkbox" class="livemapCheckbox" id="train_'+id+'followChbox"/><label for="train_'+id+'followChbox">' + Hafas.Texts.Livemap["followJourney"] + '</label>'+
            '</div>'+
            /* Route Mode */
            '<div>' +
              '<input type="checkbox" class="livemapCheckbox" id="train_'+id+'routeChbox"/><label for="train_'+id+'routeChbox">' + Hafas.Texts.Livemap["routeJourney"] + '</label><span id="train_'+id+'routeLoader" style="visibility:hidden;"><img style="vertical-align:middle;" src="' + Hafas.Config.gImagePath + 'vs_livefahrplan/ajax_loader_small_black.gif"/></span>'+
            '</div>' +
            /* Exclusive Mode */
            '<div>' +
              '<input type="checkbox" class="livemapCheckbox" id="train_'+id+'exclusiveTrain"/><label for="train_'+id+'exclusiveTrain">' + Hafas.Texts.Livemap["onlyThisTrain"] + '</label>'+
            '</div>' +
            '</div>' +
            '<div style="float:right;">'+
               '<p class="floatRight button-inside querybutton" style="margin-right:0px;"><span class="button-border"><button onclick="javascript:Livemap_'+this.name+'.openTrainRouteOverlay(\''+id+'\');" title="'+Hafas.Texts.Livemap["showallStops"]+'" value="Suchen" name="start" class="highlight" type="submit"><span>' + Hafas.Texts.Livemap["showallStops"] + '</span></button></span></p>'+
            '</div>'+
            '<div style="clear:both;"></div>'+
        '</div>';
        return html;
    },getSingleTrain:function(id,click,x,y){
        var actObj = this;
        var realId = id.replace(new RegExp(/x/g),"/");
        var showRouteLinkVis = 'display:block';
        var hideRouteLinkVis = 'display:none';
        this.singleVehicleUrl = Hafas.Config.gUrlTravelPlanner  + 'L=vs_livefahrplan&tpl=trainpopup&performLocating=8&';
        var aUrl = Hafas.Config.gUrlTrainInfo + '/' + realId + '?L=vs_livefahrplan&showWithoutHeader=1&date='+this.trainContainer[id].getReferenceDate()+'&rt=1&compactView=true&';

        if(typeof this.trainContainer[this.currentOpenInfoWindow] != "undefined") {
            this.setAdditionalInfoWindowByTrainId(this.currentOpenInfoWindow, true);
        }
        var myAjax = new Hafas.Ajax(
                aUrl,{
                method: 'post',
                onUninitialized: function(){},
                onComplete: function(o){
                   var html = o.responseText;
                   if((!this.trainContainer[id].addInfo) ||  ($(id+'outerInfoBoxWrap') == null)) {
                      if((this.currentOpenInfoWindow != null) && (typeof this.trainContainer[this.currentOpenInfoWindow] != 'undefined')) {
                          this.setAdditionalInfoWindowByTrainId(this.currentOpenInfoWindow,false);
                      }
                      this.currentOpenInfoWindow = id;
                      var coord = new CCoord({lon:actObj.trainContainer[id].getCalcX(),lat:actObj.trainContainer[id].getCalcY()});

                      //pixel coord
                      var scrPix = this.map.geo2scr(coord);
                      if(scrPix.x < 600){
                          //this.map.map.panBy(-(600 - scrPix.x),0);
                      }

				      var currentInfoBox = actObj.map.showInfoboxGeo(coord,null ,'<div id="'+id+'outerInfoBoxWrap" class="trainPopupDefault">'+ html + this.getTrainFunctionsHTML(id) + '</div>',null,function(){
                          this.setPopupStatus(id);
                       }.bind(this),function(){
                          // Popup closed
                         this.setAdditionalInfoWindowByTrainId(id,false);
                         this.stopTracking();
                      }.bind(this));
                      this.trainContainer[id].infobox = currentInfoBox;
                      this.setAdditionalInfoWindowByTrainId(id,true);
                   }else{
                         $(id+'outerInfoBoxWrap').innerHTML = html + this.getTrainFunctionsHTML(id);
                         this.setPopupStatus(id);
                    }
                   this.currentOpenInfoWindow = id;
                  }.bind(this)
               }
           );
        }
  };
}


/*var PeriodicalExecuterForObjects = Class.create();
  PeriodicalExecuterForObjects.prototype = Object.extend(new PeriodicalExecuter(), {
    initialize: function(aobject, afrequency) {
      this.obj = aobject;
      this.frequency = afrequency;
      this.currentlyExecuting = false;
      this.registerCallback();
    },

    callback: function(){
      if( typeof this.obj != 'undefined' && typeof this.obj.callback != 'undefined' )
        this.obj.callback();
    }
  });
*/

Hafas.Journey = Class.create();
Hafas.Journey.prototype = {
   initialize: function(param,timestamp,ckv,livemap,requestTimeStamp){
      /* Array mapping */
     this.livemapRef = livemap;
     this.ckv = ckv;
     this.name = param[0];
     this.x = this.sign(param[1]);
     this.y = this.sign(param[2]);
     this.id = param[3];
     this.direction = param[4];
     this.productclass = param[5];
     this.delay = param[6];
     this.lstopname = param[7];
     this.pstopname = param[9];
     this.pstopno = param[10];
     this.pstopdeparture = param[17];
     this.nstopname = param[11];
     this.nstopno = param[12];
     this.nstoparrival = param[16];
     this.dateRef = param[13];
     this.timestampRef = timestamp;
     this.ageofreport = param[14];
     this.lastreporting = param[15];
     this.hideMoments = param[22];
     this.passprocCm = param[23];
     this.passproc = param[24];
     this.requestTimeStamp = requestTimeStamp;
     this.poly = this.initPositionData(param[8]);
     this.zpathflags = param[20];
     this.calcX = null;
     this.calcY = null;
     this.display = false;
     this.additionaltype = param[21];
     this.infotexts = param[25];
     this.fstop = param[26];
   },
   updateData: function(data,timestampRef,ckv,requestTimeStamp){
      this.name = data[0];
      this.ckv = ckv;
      this.x = this.sign(data[1]);
      this.y = this.sign(data[2]);
      this.id = data[3];
      this.direction = data[4];
      this.productclass = data[5];
      this.delay = data[6];
      this.lstopname = data[7];
      this.pstopname = data[9];
      this.pstopno = data[10];
      this.nstopname = data[11];
      this.nstopno = data[12];
      this.dateRef = data[13];
      this.pstopdeparture = data[17];
      this.nstoparrival = data[16];
      this.ageofreport = data[14];
      this.lastreporting = data[15];
      this.zpathflags = data[20];
      this.timestampRef = timestampRef;
      this.additionaltype = data[21];
      this.hideMoments = data[22];
      this.passprocCm = data[23];
      this.passproc = data[24];
      this.requestTimeStamp = requestTimeStamp;
      this.infotexts = data[25];
      this.fstop = data[26];
      this.updatePolyObject(data[8]);
   },
   createTimeStampFromString: function(date, time){
      var dateSplit = date.split(".");
      var timeSplit = time.split(":");
      var day = parseInt(dateSplit[0],10);
      var month = parseInt(dateSplit[1],10)-1;
      var year = "20" + parseInt(dateSplit[2],10);
      var hour = parseInt(timeSplit[0],10);
      var minute = parseInt(timeSplit[1],10);
      var seconds = parseInt(timeSplit[2],10);
      var date = new Date(year,month,day,hour,minute,seconds,0);
      return date;
   },
   sign: function(val){
        var signed =  this.ckv * (val % this.ckv) + parseInt(val / this.ckv);
        return signed;
   },
   parseReqDate: function(dateStr){
        return dateStr.substr(6,2) + "." + dateStr.substr(4,2) + "." + dateStr.substr(2,2);
   },
   initPositionData: function(poly){
      //var timeBase = this.createTimeStampFromString(this.dateRef, this.timestampRef);
      var timeBase = this.createTimeStampFromString(this.parseReqDate(this.requestTimeStamp), this.timestampRef);
      for(var m=0; m < poly.length;m++) {
          var currentPositionTimeStamp = new Date(timeBase.getTime()+poly[m][2]);
          poly[m][6] = currentPositionTimeStamp;
          poly[m][7] = this.timestampRef;
          poly[m][8] = this.getPassProcCm();
          poly[m][9] = this.getPassProc();
          /*
          poly[m][0] = this.x + poly[m][0];
          poly[m][1] = this.y + poly[m][1];*/
      }
      if(this.hideMoments != null) {
          for(var n=0; n < this.hideMoments.length;n++) {
              this.hideMoments[n].tsBegin = new Date(timeBase.getTime()+this.hideMoments[n].b);
              this.hideMoments[n].tsEnd = new Date(timeBase.getTime()+this.hideMoments[n].e);
          }
      }

      return poly;
   },
   updatePolyObject: function(poly){
      poly = this.initPositionData(poly);
      // alte Informationen rausl�schen
      if(poly.length > 0) {
          for(var k=this.poly.length-1; k >= 0;k--) {
              if(this.poly[k][6].getTime() >= poly[0][6].getTime()) {
                 this.poly.pop();
              }
          }
      }
      for(var m=0; m < poly.length; m++) {
          this.poly.push(poly[m]);
      }
      var polyIndex = this.livemapRef.trainOverlay.getPolyIndex(this.poly,this.livemapRef.getServerTime());
      this.poly.splice(0,polyIndex);
   },
   isTrainLayered: function(time){
       for(var k=0; k < this.hideMoments.length;k++) {
           if((time.getTime() >= this.hideMoments[k].tsBegin.getTime()) && (time.getTime() <= this.hideMoments[k].tsEnd.getTime())) {
               return true;
           }
       }
       return false;
   },
   getHideMoments: function(){
       return this.hideMoments;
   },
   drawDebugPositions: function(){
       var poly = new Array();
       if(typeof this.polyDebug != "undefined" && this.polyDebug != null){
          this.livemapRef.map.hideContent(this.polyDebug);
          this.livemapRef.map.removeContent(this.polyDebug);
       }
       var colors = ["red","blue","green","yellow"];
       for(var i=0; i < this.poly.length;i++) {
           poly.push(new CCoord({lon:this.poly[i][0],lat:this.poly[i][1] }));
       }
       var random = Math.floor(0+(3+1)*(Math.random()));
       var polyTmp = this.livemapRef.map.createContent({
          type:'polyline',
          coords: poly,
          width: 3,
          color: colors[random]
       });
       this.livemapRef.map.showContent(polyTmp);
       this.polyDebug = polyTmp;
   },
   isProductClassActive: function(){
      var prodclass = this.getProductClass();
      if((this.livemapRef.prodclasses & prodclass) !== 0){
         return true;
      }else{
         return false;
      }
   },
   isReportOverdue: function(){
      var result = this.getZpathflags() & 2;
      if(result == 0) {
          return false;
      }else{
          return true;
      }
   },
   noReportMessages: function(){
      var result = this.getZpathflags() & 4;
      if(result == 0) {
          return false;
      }else{
          return true;
      }
   },
   checkTrainRule: function(){

   },
   /********** GETTER **************/
   /* returns the trainname */
   getName: function(){
      return this.name;
   },
   /* returns the trainId*/
   getId: function(){
      return this.id;
   },
   getKey: function(){
      return this.key;
   },
   /* return product class*/
   getProductClass: function(){
      return this.productclass;
   },
   /* return delay value of journey */
   getDelay: function(){
      return this.delay;
   },
   /* return last stop name */
   getLastStopName: function(){
      return this.lstopname;
   },
   /* return next stop name */
   getNextStopName: function(){
      return this.nstopname;
   },
   /* return previous stop name */
   getPreviousStopName: function(){
      return this.pstopname;
   },
   /* return reference date */
   getReferenceDate: function(){
      return this.dateRef;
   },
   /* return ageofreport */
   getAgeOfReport: function(){
      return this.ageofreport;
   },
   /* return name of last reporting point */
   getLastReportingPoint: function(){
      return this.lastreporting;
   },
   getCalcX: function(){
      return this.calcX;
   },
   getCalcY: function(){
      return this.calcY;
   },
   getZpathflags: function(){
      return parseInt(this.zpathflags);
   },
   getAdditionalType: function(){
      return parseInt(this.additionaltype);
   },
   getDisplay:function(){
      return this.display;
   },
   getDirection: function(){
      return this.direction;
   },
   getPassProcCm: function(){
      return this.passprocCm;
   },
   getPassProc: function(){
      return this.passproc;
   },
   getCodeDeMission: function(){
      return this.codeDeMission;
   },
   /********** SETTER **************/
   setCalcX: function(x){
      this.calcX = x;
   },
   setCalcY: function(y){
      this.calcY = y;
   },
   setDisplay: function(display){
      this.display = display;
   }
};



