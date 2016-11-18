/* Hafas Library              */
/* History:                   */
/* 30/04/12 Initially created ($, Ajax, jsonp)*/

/* Check for document.querySelectorAll support and */
//if((typeof document.querySelectorAll != 'object') && (typeof document.querySelectorAll != 'function') && (typeof jQuery == 'undefined')) {




if((typeof document.querySelectorAll != 'object') && (typeof document.querySelectorAll != 'function')) {
   /* Load sizzle for extended DOM access */
    var script = document.createElement("script");
    script.setAttribute("src", compatScriptPath + "sizzle/sizzle_polyfill.js");
    script.setAttribute("type", "text/javascript");
    document.getElementsByTagName("head")[0].appendChild(script);
}

/***************************************************************************************/
/* Hafas                                                                             */
/* @selector (string) url of your AJAX-Request                                         */
/* Examples:                                                                           */
/* Hafas("#HFSContent") -> returns DOM Element with the ID "HFSContent"              */
/* Hafas(".blue") -> returns all DOM Elements which have a CSS Class "blue" assigned */
/***************************************************************************************/
var Hafas = Hafas || function(selector){
  if(typeof document.querySelectorAll != "undefined"){
      var result = document.querySelectorAll(selector);
      if (result.length == 1) {
          return result[0];
      }else if(result.length == 0){
          return null;
      }else{
          return result;
      }
   }
};
Hafas.bind = function(func,scope) {
  var _function = func;
  return function() {
    return _function.apply(scope, arguments);
  }
}
var _hs = _hs || Hafas;

/****************************************/
/* Rescued class Methods from Prototype */
/* 'Class' from prototype               */
/****************************************/
var Class = {
  create: function() {
    return function() {
      this.initialize.apply(this, arguments);
    }
  }
};

/* 'Object.Extend' extracted from prototype */
Object.extend = function(destination, source) {
  for (var property in source) {
    destination[property] = source[property];
  }
  return destination;
}

Object.extend(Object, {
  inspect: function(object) {
    try {
      if (object === undefined) return 'undefined';
      if (object === null) return 'null';
      return object.inspect ? object.inspect() : object.toString();
    } catch (e) {
      if (e instanceof RangeError) return '...';
      throw e;
    }
  },

  keys: function(object) {
    var keys = [];
    for (var property in object)
      keys.push(property);
    return keys;
  },

  values: function(object) {
    var values = [];
    for (var property in object)
      values.push(object[property]);
    return values;
  },

  clone: function(object) {
    return Object.extend({}, object);
  }
});

var Hash = function(obj) {
  Object.extend(this, obj || {});
};


/* Helper functions*/
/* hasClassName: checks if DOM element has certain CSS Class*/
Element.prototype.hasClassName = function(queryClass){
   if(this.hasAttribute("class")) {
      if(this.getAttribute("class")) {
          var classes = this.getAttribute("class");
          classes = classes.split(" ");
          for(var k=0; k < classes.length; k++) {
             if(classes[k] == queryClass) {
                return true;
             }
          }
      }else{
        return false;
      }
   }
   return false;
}

/* addClassName: adds a CSS Class to a DOM Element*/
Element.prototype.addClassName = function(addClass){
   if(!this.hasClassName(addClass)) {
      this.setAttribute("class",this.getAttribute("class") + " " + addClass);
   }
}
/* removeClassName: removes a CSS Class from a DOM Element*/
Element.prototype.removeClassName = function(addClass){
   if(this.hasClassName(addClass)) {
      this.setAttribute("class",this.getAttribute("class").replace(addClass,""));
   }
}

/* replace: replaces the innerHTML of a DOM node and executes all JavaScript within the new content*/
Element.prototype.replace = function(html){
    element = this;
    html = typeof html == 'undefined' ? '' : html.toString();
    if (element.outerHTML) {
      //element.outerHTML = html.stripScripts();
       element.outerHTML = html;
    } else {
      var range = element.ownerDocument.createRange();
      range.selectNodeContents(element);
      element.parentNode.replaceChild(
        range.createContextualFragment(html.stripScripts()), element);
    }
    setTimeout(function() {html.evalScripts()}, 10);
    return element;
}

Hafas.fillParam = function(val,defaultVal){
    if(typeof val == "undefined" || val == null) {
        return defaultVal;
    }else{
        if(val == "true" || val == "false") {
            return eval(val);
        }else{
            return val;
        }
    }
}

/* Extracts all javascript bits of the current string */
String.prototype.extractScripts = function() {
    var scriptRegExp = "(?:<script.*?>)((\n|\r|.)*?)(?:<\/script>)";
    var matchAll = new RegExp(scriptRegExp, 'img');
    //var matchOne = new RegExp(scriptRegExp, 'im');
    var result = this.match(matchAll);
    return result;
}

/* Executes all javascript content within the current string Object */
String.prototype.evalScripts  = function(){
    var scriptTags = this.extractScripts();
    if(scriptTags != null) {
       for(var k=0; k < scriptTags.length; k++) {
           var div = document.createElement("div");
           div.innerHTML = scriptTags[k];
           var child = div.firstChild;
           /*scriptTags[k] = scriptTags[k].replace(/<\/?script.*>/, '');
           scriptTags[k] = scriptTags[k].replace(/<\/?script.*>/, '');
           eval(scriptTags[k].replace(/<\/?script.*>/, ''));*/
           if(child.innerHTML.length > 0) {
              eval(child.innerHTML);
           }else{
              /* externes Script */
              Hafas.loadScript(child.src);
           }
           div = null;
           delete div;
       }
    }
}



