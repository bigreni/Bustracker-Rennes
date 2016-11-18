TrainOverlay = {};
TrainOverlay.Layer = OpenLayers.Class(OpenLayers.Layer, {
  isBaseLayer: false,
  canvas: null,
  initialize: function(name, options) {
    OpenLayers.Layer.prototype.initialize.apply(this, arguments);
    this.canvas = document.createElement('canvas');
	if(typeof this.canvas.getContext != "function") {
		this.canvas = document.getElementById('livemap_canvas');
	}
    this.canvas.style.position = 'absolute';
    var sub = document.createElement('div');
    sub.appendChild(this.canvas);
    this.div.appendChild(sub);
  },
  getCanvas: function(){
    return this.canvas;
  },
  moveTo: function(bounds, zoomChanged, dragging) {
    OpenLayers.Layer.prototype.moveTo.apply(this, arguments);
    // The code is too slow to update the rendering during dragging.
	if(dragging) {
		return;
	}
    var someLoc = new OpenLayers.LonLat(0,0);
    var offsetX = this.map.getViewPortPxFromLonLat(someLoc).x -
         	   this.map.getLayerPxFromLonLat(someLoc).x;
    var offsetY = this.map.getViewPortPxFromLonLat(someLoc).y -
       			   this.map.getLayerPxFromLonLat(someLoc).y;
    var ctx = this.canvas.getContext('2d');
  },
  CLASS_NAME: 'TrainOverlay.Layer'

});

function AbstractTrainOverlay()
{
   this.intervalTimerRef = new Array();

}

AbstractTrainOverlay.prototype.TRAIN_LABEL_ALPFA = 0.9;
AbstractTrainOverlay.prototype.PRODUCT_SPRITE_IMG = "http://app.arrivabus.co.uk/journeyplanner/hafas-res/voyager/arriva/img/livemap/products/trains_sprite2.png";
AbstractTrainOverlay.prototype.IMAGEHEIGHT = 80;
AbstractTrainOverlay.prototype.IMAGEWIDTH = 80;
AbstractTrainOverlay.prototype.REALIMGSIZE = 57;

AbstractTrainOverlay.prototype.onAdd = function() {
	//this.livemap.map.map.events.register("click", this.map, this.trainClickManager.onClick.bind(this.trainClickManager));
	this.clickHandler = new OpenLayers.Control.Click({
                handlerOptions: {
                   "single": true
                },
                callback: this.trainClickManager.onClick.bind(this.trainClickManager)
    });
    this.livemap.map.map.addControl(this.clickHandler);
    this.clickHandler.activate();
    this.livemap.map.map.events.register("mousemove", this.map, this.trainClickManager.onMouseMove.bind(this.trainClickManager));
	this.updateTrains();
};

AbstractTrainOverlay.prototype.onRemove = function() {
	this.div_.parentNode.removeChild(this.div_);
	this.div_ = null;
};

