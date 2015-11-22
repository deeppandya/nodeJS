var express = require('express');
var app = express();
var assert = require('assert');
var mongodb = require('mongodb');
var fs = require('fs');
var logFileName = 'log.text';
//We need to work with "MongoClient" interface in order to connect to a mongodb server.
var MongoClient = mongodb.MongoClient;

var googleApiKey='AIzaSyA2Evw0g-aHXhjge-yiSlNRLWLhxpAjMkc';

// Connection URL. This is where your mongodb server is running.
var url = 'mongodb://159.203.1.98:27017/dmDB';

var bodyParser = require('body-parser');
//Name of the collection

//for push notifications
var gcm = require('node-gcm');

app.use(bodyParser());

/*var gcm = require('node-gcm');
 
var message = new gcm.Message();
 
message.addData('key1', 'msg1');
 
var regTokens = ['YOUR_REG_TOKEN_HERE'];
 
// Set up the sender with you API key 
var sender = new gcm.Sender('YOUR_API_KEY_HERE');
 
// Now the sender can be used to send messages 
sender.send(message, { registrationTokens: regTokens }, function (err, result) {
    if(err) console.error(err);
    else    console.log(result);
});
 
// Send to a topic, with no retry this time 
sender.sendNoRetry(message, { topic: '/topics/global' }, function (err, result) {
    if(err) console.error(err);
    else    console.log(result);
});*/


function writeToFile(data){
	var currentTime = new Date();
	var str=currentTime + "\n" + data + "\n\n";
	fs.appendFile(logFileName, data,  function(err) {
	   if (err) {
		   return console.error(err);
	   }	   
	});
}

/*
//try
var maxID;
MongoClient.connect(url, function(err, db){
	if(err) throw err;
	
	console.log("okay");
	
	var result=db.collection("driver").count();
	console.log(result);
	
	
	db.collection("practice").find({},{limit:1, sort:{_id:-1}}).toArray(function(err,doc){
		console.log(doc[0]._id);
		//maxID=doc[0]._id+1;
		//console.log("new is:"+maxID);
	});
	
	
});
*/

//try ends

//this will be called by delivery company to select driver for delivery
app.post('/sendPushNotification', function(req, res){
	console.log("inside sendPushNotification");	
	var sourceComponent = req.body.sourceComponent;	//0-restaurant, 1-dCompany, 2-driver
	var sourceID = parseInt(req.body.sourceID);	
	
	var destinationComponent = req.body.destinationComponent;	//0-restaurant, 1-dCompany, 2-driver
	var destinationID = parseInt(req.body.destinationID);	
	console.log("destinationID is:: "+destinationID);
	var msg=req.body.msg;
	var message = new gcm.Message();
	message.addData('key1', msg);
	
	sendPushNotification(sourceComponent,sourceID,destinationComponent,destinationID,res,message);
	
	
})

function sendPushNotification(sourceComponent,sourceID,destinationComponent,destinationID,res,message)
{
	var myCollection;
	if(destinationComponent=='0'){
	
	}else if(destinationComponent=='1'){
		myCollection='deliveryCompany';
	}else if(destinationComponent=='2'){
		myCollection='driver';
	}
	
	//fetch gcmid for the driver with id = driverID
	MongoClient.connect(url, function (err,db){
		assert.equal(null, err);
		var query={"_id":destinationID};
		db.collection(myCollection).findOne(query, function(err, docs){
			if(err)
			{
				writeToFile(err);
				db.close();
				res.end("0");	
			}else{
				//docs is json object so no need to parse it
				console.log(docs.gcmid);
				
				
				var regTokens = [docs.gcmid];
				 
				// Set up the sender with you API key 
				var sender = new gcm.Sender(googleApiKey);
				 
				// Now the sender can be used to send messages 
				sender.send(message, { registrationTokens: regTokens }, function (err, result) {
					if(err) console.error(err);
					else    console.log(result);
				});
				res.end("1");
			}
		})
		
	});
}