Hafas.initHafasModules = function(){
    Hafas.initHafasSuggest();
    var hafasModules = Hafas("*[data-module]");
    if(hafasModules != null) {
        /* identify hafas modules and build instances */
        for(var m=0; m < hafasModules.length;m++) {
            var module = hafasModules[m].getAttribute("data-module");
            // Hack suggest noch separat intialisieren -> entfernen !!!!
            if(module != "suggest") {
                var params = {
                    events: eval(Hafas.fillParam(hafasModules[m].getAttribute("data-" + module + "-events"),[])),
                    container: hafasModules[m]
                };
                new Hafas.Modules[module](params);
            }
        }
    }
}

/* Hafas Configuration Settings */
Hafas.LOG_LEVEL = 1;
Hafas.log = function(){
    if((typeof console != "undefined") && (typeof console.log == "function") && (Hafas.LOG_LEVEL == 1)) {
        console.log(arguments);
    }
}

Hafas.Data = new Array();
Hafas.addData = function(data){
   this.Data.push(data);
   return this.Data.length-1;
}
Hafas.getData = function(index){
   return this.Data[index];
}

Hafas.loadScript = function(scriptURL){
   var head = document.getElementsByTagName("head")[0];
   var scriptElements = Hafas("script");
}

Hafas.registerEvents = function(events,module){
    if(typeof events != "undefined") {
        for(var k=0; k < events.length; k++) {
             (function(current){
               Hafas.ps.sub(events[current].type,function(m){
                  module.events[current].callback(m,module);
              });
             }(k));
        }
    }
};


/* Eventhandling */
Hafas.observers = new Array();
Hafas.triggerEvent = function(element,name,observer){
    if (element.addEventListener) {
        this.observers.push([element, name, observer]);
        element.addEventListener(name, observer );
    } else if (element.attachEvent) {
        this.observers.push([element, name, observer]);
        element.attachEvent("on" + name, observer);
    }
}
// cst: kleine ?nderung des Namens, ok?
Hafas.addEvent = Hafas.triggerEvent;
Hafas.stopEvent = function(event){
    if (event.preventDefault) {
        event.preventDefault();
        event.stopPropagation();
    }else{
        event.returnValue = false;
        event.cancelBubble = true;
    }
    return false;
}
Hafas.bindAsEventListener = function(object,func,context) {
      var __method = func;
      args = new Array();
      for(var m=0; m < arguments.length;m++) {
          args.push(arguments[m]);
      }
      args.shift();
      args.shift();
      var newContext = [].concat(args);
      return function(event) {
          return __method.apply(object, [( event || window.event)].concat(newContext));
      };
}

Hafas.getPosX = function(a){
      var b=0;
      if(a.offsetParent){
         while(a.offsetParent){
           b+=a.offsetLeft;
           a=a.offsetParent;
         }
      }else{
         if(a.x){
            b+=a.x;
         }
      }
      return b;
}
Hafas.getPosY = function(a){
      var b=0;
      if(a.offsetParent){
          while(a.offsetParent){
              b+=a.offsetTop;
              a=a.offsetParent;
          }
      }
      else{
          if(a.y){
              b+=a.y
          }
      }
      //b+=this.inp.clientHeight;
      return b
}


/**********************************************************/
/* Hafas.Ajax                                             */
/* @url (string) url of your AJAX-Request                 */
/* @params (object) optional parameters for your request  */
/* @postParams (string) optional, for POST requests       */
/**********************************************************/
Hafas.Ajax = function (url, params, postParams) {
    var xmlHttp = null;
    try {
        // Mozilla, Opera, Safari sowie Internet Explorer (ab v7)
        xmlHttp = new XMLHttpRequest();
        url = url.replace("http://localhost", "");
    } catch (e) {
        try {
            // MS Internet Explorer (ab v6)
            xmlHttp = new ActiveXObject("Microsoft.XMLHTTP");
        } catch (e) {
            try {
                // MS Internet Explorer (ab v5)
                xmlHttp = new ActiveXObject("Msxml2.XMLHTTP");
            } catch (e) {
                xmlHttp = null;
            }
        }
    }
    if (xmlHttp) {
        var method = 'GET';
        var toSend = null;
        if (typeof params.method != 'undefined') {
            if (params.method.toLowerCase() == 'post') {
                method = 'POST';
            }
            else {
                method = 'GET';
            }
        }
        if (typeof postParams == 'string') {
            toSend = postParams;
        }

        xmlHttp.open(method, url, true);
        if (method == 'POST') {
            if (typeof params.requestXML != 'undefined') {
                xmlHttp.setRequestHeader("Content-Type", "text/xml");
            }
            else {
                xmlHttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            }
        }
        xmlHttp.onreadystatechange = function () {
            if (xmlHttp.readyState == 4) {
                if (xmlHttp.status == 200) {
                    if (typeof params.onSuccess == "function") {
                        params.onSuccess(xmlHttp);
                    }
                } else {
                    if (typeof params.onFailure == "function") {
                        params.onFailure(xmlHttp);
                    }
                }
            }
        };
        xmlHttp.send(toSend);

    }
}

/**********************************************************/
/* Hafas.jsonp                                            */
/* @url (string) url of your JSONP-Request                */
/* @callback (function) callback function will be fired   */
/*                      when the script has been loaded   */
/**********************************************************/
Hafas.jsonp = function(url,callback){
   var script = document.createElement("script");
   script.src = url;
   script.type = "text/javascript";
   script.onload = function(){
       if(typeof callback == "function") {
           callback();
       }
   }
   script.onreadystatechange = function() {
      if ((this.readyState == 'loaded') || (this.readyState == 'complete')) {
          if(typeof callback == "function") {
              callback();
          }
      }
   }
}


