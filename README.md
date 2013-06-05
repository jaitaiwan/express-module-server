express-module-server
======

express-module-server is a middleware component for expressjs which allows you to serve javascript modules and their dependencies in one big go. Any additional components that need to load after the fact can be loaded without having to resend dependencies.

This work implements google's module-server and provides nice express candy so you don't have to deal with all the funk.

Use
---

**Basic Express Server with express-module-server middleware:**
```javascript
  var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    expressModuleServer = require('express-module-server');

  app.configure('development', function() {
      app.use(expressModuleServer({ 
        // Below are defaults provided by the module
        path: "/_js/", // Path that concatenated js will be requested
        mapPath: "/_sourceMap/", // Path for requesting source maps
        srcPath: "/_source/",  // Path to get source js
        srcDir: "client/src", // Local path of source scripts
        srcMap: "/module-graph.json", // Local path of dependency layout
        mapDir: "client/maps", // Local path of generated source maps
        sourceMaps: true, // should we enable source mapping
        debug: false, // should debugging be turned on
        demo: false // enables serving of demo.html
    }));
  });

  app.get('/',function (req, res, next) {
    res.send(200, 'Hello World');
  })

  app.listen(1337)
```

More documentation to come. (Above documentation assumes knowledge of module-server's demo-server.js)