app.post('/addDeliveryRequest',function(req, res){
	var myCollection='deliveryRequest';
	var reqid;
	var deliverCompany_id = parseInt(req.body.deliverCompany_id);
	var deliveryAddress = req.body.deliveryAddress;
	var restaurant_id = parseInt(req.body.restaurant_id);
	var preDate = req.body.preDate;
	var isPre = req.body.isPre;
	
	console.log("connected to addDeliveryRequest");
	
	MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
        
		
		var maxID=0;
		//boolean isError=false;
		var id=0;
		
		//check if collection is empty
		db.collection(myCollection).count(function(err,count){
			
			if(err){
				writeToFile(err);
				db.close();
				res.end();
			}
			else{	//if count=0; db is empty so maxID = 0
				if(count===0){
					console.log("collection is empty");
					maxID=0;	
					id=maxID;
					console.log("id is:"+id);
					id=id+1;
					var obj = { "_id": id, "deliveryCompany_id": deliverCompany_id, "deliveryAddress": deliveryAddress,"driver_id":0, "restaurant_id": restaurant_id,"status":0,"preDate":preDate,"isPre":isPre};
						
					db.collection(myCollection).insertOne(obj, function (err, r) {
						db.close();
						if(err)
						{
							console.log(err); 
							res.end("0");
						}
						else{
							console.log(obj);
							var message = new gcm.Message();
							message.addData('requestID', id);
							message.addData('restaurantID', restaurant_id);
							message.addData('deliveryAddress', deliveryAddress);
							message.addData('preDate', preDate);
							message.addData('isPre', isPre);
							sendPushNotification(0,restaurant_id,1,deliverCompany_id,res,message);
							res.send(obj);
							res.end();
						}	
					});		//insert callback ends
				}else{	//initialize maxID 
					db.collection(myCollection).find({},{limit:1, sort:{"_id":-1}}).toArray(function(err, docs){
						if(err){
							writeToFile(err);
							db.close();
							res.end("0");
						}
						else{
							maxID=docs[0]._id;
							console.log("maxID is:"+maxID);
							id=parseInt(maxID);
							console.log("id is:"+id);
							id=id+1;
							var obj = { "_id": id, "deliveryCompany_id": deliverCompany_id, "deliveryAddress": deliveryAddress,"driver_id":0, "restaurant_id": restaurant_id,"status":0,"preDate":preDate,"isPre":isPre};
						
							db.collection(myCollection).insertOne(obj, function (err, r) {
								db.close();
								if(err)
								{
									console.log(err); 
									res.end("0");
								}
								else{
									console.log(obj);
									var message = new gcm.Message();
									message.addData('requestID', id);
									message.addData('restaurantID', restaurant_id);
									message.addData('deliveryAddress', deliveryAddress);
									message.addData('preDate', preDate);
									message.addData('isPre', isPre);
									sendPushNotification(0,restaurant_id,1,deliverCompany_id,res,message);
									res.send(obj);
									res.end();
								}	
							});	//insert callback ends
						}
									
					});			//find callback ends
				
				}
			}			
		});		//count callback ends
		
	});		//mongodb connect callback ends
	
	
})

//each component will call this to update their gcm registration id for the first time
app.post('/updateGcmID',function(req, res){
	var _id = parseInt(req.body.id);		//int
	var gcmid = req.body.gcmid;
	var component = req.body.component;	//0-restaurant owner; 1-deliveryCompany; 2-driver
	
	if(component=="0"){
		updateGCMID("restaurant",_id,gcmid,res);
	}else if(component=="1"){	//dCompany
		updateGCMID("deliveryCompany",_id,gcmid,res);
	}else if(component=="2"){	//driver
		updateGCMID("driver",_id,gcmid,res);
	}	
	
	
})