/**********************************************************/
/* Hafas.Suggest Rev.3                                    */
/**********************************************************/
Hafas.Suggest = function(a){
  this.instance = parseInt(Hafas.Suggest.Instances.length);
  Hafas.Suggest.Instances.push(this);
  this.error = function(msg){
    if(typeof console != "undefined") {
        console.warn(msg);
    }
  };
  this.renderer = {
    "default": "<li><a>{value}</a></li>",
    "showicons": "<li class='lc_suggesttype_{type}'><span class='icon'></span><a>{value}</a></li>"
  };
  this.keyCode = { ALT: 18, BACKSPACE: 8, CAPS_LOCK: 20, COMMA: 188, COMMAND: 91, COMMAND_LEFT: 91, COMMAND_RIGHT: 93,
                  CONTROL: 17, DELETE: 46, DOWN: 40, END: 35, ENTER: 13, ESCAPE: 27, HOME: 36, INSERT: 45, LEFT: 37,
                  MENU: 93, NUMPAD_ADD: 107, NUMPAD_DECIMAL: 110, NUMPAD_DIVIDE: 111, NUMPAD_ENTER: 108, NUMPAD_MULTIPLY: 106,
                  NUMPAD_SUBTRACT: 109, PAGE_DOWN: 34, PAGE_UP: 33, PERIOD: 190, RIGHT: 39, SHIFT: 16, SPACE: 32, TAB: 9,
                  UP: 38, WINDOWS: 91};
  /* initialize Suggest */
  this.flags = a.flags;
  this.init = function(options){
  this.inp = (typeof options.loc == "string")?document.getElementById(options.loc):options.loc;
  if(typeof options.appendTo != "undefined") {
      this.appendElement = (typeof options.appendTo == "string")?document.getElementById(options.appendTo):options.appendTo;
  }else{
      this.appendElement = document.body;
  }
  this.inp.setAttribute("autocomplete","off");
  this.suggestId = this.inp.id;
  /*this.inp.required = false;*/
  this.changeSubmitForm();
  this.currentSelIndex = -1;
  this.options = options;
  /* check if DOM Elem is input field or textarea */
  if(!(/input|textarea/.test(this.inp.tagName.toLowerCase()))){
      this.error("Hafas.Suggest: DOM Element is no inputfield or textarea");
      return;
  }
  /* bind onkeyup functionality */
  var exist_onkeyup = (this.inp.onkeyup == "function")?this.inp.onkeyup:null;
  this.inp.onkeydown = Hafas.bind(this.keyDownFunc,this);
    if(typeof this.inp.onfocus == "function"){
       this.onfocusfunc = this.inp.onfocus.bind(this.inp);
    }
    this.inp.onfocus = function(){
        // Cookie Matches
        if((this.inp.value.length == 0) && (this.flags.useTopFavorites) && (typeof Hafas.Config.HistoryList!= "undefined")) {
            this.renderData(this.filterList(Hafas.Config.HistoryList));
        }
        this.blurred = false;
        if(typeof this.onfocusfunc == "function") {
            this.onfocusfunc();
        }
    }.bind(this);
  this.inp.onblur = Hafas.bind(this.blurInput,this);
    if(typeof options.renderStyles != "undefined") {
      this.addRenderStyles(options.renderStyles);
    }
    if(typeof options.renderRules != "undefined") {
      this.addRenderRules(options.renderRules);
    }
  }
  this.addRenderRules = function(rules){
      this.renderRules = rules;
  }
  this.blurInput = function(){
    this.clearList();
  }
  this.addRenderStyles = function(styles){
     for(var j=0; j < styles.length;j++) {
         for(var k in styles[j]) {
             this.renderer[k] = styles[j][k];
         }
     }
  };
  this.blurInput = function(){ if(!this.furtherMatchesDisplayed){ this.clearList(); this.blurred = true; } }
  this.changeSubmitForm=function(){
         f=this.inp;
         while(f!=null){
             if(f.nodeName.toLowerCase()=="form"){
                 this.form = f;
                 this.oldSubmitFunc = this.form.onsubmit;
                 this.form.onsubmit = Hafas.bind(this.submitFunc,this);
                 return;
             }
             f=f.parentNode
        }
  }
  this.submitFunc = function(e,passedvar){
      if(_hs("#hfsSuggestlist")){
         return false;
      }else{
         if(typeof this.oldSubmitFunc == "function") {
             this.oldSubmitFunc();
         }
         return true;
      }
      return false;

  }
  this.moveSelection = function(key){
     if(key == this.keyCode.DOWN) {
        if(this.currentSelIndex < this.listElem.childNodes.length-1) {
            this.currentSelIndex++;
        }else{
            this.currentSelIndex = -1;
        }
     }else if(key == this.keyCode.UP){
         if(this.currentSelIndex >= 0) {
             this.currentSelIndex--;
         }else{
             this.currentSelIndex = this.listElem.childNodes.length-1;
         }
     }
     /* Umkopieren muss auf lange Sicht gestrichen werden, Objekte m?ssen vom Server schon mit den "richtigen" Attributen geliefert werden*/
     if(this.currentSelIndex != -1) {
         var hfsLocObj = this.data[this.currentSelIndex];
         Hafas.ps.pub("/suggest/hoveritem", [hfsLocObj]);  // Main event
         Hafas.ps.pub("/suggest/hoveritem/" + this.suggestId, [hfsLocObj]);
     }
     this.selectItem(this.currentSelIndex,false);
  }
  this.selectItem = function(index,selection){
     // reset classes
     for(var j=0; j < this.listElem.childNodes.length; j++) {
            this.listElem.childNodes[j].removeClassName("lc_active");
     }
     if(index != -1) {
        this.inp.value = this.data[index].value;
		this.inp.removeClassName("error");
        this.setTripleId(this.data[index]);
        this.listElem.childNodes[index].addClassName("lc_active");

        var hfsLocObj = {
             id: this.data[index].id,
             type: parseInt(this.data[index].type),
             extId: this.data[index].extId,
             name: this.data[index].value,
             x: this.data[index].xcoord,
             y: this.data[index].ycoord
         };
         if((typeof selection == "undefined") || (selection == true)) {
             Hafas.ps.pub("/suggest/selectitem", [hfsLocObj]);  // Main event
             Hafas.ps.pub("/suggest/selectitem/" + this.suggestId, [hfsLocObj]);
         }

        return this.data[index];
     }else{
        this.inp.value = this.originalInput;
     }
  }
  this.setTripleId = function(data){
      // Hidden Field existiert bereits
      if(document.getElementById(this.inp.id+'ID') != null) {
         var g = document.getElementById(this.inp.id+'ID');
         g.value = data.id;
      }else{
         if(this.inp.name.charAt(this.inp.length-1)=="G"){
             var f=this.inp.name.replace(/G$/,"ID");
         }else{
             //var f="REQ0JourneyStops"+this.params.type+"ID"
         }
      }
  }
  this.filterList = function(data){
      var type = this.options.type;
      var filteredList = new Array();
      for(var m=0; m < data.length;m++) {
          if((parseInt(data[m].type) & type) == type) {
              filteredList.push(data[m]);
          }
      }
      return filteredList;
  }
  this.keyDownFunc = function(event){
    event = event || window.event;
    var keyCode = event.keyCode;

    window.setTimeout(Hafas.bind(function(){
         var c = this.keyCode;
         /* Buchstabe oder anderes welches Request ausl?st */
         if((keyCode != c.ESCAPE) && (keyCode != c.ENTER) && (keyCode != c.TAB) && ((keyCode != c.UP) && (keyCode != c.DOWN) || (!_hs("#hfsSuggestlist")) ) && (this.inp.value.length >= this.options.minChar)) {
            if(this.keyUpTimeout){ window.clearTimeout(this.keyUpTimeout); }
            this.keyUpTimeout = window.setTimeout(Hafas.bind(this.getData,this),(this.options.delay || 500));
         }else{
            switch(keyCode) {
                case c.DELETE:
                case c.BACKSPACE: if((this.inp.value.length < this.options.minChar) && ((this.flags.useTopFavorites == "undefined") || (!this.flags.useTopFavorites) || (typeof Hafas.Config.HistoryList == "undefined"))){
                                     this.clearList();
                                  }else{
                                     this.renderData(this.filterList(Hafas.Config.HistoryList));
                                  }
                                  break;
                case c.UP:
                case c.DOWN: if(this.listElem){
                                this.moveSelection(keyCode);
                             }
                             break;
                case c.ENTER: if(this.data == null){
                                 return true;
                              }else{
                                 var data = this.selectItem(this.currentSelIndex);
                              }
                case c.ESCAPE:
                case c.TAB:   this.clearList();
                              break;
            }
         }
    },this),1);
  }
  this.getData = function(){
      if(this.inp.value.length == 0) {
          return;
      }
      var reqType = this.options.requestType || "js";
      if(reqType == "js") {
          if(document.getElementById("hfsSuggestRequest")!=null){
                  document.getElementsByTagName("head")[0].removeChild(document.getElementById("hfsSuggestRequest"))
          }
          var context = this;
          var e=document.createElement("script");
          e.type="text/javascript";
          e.src=this.options.requestURL + this.inp.value + escape("?") + "&suggestCB=Hafas.Suggest.Instances["+this.instance+"].getSuggestions&";
          e.id="hfsSuggestRequest";
          /* IE browser 7,8,9*/
          /*if(typeof e.readyState != "undefined") {
            e.onreadystatechange = function() {
              if ((this.readyState == 'complete') || (this.readyState == 'loaded')){
                  context.renderData();
              }
            }
          }else{
            /* Webkit, Firefox, Opera */
          /*  e.onload = Hafas.bind(context.renderData,context);
          }*/
          document.getElementsByTagName("head")[0].appendChild(e);
      }
  }
  this.createLabel = function(name){
     var label = '<li class="lc_hfsSuggestLabel">'+name+'</li>';
     return label;
  };
  this.clearList = function(){
     var self = this;
     window.setTimeout(function(){
         if(self.listElem) {
            self.listElem.parentNode.removeChild(self.listElem);
            self.listElem = null;
         }
         self.data = null;
     },10);
  }
  this.fillPlaceHolder = (function(suggest){
     var replacer = function(context)
     {
         return function(s, name){
             var cRenderRule = null;
             for(var i = 0; i < suggest.renderRules.length;i++) {
                 if(typeof suggest.renderRules[i][name] != "undefined") {
                    cRenderRule = suggest.renderRules[i][name].renderStyle;
                 }
             }
             var currentValue = context[name];
             if((suggest.flags.useHighlighting) && (name == "value")){
                currentValue = currentValue.replace(new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + suggest.inp.value.replace(/([\^\$\(\)\[\]\{\}\*\.\+\?\|\\])/gi, "\\$1") + ")(?![^<>]*>)(?![^&;]+;)", "gi"), "<b>$1</b>");
             }
             if(cRenderRule == null) {
                 return currentValue;
             }else if(typeof cRenderRule == "function"){
                return cRenderRule(currentValue);
             }
         };
     };

     return function(input, context)
     {
         return input.replace(/\{(\w+)\}/g, replacer(context));
     };
  })(this);
  this.renderItem = function(itemData){
      var customRenderer = null;
      if(this.renderRules != null) {
          for(var k=0; k < this.renderRules.length;k++) {
              for(var m in this.renderRules[k]){
                  if(typeof this.renderRules[k][m].id == "string"){
                        if((typeof itemData[m] != "undefined") && (this.renderRules[k][m].id == itemData[m][0].code)) {
                            customRenderer = this.renderer[this.renderRules[k][m].renderStyle];
                            break;
                        }
                  }else{

                      if(typeof this.renderRules[k][m].id != "undefined") {
                          for(var p=0; p < this.renderRules[k][m].id.length;p++) {
                              if((typeof itemData[m] != "undefined") && (this.renderRules[k][m].id[p] == itemData[m][0].code)) {
                                 if((typeof this.renderRules[k][m].type == "undefined") || (itemData.type == this.renderRules[k][m].type)) {
                                    customRenderer = this.renderer[this.renderRules[k][m].renderStyle];
                                    break;
                                 }
                              }
                          }
                      }else if((parseInt(this.renderRules[k][m].type) & parseInt(itemData.type)) == parseInt(itemData.type)){
                          customRenderer = this.renderer.type[itemData.type];
                          break;
                      }
                  }
              }
          }
      }
      if(customRenderer != null) {
          var cRender = customRenderer;
      }else{
          if(typeof this.renderer.type[itemData.type] != "undefined") {
                    this.renderer.type[itemData.type]
          }
      var cRender = this.options.renderer || this.renderer["showicons"];
      }
      return this.fillPlaceHolder(cRender, itemData, this);
  };
  this.itemMouseOvers = function(list){
      var listElems = list.getElementsByTagName("li");
      var self = this;

      for(var m=0; m < listElems.length; m++) {
          listElems[m].onmousedown = function(index,context){
             return function(){
                context.currentSelIndex = index;
                context.selectItem(index);
             }
          }(m,self);
          listElems[m].onmousemove = function(index,context){
              return function(){
                 if(context.currentSelIndex != -1) {
                     listElems[context.currentSelIndex].removeClassName("lc_active");
                 }
                 listElems[index].addClassName("lc_active");
                 context.currentSelIndex = index;
              }
          }(m,self);
          listElems[m].onmouseout = function(index,context){
              return function(){
                 listElems[index].removeClassName("lc_active");
              }
          }(m,self);
      }
  };
  this.getSuggestions = function(data){
      var suggestions = data.suggestions;
      this.renderData(suggestions);
  }
  this.renderData = function(data){
      this.inp.focus();
      this.data = data;
      this.originalInput = this.inp.value;
      this.currentSelIndex = -1;

      if(!this.listElem){
         this.listElem = document.createElement("ul");
         this.listElem.id = "hfsSuggestlist";
         this.listElem.className = "sc_hfsSuggestList lc_hfsSuggestList";
         this.listElem.style.zIndex = "10000";
         this.appendElement.appendChild(this.listElem);
      }
      var listItems = "";
      for(var j=0; j < this.data.length; j++){
          var elem = this.renderItem(this.data[j]);
          listItems+=elem;
      }
      this.listElem.innerHTML = listItems;
      this.itemMouseOvers(this.listElem);
      this.listElem.style.top = (Hafas.getPosY(this.inp) - Hafas.getPosY(this.appendElement) + this.inp.offsetHeight) + "px";
      this.listElem.style.left = (Hafas.getPosX(this.inp) - Hafas.getPosX(this.appendElement)) + "px";
      this.listElem.style.minWidth = this.inp.clientWidth + "px";
  }
  this.init(a);
  Hafas.Components.push({
      type: "suggest",
      id: "",
      reference: this
  });
}
Hafas.Suggest.Instances = new Array;