AbstractTrainOverlay.prototype.draw = function()
{

 var bounds = this.map.getBoundingBox();

 var ne_coord = this.map.CCoord2LonLat(bounds.ne);
 var sw_coord = this.map.CCoord2LonLat(bounds.sw);

//
 var ne_pix = this.trainOverlay.getViewPortPxFromLonLat(ne_coord);
 var sw_pix = this.trainOverlay.getViewPortPxFromLonLat(sw_coord);


 var someLoc = new OpenLayers.LonLat(0,0);
 var offsetX = this.map.map.getViewPortPxFromLonLat(someLoc).x -
              this.map.map.getLayerPxFromLonLat(someLoc).x;

 var offsetY = this.map.map.getViewPortPxFromLonLat(someLoc).y -
              this.map.map.getLayerPxFromLonLat(someLoc).y;

 var time = new Date().getTime();
 this.trainOverlay.canvas.width =  this.map.map.getSize().w;
 this.trainOverlay.canvas.height = this.map.map.getSize().h;


 this.trainOverlay.canvas.style.left = Math.round(-offsetX) + 'px';
 this.trainOverlay.canvas.style.top = Math.round(-offsetY) + 'px';

 this.currentsize = this.livemap.imageSizePerZoomLevel[this.livemap.map.map.getZoom()];

     var count = 0;
	 var debug = false;
     var context = this.trainOverlay.getCanvas().getContext('2d');
     for (var key in this.livemap.trainContainer)
     {

    	  var train = this.livemap.trainContainer[key];
		  this.livemap.trainContainer[key].zLayer =	 count;
          if(this.livemap.trainContainer[key].poly.length > 0){
	         	var current = new Date();
	        	current = new Date(current.getTime() + this.livemap.getServerClientTimeDelta());



	        	/* pick right timestamp for interpolating train position */

	        	var polyIndex = this.getPolyIndex(train.poly,current);

	        	/* no valid train position could be found in timeframe -> do not display then*/
	        	if((typeof train.poly[polyIndex] == "undefined") || (typeof train.poly[polyIndex+1] == "undefined")) {
					train.visible = false;
					if((typeof this.livemap.trainContainer[key].infobox != "undefined") && (this.livemap.trainContainer[key].addInfo == true)) {
						this.livemap.map.map.removePopup(this.livemap.trainContainer[key].infobox);
					}
					continue;
	        	}

				if((this.livemap.minDelay != null) && ((parseInt(this.livemap.trainContainer[key].getDelay()) < this.livemap.minDelay) || (this.livemap.trainContainer[key].getDelay() == ""))) {
					train.visible = false;
					continue;
				}

				train.visible = true;
	        	/* calculate delta between NOW and determined position */
	        	var delta = current.getTime() - train.poly[polyIndex][6].getTime();




	        	/* calculate delta in the current interval*/
	        	var deltaInterval = train.poly[polyIndex+1][6].getTime() - train.poly[polyIndex][6].getTime();
	        	var interpolationVal = delta / deltaInterval;


	        	/* interpolate x and y */
	        	var x = parseInt( parseInt(train.poly[polyIndex][0]) + parseInt(interpolationVal*(train.poly[polyIndex+1][0]-train.poly[polyIndex][0])) );
	        	var y = parseInt( parseInt(train.poly[polyIndex][1]) + parseInt(interpolationVal*(train.poly[polyIndex+1][1]-train.poly[polyIndex][1])) );

				/* calculate passproc */
				if(this.livemap.zugPosMode == 3) {
					var currentPassProc = parseInt(train.poly[polyIndex][8]);
					var nextPassProc = parseInt(train.poly[polyIndex+1][8]);
				}else{
					var currentPassProc = parseInt(train.poly[polyIndex][9]);
					var nextPassProc = parseInt(train.poly[polyIndex+1][9]);
				}
				if((nextPassProc == 0) && (currentPassProc == 0)) {
				   train.passprocCalc = 0;
				}else{
				   if(nextPassProc == 0) {
					   nextPassProc = 100;
				   }
				   train.passprocCalc = parseInt( currentPassProc ) + parseInt(interpolationVal*(nextPassProc-currentPassProc));
				}


	        	/* set current calculated position (for mouseover/click events) */
	        	this.livemap.trainContainer[key].setCalcX(x);
	        	this.livemap.trainContainer[key].setCalcY(y);

	            var newCoord = new CCoord( { lat:y, lon:x } );


			    var latlon = this.livemap.map.CCoord2LonLat(newCoord);
	      }
	      else
	      {
			    var newCoord = new CCoord( { lat: train.y, lon: train.x } );
	            var latlon = this.livemap.map.CCoord2LonLat(newCoord);
	      }
          var pix = this.trainOverlay.getViewPortPxFromLonLat(latlon);
     	  this.drawTrainImage(train, pix, sw_pix.x, ne_pix.y, context, polyIndex);
		  if((typeof this.livemap.trainContainer[key].infobox != "undefined") && (this.livemap.trainContainer[key].addInfo == true)) {
			  this.livemap.map.updateInfoBoxPosition(this.livemap.trainContainer[key].infobox,newCoord);
		  }

          if(this.livemap.shownames){
    			this.drawTrainLabel(train, pix, sw_pix.x, ne_pix.y, context,offsetX,offsetY);
		  }
    	count++;
		debugged = true;
     }
}

AbstractTrainOverlay.prototype.getPolyIndex = function(poly,current){
   var polyIndex = -1;
   for(var m=0; m < poly.length-1; m++) {
		if((current.getTime() >= poly[m][6].getTime()) && (current.getTime() < poly[m+1][6].getTime())) {
		    polyIndex = m;
		    break;
		}
   }
   return polyIndex;
}

AbstractTrainOverlay.prototype.updateTrains = function()
{
 if( this.updateTimeout != null){
	window.clearTimeout(this.updateTimeout);
 }
 var startTime = new Date();
 this.draw();
 var endTime = new Date();
 var timeLeft = (endTime.getTime() - startTime.getTime());
 var speed = parseInt(this.livemap.timeShiftSpeed);
  if((timeLeft < 300))
 {
	timeLeft=1000;
	/*if((this.livemap.isAnimated))
	{ */
	  this.intervalTimerRef[0] = window.setTimeout(this.draw.bind(this), 125);
      this.intervalTimerRef[1] = window.setTimeout(this.draw.bind(this), 250);
      this.intervalTimerRef[2] = window.setTimeout(this.draw.bind(this), 375);
	  this.intervalTimerRef[3] = window.setTimeout(this.draw.bind(this), 500);
	  this.intervalTimerRef[4] = window.setTimeout(this.draw.bind(this), 625);
      this.intervalTimerRef[5] = window.setTimeout(this.draw.bind(this), 750);
	  this.intervalTimerRef[6] = window.setTimeout(this.draw.bind(this), 875);
	/*}*/
 }
 else
	{
	 if(timeLeft > 2000)
		timeLeft+= 5000;
	 else if(timeLeft > 800)
		timeLeft += 2500;
	 else
		timeLeft = 1000;
	}
	// if(timeLeft > 2000)
	//	timeLeft+= 5000;
	// else if(timeLeft > 800)
	//	timeLeft += 2500;
	// else
	//    timeLeft = 1000;
 if((this.livemap.isAnimated) && (!this.livemap.disabled))
 {
	this.updateTimeout = window.setTimeout(this.updateTrains.bind(this), timeLeft);
 }
}