function updateGCMID(collection,_id,gcmid,res)
{
	MongoClient.connect(url, function(err, db){
		console.log("Connected correctly to updateGcmId");
			assert.equal(null, err);
			db.collection(collection).updateOne(
            { "_id": _id }, 
            { $set: {"gcmid":gcmid} }, function (err, r) {
				db.close();
                if(err)
				{
					writeToFile(err);
					console.log(err); 
					res.end("0");
				}
				else{
					res.end("1"); 
				}					
            });
		});
}
/*
app.post('/addDriver', function (req, res) {
	
	var myCollection="driver";
	
    MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
        console.log("Connected correctly to addDriver");
		
		var uname = req.body.uname;
		var password = req.body.password;
		var name = req.body.name;
		var contact = req.body.contact;
		var companyID=req.body.companyID;
		var status=0;
		var lastID;
		//boolean isError=false;
		var id;
		
		db.collection(myCollection).find({},{ limit : 1, sort : { "_id" : -1 } }).toArray(function(err, docs) {
        if(err)
		{
			writeToFile(err);
			db.close();
			res.end("0");	
		}
		else{
			lastID=docs[0]._id;
			id=parseInt(lastID)+1;
			
			var driver = { "_id": id, "uname": uname, "pwd": password, "name": name,"contact":contact,"status":status,"companyID": companyID};
			
				db.collection(myCollection).insertOne(driver, function (err, r) {
					db.close();
					if(err)
					{
						writeToFile(err);
						console.log(err); 
						res.end("0");
					}
					else{
						console.log(driver);
						res.send(driver);
						res.end();
					}	
				});
		}
		});	
      });
	  	
		
		
})
*/


/*author:meet*/
app.post('/addNewDriver', function (req, res) {
	
	var myCollection="driver";
	
    MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
        console.log("Connected correctly to addDriver");
		
		var uname = req.body.uname;
		var password = req.body.password;
		var name = req.body.name;
		var contact = req.body.contact;
		var companyID=(parseInt(req.body.companyID));
		//var companyID=1;
		var status=0;
		var maxID=0;
		//boolean isError=false;
		var id=0;
		
		//check if collection is empty
		db.collection(myCollection).count(function(err,count){
			
			if(err){
				writeToFile(err);
				db.close();
				res.end();
			}
			else{	//if count=0; db is empty so maxID = 0
				if(count===0){
					console.log("collection is empty");
					maxID=0;	
					id=maxID;
					console.log("id is:"+id);
					id=id+1;
					var driver = { "_id": id, "uname": uname, "pwd": password, "name": name,"contact":contact,"status":status,"companyID": companyID,"location":
								{"latitude":"0.0","longitude":"0.0"}};
						
					db.collection(myCollection).insertOne(driver, function (err, r) {
						db.close();
						if(err)
						{
							console.log(err); 
							res.end("0");
						}
						else{
							console.log(driver);
							res.send(driver);
							res.end();
						}	
					});		//insert callback ends
				}else{	//initialize maxID 
					db.collection(myCollection).find({},{limit:1, sort:{"_id":-1}}).toArray(function(err, docs){
						if(err){
							writeToFile(err);
							db.close();
							res.end("0");
						}
						else{
							maxID=docs[0]._id;
							console.log("maxID is:"+maxID);
							id=parseInt(maxID);
							console.log("id is:"+id);
							id=id+1;
							var driver = { "_id": id, "uname": uname, "pwd": password, "name": name,"contact":contact,"status":status,"companyID": companyID,"location":
									{"latitude":"0.0","longitude":"0.0"}};
						
							db.collection(myCollection).insertOne(driver, function (err, r) {
								db.close();
								if(err)
								{
									console.log(err); 
									res.end("0");
								}
								else{
									console.log(driver);
									res.send(driver);
									res.end();
								}	
							});	//insert callback ends
						}
									
					});			//find callback ends
				
				}
			}	
			
			
		});		//count callback ends
		
	});		//mongodb connect callback ends

});

app.post('/addDeliveryCompany', function (req, res) {
    var myCollection = "deliveryCompany";
    console.log("in the addDeliveryCompany method");
    //var _id = req.body._id;
    var uname = req.body.uname;
    var password = req.body.password;
    var name = req.body.name;
    var contact = req.body.contact;
    var address = req.body.address;
    //var latitude = req.body.latitude;
    //var longitude = req.body.longitude;
    
	var lastID=0;
	//boolean isError=false;
    
    MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
        console.log("Connected correctly to server");
        
		db.collection(myCollection).findOne({},{fields:{'_id':1}}, function (err, item) {
            if (err) {
				writeToFile(err);
                console.log("error"+err);
                //isError=true;
				res.end("0");
            }
            else {
                lastID=item;
            }
        }).sort([["_id",-1]]).limit(1);
	
	
    var company = {"_id": (lastID+1), "uname": uname, "password": password, "name": name, "contact": contact,"address": address};
		
		//if(!isError)
		//{
			db.collection(myCollection).insertOne(company, function (err, r) {
				db.close();
                if(err)
				{
					writeToFile(err);
					console.log(err); 
					res.end("0");
				}
				else{
					res.end("1"); 
				}	
			});
		//}
		//else{
			//res.end("0");
		//}
    });
});

