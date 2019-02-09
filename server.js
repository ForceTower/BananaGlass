require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const routes = require('./config/routes');


const app = express();
app.set('port', process.env.PORT || 3000);
app.use(bodyParser.json());

app.get('/', function (req, res) {
  res.send({ success: "Mas é claro que sim!"})
})


const server = http.createServer(app);
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});