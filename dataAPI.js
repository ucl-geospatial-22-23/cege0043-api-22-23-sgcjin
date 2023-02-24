"use strict";
// express is the server that forms part of the nodejs program

let express = require('express');
let path = require("path");
let app = express();
let fs = require('fs');
// add an https server to serve files
let http = require('http');
let httpServer = http.createServer(app);
httpServer.listen(4480);
app.get('/',function (req,res) {
res.send("hello world from the Data API ");
});

// adding functionality to allow cross-origin queries
app.use(function(req, res, next) {
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Headers", "X-Requested-With");
res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
next();
});

// adding functionality to log the requests
app.use(function (req, res, next) {
let filename = path.basename(req.url);
let extension = path.extname(filename);
console.log("The file " + filename + " was requested.");

next();
});

const geoJSON = require('./routes/geoJSON');
app.use('/geojson', geoJSON);