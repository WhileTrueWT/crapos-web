
var Module;

if (typeof Module === 'undefined') Module = eval('(function() { try { return Module || {} } catch(e) { return {} } })()');

if (!Module.expectedDataFileDownloads) {
  Module.expectedDataFileDownloads = 0;
  Module.finishedDataFileDownloads = 0;
}
Module.expectedDataFileDownloads++;
(function() {
 var loadPackage = function(metadata) {

  var PACKAGE_PATH;
  if (typeof window === 'object') {
    PACKAGE_PATH = window['encodeURIComponent'](window.location.pathname.toString().substring(0, window.location.pathname.toString().lastIndexOf('/')) + '/');
  } else if (typeof location !== 'undefined') {
      // worker
      PACKAGE_PATH = encodeURIComponent(location.pathname.toString().substring(0, location.pathname.toString().lastIndexOf('/')) + '/');
    } else {
      throw 'using preloaded data can only be done on a web page or in a web worker';
    }
    var PACKAGE_NAME = 'game.data';
    var REMOTE_PACKAGE_BASE = 'game.data';
    if (typeof Module['locateFilePackage'] === 'function' && !Module['locateFile']) {
      Module['locateFile'] = Module['locateFilePackage'];
      Module.printErr('warning: you defined Module.locateFilePackage, that has been renamed to Module.locateFile (using your locateFilePackage for now)');
    }
    var REMOTE_PACKAGE_NAME = typeof Module['locateFile'] === 'function' ?
    Module['locateFile'](REMOTE_PACKAGE_BASE) :
    ((Module['filePackagePrefixURL'] || '') + REMOTE_PACKAGE_BASE);

    var REMOTE_PACKAGE_SIZE = metadata.remote_package_size;
    var PACKAGE_UUID = metadata.package_uuid;

    function fetchRemotePackage(packageName, packageSize, callback, errback) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', packageName, true);
      xhr.responseType = 'arraybuffer';
      xhr.onprogress = function(event) {
        var url = packageName;
        var size = packageSize;
        if (event.total) size = event.total;
        if (event.loaded) {
          if (!xhr.addedTotal) {
            xhr.addedTotal = true;
            if (!Module.dataFileDownloads) Module.dataFileDownloads = {};
            Module.dataFileDownloads[url] = {
              loaded: event.loaded,
              total: size
            };
          } else {
            Module.dataFileDownloads[url].loaded = event.loaded;
          }
          var total = 0;
          var loaded = 0;
          var num = 0;
          for (var download in Module.dataFileDownloads) {
            var data = Module.dataFileDownloads[download];
            total += data.total;
            loaded += data.loaded;
            num++;
          }
          total = Math.ceil(total * Module.expectedDataFileDownloads/num);
          if (Module['setStatus']) Module['setStatus']('Downloading data... (' + loaded + '/' + total + ')');
        } else if (!Module.dataFileDownloads) {
          if (Module['setStatus']) Module['setStatus']('Downloading data...');
        }
      };
      xhr.onerror = function(event) {
        throw new Error("NetworkError for: " + packageName);
      }
      xhr.onload = function(event) {
        if (xhr.status == 200 || xhr.status == 304 || xhr.status == 206 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
          var packageData = xhr.response;
          callback(packageData);
        } else {
          throw new Error(xhr.statusText + " : " + xhr.responseURL);
        }
      };
      xhr.send(null);
    };

    function handleError(error) {
      console.error('package error:', error);
    };

    function runWithFS() {

      function assert(check, msg) {
        if (!check) throw msg + new Error().stack;
      }
      Module['FS_createPath']('/', 'Music', true, true);
      Module['FS_createPath']('/', 'Pictures', true, true);
      Module['FS_createPath']('/', 'Videos', true, true);
      Module['FS_createPath']('/', '_NOTHING', true, true);
      Module['FS_createPath']('/_NOTHING', 'net', true, true);
      Module['FS_createPath']('/_NOTHING/net', 'crapos.notarealsite.com', true, true);
      Module['FS_createPath']('/_NOTHING/net', 'discord.com', true, true);
      Module['FS_createPath']('/_NOTHING/net', 'google.com', true, true);
      Module['FS_createPath']('/_NOTHING/net', 'youtube.com', true, true);
      Module['FS_createPath']('/_NOTHING/net/youtube.com', 'thumbnails', true, true);
      Module['FS_createPath']('/_NOTHING/net/youtube.com', 'videos', true, true);
      Module['FS_createPath']('/_NOTHING', 'shop', true, true);
      Module['FS_createPath']('/', 'fonts', true, true);
      Module['FS_createPath']('/', 'images', true, true);
      Module['FS_createPath']('/images', 'icons', true, true);
      Module['FS_createPath']('/images', 'minecraft', true, true);
      Module['FS_createPath']('/', 'lib', true, true);
      Module['FS_createPath']('/lib', 'g3d', true, true);
      Module['FS_createPath']('/', 'screens', true, true);
      Module['FS_createPath']('/', 'sounds', true, true);
      Module['FS_createPath']('/', 'windows', true, true);

      function DataRequest(start, end, crunched, audio) {
        this.start = start;
        this.end = end;
        this.crunched = crunched;
        this.audio = audio;
      }
      DataRequest.prototype = {
        requests: {},
        open: function(mode, name) {
          this.name = name;
          this.requests[name] = this;
          Module['addRunDependency']('fp ' + this.name);
        },
        send: function() {},
        onload: function() {
          var byteArray = this.byteArray.subarray(this.start, this.end);

          this.finish(byteArray);

        },
        finish: function(byteArray) {
          var that = this;

        Module['FS_createDataFile'](this.name, null, byteArray, true, true, true); // canOwn this data in the filesystem, it is a slide into the heap that will never change
        Module['removeRunDependency']('fp ' + that.name);

        this.requests[this.name] = null;
      }
    };

    var files = metadata.files;
    for (i = 0; i < files.length; ++i) {
      new DataRequest(files[i].start, files[i].end, files[i].crunched, files[i].audio).open('GET', files[i].filename);
    }


    var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    var IDB_RO = "readonly";
    var IDB_RW = "readwrite";
    var DB_NAME = "EM_PRELOAD_CACHE";
    var DB_VERSION = 1;
    var METADATA_STORE_NAME = 'METADATA';
    var PACKAGE_STORE_NAME = 'PACKAGES';
    function openDatabase(callback, errback) {
      try {
        var openRequest = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (e) {
        return errback(e);
      }
      openRequest.onupgradeneeded = function(event) {
        var db = event.target.result;

        if(db.objectStoreNames.contains(PACKAGE_STORE_NAME)) {
          db.deleteObjectStore(PACKAGE_STORE_NAME);
        }
        var packages = db.createObjectStore(PACKAGE_STORE_NAME);

        if(db.objectStoreNames.contains(METADATA_STORE_NAME)) {
          db.deleteObjectStore(METADATA_STORE_NAME);
        }
        var metadata = db.createObjectStore(METADATA_STORE_NAME);
      };
      openRequest.onsuccess = function(event) {
        var db = event.target.result;
        callback(db);
      };
      openRequest.onerror = function(error) {
        errback(error);
      };
    };

    /* Check if there's a cached package, and if so whether it's the latest available */
    function checkCachedPackage(db, packageName, callback, errback) {
      var transaction = db.transaction([METADATA_STORE_NAME], IDB_RO);
      var metadata = transaction.objectStore(METADATA_STORE_NAME);

      var getRequest = metadata.get("metadata/" + packageName);
      getRequest.onsuccess = function(event) {
        var result = event.target.result;
        if (!result) {
          return callback(false);
        } else {
          return callback(PACKAGE_UUID === result.uuid);
        }
      };
      getRequest.onerror = function(error) {
        errback(error);
      };
    };

    function fetchCachedPackage(db, packageName, callback, errback) {
      var transaction = db.transaction([PACKAGE_STORE_NAME], IDB_RO);
      var packages = transaction.objectStore(PACKAGE_STORE_NAME);

      var getRequest = packages.get("package/" + packageName);
      getRequest.onsuccess = function(event) {
        var result = event.target.result;
        callback(result);
      };
      getRequest.onerror = function(error) {
        errback(error);
      };
    };

    function cacheRemotePackage(db, packageName, packageData, packageMeta, callback, errback) {
      var transaction_packages = db.transaction([PACKAGE_STORE_NAME], IDB_RW);
      var packages = transaction_packages.objectStore(PACKAGE_STORE_NAME);

      var putPackageRequest = packages.put(packageData, "package/" + packageName);
      putPackageRequest.onsuccess = function(event) {
        var transaction_metadata = db.transaction([METADATA_STORE_NAME], IDB_RW);
        var metadata = transaction_metadata.objectStore(METADATA_STORE_NAME);
        var putMetadataRequest = metadata.put(packageMeta, "metadata/" + packageName);
        putMetadataRequest.onsuccess = function(event) {
          callback(packageData);
        };
        putMetadataRequest.onerror = function(error) {
          errback(error);
        };
      };
      putPackageRequest.onerror = function(error) {
        errback(error);
      };
    };

    function processPackageData(arrayBuffer) {
      Module.finishedDataFileDownloads++;
      assert(arrayBuffer, 'Loading data file failed.');
      assert(arrayBuffer instanceof ArrayBuffer, 'bad input to processPackageData');
      var byteArray = new Uint8Array(arrayBuffer);
      var curr;

        // copy the entire loaded file into a spot in the heap. Files will refer to slices in that. They cannot be freed though
        // (we may be allocating before malloc is ready, during startup).
        if (Module['SPLIT_MEMORY']) Module.printErr('warning: you should run the file packager with --no-heap-copy when SPLIT_MEMORY is used, otherwise copying into the heap may fail due to the splitting');
        var ptr = Module['getMemory'](byteArray.length);
        Module['HEAPU8'].set(byteArray, ptr);
        DataRequest.prototype.byteArray = Module['HEAPU8'].subarray(ptr, ptr+byteArray.length);

        var files = metadata.files;
        for (i = 0; i < files.length; ++i) {
          DataRequest.prototype.requests[files[i].filename].onload();
        }
        Module['removeRunDependency']('datafile_game.data');

      };
      Module['addRunDependency']('datafile_game.data');

      if (!Module.preloadResults) Module.preloadResults = {};

      function preloadFallback(error) {
        console.error(error);
        console.error('falling back to default preload behavior');
        fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE, processPackageData, handleError);
      };

      openDatabase(
        function(db) {
          checkCachedPackage(db, PACKAGE_PATH + PACKAGE_NAME,
            function(useCached) {
              Module.preloadResults[PACKAGE_NAME] = {fromCache: useCached};
              if (useCached) {
                console.info('loading ' + PACKAGE_NAME + ' from cache');
                fetchCachedPackage(db, PACKAGE_PATH + PACKAGE_NAME, processPackageData, preloadFallback);
              } else {
                console.info('loading ' + PACKAGE_NAME + ' from remote');
                fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE,
                  function(packageData) {
                    cacheRemotePackage(db, PACKAGE_PATH + PACKAGE_NAME, packageData, {uuid:PACKAGE_UUID}, processPackageData,
                      function(error) {
                        console.error(error);
                        processPackageData(packageData);
                      });
                  }
                  , preloadFallback);
              }
            }
            , preloadFallback);
        }
        , preloadFallback);

      if (Module['setStatus']) Module['setStatus']('Downloading...');

    }
    if (Module['calledRun']) {
      runWithFS();
    } else {
      if (!Module['preRun']) Module['preRun'] = [];
      Module["preRun"].push(runWithFS); // FS is not initialized yet, wait for it
    }

  }
  loadPackage({"package_uuid":"529eead7-2a08-4c81-ba71-ef0865670572","remote_package_size":7013369,"files":[{"filename":"/_NOTHING/missing.png","crunched":0,"start":0,"end":13318,"audio":false},{"filename":"/_NOTHING/net/crapos.notarealsite.com/iehome.lua","crunched":0,"start":13318,"end":13963,"audio":false},{"filename":"/_NOTHING/net/crapos.notarealsite.com/legit404page.lua","crunched":0,"start":13963,"end":14406,"audio":false},{"filename":"/_NOTHING/net/crapos.notarealsite.com/search.lua","crunched":0,"start":14406,"end":14935,"audio":false},{"filename":"/_NOTHING/net/discord.com/app.lua","crunched":0,"start":14935,"end":17648,"audio":false},{"filename":"/_NOTHING/net/google.com/home.lua","crunched":0,"start":17648,"end":18434,"audio":false},{"filename":"/_NOTHING/net/google.com/logo.png","crunched":0,"start":18434,"end":25972,"audio":false},{"filename":"/_NOTHING/net/youtube.com/home.lua","crunched":0,"start":25972,"end":26936,"audio":false},{"filename":"/_NOTHING/net/youtube.com/thumbnails/Why Windows PE Is The Greatest OS Ever.png","crunched":0,"start":26936,"end":40254,"audio":false},{"filename":"/_NOTHING/net/youtube.com/videos/Why Windows PE Is The Greatest OS Ever.lua","crunched":0,"start":40254,"end":40444,"audio":false},{"filename":"/_NOTHING/net/youtube.com/youtube-legit.png","crunched":0,"start":40444,"end":62528,"audio":false},{"filename":"/_NOTHING/shop/virus.lua","crunched":0,"start":62528,"end":62781,"audio":false},{"filename":"/conf.lua","crunched":0,"start":62781,"end":62964,"audio":false},{"filename":"/fonts/DejaVuSans.ttf","crunched":0,"start":62964,"end":820040,"audio":false},{"filename":"/fonts/DejaVuSansMono.ttf","crunched":0,"start":820040,"end":1160752,"audio":false},{"filename":"/icon.png","crunched":0,"start":1160752,"end":1173914,"audio":false},{"filename":"/images/background.png","crunched":0,"start":1173914,"end":2160225,"audio":false},{"filename":"/images/button.png","crunched":0,"start":2160225,"end":2160602,"audio":false},{"filename":"/images/closebutton.png","crunched":0,"start":2160602,"end":2166506,"audio":false},{"filename":"/images/cursor.png","crunched":0,"start":2166506,"end":2166776,"audio":false},{"filename":"/images/gamesforwindowspe.png","crunched":0,"start":2166776,"end":2201919,"audio":false},{"filename":"/images/gradient.png","crunched":0,"start":2201919,"end":2202504,"audio":false},{"filename":"/images/icons/3d.png","crunched":0,"start":2202504,"end":2207425,"audio":false},{"filename":"/images/icons/app.png","crunched":0,"start":2207425,"end":2211844,"audio":false},{"filename":"/images/icons/brainflip.png","crunched":0,"start":2211844,"end":2222282,"audio":false},{"filename":"/images/icons/bubblescreen.png","crunched":0,"start":2222282,"end":2231911,"audio":false},{"filename":"/images/icons/code.png","crunched":0,"start":2231911,"end":2237384,"audio":false},{"filename":"/images/icons/controlpanel.png","crunched":0,"start":2237384,"end":2244656,"audio":false},{"filename":"/images/icons/deadfish.png","crunched":0,"start":2244656,"end":2261733,"audio":false},{"filename":"/images/icons/download.png","crunched":0,"start":2261733,"end":2268014,"audio":false},{"filename":"/images/icons/explode.png","crunched":0,"start":2268014,"end":2383829,"audio":false},{"filename":"/images/icons/explorer.png","crunched":0,"start":2383829,"end":2390041,"audio":false},{"filename":"/images/icons/file.png","crunched":0,"start":2390041,"end":2398262,"audio":false},{"filename":"/images/icons/folder.png","crunched":0,"start":2398262,"end":2411908,"audio":false},{"filename":"/images/icons/games.png","crunched":0,"start":2411908,"end":2418702,"audio":false},{"filename":"/images/icons/gears.png","crunched":0,"start":2418702,"end":2422063,"audio":false},{"filename":"/images/icons/ie.png","crunched":0,"start":2422063,"end":2430807,"audio":false},{"filename":"/images/icons/info.png","crunched":0,"start":2430807,"end":2437134,"audio":false},{"filename":"/images/icons/minecraft.png","crunched":0,"start":2437134,"end":2438840,"audio":false},{"filename":"/images/icons/missing.png","crunched":0,"start":2438840,"end":2452158,"audio":false},{"filename":"/images/icons/music.png","crunched":0,"start":2452158,"end":2455777,"audio":false},{"filename":"/images/icons/notepad.png","crunched":0,"start":2455777,"end":2463109,"audio":false},{"filename":"/images/icons/paint.png","crunched":0,"start":2463109,"end":2470011,"audio":false},{"filename":"/images/icons/picture.png","crunched":0,"start":2470011,"end":2476498,"audio":false},{"filename":"/images/icons/run.png","crunched":0,"start":2476498,"end":2481578,"audio":false},{"filename":"/images/icons/solitaire.png","crunched":0,"start":2481578,"end":2482325,"audio":false},{"filename":"/images/icons/sound.png","crunched":0,"start":2482325,"end":2485237,"audio":false},{"filename":"/images/icons/soundboard.png","crunched":0,"start":2485237,"end":2492475,"audio":false},{"filename":"/images/icons/speaker.png","crunched":0,"start":2492475,"end":2499813,"audio":false},{"filename":"/images/icons/stick.png","crunched":0,"start":2499813,"end":2502392,"audio":false},{"filename":"/images/icons/text.png","crunched":0,"start":2502392,"end":2505322,"audio":false},{"filename":"/images/icons/video.png","crunched":0,"start":2505322,"end":2509222,"audio":false},{"filename":"/images/icons/video2.png","crunched":0,"start":2509222,"end":2515667,"audio":false},{"filename":"/images/logo.png","crunched":0,"start":2515667,"end":2766463,"audio":false},{"filename":"/images/minecraft/jomang.png","crunched":0,"start":2766463,"end":2790821,"audio":false},{"filename":"/images/minecraft/minecraft-background.png","crunched":0,"start":2790821,"end":3231226,"audio":false},{"filename":"/images/minecraft/minecraft-logo.png","crunched":0,"start":3231226,"end":3248190,"audio":false},{"filename":"/images/start.png","crunched":0,"start":3248190,"end":3252896,"audio":false},{"filename":"/images/startbutton.png","crunched":0,"start":3252896,"end":3265005,"audio":false},{"filename":"/lib/cube.obj","crunched":0,"start":3265005,"end":3265684,"audio":false},{"filename":"/lib/g3d/camera.lua","crunched":0,"start":3265684,"end":3272093,"audio":false},{"filename":"/lib/g3d/collisions.lua","crunched":0,"start":3272093,"end":3295647,"audio":false},{"filename":"/lib/g3d/g3d.vert","crunched":0,"start":3295647,"end":3296462,"audio":false},{"filename":"/lib/g3d/init.lua","crunched":0,"start":3296462,"end":3298684,"audio":false},{"filename":"/lib/g3d/matrices.lua","crunched":0,"start":3298684,"end":3304609,"audio":false},{"filename":"/lib/g3d/model.lua","crunched":0,"start":3304609,"end":3311231,"audio":false},{"filename":"/lib/g3d/objloader.lua","crunched":0,"start":3311231,"end":3315151,"audio":false},{"filename":"/lib/g3d/vectors.lua","crunched":0,"start":3315151,"end":3316262,"audio":false},{"filename":"/lib/sphere.obj","crunched":0,"start":3316262,"end":3325187,"audio":false},{"filename":"/main.lua","crunched":0,"start":3325187,"end":3327123,"audio":false},{"filename":"/screens/crash.lua","crunched":0,"start":3327123,"end":3328036,"audio":false},{"filename":"/screens/desktop.lua","crunched":0,"start":3328036,"end":3329449,"audio":false},{"filename":"/screens/shutdown.lua","crunched":0,"start":3329449,"end":3330212,"audio":false},{"filename":"/screens/startup.lua","crunched":0,"start":3330212,"end":3330917,"audio":false},{"filename":"/settings","crunched":0,"start":3330917,"end":3330926,"audio":false},{"filename":"/sounds/ast.wav","crunched":0,"start":3330926,"end":3647898,"audio":true},{"filename":"/sounds/critical.wav","crunched":0,"start":3647898,"end":4123862,"audio":true},{"filename":"/sounds/default.wav","crunched":0,"start":4123862,"end":4360962,"audio":true},{"filename":"/sounds/exc.wav","crunched":0,"start":4360962,"end":4854710,"audio":true},{"filename":"/sounds/shutdown.wav","crunched":0,"start":4854710,"end":5785570,"audio":true},{"filename":"/sounds/startup.wav","crunched":0,"start":5785570,"end":6920478,"audio":true},{"filename":"/system.lua","crunched":0,"start":6920478,"end":6939358,"audio":false},{"filename":"/windows/3d.lua","crunched":0,"start":6939358,"end":6941726,"audio":false},{"filename":"/windows/about.lua","crunched":0,"start":6941726,"end":6943497,"audio":false},{"filename":"/windows/bf.lua","crunched":0,"start":6943497,"end":6945928,"audio":false},{"filename":"/windows/cmd.lua","crunched":0,"start":6945928,"end":6948944,"audio":false},{"filename":"/windows/control.lua","crunched":0,"start":6948944,"end":6949694,"audio":false},{"filename":"/windows/deadfish.lua","crunched":0,"start":6949694,"end":6951364,"audio":false},{"filename":"/windows/emulation.lua","crunched":0,"start":6951364,"end":6952564,"audio":false},{"filename":"/windows/explorer.lua","crunched":0,"start":6952564,"end":6959814,"audio":false},{"filename":"/windows/fnaf.lua","crunched":0,"start":6959814,"end":6960005,"audio":false},{"filename":"/windows/games.lua","crunched":0,"start":6960005,"end":6961485,"audio":false},{"filename":"/windows/ie.lua","crunched":0,"start":6961485,"end":6963297,"audio":false},{"filename":"/windows/imageviewer.lua","crunched":0,"start":6963297,"end":6964049,"audio":false},{"filename":"/windows/importer.lua","crunched":0,"start":6964049,"end":6964838,"audio":false},{"filename":"/windows/mediaplayer.lua","crunched":0,"start":6964838,"end":6966123,"audio":false},{"filename":"/windows/minecraft.lua","crunched":0,"start":6966123,"end":6975455,"audio":false},{"filename":"/windows/minesweeper.lua","crunched":0,"start":6975455,"end":6975948,"audio":false},{"filename":"/windows/more.lua","crunched":0,"start":6975948,"end":6977377,"audio":false},{"filename":"/windows/music.lua","crunched":0,"start":6977377,"end":6978107,"audio":false},{"filename":"/windows/notepad.lua","crunched":0,"start":6978107,"end":6981858,"audio":false},{"filename":"/windows/paint.lua","crunched":0,"start":6981858,"end":6992401,"audio":false},{"filename":"/windows/shop.lua","crunched":0,"start":6992401,"end":6992979,"audio":false},{"filename":"/windows/solitaire.lua","crunched":0,"start":6992979,"end":6994527,"audio":false},{"filename":"/windows/soundboard.lua","crunched":0,"start":6994527,"end":6995338,"audio":false},{"filename":"/windows/startmenu.lua","crunched":0,"start":6995338,"end":6997619,"audio":false},{"filename":"/windows/stickcollector.lua","crunched":0,"start":6997619,"end":7000107,"audio":false},{"filename":"/windows/ucancode.lua","crunched":0,"start":7000107,"end":7012437,"audio":false},{"filename":"/windows/videos.lua","crunched":0,"start":7012437,"end":7013369,"audio":false}]});

})();