app.post('/addRestaurant', function (req, res) {
    var myCollection = "restaurant";
    console.log("in the addRestaurant method");
    var _id = req.body._id;
    var uname = req.body.uname;
    var password = req.body.password;
    var name = req.body.name;
    var details = req.body.details;
    var contact = req.body.contact;
    var address = req.body.address;
    var latitude = req.body.latitude;
    var longitude = req.body.longitude;
    
    var user = {
        "_id": _id, "uname": uname, "password": password, "name": name, "contact": contact, 
        "address": address, "location": { "latitude": latitude, "longitude": longitude }, "details": details
    };
    
    MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
        console.log("Connected correctly to server");
        // Insert a single document
        db.collection(myCollection).insertOne(user, function (err, r) {
            db.close();
                if(err)
				{
					console.log(err); 
					res.end("0");
				}
				else{
					res.end("1"); 
				}	
        });
    });
});

/*app.post('/addDriver', function (req, res) {
    var myCollection = "driver";
    console.log("in the addDriver method");
    var _id = req.body._id;
    var uname = req.body.uname;
    var password = req.body.password;
    var name = req.body.name;
    var companyID = req.body.companyID;
    var contact = req.body.contact;
    var latitude = req.body.latitude;
    var longitude = req.body.longitude;
    
    var user = {
        "_id": _id, "uname": uname, "password": password, "name": name, "contact": contact, 
        "location": { "latitude": latitude, "longitude": longitude }, "companyID": companyID
    };
    
    MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
        console.log("Connected correctly to server");
        // Insert a single document
        db.collection(myCollection).insertOne(user, function (err, r) {
            assert.equal(null, err);
            assert.equal(1, r.insertedCount);
            
            db.close();
        });
    });
    res.end("1");
});*/

app.post('/trypost', function (req, res) {
    console.log("in the post method");
    //console.log(req);
    var user_name = req.body.user;
    var password = req.body.password;
    console.log("User name = " + user_name + ", password is " + password);
    res.end("yes");
});

//check driver Login POST
app.post('/driverLogin', function (req, res) {
    var myCollection="driver";
	var username = req.body.uname;
    console.log(username);
    var password = req.body.password;
    console.log(password);
    
    var query = { 'uname': username ,'pwd':password};
    
    MongoClient.connect(url, function (err, db) {
        if(err){
			writeToFile(err);
			console.log(err);
		}
		
		
		//first update the status to 0,if in case its online; just to make sure that driver is offline when logs in for the first time
		db.collection(myCollection).updateOne(query,
		{$set:{'status':0}},function(err,item){
			writeToFile(err);
			console.log(err);
			//db.close();
		});
		
        //console.log("Connected correctly to server");        
        db.collection(myCollection).findOne(query, function (err, item) {
            if (err) {
				writeToFile(err);
                console.log(err);
                res.send(item);
                res.end();
            }
            else {
				console.log(JSON.stringify(item));
                res.send(item);
                res.end();
            }
        });
    });
});

//check restaurant Login POST
app.post('/restaurantLogin', function (req, res) {
    var myCollection="restaurant";
	var username = req.body.uname;
    console.log(username);
    var password = req.body.password;
    console.log(password);
    
    var query = { 'uname': username ,'pwd':password};
    
    MongoClient.connect(url, function (err, db) {
        if(err){
			writeToFile(err);
			console.log(err);
		}
		
		
        //console.log("Connected correctly to server");        
        db.collection(myCollection).findOne(query, function (err, item) {
            if (err) {
				writeToFile(err);
                console.log(err);
                res.send(item);
                res.end();
            }
            else {
				console.log(JSON.stringify(item));
                res.send(item);
                res.end();
            }
        });
    });
});