AbstractTrainOverlay.prototype.drawTrainDebug = function(context, train, shiftX, shiftY, newCoord)
{

	//var latlon = this.livemap.map.Coord2LatLng(new CCoord( { lat:train.y, lon:train.x } ));
	var latlon = this.livemap.map.CCoord2LonLat(newCoord);
	var pix =  this.trainOverlay.getViewPortPxFromLonLat(latlon);
	context.fillStyle = "#00FF00";
	context.beginPath();
	context.arc(pix.x-shiftX, pix.y-shiftY, 5, 0,Math.PI*2,true);
	context.closePath();
	context.fill();

	var latlon2 = this.livemap.map.CCoord2LonLat(new CCoord( { lat:parseInt(train.y)+parseInt(train.vec.y), lon:parseInt(train.x)+parseInt(train.vec.x) } ));
	var pix2 = this.trainOverlay.getViewPortPxFromLonLat(latlon2);
	context.strokeStyle = "#ff0000";
	context.beginPath();
	context.moveTo(pix.x-shiftX, pix.y-shiftY);
	context.lineTo(pix2.x-shiftX, pix2.y-shiftY);
	context.stroke();

	for(var i = 0; i < train.poly.length; i++)
	{
		var poly=train.poly[i];
		var latlon = this.livemap.map.CCoord2LonLat(new CCoord( { lat:poly.y, lon:poly.x } ));
		var pix = this.trainOverlay.getViewPortPxFromLonLat(latlon);
		context.fillStyle = "#FF0000";
		context.beginPath();
		context.arc(pix.x-shiftX, pix.y-shiftY, 3, 0,Math.PI*2,true);
		context.closePath();
		context.fill();
	}
}

AbstractTrainOverlay.prototype.drawTrainLabel = function(train, pix, shift_x, shift_y, context)
{
	//Farben berechnen
	var delayBgColor='FFFFCC';
	if(typeof train.delay != 'undefined' && train.delay != "") {

	  if(train.delay <= 0 && train.delay <= 2) {
		  var delayForColor='50AA50';
		  if(train.delay > 0) {
			  var delaylabel = '+' + train.delay;
		  }else{
			  var delaylabel = train.delay;
		  }
	  }else{
		  var delayForColor='800000';
		  if(train.delay == 0)
			var delaylabel = " "+train.delay+" ";
		  else
			var delaylabel = '+' + train.delay;
	  }
	}else{
	        var delaylabel = '-';
	        var delayForColor = '000000';
	}

	//Groessen berechenen
	if(typeof this.FONT_STYLE != 'undefined')
		context.font = this.FONT_STYLE;
	var rt_width = context.measureText(delaylabel).width +2;


    if((typeof train.infotexts != "undefined") && (typeof train.infotexts[0] != "undefined") && (typeof train.infotexts[1] != "undefined") && (typeof train.infotexts[0].OC != "undefined") && (typeof train.infotexts[1].RT != "undefined")) {
        var trainLabelContent = train.infotexts[0].OC + " " + train.infotexts[1].RT;
    }else{
        var trainLabelContent = train.name;
    }

	var text_width = context.measureText(trainLabelContent).width;
	var top = parseInt(pix.y - shift_y + this.currentsize/2);
	//var w = parseInt(text_width + 6 + rt_width);
	var w = parseInt(text_width + 6);
	var left = parseInt(pix.x - shift_x - ( w )/2);
	var h = 16;

	//Zeichnen
	context.globalAlpha = this.TRAIN_LABEL_ALPFA;
	//context.fillStyle = '#'+Hafas.Config.ProductColors[train.prodclass];
	context.fillStyle = "#E8E8E8";
	context.fillRect(left, top, w, h);

	//context.fillStyle = "#FFFFCC";
	context.fillStyle = "#333";
	context.textAlign = "left";
	context.fillText(trainLabelContent, left+2, top+12);

    /*context.fillStyle = '#'+delayBgColor;
	context.fillRect(left+(w-rt_width-2), top, rt_width, h);

	context.fillStyle = "#"+delayForColor;
	context.fillText(delaylabel, left+(w-rt_width)-1, top+12);*/

	context.globalAlpha = 1.0;

	context.lineWidth = 1;
	context.strokeStyle = "#333";
	//context.strokeStyle = "#FFFFCC";
	context.strokeRect(left-1, top-1, w+2, h+2);
}

// ##################################### TrainClickManager ###########################

