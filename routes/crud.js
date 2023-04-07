"use strict";
let express = require('express');
let pg = require('pg');
let crud = require('express').Router();
 let fs = require('fs');


let os = require('os');
 const userInfo = os.userInfo();
 const username = userInfo.username;
 console.log(username);
 // locate the database login details
 let configtext = ""+fs.readFileSync("/home/"+username+"/certs/postGISConnection.js");
 
 // now convert the configruation file into the correct format -i.e. a name/value pair array
 let configarray = configtext.split(",");
 let config = {};
 for (let i = 0; i < configarray.length; i++) {
 let split = configarray[i].split(':');
 config[split[0].trim()] = split[1].trim();
 }
 let pool = new pg.Pool(config);
 console.log(config);
 
 const bodyParser = require('body-parser');
crud.use(bodyParser.urlencoded({ extended: true }));

// test endpoint for GET requests (can be called from a browser URL or AJAX)
 crud.get('/testCRUD',function (req,res) {
 res.json({message:req.originalUrl+" " +"GET REQUEST"});
 });

 // test endpoint for POST requests - can only be called from AJAX
 crud.post('/testCRUD',function (req,res) {
 res.json({message:req.body});
 });
 
 
// A0 get user ids

crud.get('/userId', function (req,res) {
	pool.connect(function(err,client,done) {
		if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
		let querystring = "select user_id from ucfscde.users where user_name = current_user;";
		// query user id
		client.query(querystring ,function(err,result) {
               done(); 
               if(err){
                   console.log(err);
                   res.status(400).send(err);
               }
               res.status(200).send(result.rows);
           }); // end of query
		   
	});// end of pool
});// end of func
	
// A1 Get the condition status list
crud.get('/conditionDetails', function (req,res) {
	pool.connect(function(err,client,done) {
		if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
		let querystring = "select * from cege0043.asset_condition_options;";
		// query user id
		client.query(querystring ,function(err,result) {
               done(); 
               if(err){
                   console.log(err);
                   res.status(400).send(err);
               }
               res.status(200).send(result.rows);
           }); // end of query
		   
	});// end of pool
});// end of func

// A1 insert asset point
crud.post('/insertAssetPoint',function(req,res){

    pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }

		// get parameters
        let asset_name =  req.body.asset_name ;
        let installation_date =  req.body.installation_date ;

        var geometrystring = "st_geomfromtext('POINT("+req.body.longitude+ " "+req.body.latitude +")',4326)";
		var querystring = "INSERT into cege0043.asset_information (asset_name,installation_date, location) values ";
		querystring += "($1,$2,";
		querystring += geometrystring + ")";


        client.query(querystring, [asset_name,installation_date],function(err,result) {
                done();
                if(err){
                   console.log(err);
                   res.status(400).send(err);
               }
               res.status(200).send("Form Data "+ req.body.asset_name+ " has been inserted");
           }); // end of query

    }); // end of pool
}); // end of func













 
 module.exports = crud;