app.post('/deliveryCompanyLogin', function (req, res) {
    var myCollection="deliveryCompany";
	var username = req.body.uname;
    console.log(username);
    var password = req.body.password;
    console.log(password);
    
    var query = { 'uname': username ,'password':password};
    
    MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
		
        db.collection(myCollection).findOne(query, function (err, item) {
            if (err) {
                console.log(err);
                res.send(item);
                res.end();
            }
            else {
				console.log(JSON.stringify(item));
                res.send(item);
                res.end();
            }
        });
    });
});

app.post('/updateDriverLocation', function (req, res) {
    var myCollection = "driver";
    console.log("in the updateDriverLocation method");
    var _id = parseInt(req.body._id);
    var latitude = req.body.latitude;
    var longitude = req.body.longitude;
    console.log(_id+": "+ "latitude: " + latitude + "\tlongitude: " + longitude);
	console.log("Time: "+new Date().toUTCString());
	
	var driverLocation={ "latitude": latitude, "longitude": longitude };
    
    
    MongoClient.connect(url, function (err, db) {
        //assert.equal(null, err);
		writeToFile(err);
        console.log("Connected correctly to server");
        // Insert a single document
        
        db.collection(myCollection).updateOne(
            { "_id": _id }, 
            { $set: {"location":driverLocation} }, function (err, r) {
				db.close();
                if(err)
				{
					writeToFile(err);
					console.log(err); 
					res.end("0");
				}
				else{
					res.end("1"); 
				}					
            });
    });
});

app.post('/updateDriverStatus', function (req, res) {
    var myCollection = "driver";
    console.log("Connected in the updateDriverStatus method");
    var _id = parseInt(req.body._id);
	console.log(_id);
    var status = parseInt(req.body.status) ;
	console.log(status);
    
    MongoClient.connect(url, function (err, db) {
	
		if(err){
			writeToFile(err);
			console.log(err);
		}
        assert.equal(null, err);
		
        db.collection(myCollection).updateOne(
            { '_id': _id }, 
            { $set: { 'status': status} }, function (err, result) {
				db.close();
                if(err)
				{
					writeToFile(err);
					console.log(err); 
					res.end("0");
				}
				else{
					res.end("1"); 
				}
        });
    });
});

app.get('/getDeliveryRequestByID',function(req,res)
{
	var id=parseInt(req.query.id);
	console.log("RequestID : "+id);
	var whereQuery={'_id':id};
	
	var myCollection='deliveryRequest';
	
	MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
        console.log("Connected to getDeliveryRequestByID");        
        db.collection(myCollection).findOne(whereQuery,function(err, doc) {
			assert.equal(null, err);
			console.log(doc);
			res.send(doc);
			res.end();
			db.close();
      });
    });	
})

app.post('/updateDeliveryRequestDriverInfo',function(req, res){
	var driverID=parseInt(req.body.driverID);
	var deliveryRequestID = parseInt(req.body.deliveryRequestID);
	console.log("connected to updateDeliveryRequestDriverInfo");
	
	MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
		
        db.collection(myCollection).updateOne(
            { '_id': deliveryRequestID }, 
            { $set: { 'driver_id': driverID} }, function (err, result) {
				db.close();
                if(err)
				{
					writeToFile(err);
					console.log(err); 
					res.end("0");
				}
				else{
					res.end("1"); 
				}
        });
    });
	
})

app.post('/updateDeliveryRequestStatus',function(req, res){
	var status = parseInt(req.body.status);
	var deliveryRequestID = parseInt(req.body.deliveryRequestID);
	console.log("connected to updateDeliveryRequestStatus");
	
	MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
		
        db.collection(myCollection).updateOne(
            { '_id': deliveryRequestID }, 
            { $set: { 'status': status} }, function (err, result) {
				db.close();
                if(err)
				{
					writeToFile(err);
					console.log(err); 
					res.end("0");
				}
				else{
					res.end("1"); 
				}
        });
    });
	
})


