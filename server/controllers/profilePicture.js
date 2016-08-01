var fs = require('fs');
var gm = require('gm').subClass({ imageMagick: true });
var AWS = require('aws-sdk');
var async = require('async');
var config = require('../../config.json');

AWS.config.update(config.amazon);

// HELPER
function uploadToBucket(file, folder, callback){
	var s3Cdn = 'https://s3.amazonaws.com';
	var bucketName = 'selected-test';
	var s3Folder = folder;

	console.log("file is ", file);
//add user as first param
	// if(folder == "original"){
	// 	var imageName = user._id.toString()+"_original"+'.'+file.data.format || file.name;
	// }else{
	// 	var imageName = user._id.toString()+'.'+file.data.format || file.name;
	// }

	if(folder == "original"){
		var imageName = "_original"+'.'+file.data.format || file.name;
	}else{
		var imageName = "formatted_test"+'.'+file.data.format || file.name;
	}

	console.log('imageName is ', imageName);

	var imageUrl = s3Cdn+'/'+bucketName+'/'+s3Folder+'/'+imageName;
	file.imageUrl = imageUrl;

	var s3Bucket = new AWS.S3({ params: { Bucket: bucketName } });

	var data = {
		Key : s3Folder + '/'+imageName,
		Body : file.buffer,
		ContentType: file.filetype,
		Metadata: {
			//'userId': user._id.toString(),
			'uploadDate': (new Date()).toDateString()
		},
	};
	//add the Object to S3 bucket
	s3Bucket.putObject(data, function (err,result){
		if(err){
			console.log('putObject error: ', err);
			callback(err);
		}else{
			console.log('Uploaded successfully');
			// file.Etag = result;  //necessary?
			callback(null, file);
		}
	});
}

exports.uploadPhoto = function(req,res){
	console.log('Entering uploadPhoto route === ');
	console.log('req.files is: ', req.files);

	if(!req.files.file){
		res.status(400).send('req.files is empty');
	} else{
		var extension;
		async.waterfall([
			//Resize and crop the picture
			function (callback){
				console.log('Entering resize picture');
				var tempImage = req.files.file;

				console.log('tempImage: ',tempImage);

				var originalImg = gm(tempImage.path)
				//getters
				.format(function (err,value){
					if(err){
						console.log('format error: ', err);
						callback(err);
					} else{
						console.log('format is: ', value);
					}
				})
				//if there is EXIF, it autoOrients the image
				.autoOrient();
				originalImg.filetype = tempImage.type;

				var formattedImg = gm(tempImage.path)
				.format(function (err,value){
					if(err){
						console.log('format error: ', err);
						callback(err);
					} else{
						console.log('format is: ', value);
					}
				})
				.autoOrient()
				.resize('300', '300', '^')
				.gravity('Center')
				.crop('300', '300')

				formattedImg.filetype = tempImage.type;

				//Make both images a buffer
				async.parallel([
					function (done){
						originalImg.toBuffer(function (err, buffer){
							if(err){
								console.log('toBuffer error: ', err);
								done(err);
							}else{
								originalImg.buffer = buffer;
								done(null, originalImg);
							}
						});
					},
					function (done){
						formattedImg.toBuffer(function (err, buffer){
							if(err){
								console.log('toBuffer error: ', err);
								done(err);
							}else{
								formattedImg.buffer = buffer;
								done(null, formattedImg);
							}
						});
					}
					],function (err, images){
						if(err){
							callback(err);
						}else{
							console.log("images: ", images);
							callback(null, images);
						}
				}); //async
			},
			//Upload to Amazon
			function (images, callback){
				//- use upload
				async.parallel([
					//Upload original //FILE, FOLDER, CALLBACK
					function (done){
						uploadToBucket(images[0], 'original', function (error, result){
							if(error){
								console.log('error: ', error);
								done(error);
							}else{
								console.log('result from upload ', result);
								done(null, result);
							}
						});
					},
					//Upload resized
					function (done){
						uploadToBucket(images[1], 'formatted_test', function (error, result){
							if(error){
								console.log('error: ', error);
								done(error);
							}else{
								console.log('result from upload ', result);
								done(null, result);
							}
						});
					}
					],function (err, results){
						if(err){
							console.log("err: ", err);
							callback(err);
						}else{
							console.log('Uploading finished!');
							callback(null, results[1]);
						}
				});
			},
			//Save imageUrl on db Object
			// function (newImage, callback){
			// 	console.log('newImage: ', newImage);
			// 	Profile.update({ '_userId' : req.user._id },
			// 		{ $set :{
			// 			'profilePicture.url': newImage.imageUrl,
			// 			'profilePicture.Etag' : newImage.Etag.ETag
			// 		} }, function (err, result){
			// 				if(err){
			// 					console.log('Update error: ', err);
			// 					callback(err);
			// 				} else{
			// 					console.log('Update result: ', result);
			// 					callback(null, newImage.imageUrl)
			// 				}
			// 	});
			// }
			], function (err, result){
				if(err){
					console.log('upload Series err:', err);
					res.status(400).send(err);
				} else{
					console.log('upload result: ', result);
					res.status(200).send({imageUrl: result.imageUrl});
				}
			}
		);//end of waterfall callback
	}
};
