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
               res.status(200).send("Form Data "+ req.body.asset_name+ " has been inserted");
           }); // end of query

    }); // end of pool
}); // end of func


// A2 get only the geoJSON asset locations for a specific user_id

crud.get('/userAssets/:user_id', function (req,res) {
	pool.connect(function(err,client,done) {
		if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
		var colnames = "asset_id, asset_name, installation_date, latest_condition_report_date, condition_description";  
		var user_id = req.params.user_id;
	

	var querystring = "SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM ";
	querystring += "(SELECT 'Feature' As type, ST_AsGeoJSON(lg.location)::json As geometry, ";
	querystring += "row_to_json((SELECT l FROM (SELECT "+colnames+") As l)) As properties ";
	querystring += "FROM cege0043.asset_with_latest_condition As lg ";
	querystring += "WHERE user_id = $1 limit 100) As f ";
		

		client.query(querystring,[user_id],function(err,result) {
               done(); 
               if(err){
                   console.log(err);
                   res.status(400).send(err);
               }
			   console.log(result.rows);
               let geoJSONData = JSON.stringify(result.rows);
				// the data from PostGIS is surrounded by [ ] which doesn't work in QGIS, so remove
				geoJSONData = geoJSONData.substring(1); 
				geoJSONData = geoJSONData.substring(0, geoJSONData.length - 1);         
				console.log(geoJSONData);
				res.status(200).send(JSON.parse(geoJSONData));
           }); // end of query
		   
	});// end of pool
});// end of func

// A3 user is told how many condition reports they have saved

crud.get('/userConditionReports/:user_id', function (req,res) {
	pool.connect(function(err,client,done) {
		if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
		var user_id = req.params.user_id;

	var querystring = "select array_to_json (array_agg(c)) from (SELECT COUNT(*) AS num_reports from cege0043.asset_condition_information where user_id = $1) c;"		

		client.query(querystring,[user_id],function(err,result) {
               done(); 
               if(err){
                   console.log(err);
                   res.status(400).send(err);
               }
				res.status(200).send(result.rows);
           }); // end of query
		   
	});// end of pool
});// end of func

// S1: user is given their ranking 
crud.get('/userRanking/:user_id', function (req,res) {
	pool.connect(function(err,client,done) {
		if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
		var user_id = req.params.user_id;
	

	var querystring = "select array_to_json (array_agg(hh)) from (select c.rank from (SELECT b.user_id, rank()over (order by num_reports desc) as rank from (select COUNT(*) AS num_reports, user_id from cege0043.asset_condition_information group by user_id) b) c where c.user_id = $1) hh;"		

		client.query(querystring,[user_id],function(err,result) {
               done(); 
               if(err){
                   console.log(err);
                   res.status(400).send(err);
               }
				res.status(200).send(result.rows);
           }); // end of query
		   
	});// end of pool
});// end of func

// L1: list of all the assets with at least one report saying that they are in the best condition
crud.get('/assetsInGreatCondition', function (req,res) {
	pool.connect(function(err,client,done) {
		if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
		let querystring = "select array_to_json (array_agg(d)) from (select c.* from cege0043.asset_information c inner join  (select count(*) as best_condition, asset_id from cege0043.asset_condition_information where condition_id in (select id from cege0043.asset_condition_options where condition_description like '%very good%') group by asset_id order by best_condition desc) b on b.asset_id = c.id) d;";
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

// L2: daily reporting rates for the past week
crud.get('/dailyParticipationRates', function (req,res) {
	pool.connect(function(err,client,done) {
		if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
		let querystring = "select  array_to_json (array_agg(c)) from (select day, sum(reports_submitted) as reports_submitted, sum(not_working) as reports_not_working from cege0043.report_summary group by day) c ";
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


 module.exports = crud;