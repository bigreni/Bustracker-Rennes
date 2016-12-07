    function onLoad() {
        if ((/(ipad|iphone|ipod|android|windows phone)/i.test(navigator.userAgent))) {
            document.addEventListener('deviceready', initApp, false);
        } else {
            AndroidFullScreen.immersiveMode(null, null);
            checkFirstUse();
            initApp();
        }
    }
    var admobid = {};
    if (/(android)/i.test(navigator.userAgent)) {
        admobid = { // for Android
            banner: 'ca-app-pub-1683858134373419/2524889484',
            interstitial: 'ca-app-pub-1683858134373419/7331801484'
            //banner: 'ca-app-pub-3886850395157773/3411786244'
            //interstitial: 'ca-app-pub-9249695405712287/3301233156'
        };
    }

    function initApp() {
        if (!AdMob) { alert('admob plugin not ready'); return; }
        initAd();
        // display the banner at startup
        createSelectedBanner();
    }
    function initAd() {
        var defaultOptions = {
            // bannerId: admobid.banner,
            // interstitialId: admobid.interstitial,
            // adSize: 'SMART_BANNER',
            // width: integer, // valid when set adSize 'CUSTOM'
            // height: integer, // valid when set adSize 'CUSTOM'
            position: AdMob.AD_POSITION.BOTTOM_CENTER,
            // offsetTopBar: false, // avoid overlapped by status bar, for iOS7+
            bgColor: 'black', // color name, or '#RRGGBB'
            // x: integer,      // valid when set position to 0 / POS_XY
            // y: integer,      // valid when set position to 0 / POS_XY
            isTesting: true // set to true, to receiving test ad for testing purpose
            // autoShow: true // auto show interstitial ad when loaded, set to false if prepare/show
        };
        AdMob.setOptions(defaultOptions);
        registerAdEvents();
    }
    // optional, in case respond to events or handle error
    function registerAdEvents() {
        /* deprecated
        document.addEventListener('onBannerFailedToReceive', function(data){ alert('error: ' + data.error + ', reason: ' + data.reason); });
        document.addEventListener('onBannerReceive', function(){});
        document.addEventListener('onBannerPresent', function(){});
        document.addEventListener('onBannerLeaveApp', function(){});
        document.addEventListener('onBannerDismiss', function(){});

        document.addEventListener('onInterstitialFailedToReceive', function(data){ alert('error: ' + data.error + ', reason: ' + data.reason); });
        document.addEventListener('onInterstitialReceive', function(){});
        document.addEventListener('onInterstitialPresent', function(){});
        document.addEventListener('onInterstitialLeaveApp', function(){});
        document.addEventListener('onInterstitialDismiss', function(){});
        */

        // new events, with variable to differentiate: adNetwork, adType, adEvent
        document.addEventListener('onAdFailLoad', function (data) {
            alert('error: ' + data.error +
                    ', reason: ' + data.reason +
                    ', adNetwork:' + data.adNetwork +
                    ', adType:' + data.adType +
                    ', adEvent:' + data.adEvent); // adType: 'banner' or 'interstitial'
        });
        document.addEventListener('onAdLoaded', function (data) { });
        document.addEventListener('onAdPresent', function (data) { });
        document.addEventListener('onAdLeaveApp', function (data) { });
        document.addEventListener('onAdDismiss', function (data) { });
    }

    // click button to call following functions
    //function getSelectedAdSize() {
    //    var i = document.getElementById("adSize").selectedIndex;
    //    var items = document.getElementById("adSize").options;
    //    return items[i].value;
    //}
    //function getSelectedPosition() {
    //    var i = document.getElementById("adPosition").selectedIndex;
    //    var items = document.getElementById("adPosition").options;
    //    return parseInt(items[i].value);
    //}
    function createSelectedBanner() {
        //var overlap = document.getElementById('overlap').checked;
        //var offsetTopBar = document.getElementById('offsetTopBar').checked;
        //AdMob.createBanner( {adId:admobid.banner, overlap:overlap, offsetTopBar:offsetTopBar, adSize: getSelectedAdSize(), position:getSelectedPosition()} );
        AdMob.createBanner({adId:admobid.banner});
    }
    //function createBannerOfGivenSize() {
    //    var w = document.getElementById('w').value;
    //    var h = document.getElementById('h').value;

    //    AdMob.createBanner({ adId: admobid.banner,
    //        adSize: 'CUSTOM', width: w, height: h,
    //        position: getSelectedPosition()
    //    });
    //}
    //function showBannerAtSelectedPosition() {
    //    AdMob.showBanner(getSelectedPosition());
    //}
    //function showBannerAtGivenXY() {
    //    var x = document.getElementById('x').value;
    //    var y = document.getElementById('y').value;
    //    AdMob.showBannerAtXY(x, y);
    //}
    function loadInterstitial() {
        AdMob.prepareInterstitial({ adId: admobid.interstitial, isTesting: true, autoShow: true });
        window.location.href = "Paradas.html";
        return true;
    }

    function loadAnalytics(page){
        window.ga.startTrackerWithId('UA-88579601-3', 0);
        window.ga.setAppVersion('1.0.0.1');
        window.ga.setAllowIDFACollection(true);
        window.ga.trackView(page);
    }

    checkFirstUse()
    {
        if (!localStorage.getItem("firstuse")) {
            alert('First use');
            localStorage.setItem("firstuse", 1);
        }
    }