function TrainClickManager(livemap)
{
   this.livemap = livemap;

   this.sortByZIndex = function(a,b){
		return (b.zLayer - a.zLayer);
   }

   this.onClick = function(mouseEvent)
   {

		var trains = this.livemap.trainContainer;
		var size = this.livemap.imageSizePerZoomLevel[this.livemap.map.map.getZoom()];

		//var mouselatlng = mouseEvent.latLng;

		//var click_pix = this.livemap.map.map.getViewPortPxFromLonLat(mouselatlng);
		var click_pix = mouseEvent.xy;
		var pix_bb = { x:click_pix.x+size, y:click_pix.y+size };

		//var coord = this.livemap.map.LatLng2Coord( mouselatlng );
		var coord = this.livemap.map.scr2geo( click_pix );
		var coord_bb = this.livemap.map.scr2geo( pix_bb );
		var coord_length = new CCoord( { lat:Math.abs(coord_bb.getLat() - coord.getLat())/2, lon:Math.abs(coord_bb.getLon() - coord.getLon())/2 } );
		var hits = new Array();
		for (var key in this.livemap.trainContainer)
		{
			var train = this.livemap.trainContainer[key];
			if(Math.abs(coord.getLat() - train.getCalcY()) < coord_length.getLat())
				if(Math.abs(coord.getLon() - train.getCalcX()) < coord_length.getLon())
				{
					train.key = key;
					//this.livemap.generateRequest(key, null, 0, 0);
					hits.push(this.livemap.trainContainer[key]);
					//return;
				}
		}
		if(hits.length > 0) {
			hits.sort(this.sortByZIndex);
			this.livemap.generateRequest(hits[0].key, null, 0, 0);
		}

   }


   this.onMouseMove = function(mouseEvent)
   {
		var trains = this.livemap.trainContainer;
		var size = this.livemap.imageSizePerZoomLevel[this.livemap.map.map.getZoom()];
		var mouselatlng = mouseEvent.latLng;
		var click_pix = mouseEvent.xy;
		var pix_bb = { x:click_pix.x+size, y:click_pix.y+size };
		var coord = this.livemap.map.scr2geo( click_pix );
		var coord_bb = this.livemap.map.scr2geo( pix_bb );
		var coord_length = new CCoord( { lat:Math.abs(coord_bb.getLat() - coord.getLat())/2, lon:Math.abs(coord_bb.getLon() - coord.getLon())/2 } );
		var hits = new Array();

		for (var key in this.livemap.trainContainer)
		{
			var train = this.livemap.trainContainer[key];
			if(train.visible) {
				if(Math.abs(coord.getLat() - train.getCalcY()) < coord_length.getLat())
					if(Math.abs(coord.getLon() - train.getCalcX()) < coord_length.getLon())
					{
						this.livemap.trainOverlay.trainOverlay.getCanvas().style.cursor = "pointer";
						this.livemap.trainOverlay.trainOverlay.getCanvas().style.cursor = "hand";
						hits.push(this.livemap.trainContainer[key]);
					}
			}
		}
		if(hits.length > 0) {
			hits.sort(this.sortByZIndex);
			var pix = this.livemap.map.geo2scr(new CCoord({lon: hits[0].getCalcX(), lat: hits[0].getCalcY()}));
			//document.getElementById('livemapTrainTooltip').innerHTML = "<strong style='color:#0088CE;'>" + hits[0].getName() + "</strong> " + Hafas.Texts.Livemap['destination'] + " "+ hits[0].getLastStopName();

			if((typeof hits[0].infotexts != "undefined") && (typeof hits[0].infotexts != "undefined") && (typeof hits[0].infotexts[0] != "undefined") && (typeof hits[0].infotexts[1] != "undefined") && (typeof hits[0].infotexts[0].OC != "undefined") && (typeof hits[0].infotexts[1].RT != "undefined")) {
				var trainname = hits[0].infotexts[0].OC + " " + hits[0].infotexts[1].RT;
			}else{
				var trainname = hits[0].getName();
			}

			document.getElementById('livemapTrainTooltip').innerHTML = "<strong style='color:#0088CE;'>" + trainname + "</strong> " + hits[0].fstop.fdep + " " + hits[0].fstop.fname + " " + Hafas.Texts.Livemap['destination'] + " "+ hits[0].getLastStopName() + " <span class='" + this.livemap.delay2class(hits[0].getDelay()).css + "'>" + this.livemap.delay2class(hits[0].getDelay()).delay + "</span>";
			document.getElementById('livemapTrainTooltip').style.left = pix.x + 20 + "px";
			document.getElementById('livemapTrainTooltip').style.top = pix.y + "px";
		    document.getElementById('livemapTrainTooltip').style.display = 'block';
			return;
		}
		this.livemap.trainOverlay.trainOverlay.getCanvas().style.cursor = "";
		document.getElementById('livemapTrainTooltip').style.display = 'none';

   }
   return true;
}

// ##################################### CanvasTrainOverlay #####################
// Fuer alle Canvas Browser

function CanvasTrainOverlay(livemap)
{
	if(livemap != null){
		this.init(livemap);
	}
}

CanvasTrainOverlay.prototype = new AbstractTrainOverlay();

