module.exports = function (options) {
  // Lets setup our options
  var setDefaults = require('underscore').defaults,
      defaults = {
        path: "/_js/", // Path that concatenated js will be requested
        mapPath: "/_sourceMap/", // Path for requesting source maps
        srcPath: "/_source/",  // Path to get source js
        srcDir: "client/src", // Local path of source scripts
        srcMap: "/module-graph.json", // Local path of dependency layout
        mapDir: "client/maps", // Local path of generated source maps
        sourceMaps: true, // should we enable source mapping
        debug: false, // should debugging be turned on
        demo: false, // enables serving of demo.html
        hooks: {}
      };

  // Make sure all the options are there
  setDefaults(options, defaults);
  middleware = function (req, res, next) {
    // Get our utility belt ready
    var Route = require('express/lib/router/route'),
        jsRoute = new Route('', options.path + "*:request"),
        mapRoute = new Route('', options.mapPath + "*:request"),
        sourceRoute = new Route('', options.srcPath + "*:request"),
        path = require('path');
    
    // Statically serve files
    var modulePath = (options.demo) ? '/' : options.srcPath,
        LABjsPath = (options.demo) ? '/third-party/LABjs/' : options.srcPath,
        moduleClientRoute = new Route('', modulePath + 'module-client.js'),
        LABjsRoute = new Route('', LABjsPath + 'LAB.src.js'),
        demoRoute = new Route('', '/demo.html'),
        fs = require('fs');
    req.pathname = req.originalUrl;
    // Return static files
    if(moduleClientRoute.match(req.pathname)) {
      // Server module-client.js
      fs.readFile(__dirname + '/node_modules/module-server/clients/module-client.js', 'utf8', function(err, js) {
        if(err) { console.log(err); return; }
        res.writeHead(200, {
          'Content-Type': 'application/javascript',
        });
        res.end(js, 'utf8');
      });
      return;
    } else if (LABjsRoute.match(req.pathname)) {
      // Serve Lab.js
      fs.readFile(__dirname + '/node_modules/module-server/clients/third-party/LABjs/LAB.src.js', 'utf8', function(err, js) {
        if(err) { console.log(err); return; }
        res.writeHead(200, {
          'Content-Type': 'application/javascript',
        });
        res.end(js, 'utf8');
      });
      return;
    } else if (options.demo && demoRoute.match(req.pathname)) {
      // Serve demo.html
      // Make sure to dynamically generate demo paths | string replace
      fs.readFile(__dirname + '/node_modules/module-server/clients/test/demo.html', 'utf8', function(err, html) {
        if(err) { console.log(err); return; }
        host = req.get('Host');
        html = html.replace('http://127.0.0.1:1337/','http://'+host+options.path);
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Content-Length': html.length
        });
        res.end(html, 'utf8');
      });
      return;
    }
    /**/

    // Main grunt/worker function
    var self = options;
    run = function (err, moduleServer) {
      if(err) {
        throw err;
      }
      var options = self,
          isSourceMapRequest = false;
      if (jsRoute.match(req.pathname)) {
        // Get JS Modules
        if(typeof options.hooks.beforeJS == 'function') options.hooks.beforeJS(req, res, next); 
        req.pathname = req.pathname.replace(options.path,'/');
      } else if (mapRoute.match(req.pathname)) {
        // Get JS Maps
        if(options.sourceMaps == false) {
          console.warn('Source Maps are off. Passing responsibility');
          return next();
        }
        isSourceMapRequest = true;
        req.pathname = req.pathname.replace(options.mapPath,'/');
        if(typeof options.hooks.beforeMap == 'function') options.hooks.beforeMap(req, res, next);
      } else if (sourceRoute.match(req.pathname)) {
        // Get Source JS
        if(typeof options.hooks.beforeSource == 'function') options.hooks.beforeSource(req, res, next);
        var tempPath = req.path;
        tempPath = tempPath.split(/\//);
        tempPath.shift();
        tempPath = tempPath.join("/");
        res.sendfile(path.normalize(__dirname + "/" + options.srcDir + tempPath));
        res.end();
      } else {
        return next();
      }
      var urlpath = req.pathname;
      urlpath = urlpath.replace(/^\//, '');
      var parts = urlpath.split(/\//);
      var modules = decodeURIComponent(parts.shift()).split(/,/);
      var opt = {};
      parts.forEach(function(part) {
        var pair = part.split(/=/);
        opt[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
      });
      var exclude = null;
      if(opt.exm) {
        exclude = opt.exm.split(/,/);
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

      return moduleServer(modules, exclude, onJs, {
        createSourceMap: isSourceMapRequest,
        sourceMapSourceRootUrlPrefix: req.protcol + "://" + req.host + options.path,
        debug: options.debug,
        onLog: function() {
          if(options.debug) console.log(arguments);
        }
      });
    };


    // Setup the module server
    var go = require('module-server'),
        srcMapPath = (options.demo) ? './node_modules/module-server/test/fixtures/sample-module/' : options.srcDir,
        srcMap = (options.demo) ? 'module-graph.json' : options.srcMap,
        srcDir = (options.demo) ? './node_modules/module-server/test/fixtures' : options.srcDir;
    go.from(
      path.normalize(srcDir + '/build'),
      path.normalize(srcMapPath + srcMap),
      run
    );
  }
  return middleware;
};
