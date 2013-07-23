var express = require('express');
var fs = require('fs');

var app = express.createServer(express.logger());

app.get('/', function(request, response) {
  buf = fs.readFileSync('simple.html');
  response.send(buf.toString());
});

app.use('/static', express.static(__dirname + '/static'));

var port = process.env.PORT || 8080;
app.listen(port, function() {
  console.log("Listening on " + port);
});