CanvasTrainOverlay.prototype.init = function(livemap)
{
	//this.setOptions( { map:livemap.map.map } );
	this.map = livemap.map;
    this.trainOverlay = new TrainOverlay.Layer("trainOverlay");

	this.map.map.addLayers([this.trainOverlay]);
    this.map.setOnChange(function(){
        this.trainOverlay.redraw();
		//this.trainOverlay.setZIndex(400);
    }.bind(this));
	this.livemap = livemap;
	this.trainClickManager = new TrainClickManager(this.livemap);
	this.FONT_STYLE = "Lucida Grande 11px";

	this.prodImages = {};
	this.prodList = [ 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192 ];
	this.pr_img = document.createElement('img');
	this.ar_img_list = [];
	this.ar_station_img_list = [];
	for(var i = 0; i < 32; i++)
	{
		this.ar_img_list.push( document.createElement('img') );
		this.ar_img_list[i].src = this.livemap.getDirectionImage( { direction:i+"" },false );
		this.ar_station_img_list.push( document.createElement('img') );
		this.ar_station_img_list[i].src = this.livemap.getDirectionImage( { direction:i+"" },true );
	}
	this.pr_img.src = this.PRODUCT_SPRITE_IMG;
	this.pr_img.onload = this.preRenderTrains.bind(this);
	this.onAdd();
}


CanvasTrainOverlay.prototype.preRenderTrains = function()
{
	//
	for(var i = 0; i < 32; i++)
	{
		if(!this.ar_img_list[i].complete)
		{
			window.setTimeout(function(){
				this.preRenderTrains();
			}.bind(this),1000);
			return;
		}
	}
	for(var i = -1; i < 32; i++)
	{
		for(var j = 0; j < this.prodList.length; j++)
		{
			var can = document.createElement('canvas');
			can.width = 80;
			can.height = 80;
			var width = this.IMAGEWIDTH;
			var height = this.IMAGEHEIGHT;

			var skip = j*(80);
			if(skip < 0)
				skip = 0;

			/*if(i>=0)
				{ can.getContext('2d').drawImage(this.ar_img_list[i], 0, 0); }*/
			var context = can.getContext('2d');
			if(i>=0)
			{
				  /*can.getContext('2d').fillRect(0,0,width,height);*/
				  var rotationAngle = 11.25 * i;
				  context.save();
				  context.translate(width/2, height/2);
				  context.rotate(-rotationAngle * Math.PI/180);
				  context.translate(-(width/2), -(height/2));
				  context.drawImage(this.ar_img_list[0],0,0,width,height,3,3,width-7,height-7);
			}
			context.restore();
			can.getContext('2d').drawImage(this.pr_img, skip, 0, 80, 80, 11.5, 11.5, 57, 57);
			this.prodImages[i+"_"+this.prodList[j]] = can;
		}
		//
		for(var j = 0; j < this.prodList.length; j++)
		{
			var can = document.createElement('canvas');
			can.width = 80;
			can.height = 80;
			var width = this.IMAGEWIDTH;
			var height = this.IMAGEHEIGHT;

			var skip = j*(80);
			if(skip < 0)
				skip = 0;

			/*if(i>=0)
				{ can.getContext('2d').drawImage(this.ar_img_list[i], 0, 0); }*/
			var context = can.getContext('2d');
			if(i>=0)
			{
				  /*can.getContext('2d').fillRect(0,0,width,height);*/
				  var rotationAngle = 11.25 * i;
				  context.save();
				  context.translate(width/2, height/2);
				  context.rotate(-rotationAngle * Math.PI/180);
				  context.translate(-(width/2), -(height/2));
				  context.drawImage(this.ar_station_img_list[0],0,0,width,height,3,3,width-7,height-7);
			}
			context.restore();
			can.getContext('2d').drawImage(this.pr_img, skip, 0, 80, 80, 11.5, 11.5, 57, 57);
			this.prodImages[i+"station_"+this.prodList[j]] = can;
		}

	 }
}

CanvasTrainOverlay.prototype.drawFollowImage = function(follow, pix, shift_x, shift_y, context)
{
	 context.drawImage(follow, 0, 0, 16, 16, pix.x-shift_x, pix.y-(this.currentsize/2)-shift_y, 16, 16);
}


CanvasTrainOverlay.prototype.drawTrainImage = function(train, pix, shift_x, shift_y, context, polyIndex)
{
	 if(train.getAgeOfReport() >= this.livemap.overdueMsgTime){
		 var status = 2;
	 }else{
		 var status = 1;
	 }

	 // ##############

	 if(typeof this.livemap.iconMapping != "undefined") {
		  var mappedProdClass = Math.pow(2,parseInt(this.livemap.iconMapping[train.getProductClass()]));
	 }else{
	      var mappedProdClass = train.getProductClass();
     }

	 if((typeof train.poly[polyIndex][3] == "undefined") || train.poly[polyIndex][3] == "") {
		 var direction = train.getDirection();
	 }else{
		 var direction = train.poly[polyIndex][3];
	 }
   	 var img_node = this.prodImages[direction+"_"+mappedProdClass];
	 if(typeof img_node == 'undefined')
	 {
		 return;
     }
     //context.drawImage(img_node, 0, 0, 61, 61, pix.x-(this.currentsize/2)-shift_x, pix.y-(this.currentsize/2)-shift_y, this.currentsize, this.currentsize);
	 context.drawImage(img_node, 0, 0, 80, 80, pix.x-(this.currentsize/2)-shift_x, pix.y-(this.currentsize/2)-shift_y, this.currentsize, this.currentsize);
}