app.get('/getDriversByCompanyID',function(req,res)
{
	var companyID=req.query.companyID;
	console.log("companyId : "+companyID);
	var whereQuery={'companyID':companyID};
	
	var myCollection='driver';
	
	MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
        console.log("Connected to getDriversByCompanyID");        
        db.collection(myCollection).find(whereQuery).toArray(function(err, docs) {
			console.log(docs);
        res.send(docs);
		res.end();
        db.close();
      });
    });	
}
)

app.get('/getAllDeliveryCompany',function(req,res)
{
	var myCollection='deliveryCompany';
	
	MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
        console.log("Connected to getAllDeliveryCompany");        
        db.collection(myCollection).find().toArray(function(err, docs) {
			console.log(docs);
        res.send(docs);
		res.end();
        db.close();
      });
    });	
}
)

app.post('/getDriverById', function (req, res) {
    var id = req.body.id;    
    var query = { '_id': id };
    
	var myCollection="driver";
	
    MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
        console.log("Connected to getDriverById");        
        db.collection(myCollection).findOne(query, function (err, item) {
            if (err) {
                console.log(err);
                res.send(item);
                res.end();
            }
            else {
                res.send(item);
                res.end();
            }
        });
    });
});

app.get('/getDriverLocation', function (req, res) {
    var _id = parseInt(req.query._id);	
	
	console.log(_id);
	
    var whereQuery = { '_id': 1 };
	
	var myCollection="driver";
    
    MongoClient.connect(url, function (err, db) {
		if(err){
			writeToFile(err);
			console.log(err);
		}
        assert.equal(null, err);
        console.log("Connected to getDriverLocation");        
        db.collection(myCollection).findOne(whereQuery,{fields:{'location':1}}, function (err, item) {
            if (err) {
				writeToFile(err);
                console.log("error"+err);
                res.send(item);
                res.end();
            }
            else {
                res.send(item);
				console.log(JSON.stringify(item));
                res.end();
            }
        });
    });
});

app.get('/getLastDriverId', function (req, res) {
    
	var myCollection="driver";
	
    MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
        console.log("Connected to getLastDriverId");        
        db.collection(myCollection).findOne({},{fields:{'_id':1}}, function (err, item) {
            if (err) {
                console.log("error"+err);
                res.send(item);
                res.end();
            }
            else {
                res.send(item);
				console.log(JSON.stringify(item));
                res.end();
            }
        }).sort([["_id",-1]]).limit(1);
    });
});

app.get('/getAllOnlineDrivers', function (req, res) {
	
    var query = { 'status': 1 };
	
	var myCollection="driver";
    
    MongoClient.connect(url, function (err, db) {
		if(err){
			writeToFile(err);
			console.log(err);
		}
	
        assert.equal(null, err);
        console.log("Connected to getAllOnlineDrivers");        
        db.collection(myCollection).find(query).toArray(function(err, docs) {
			if(err){
				writeToFile(err);
				console.log(err);
			}	
		
			res.send(docs);
			res.end();
			db.close();
      });
    });
});




app.post('/sendDeliveryRequest', function (req, res) {
    var myCollection = "deliveryRequest";
    console.log("in the sendDeliveryRequest method");
    var _id = req.body._id;
    var restaurantID = req.body.restaurantID;
    var companyID = req.body.companyID;
    var details = req.body.details;
    var postalCode = req.body.postalCode;
    var deliveryAddress = req.body.deliveryAddress;
    
    var user = {
        "_id": _id, "restaurantID": restaurantID, "companyID": companyID, "details": details, "postalCode": postalCode, 
        "deliveryAddress": deliveryAddress
    };
    
    MongoClient.connect(url, function (err, db) {
        assert.equal(null, err);
        console.log("Connected correctly to server");
        // Insert a single document
        db.collection(myCollection).insertOne(user, function (err, r) {
            assert.equal(null, err);
            assert.equal(1, r.insertedCount);
            
            db.close();
        });
    });
    res.end("1");
});

var server = app.listen(8081, function () {
    
    var host = server.address().address
    var port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port)

})