/***************************************************************************************/
/* Cookies                                                                             */
/***************************************************************************************/

/***************************************************************************************/
/* Sets a Cookie with the given name and value.                                        */
/*                                                                                     */
/* name       Name of the cookie                                                       */
/* value      Value of the cookie                                                      */
/* [expires]  Expiration date of the cookie (default: end of current session)          */
/* [path]     Path where the cookie is valid (default: path of calling document)       */
/* [domain]   Domain where the cookie is valid                                         */
/*              (default: domain of calling document)                                  */
/* [secure]   Boolean value indicating if the cookie transmission requires a           */
/*              secure transmission                                                    */
/***************************************************************************************/
Hafas.setCookie = function(name, value, expires, path, domain, secure){

	if(typeof domain == 'undefined'){
		var domain = location.hostname;
	}

	var cookieString = name + "=" + escape(value) +
        ((expires) ? "; expires=" + expires.toGMTString() : "") +
        ((path) ? "; path=" + path : "") +
        ((domain) ? "; domain=" + domain : "") +
        ((secure) ? "; secure" : "");

    //document.cookie= name + "=" + escape(value) +
    document.cookie= name + "=" + value +
        ((expires) ? "; expires=" + expires.toGMTString() : "") +
        ((path) ? "; path=" + path : "") +
        ((domain) ? "; domain=" + domain : "") +
        ((secure) ? "; secure" : "");
}