// ############################################## MultiCanvasTrainOverlay #########################
// Das gleiche wie CanvasTrainOverlay nur, dass der sichbare Bereich in mehrer Canvas aufgeteilt wird um
// den Absturtz von Firefox auf großen Monitoren zu verhindern

function MultiCanvasTrainOverlay(livemap)
{
	this.init(livemap);
	this.trainLabelHeight = 22;
	this.maxTrainLabelWidth = 90;
	this.speedIntervalTimer = new Array();
}

MultiCanvasTrainOverlay.prototype = new CanvasTrainOverlay(null);

MultiCanvasTrainOverlay.prototype.onAdd = function()
{
	/*this.div_ = document.createElement('DIV');
	this.getPanes().overlayImage.appendChild(this.div_);*/
	this.canvas_ = this.div_;
	this.labelDiv_ = document.createElement('DIV');
	this.div_.appendChild(this.labelDiv_);
    this.livemap.map.map.events.register("click", this.trainClickManager.onClick.bind(this.trainClickManager));
    this.livemap.map.map.events.register("mousemove", this.trainClickManager.onMouseMove.bind(this.trainClickManager));

	this.canvasArray = [];
	var canvasArrayWidth = 3;
	var canvasArrayHeight = 3;
	for(var i = 0; i < canvasArrayWidth; i++)
	{
		this.canvasArray.push([]);
		for(var j = 0; j < canvasArrayHeight; j++)
		{
			var data = { top:0, left:0, bottom:0, right:0,
						 canvas:document.createElement('canvas') };
			data.canvas.style.position = 'absolute';
			/*data.canvas.style.backgroundColor = "black";
			data.canvas.style.opacity = '0.3';*/
			this.div_.appendChild(data.canvas);
			this.canvasArray[i].push( data )
		}
	}
	this.updateTrains();
}

MultiCanvasTrainOverlay.prototype.getCanvasDataForPosition = function(x, y, w, h)
{
	var i = parseInt(x / w);
	var j = parseInt(y / h);
	if(i < 0)
		i = 0;
	if(j < 0)
		j = 0;
	if(i >= this.canvasArray.length)
		i = this.canvasArray.length-1;
	if(j >= this.canvasArray[0].length)
		j = this.canvasArray[0].length-1;
	return this.canvasArray[i][j];
}

