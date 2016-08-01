var express = require('express');
var app = express();
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var router = express.Router();

var amazonS3 = require('./server/controllers/profilePicture');

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
	res.send("hello");
})

router.post('/photos', multipartMiddleware, amazonS3.uploadPhoto);
app.use('/', router);

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
