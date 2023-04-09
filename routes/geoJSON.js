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





	
    geoJSON.route('/testGeoJSON').get(function (req,res) {
        res.json({message:req.originalUrl});
    });

    geoJSON.get('/postgistest', function (req,res) {
    pool.connect(function(err,client,done) {
           if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
	   let query = "select * from information_schema.tables";
 
           client.query(query ,function(err,result) {
               done(); 
               if(err){
                   console.log(err);
                   res.status(400).send(err);
               }
               res.status(200).send(result.rows);
           });
        });
    });

geoJSON.get('/postgistest_parameters', function (req,res) {
pool.connect(function(err,client,done) {
       let schemaname = 'ucfscde';
        let tabletype ='BASE TABLE';
       if(err){
           console.log("not able to get connection "+ err);
           res.status(400).send(err);
       } 
      let query = 'select * from information_schema.tables where table_schema = $1 and table_type =$2' ;
       client.query(query, [schemaname,tabletype],function(err,result) {
           done(); 
           if(err){
               console.log(err);
               res.status(400).send(err);
           }
           res.status(200).send(result.rows);
       });
    });
});

geoJSON.get('/getRoom', function (req,res) {
    pool.connect(function(err,client,done) {
           if(err){
               console.log("not able to get connection "+ err);
               res.status(400).send(err);
           } 
	let querystring = "SELECT 'FeatureCollection'";
	querystring = querystring + " as type, array_to_json(array_agg(f)) As features ";
	querystring = querystring + " FROM (SELECT 'Feature' As type , ST_AsGeoJSON(lg.location)::json As geometry , ";
	querystring = querystring + "row_to_json(lp) As properties FROM ucfscde.rooms As lg INNER JOIN (SELECT room_id, room_use, building_id FROM ucfscde.rooms)  ";
	querystring = querystring + "   As lp ON lg.room_id = lp.room_id ) As f";

           client.query(querystring,function(err,result) {
               done(); 
               if(err){
                   console.log(err);
                   res.status(400).send(err);
               }
               res.status(200).send(result.rows);
           });
        });
    });


geoJSON.get('/:schemaname/:tablename/:idcolumn/:geomcolumn', function (req,res) {
     pool.connect(function(err,client,done) {
        if(err){
            console.log("not able to get connection "+ err);
            res.status(400).send(err);
        } 

        let colnames = "";

        // first get a list of the columns that are in the table 
        // use string_agg to generate a comma separated list that can then be pasted into the next query
        let tablename = req.params.tablename;
	let schema = req.params.schemaname;
	let idcolumn = req.params.idcolumn;
        let geomcolumn = req.params.geomcolumn;
        let querystring = "select string_agg(colname,',') from ( select column_name as colname ";
        querystring = querystring + " FROM information_schema.columns as colname ";
        querystring = querystring + " where table_name   =$1";
        querystring = querystring + " and column_name <> $2 and table_schema = $3 and data_type <> 'USER-DEFINED') as cols ";

            console.log(querystring);
            
            // now run the query
            client.query(querystring,[tablename,geomcolumn,schema], function(err,result){
              if(err){
                console.log(err);
                    res.status(400).send(err);
            }
            let thecolnames = result.rows[0].string_agg;
            colnames = thecolnames;
            console.log("the colnames "+thecolnames);

            let cols = colnames.split(",");
                        let colString="";
                        for (let i =0; i< cols.length;i++){
                            console.log(cols[i]);
                            colString = colString + JSON.stringify(cols[i]) + ",";
                        }
                        console.log(colString);

                        //remove the extra comma
                        colString = colString.substring(0,colString.length -1);

            // now use the inbuilt geoJSON functionality
            // and create the required geoJSON format using a query adapted from here:  
            // http://www.postgresonline.com/journal/archives/267-Creating-GeoJSON-Feature-Collections-with-JSON-and-PostGIS-functions.html, accessed 4th January 2018
            // note that query needs to be a single string with no line breaks so built it up bit by bit


	// to overcome the polyhedral surface issue, convert them to simple geometries
	// assume that all tables have an id field for now - to do add the name of the id field as a parameter
	querystring = "SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features  FROM ";
	querystring += "(select 'Feature' as type, x.properties,st_asgeojson(y.geometry)::json as geometry from ";
	querystring +=" (select "+idcolumn+", row_to_json((SELECT l FROM (SELECT "+colString + ") As l )) as properties   FROM "+schema+"."+JSON.stringify(tablename) + " ";


	querystring += " ) x";
	querystring +=" inner join (SELECT "+idcolumn+", c.geom as geometry";

	querystring +=" FROM ( SELECT "+idcolumn+", (ST_Dump(st_transform("+JSON.stringify(geomcolumn)+",4326))).geom AS geom ";

	querystring +=" FROM "+schema+"."+JSON.stringify(tablename)+") c) y  on y."+idcolumn+" = x."+idcolumn+") f";
	console.log(querystring);

            // run the second query
            client.query(querystring,function(err,result){
              //call `done()` to release the client back to the pool
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
        });
        
        });
    });
});


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
