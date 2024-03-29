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
               res.status(200).send("Asset Data "+ req.body.asset_name+ " has been successfully inserted.");
           }); // end of query

    }); // end of pool
}); // end of func

// A1 insert condition info
crud.post('/insertConditionInformation',function(req,res){

    pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        }

		// get parameters
        let asset_name =  req.body.asset_name ;
        let condition_description  =  req.body.condition_description;

        var querystring = "INSERT into cege0043.asset_condition_information (asset_id, condition_id) values (";
		querystring += "(select id from cege0043.asset_information where asset_name = $1),(select id from cege0043.asset_condition_options where condition_description = $2))";


        client.query(querystring, [asset_name,condition_description],function(err,result) {
                done();
                if(err){
                   console.log(err);
                   res.status(400).send(err);
               }
               res.status(200).send("Condition reports for "+ req.body.asset_name+ " has been successfully inserted.");
           }); // end of query

    }); // end of pool
}); // end of func


 module.exports = crud;