/***************************************************************************************/
/* Gets the value of the specified cookie.                                             */
/*                                                                                     */
/* name  Name of the desired cookie.                                                   */
/*                                                                                     */
/* Returns a string containing value of specified cookie,                              */
/*   or null if cookie does not exist.                                                 */
/***************************************************************************************/
Hafas.getCookie = function(name){
    var dc = document.cookie;
    var prefix = name + "=";
    var begin = dc.indexOf("; " + prefix);
    if (begin == -1)
    {
        begin = dc.indexOf(prefix);
        if (begin != 0) return null;
    }
    else
    {
        begin += 2;
    }
    var end = document.cookie.indexOf(";", begin);
    if (end == -1)
    {
        end = dc.length;
    }
    return unescape(dc.substring(begin + prefix.length, end));
}

/***************************************************************************************/
/* Deletes the specified cookie.                                                       */
/*                                                                                     */
/* name      name of the cookie                                                        */
/* [path]    path of the cookie (must be same as path used to create cookie)           */
/* [domain]  domain of the cookie (must be same as domain used to create cookie)       */
/***************************************************************************************/
Hafas.deleteCookie = function(name, path, domain){
    if (getCookie(name))
    {
        document.cookie = name + "=" +
            ((path) ? "; path=" + path : "") +
            ((domain) ? "; domain=" + domain : "") +
            "; expires=Thu, 01-Jan-70 00:00:01 GMT";
    }
}


