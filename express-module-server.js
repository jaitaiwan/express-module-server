exports = function (options) {

  // It's possible module-server isn't in npm yet. Fail gracefully.
  try { 
    var go = require('module-server');
  } catch (e) {
    console.error('Cannot find require module: "module-server". It is required for this middleware to run');
    return function (req, res, next) {
      next();
    }
  }

  // Lets setup our options
  var setDefaults = require('underscore').defaults,
      defaults = {
        path: "/_js/",
        mapPath: "/_sourceMap/",
        srcPath: "/_source/",
        srcDir: "client/src",
        srcMap: "/module-graph.json",
        mapDir: "client/maps",
        sourceMaps: true,
        debug: false
      };

  // Make sure all the options are there
  setDefaults(options, defaults);

  return function (req, res, next) {
    // Static Data Serv
    // TODO: Statically return module-client.js and LABjs

    // Get our utility belt ready
    var Route = require('express/lib/router/route'),
        jsRoute = new Route('', options.path + "*:request"),
        mapRoute = new Route('', options.mapPath + "*:request"),
        sourceRoute = new Route('', options.srcPath + "*:request"),
        path = require('path');


    // Main grunt/worker function
    run = function (err, moduleServer) {
      var isSourceMapRequest = false;
      if (jsRoute.match(req.path)) {
        // Get JS Modules
        if(typeof options.hooks.beforeJS == 'function') options.hooks.beforeJS(req, res, next); 
      } else if (mapRoute.match(req.path)) {
        // Get JS Maps
        if(options.sourceMaps == false) {
          console.warn('Source Maps are off. Passing responsibility');
          return next();
        }
        isSourceMapRequest = true;
        if(typeof options.hooks.beforeMap == 'function') options.hooks.beforeMap(req, res, next);
      } else if (sourceRoute.match(req.path)) {
        // Get Source JS
        if(typeof options.hooks.beforeSource == 'function') options.hooks.beforeSource(req, res, next);
        var tempPath = req.path;
        tempPath = tempPath.split(/\//);
        tempPath.shift();
        tempPath = tempPath.join("/");
        res.sendfile(path.normalise(__dirname + "/" + options.srcDir + tempPath));
        res.end();
      } else {
        return next();
      }

      var urlpath = req.path;
      urlpath.shift();
      urlpath = urlpath.replace(/^\//, '');
      var parts = urlpath.split(/\//),
          modules = parts.shift().split(/,/),
          options = {};
      parts.forEach(function(part) {
        var pair = part.split(/=/);
        options[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
      });
      var exclude = null;
      if(options.exm) {
        exclude = options.exm.split(/,/);
      }

      onJs = function(err, length, js, sourceMap) {
        if (err) {
          console.log('Error:', err);
          if (err.statusCode) {
            res.writeHead(err.statusCode, {'Content-Type': 'text/plain'});
            res.end(err.message)
          } else {
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end('Internal server error');
          }
        } else {
          if (isSourceMapRequest) {
            var map = JSON.stringify(sourceMap, null, ' ');
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Content-Length': map.length,
              'Pragma': 'no-cache'
            });
            res.end(map, 'utf8');
          } else {
            var mapUrl = options.mapPath.slice(0,options.mapPath-1) + req.path;
            res.writeHead(200, {
              'Content-Type': 'application/javascript',
              'Content-Length': length,
              'SourceMap': mapUrl,
              'X-SourceMap': mapUrl
            });
            res.end(js, 'utf8');
          }
        }
      };

      return moduleServer(modules, exlude, onJs, {
        createSourceMap: isSourceMapRequest,
        sourceMapSourceRootUrlPrefix: req.protcol + "://" + req.host + options.path,
        debug: options.debug,
        onLog: function() {
          console.log(arguments);
        }
      });
    };


    // Setup the module server
    go.from(
      path.normalise(options.srcDir + '/build'),
      path.normalise(options.srcDir + options.srcMap),
      run
    );
  }
}