MultiCanvasTrainOverlay.prototype.drawTrainDebug = function(context, projection, train, shiftX, shiftY, newCoord)
{

	var latlon = this.livemap.map.Coord2LatLng(newCoord);
	var pix = projection.fromLatLngToDivPixel(latlon);
	context.fillStyle = "#00FF00";
	context.beginPath();
	context.arc(pix.x-shiftX, pix.y-shiftY, 5, 0,Math.PI*2,true);
	context.closePath();
	context.fill();

	var latlon2 = this.livemap.map.Coord2LatLng(new CCoord( { lat:parseInt(train.y)+parseInt(train.vec.y), lon:parseInt(train.x)+parseInt(train.vec.x) } ));
	var pix2 = projection.fromLatLngToDivPixel(latlon2);
	context.strokeStyle = "#ff0000";
	context.beginPath();
	context.moveTo(pix.x-shiftX, pix.y-shiftY);
	context.lineTo(pix2.x-shiftX, pix2.y-shiftY);
	context.stroke();

	for(var i = 0; i < train.poly.length; i++)
	{
		var poly=train.poly[i];
		var latlon = this.livemap.map.Coord2LatLng(new CCoord( { lat:poly.y, lon:poly.x } ));
		var pix = projection.fromLatLngToDivPixel(latlon);
		context.fillStyle = "#FF0000";
		context.beginPath();
		context.arc(pix.x-shiftX, pix.y-shiftY, 3, 0,Math.PI*2,true);
		context.closePath();
		context.fill();
	}
}
MultiCanvasTrainOverlay.prototype.getCanvasDataForPosition = function(x, y, w, h)
{
	var i = parseInt(x / w);
	var j = parseInt(y / h);
	if(i < 0)
		i = 0;
	if(j < 0)
		j = 0;
	if(i >= this.canvasArray.length)
		i = this.canvasArray.length-1;
	if(j >= this.canvasArray[0].length)
		j = this.canvasArray[0].length-1;
	try
	{
	return this.canvasArray[i][j];
	}
	catch(e)
		{
		return null;
		}
}
MultiCanvasTrainOverlay.prototype.draw = function()
{
	 if(typeof this.div_ == "undefined"){
		return;
	 }
	 // Kooridinaten zu Pixel
	 //var projection = this.getProjection();
	 var bounds = this.map.getBoundingBox();
	 /*transform(this.projection, this.map.getProjectionObject()),
     pixel = this.roundPixels(this.getViewPortPxFromLonLat(lonlat));*/

	 var ne_coord = this.map.CCoord2LonLat(bounds.ne);
	 var sw_coord = this.map.CCoord2LonLat(bounds.sw);

	 var ne_pix = this.trainOverlay.getViewPortPxFromLonLat(ne_coord);
	 var sw_pix = this.trainOverlay.getViewPortPxFromLonLat(sw_coord);




	 //Aktuelle groesse der Zuggrafiken
	 this.currentsize = this.livemap.imageSizePerZoomLevel[this.livemap.map.map.getZoom()];
	 if(typeof this.currentsize == 'undefined')
		this.currentsize=57;



	 // Hoehe und brete der Canvas
	 var w = (ne_pix.x - sw_pix.x) / this.canvasArray.length;
	 var h = (sw_pix.y - ne_pix.y) / this.canvasArray[0].length;


	 // Aktuelle verschiebung des Layers
	 this.shiftX = parseInt(sw_pix.x);
	 this.shiftY = parseInt(ne_pix.y);
	 /*this.shiftX = parseInt(deltaOffsetX);
	 this.shiftY = parseInt(deltaOffsetY);*/



	 var time = new Date().getTime();
	 // Alle Canvas anpassen
	 var canvascounter = 0;
	 for(var i = 0; i < this.canvasArray.length; i++)
	 {
		for(var j = 0; j < this.canvasArray[0].length; j++)
		{
			canvascounter++;
			var data = this.canvasArray[i][j];
			data.left = this.shiftX + (i*w);
			data.top = this.shiftY+ (j*h);
			data.bottom = data.top+h;
			data.right = data.left+w;
			data.canvas.id = "traincanvas_" + i + "_" + j;
			data.canvas.width = w+this.maxTrainLabelWidth;
			data.canvas.height = h+this.trainLabelHeight+this.currentsize;
			data.canvas.style.top = data.top+"px";
			data.canvas.style.left = data.left+"px";
		}
	 }


	 // Zuege zeichnen
	 var debug = false;
	 var drawingOrder =0;
	 for (var key in this.livemap.trainContainer)
	 {
		var train = this.livemap.trainContainer[key];
		var newMode = true;
		var current = new Date();
		current = new Date(current.getTime() + this.livemap.getServerClientTimeDelta());

		/* pick right timestamp for interpolating train position */
		var polyIndex = this.getPolyIndex(train.poly,current);

		/* no valid train position could be found in timeframe -> do not display then*/
		if((typeof train.poly[polyIndex] == "undefined") || (typeof train.poly[polyIndex+1] == "undefined")) {
		continue;
		}
		/* calculate delta between NOW and determined position */
		var delta = current.getTime() - train.poly[polyIndex][6].getTime();

		/* calculate delta in the current interval*/
		var deltaInterval = train.poly[polyIndex+1][6].getTime() - train.poly[polyIndex][6].getTime();

		//var interpolationVal = Math.abs(delta) / deltaInterval;
		var interpolationVal = delta / deltaInterval;

		/* interpolate x and y */
		var x = parseInt( parseInt(train.poly[polyIndex][0])+ parseInt(interpolationVal*(train.poly[polyIndex+1][0]-train.poly[polyIndex][0])) );
		var y = parseInt( parseInt(train.poly[polyIndex][1])+ parseInt(interpolationVal*(train.poly[polyIndex+1][1]-train.poly[polyIndex][1])) );

		/* calculate passproc*/
		var passproc = parseInt( parseInt(train.poly[polyIndex][8])+ parseInt(interpolationVal*(train.poly[polyIndex+1][8]-train.poly[polyIndex][0])) );

		/* set current calculated position (for mouseover/click events) */
		this.livemap.trainContainer[key].setCalcX(x);
		this.livemap.trainContainer[key].setCalcY(y);

		var newCoord = new CCoord( { lat:y, lon:x } );
		var latlon = this.livemap.map.CCoord2LonLat(newCoord);

		if((typeof this.livemap.trainContainer[key] != 'undefined') && (this.livemap.trainContainer[key].addInfo) && (this.livemap.trainContainer[key].infobox != null)){
			this.livemap.map.updateInfoBoxPosition(this.livemap.trainContainer[key].infobox,newCoord);
		}
		var pix =  this.overlay.getViewPortPxFromLonLat(latlon);
		var canvas_data = this.getCanvasDataForPosition(pix.x-sw_pix.x -(this.maxTrainLabelWidth/2), pix.y-ne_pix.y -(this.currentsize/2), w, h);
		if(canvas_data == null)
			continue;
		var context = canvas_data.canvas.getContext('2d');
        /* Zug nur zeichnen, wenn fahrt noch unterwegs!*/
        if(this.livemap.trainContainer[key].poly.length > 0){
          this.drawTrainImage(train, pix, canvas_data.left, canvas_data.top, context);
          if((this.livemap.trackerid != null) && (this.livemap.trackerid == key)){
               var imgFollow = document.createElement("img");
               imgFollow.src = Hafas.Config.gImagePath + 'icons/ico_follow.png';
               this.drawFollowImage(imgFollow, pix, canvas_data.left, canvas_data.top, context);
          }
          if(this.livemap.shownames)
               this.drawTrainLabel(train, pix, canvas_data.left, canvas_data.top, context);
        }
		//this.drawTrainDebug(context, projection, train, canvas_data.left, canvas_data.top, newCoord);
		drawingOrder++;
	 }
}


