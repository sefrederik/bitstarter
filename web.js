var express = require('express');
var fs = require('fs');

var app = express.createServer(express.logger());

app.use('/static', express.static(__dirname + '/static'));
app.use(express.bodyParser());

app.get('/', function(request, response) {
  buf = fs.readFileSync('simple.html');
  response.send(buf.toString());
});

app.post('/email/add', function(request, response) {
  var line = new Date() + ';'; 
  line += request.connection.remoteAddress + ';';
  line += request.headers['X-Forwarded-For'] + ';';
  line += request.body.email.replace('\n', '') + '\n';
  console.log(line);
  response.end();
});


var port = process.env.PORT || 8080;
app.listen(port, function() {
  console.log("Listening on " + port);
});