/**********************************************************/
/* Hafas.object2string                                    */
/* transform an object to a string                        */
/**********************************************************/
Hafas.object2string = function(object){
    var stringified = JSON.stringify(object, function replacer(key, value) {
                            if (typeof value === 'number' && !isFinite(value)) {
                                return String(value);
                            }
                            return value;
                        });
    return stringified;
}

/**********************************************************/
/* Hafas.string2object                                    */
/* transform a string to an object                        */
/**********************************************************/
Hafas.string2object = function(string){
    var obj = JSON.parse(string, function (key, value) {
                    var type;
                    if (value && typeof value === 'object') {
                        type = value.type;
                        if (typeof type === 'string' && typeof window[type] === 'function') {
                            return new (window[type])(value);
                        }
                    }
                    return value;
              });

    return obj;
}

/***********************************************************/
/* Hafas.Clone                                             */
/* Clones an Object deep copy                              */
/***********************************************************/
Hafas.Clone = function(obj){
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }

        var c = obj instanceof Array ? [] : {};

        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                c[i] = Hafas.Clone(obj[i]);
            }
        }

        return c;
}


/* Hafas pub / sub (subscribe / unsubscribe to certain Events */
Hafas.ps = (function() {
    var cache = {},
        /**
         *    Events.publish
         *    e.g.: Events.publish("/Article/added", [article], this);
         *
         *    @class Events
         *    @method publish
         *    @param topic {String}
         *    @param args {Array}
         *    @param scope {Object} Optional
         */
        publish = function(topic, args, scope) {
            if (cache[topic]) {
                var thisTopic = cache[topic],
                    i = thisTopic.length - 1;

                for (i; i >= 0; i -= 1) {
                    thisTopic[i].apply(scope || this, args || []);
                }
            }
        },
        /**
         *    Events.subscribe
         *    e.g.: Events.subscribe("/Article/added", Articles.validate)
         *
         *    @class Events
         *    @method subscribe
         *    @param topic {String}
         *    @param callback {Function}
         *    @return Event handler {Array}
         */
        subscribe = function(topic, callback) {
            if (!cache[topic]) {
                cache[topic] = [];
            }
            cache[topic].push(callback);
            return [topic, callback];
        },
        /**
         *    Events.unsubscribe
         *    e.g.: var handle = Events.subscribe("/Article/added", Articles.validate);
         *        Events.unsubscribe(handle);
         *
         *    @class Events
         *    @method unsubscribe
         *    @param handle {Array}
         *    @param completly {Boolean}
         *    @return {type description }
         */
        unsubscribe = function(handle, completely) {
            var t = handle[0],
                i = cache[t].length - 1;

            if (cache[t]) {
                for (i; i >= 0; i -= 1) {
                    if (cache[t][i] === handle[1]) {
                        cache[t].splice(cache[t][i], 1);
                        if (completely) {
                            delete cache[t];
                        }
                    }
                }
            }
        };
    return {
        pub: publish,
        sub: subscribe,
        unsub: unsubscribe
    }
})();