// ############################################# ExCanvasTrainOverlay ###################
// Fuer IE 7 - 8

function ExCanvasTrainOverlay(livemap)
{
	//this.setOptions( { map:livemap.map.map } );
	this.livemap = livemap;
	this.map = livemap.map;
	this.trainOverlay = new TrainOverlay.Layer("trainOverlay");
	this.map.map.addLayers([this.trainOverlay]);

	this.trainClickManager = new TrainClickManager(this.livemap);
	this.img_node = document.createElement('img');
	this.img_node.src =	this.PRODUCT_SPRITE_IMG;
	this.onAdd();
}

ExCanvasTrainOverlay.prototype = new AbstractTrainOverlay();

ExCanvasTrainOverlay.prototype.drawTrainImage = function(train, pix, shift_x, shift_y, context,polyIndex)
{
	/*var img_node = document.createElement('img');
	img_node.src = this.img_node;*/
	var skip = ( Math.log(train.getProductClass()) / Math.log(2) )*(80);
	if(skip < 0)
	   skip = 0;
	this.drawTrainDir(train, pix, shift_x, shift_y, context,polyIndex);
    context.drawImage(this.img_node, skip, 0, 80, 80, pix.x-(this.currentsize/2/1.4)-shift_x, pix.y-(this.currentsize/2/1.4)-shift_y, this.currentsize/1.4, this.currentsize/1.4);

}

ExCanvasTrainOverlay.prototype.drawTrainDir = function(train, pix, shift_x, shift_y, context,polyIndex,offsetX,offsetY)
{
	 /*if(train.poly[polyIndex][3] == "") {
		 return;
	 }*/

	 var img_node = document.createElement('img');
	 if(train.passprocCalc == 0){
		 img_node.src = this.livemap.getDirectionImage(train,false);
	 }else{
		 img_node.src = this.livemap.getDirectionImage(train,true);
	 }
     context.drawImage(img_node, pix.x-(this.currentsize/2)-shift_x, pix.y-(this.currentsize/2)-shift_y,this.currentsize,this.currentsize);
}

ExCanvasTrainOverlay.prototype.drawTrainLabel = function(train, pix, shift_x, shift_y, context,offsetX,offsetY)
{
	//Farben berechnen
	var delayBgColor='FFFFCC';
	if(typeof train.delay != 'undefined' && train.delay != "") {

	  if(train.delay >= 0 && train.delay <= 2) {
		  var delayForColor='50AA50';

		  var delaylabel = '+' + train.delay;
	  }else{
		  var delayForColor='FF0000';
		  if(train.delay == 0)
			var delaylabel = " "+train.delay+" ";
		  else
			var delaylabel = '+' + train.delay;
	  }
	}else{
	  var delaylabel = '-';
	  var delayForColor = '000000';
	}

	//Groessen berechenen
	if(typeof this.FONT_STYLE != 'undefined')
		context.font = this.FONT_STYLE;
	var rt_width = context.measureText(delaylabel).width +2;

	/*if(train.getCodeDeMission() != null) {
	   var trainLabelContent = train.getName();
	}else{*/
	   var trainLabelContent = train.name;
	//}

	var text_width = context.measureText(trainLabelContent).width;
	var top = parseInt(pix.y - shift_y + this.currentsize/2);
	//var w = parseInt(text_width + 6 + rt_width);
	var w = parseInt(text_width + 6);
	var left = parseInt(pix.x - shift_x - ( w )/2);
	var h = 16;

	var hashTrainId = train.getId().replace(new RegExp(/\//g),"x");
	if(document.getElementById('labelDiv_' + hashTrainId) == null) {
		var labelDiv = document.createElement("div");
		labelDiv.id = 'labelDiv_' + hashTrainId;
		labelDiv.className = 'trainDivLabel'
		labelDiv.style.position = 'absolute';
		labelDiv.style.top = top + "px";
		labelDiv.style.left = left + "px";
		labelDiv.innerHTML = trainLabelContent;
		this.trainOverlay.div.appendChild(labelDiv);
	}else{
		document.getElementById('labelDiv_' + hashTrainId).style.top = parseInt(top - offsetY) + "px";
		document.getElementById('labelDiv_' + hashTrainId).style.left = parseInt(left - offsetX) + "px";
	}
}