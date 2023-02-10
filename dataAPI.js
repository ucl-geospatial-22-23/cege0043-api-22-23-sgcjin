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
res.send("hello world from the Data API "+ now());
});
