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
    express-module-server = require('express-module-server');

  app.configure 'development', ->
      app.use(express-module-server({ 
        path: "/_js/",  // requested module path
        mapPath: "/_sourceMap/",  // requested source map path
        srcPath: "/_source/", // request source js path
        srcDir: "client/src", // js src directory
        srcMap: "/module-graph.json", // js dependency file
        mapDir: "client/maps", // map src directory
        sourceMaps: true, // use source maps?
        debug: false // are we debugging?
    })
  );

  app.get('/',function (req, res, next) {
    res.send(200, 'Hello World');
  })

  app.listen(1337)
```

More dock to come. (Above dock assumes knowledge of module-server's demo-server.js)
