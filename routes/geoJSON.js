"use strict";
const express = require('express');
 const pg = require('pg');
 const geoJSON = require('express').Router();
 const fs = require('fs');

 // get the username - this will ensure that we can use the same code on multiple machines
 const os = require('os');
 const userInfo = os.userInfo();
 const username = userInfo.username;
 
  console.log(username);
 // locate the database login details
 const configtext = ""+fs.readFileSync("/home/"+username+"/certs/postGISConnection.js");
 // now convert the configuration file into the correct format -i.e. a name/value pair array
 const configarray = configtext.split(",");
 let config = {};
 for (let i = 0; i < configarray.length; i++) {
 let split = configarray[i].split(':');
 config[split[0].trim()] = split[1].trim();
 }
 const pool = new pg.Pool(config);
 console.log(config);
 
 geoJSON.route('/testGeoJSON').get(function (req,res) {
 res.json({message:req.originalUrl});
 });

 geoJSON.get('/postgistest', function (req,res) {
 pool.connect(function(err,client,done) {
 if(err){
 console.log("not able to get connection "+ err);
 res.status(400).send(err);
 }
 client.query(' select * from information_schema.columns' ,function(err,result) {
 done();
 if(err){
 console.log(err);
 res.status(400).send(err);
 }
 res.status(200).send(result.rows);
 });
 });
 });


module.exports = geoJSON;