Hafas.decodeGooglePolyline = function(polylineString){
    var points=[ ]
    var index = 0, len = polylineString.length;
    var lat = 0, lng = 0;
    while (index < len) {
        var b, shift = 0, result = 0;
        do {
            b = encoded.charAt(index++).charCodeAt(0) - 63;// ascii zeichen
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        var dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        shift = 0;
        result = 0;
        do {
            b = encoded.charAt(index++).charCodeAt(0) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        points.push({latitude:( lat / 1E5),longitude:( lng / 1E5)})
    }
    return points;
}

Hafas.Components = new Array();


/***********************************/
/* Hafas Request Builder           */
/* @class Hafas.Request            */


Hafas.Request = function(params){
    this.type = params.type || 'ajax';
    this.requestParams = params.requestParams;
    this.callback = params.callback || null;
    if(typeof params.request == "undefined") {
        Hafas.log("Hafas.Request: no request defined");
        return;
    }
    this.request = params.request;
    this.requestobj = params.requestobj;
    if(this.buildRequest()){
       this.fireRequest();
    }
}
Hafas.Request.prototype = {
    buildRequest: function(){
       this.getRequest();
       return true;
    },
    fireRequest: function(){
         if(this.type == 'ajax') {
             var postParams = JSON.stringify(this.requestJSON);
             Hafas.Ajax(this.url,{
                method:'post',
                onSuccess:Hafas.bind(function(o){
                   var data = this.handleResult(o.responseText);
                   if(typeof this.callback == "function") {
                       this.callback(data);
                   }
                },this)
             },postParams);
         }
    },
    handleResult: function(responseText){
         var data = eval('(' + responseText + ')');
         return data;
    },
    getRequest: function(){
        this.url = Hafas.Config.gBaseUrl;
        var languageSuffix = Hafas.Config.gLanguage + Hafas.Config.gBrowser;
        switch(this.request) {
            case "stboard": this.url += Hafas.Config.gStboard_path + "/" + languageSuffix + "y?tpl=StationBoard&format=json&start=yes&"; break;
            case "trainroute": this.url += Hafas.Config.gTraininfo_path + "/" + languageSuffix + "y/" + this.requestobj.input + "/?tpl=JourneyDetails&"; break;
            case "jplanner": this.url += Hafas.Config.gQuery_path + "/" + languageSuffix + "y?tpl=connResult2json&"; break;
        }
        this.url += this.getParams(this.requestobj);
    },
    getParams: function(params){
         var paramsString = "";
         for(var m in params) {
             paramsString += m + "=" + params[m] + "&"
         }
         return paramsString;
    }
}


/**
* Represents a Hafas Object of a location
*
* @class Hafas.Location
* @constructor
* @param {Object} params
*   @param
*     type: required
*     name: required
*     x: required
*     y: required
*     id: required
*/
Hafas.Location = function(params){
    for(var k in params) {
        this[k] = params[k];
    }
}
Hafas.Location.prototype.getId = function(){
    return this.id;
}
Hafas.Location.prototype.getType = function(){
    return parseInt(this.type);
}
Hafas.Location.prototype.getName = function(){
    return this.name;
}
Hafas.Location.prototype.getX = function(){
    return this.x;
}
Hafas.Location.prototype.getY = function(){
    return this.y;
}


/**
* Represents a Hafas Object of a trainroute
*
* @class Hafas.Trainroute
* @constructor
* @param {Object} params
*   @param
*     map: {Object} required
*     locations: { Array } required
*     polyline: {Array} optional
*/
Hafas.Trainroute = function(params){
    this.data = new Array();
    this.defaultRenderer = {
                           "header":"<table class='lc_trainRouteTable'>"+
                                     "<tr>"+
                                        "<th>" + Hafas.Texts.Trainroute.station + "/" + Hafas.Texts.Trainroute.stop + "</th>"+
                                        "<th>" + Hafas.Texts.Trainroute.arrival + "</th>"+
                                        "<th>" + Hafas.Texts.Trainroute.departure + "</th>"+
                                        "<th>" + Hafas.Texts.Trainroute.journey + "</th>"+
                                        "<th>" + Hafas.Texts.Trainroute.platform + "</th>"+
                                     "</tr>",
                           "station":"<tr>"+
                                       "<td>{name}</td>"+
                                       "<td>{arrTime}</td>"+
                                       "<td>{depTime}</td>"+
                                       "<td></td>"+
                                       "<td></td>"+
                                     "</tr>",
                           "stationPast":"<tr class='lc_trainRouteStationPast'>"+
                                       "<td>{name}</td>"+
                                       "<td>{arrTime}</td>"+
                                       "<td>{depTime}</td>"+
                                       "<td></td>"+
                                       "<td></td>"+
                                     "</tr>",
                           "footer":"</table>"
                           }
    for(var k in params) {
        this[k] = params[k];
    }
    Hafas.registerEvents(this.events,this);
    // fill parameter
    if((typeof this.container != "undefined") && (this.container != null)) {
        this.autorefresh = Hafas.fillParam(this.container.getAttribute("data-trainroute-refresh"),false);
        this.updateInterval = Hafas.fillParam(this.container.getAttribute("data-stboard-updateinterval"),60000);
    }
    if(typeof this.data.locations != "undefined") {
        for(var m=0; m < this.data.locations.length; m++) {
            Hafas.Maps.showHCILocation(this.data.locations[m],this.map);
        }
    }
    if(typeof this.data.realgraph != "undefined") {
        this.polylineRef = Hafas.Maps.showHCIPolyline(this.data.realgraph,this.map);
        this.map.centerToContent(this.polylineRef);
    }
    // im regelm??igen Interval Daten holen
    if(this.autorefresh) {
       this.autoRefreshTimer = window.setInterval(Hafas.bind(function(){
           this.update(this.journey,Hafas.bind(this.render,this));
       },this),this.updateInterval);
    }
}
Hafas.Trainroute.prototype = {
   update: function(journey,callback){
        if(journey == null) {
           return;
        }
        this.journey = journey;
        new Hafas.Request({
          request:"trainroute",
          requestobj:{
             "input":this.journey.trainId,
             "date":this.journey.da,
             "time":this.journey.ti
          },
          callback: Hafas.bind(function(data){
               this.updateData(data);
               Hafas.ps.pub("/trainroute/loaded", [this]);  // Main event
               if(typeof callback == "function") {
                   callback();
               }
          },this)
        })
    },
    updateData: function(data){
        this.data = data;
    },
    render: function(renderer){
        var currentRenderer = Hafas.fillParam(renderer,this.defaultRenderer);
        var currentRendererInstance = new Hafas.Renderer(currentRenderer);
        var html = "";
        // build header
        html += currentRendererInstance.render("header",this.data);
        if(typeof this.data.locations != "undefined") {
            for(var n=0; n < this.data.locations.length;n++) {
                   if(typeof this.data.currentLocIndex != "undefined" && n < this.data.currentLocIndex){
                      html += currentRendererInstance.render("stationPast",this.data.locations[n]);
                   }else{
                      html += currentRendererInstance.render("station",this.data.locations[n]);
                   }
            }
        }
        html += currentRendererInstance.render("footer");
        this.container.innerHTML = html;
    }
};




/* Represents a Hafas Object of a Connection Result */
Hafas.ConnectionResult = function(params){
    //console.dir(params);
}



Hafas.JourneyPlanner = function(params){
    for(var m in params) {
        this[m] = params[m];
    }
    this.connReq = new Object;
    this.connReq.SID = Hafas.fillParam(this.container.getAttribute("data-jplanner-depLocL"),null);
    this.connReq.ZID = Hafas.fillParam(this.container.getAttribute("data-jplanner-arrLocL"),null);
    this.connReq.start =  Hafas.fillParam(this.container.getAttribute("data-jplanner-start"),null);
    if(this.connReq.start) {
       this.calculateConnections();
    }
}

Hafas.JourneyPlanner.prototype = {
    calculateConnections: function(){
        new Hafas.Request({
          request:"jplanner",
          requestobj:this.connReq,
          callback: Hafas.bind(function(data){
               if(typeof callback == "function") {
                   callback();
               }
          },this)
        })
    }
}


/**
* Represents a Hafas Object of a stboard
*
* @class Hafas.Trainroute
* @constructor
* @param {Object} params
*   @param
*/
Hafas.Stboard = function(params){
    for(var m in params) {
        this[m] = params[m];
    }
    Hafas.registerEvents(this.events,this);
    this.station = null;
    this.showJourneys = Hafas.fillParam(parseInt(this.container.getAttribute("data-stboard-journeys")),7);
    this.type = Hafas.fillParam(this.container.getAttribute("data-stboard-type"),"dep");
    this.autorefresh = Hafas.fillParam(this.container.getAttribute("data-stboard-refresh"),false);
    this.updateInterval = Hafas.fillParam(this.container.getAttribute("data-stboard-updateinterval"),60000);
    this.sortType = Hafas.fillParam(this.container.getAttribute("data-stboard-sort"),"ti");
    this.defaultRenderer = {
        "header":"<div><strong>{stationName}</strong></div>"+
                 "<table class='lc_stboardTable'>"+
                   "<tr>"+
                     "<th class='lc_stboardHeader active' data-stboard-sort='ti'>{headTexts.time}</th>"+
                     "<th class='lc_stboardHeader' data-stboard-sort='pr'>{headTexts.product}</th>"+
                     "<th class='lc_stboardHeader' data-stboard-sort='st.name'>{headTexts.direction}</th>"+
                     "<th class='lc_stboardHeader' data-stboard-sort='tr'>{headTexts.platform}</th>"+
                   "</tr>",
        "journey":"<tr class='lc_stboardJourney' data-stboard-journey='{lfn}'>"+
                     "<td>{ti}</td>"+
                     "<td>{pr}</td>"+
                     "<td>{st.name}</td>"+
                     "<td>{tr}</td>"+
                   "</tr>",
        "footer":"</table>"
    };
    // im regelm??igen Interval Daten holen
    if(this.autorefresh) {
       this.autoRefreshTimer = window.setInterval(Hafas.bind(function(){
           this.update(this.station,Hafas.bind(this.render,this));
       },this),this.updateInterval);
    }
}



/* Hafas Stboard Module */
Hafas.Stboard.prototype = {
    sort: function(mode){
         this.data.journey.sort(function(a,b){
             a = eval("a."+mode);
             b = eval("b."+mode);
             if( a < b ){
                return -1
             }else if( a > b ){
                return 1;
             }else{
                return 0;
            }
         });
         this.render();
         var thElements = this.container.getElementsByTagName("th");
         for(var j=0; j < thElements.length;j++) {
             if(thElements[j].getAttribute('data-stboard-sort') == mode){
                 thElements[j].addClassName("active");
             }else{
                 thElements[j].removeClassName("active");
             }
         }
    },
    update: function(station,callback){
        if(station == null) {
           return;
        }
        this.station = station;
        new Hafas.Request({
          request:"stboard",
          requestobj:{
             "input":station.extId,
             "boardType":this.type,
             "maxJourneys":30
          },
          callback: Hafas.bind(function(data){
               this.updateData(data);
               if(typeof callback == "function") {
                   callback();
               }
          },this)
        })
    },
    updateData: function(data){
        this.data = data;
    },
    render: function(renderer){
        var currentRenderer = Hafas.fillParam(renderer,this.defaultRenderer);
        var currentRendererInstance = new Hafas.Renderer(currentRenderer);
        var html = "";
        // build header
        html += currentRendererInstance.render("header",this.data);
        if(typeof this.data.journey != "undefined") {
            for(var n=0; n < this.data.journey.length;n++) {
                if(n < this.showJourneys ) {
                   html += currentRendererInstance.render("journey",this.data.journey[n]);
                }
            }
        }
        html += currentRendererInstance.render("footer");
        this.container.innerHTML = html;
        // build events
        var trElements = this.container.getElementsByTagName("tr");
        var elemIndex = 0;
        for(var m=0; m < trElements.length;m++) {
            if(trElements[m].getAttribute('data-stboard-journey') != null) {
               trElements[m].onclick = function(reference,index){
                   return function(){
                       Hafas.ps.pub("/stboard/selectjourney", [reference.data.journey[index]]);  // Main event
                       Hafas.ps.pub("/stboard/selectjourney/" + reference.container.id, [reference.data.journey[index]]);
                   }
               }(this,elemIndex);
               elemIndex++;
            }
        }
        var thElements = this.container.getElementsByTagName("th");
        for(var j=0; j < thElements.length;j++) {
            if(thElements[j].getAttribute('data-stboard-sort') != null) {
                thElements[j].onclick = function(reference,mode){
                   return function(){
                       reference.sort(mode);
                       Hafas.ps.pub("/stboard/sort/", [reference.data]);
                       Hafas.ps.pub("/stboard/sort/"+mode, [reference.data]);
                       Hafas.ps.pub("/stboard/sort/"+mode+"/" + reference.container.id, [reference.data]);
                   }
                }(this,thElements[j].getAttribute('data-stboard-sort'));
            }
        }
    }
}


/* Mapping from string to actual class */
Hafas.Modules = {
    "suggest":Hafas.Suggest,
    "stboard":Hafas.Stboard,
    "trainroute":Hafas.Trainroute,
    "connectionResult": Hafas.ConnectionResult,
    "jplanner": Hafas.JourneyPlanner
};

/* Class to render HTML Content */
Hafas.Renderer = function(renderer){
    this.renderer = renderer;

}
Hafas.Renderer.prototype = {
      render: function(id,data){
         var template = this.renderer[id];
         var matches = this.renderer[id].match(/\{(\w+|\S[^<>]+)\}/g)
         var result = this.renderer[id];
         if(matches != null && typeof data != "undefined") {
             for(var n=0; n < matches.length; n++) {
                 var currentRegExp = new RegExp("("+matches[n]+")","g");
                 var key = matches[n].replace("{","").replace("}","");
                 if(key.indexOf(".") > -1) {
                    var keySplit = key.split(".");
                    key = "";
                    for(var m = 0; m < keySplit.length;m++) {
                       key += '["' + keySplit[m] + '"]';
                    }
                    eval("var obj = data" + key);
                 }else{
                    if(typeof data[key] == "undefined") {
                        obj = "";
                    }else{
                        eval("var obj = '" + (data[key])+"'");
                    }
                 }
                 result = result.replace(currentRegExp,obj);
             }
         }
         return result;
      }
}




