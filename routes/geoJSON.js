"use strict";
let express = require('express');
let pg = require('pg');
let geoJSON = require('express').Router();
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
geoJSON.use(bodyParser.urlencoded({ extended: true }));



// A0 Get the condition status list
geoJSON.get('/conditionDetails', function (req,res) {
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

// A2 get only the geoJSON asset locations for a specific user_id

geoJSON.get('/userAssets/:user_id', function (req,res) {
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
geoJSON.get('/userConditionReports/:user_id', function (req,res) {
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
geoJSON.get('/userRanking/:user_id', function (req,res) {
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
geoJSON.get('/assetsInGreatCondition', function (req,res) {
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
geoJSON.get('/dailyParticipationRates', function (req,res) {
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

// S2: showing the 5 assets closest to the user’s current location, added by any user
geoJSON.get('/userFiveClosestAssets/:latitude/:longitude', function (req,res) {
	pool.connect(function(err,client,done) {
		if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
	var latitude = req.params.latitude;
	var longitude = req.params.longitude;

	var querystring = "SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features FROM (SELECT 'Feature' As type , ST_AsGeoJSON(lg.location)::json As geometry, row_to_json((SELECT l FROM (SELECT id, asset_name, installation_date) As l )) As properties FROM (select c.* from cege0043.asset_information c inner join (select id, st_distance(a.location, st_geomfromtext('POINT("+longitude+" "+latitude+")',4326)) as distance from cege0043.asset_information a order by distance asc limit 5) b on c.id = b.id ) as lg) As f"		

		client.query(querystring,function(err,result) {
               done(); 
               if(err){
                   console.log(err);
                   res.status(400).send(err);
               }
				let geoJSONData = JSON.stringify(result.rows);
				// the data from PostGIS is surrounded by [ ] which doesn't work in QGIS, so remove
				geoJSONData = geoJSONData.substring(1); 
				geoJSONData = geoJSONData.substring(0, geoJSONData.length - 1);         
				console.log(geoJSONData);
				res.status(200).send(JSON.parse(geoJSONData));
           }); // end of query
		   
	});// end of pool
});// end of func

// S3: showing the last 5 reports that the user created
geoJSON.get('/lastFiveConditionReports/:user_id', function (req,res) {
	pool.connect(function(err,client,done) {
		if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
		var user_id = req.params.user_id;

	var querystring = "SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features FROM (SELECT 'Feature' As type , ST_AsGeoJSON(lg.location)::json As geometry, row_to_json((SELECT l FROM (SELECT id,user_id, asset_name, condition_description ) As l )) As properties FROM (select * from cege0043.condition_reports_with_text_descriptions where user_id = $1 order by timestamp desc limit 5) as lg) As f"		

		client.query(querystring,[user_id],function(err,result) {
               done(); 
               if(err){
                   console.log(err);
                   res.status(400).send(err);
               }
				let geoJSONData = JSON.stringify(result.rows);
				// the data from PostGIS is surrounded by [ ] which doesn't work in QGIS, so remove
				geoJSONData = geoJSONData.substring(1); 
				geoJSONData = geoJSONData.substring(0, geoJSONData.length - 1);         
				console.log(geoJSONData);
				res.status(200).send(JSON.parse(geoJSONData));
           }); // end of query
		   
	});// end of pool
});// end of func

// S4: generate a list of the user's assets for which no condition report exists
geoJSON.get('/conditionReportMissing/:user_id', function (req,res) {
	pool.connect(function(err,client,done) {
		if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
		var user_id = req.params.user_id;

	var querystring = "SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features FROM (SELECT 'Feature' As type , ST_AsGeoJSON(lg.location)::json As geometry, row_to_json((SELECT l FROM (SELECT asset_id, asset_name, installation_date, latest_condition_report_date, condition_description) As l )) As properties FROM (select * from cege0043.asset_with_latest_condition where user_id = $1 and asset_id not in ( select asset_id from cege0043.asset_condition_information where user_id = $1 and timestamp > NOW()::DATE-EXTRACT(DOW FROM NOW())::INTEGER-3) ) as lg) As f"		

		client.query(querystring,[user_id],function(err,result) {
               done(); 
               if(err){
                   console.log(err);
                   res.status(400).send(err);
               }
				let geoJSONData = JSON.stringify(result.rows);
				// the data from PostGIS is surrounded by [ ] which doesn't work in QGIS, so remove
				geoJSONData = geoJSONData.substring(1); 
				geoJSONData = geoJSONData.substring(0, geoJSONData.length - 1);         
				console.log(geoJSONData);
				res.status(200).send(JSON.parse(geoJSONData));
           }); // end of query
		   
	});// end of pool
});// end of func








module.exports = geoJSON;
