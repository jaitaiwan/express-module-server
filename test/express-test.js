var express = require('express'),
  app = express(),
  server = require('http').createServer(app),
  expressModuleServer = require('../express-module-server');

app.configure('development', function() {
    app.use(expressModuleServer({demo: true}));
});

app.get('/',function (req, res, next) {
  res.send(200, 'Hello World');
})

app.listen(1337)