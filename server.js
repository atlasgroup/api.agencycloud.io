var redis = require( 'redis' ).createClient( 6379 , 'agencycloud.o6hzk8.0001.usw1.cache.amazonaws.com' );

var io = require( 'socket.io' )( process.env.PORT || 8080 );

var jwt = require( 'jsonwebtoken' );

var crypto = require( 'crypto' );

var _ = require( 'underscore' );

io.on( 'connection' , function ( socket ) {

  console.log( 'Connection!' );

  socket.emit( 'welcome' , 'Welcome to Agency Cloud.' );

  socket.on( 'users:update' , function( data ) {

    console.log( 'These are the current users ' , data );

    socket.users = data;

    socket.broadcast.emit( 'users:set' , socket.users );

  });

  socket.on( 'authenticate' , function( data , callback ) {

    var user = JSON.parse( data );

    if( user.email === 'r@agencycloud.io' && user.password === 'temporary' || user.email === 's@agencycloud.io' && user.password === 'temporary' || user.email === 'monica@freedommodels.com' && user.password === 'temporary' || user.email === 'maia@freedommodels.com' && user.password === 'temporary' ) {

      var token = jwt.sign({

        email: user.email

      } , process.env.AWS_SECRET_KEY );

      callback({

        token : token,
        user : user

      });

    } else {

      callback( 'FAIL' );

    }

  });

  socket.on( 'data:get' , function( data , callback ) {

    var account = data.account || data;

    var user = '';

    if( data.token ) {

      user = jwt.verify( data.token , process.env.AWS_SECRET_KEY );

    }

    redis.get( account , function( error , data ) {

      console.log( data );

      socket.users = socket.users || [];

      callback( data , user , socket.users );

    });

  });

  socket.on( 'data:set' , function( data , callback ) {

    redis.set( JSON.parse( data ).account , data , function( error , response ) {

      console.log( response );

      callback( response );

    });

  });

  socket.on( 'data:load' , function( account ) {

    redis.get( account , function( error , data ) {

      console.log( data );

      socket.emit( 'data:loaded' , data );

    });

  });

  socket.on( 'aws:credentials:get' , function( data , callback ) {

    var today = new Date().toJSON().slice( 0 , 10 ).split( '-' ).join( '' );

    var policy = {
      "expiration": "2020-12-01T12:00:00.000Z",
      "conditions": [
        {"bucket": "lambdatestbucket"},
        ["starts-with", "$key", ""],
        ["starts-with", "$success_action_status", ""],
        {"x-amz-credential": process.env.AWS_ACCESS_KEY_ID + "/" + today + "/us-west-2/s3/aws4_request"},
        {"x-amz-algorithm": "AWS4-HMAC-SHA256"},
        {"x-amz-date": today + "T000000Z"}
      ]
    };

    var base64Policy = Buffer( JSON.stringify( policy ) , 'utf-8' ).toString( 'base64' );

    var a = crypto.createHmac( 'sha256' , 'AWS4' + process.env.AWS_SECRET_KEY );

    a.write( today );

    a.end();

    var b = crypto.createHmac( 'sha256' , a.read() );

    b.write( 'us-west-2' );

    b.end();

    var c = crypto.createHmac( 'sha256' , b.read() );

    c.write( 's3' );

    c.end();

    var d = crypto.createHmac( 'sha256' , c.read() );

    d.write( 'aws4_request' );

    d.end();

    var e = crypto.createHmac( 'sha256' , d.read() );

    e.write( new Buffer( base64Policy , 'utf-8') );

    e.end();

    var signature = e.read().toString( 'hex' );

    console.log( signature );

    var credentials = {

      policy : base64Policy,
      signature : signature

    };

    console.log( credentials );

    callback( credentials );

  });

  socket.on( 'aws:authenticate' , function() {

    var today = new Date().toJSON().slice( 0 , 10 ).split( '-' ).join( '' );

    var policy = {
      "expiration": "2020-12-01T12:00:00.000Z",
      "conditions": [
        {"bucket": "original.freedommodels.com"},
        ["starts-with", "$key", ""],
        ["starts-with", "$success_action_status", ""],
        {"x-amz-credential": process.env.AWS_ACCESS_KEY_ID + "/" + today + "/us-west-2/s3/aws4_request"},
        {"x-amz-algorithm": "AWS4-HMAC-SHA256"},
        {"x-amz-date": today + "T000000Z"}
      ]
    };

    var base64Policy = Buffer( JSON.stringify( policy ) , 'utf-8' ).toString( 'base64' );

    var a = crypto.createHmac( 'sha256' , 'AWS4' + process.env.AWS_SECRET_KEY );

    a.write( today );

    a.end();

    var b = crypto.createHmac( 'sha256' , a.read() );

    b.write( 'us-west-2' );

    b.end();

    var c = crypto.createHmac( 'sha256' , b.read() );

    c.write( 's3' );

    c.end();

    var d = crypto.createHmac( 'sha256' , c.read() );

    d.write( 'aws4_request' );

    d.end();

    var e = crypto.createHmac( 'sha256' , d.read() );

    e.write( new Buffer( base64Policy , 'utf-8') );

    e.end();

    var signature = e.read().toString( 'hex' );

    console.log( signature );

    var credentials = {

      policy : base64Policy,
      signature : signature

    };

    console.log( credentials );

    socket.emit( 'aws:authenticated' , credentials );

  });

  socket.on( 'data:save' , function( data ) {

    console.log( data );

    console.log( JSON.parse( data ) , JSON.parse( data ).account );

    redis.set( JSON.parse( data ).account , data , function( error , response ) {

      console.log( response );

      socket.emit( 'data:saved' , response );

    });

  });

  socket.on( 'request' , function( email ) {

    console.log( email );

    redis.sadd( 'requests' , email , function( error , requests ) {

      console.log( requests );

      redis.smembers( 'requests' , function( error , requests ) {

        console.log( requests );

      });

    });

  });

  socket.on( 'model:image:sizes:put' , function( image ) {

    console.log( 'AN IMAGE WAS RESIZED' , image );

    var url = ( image.url.split( '/' )[ image.url.split( '/' ).length - 1 ] ).split( '.' )[ 0 ];

    redis.get( image.account , function( error , response ) {

      var data = JSON.parse( response );

      for( var index = 0; index < data.models.length; index++ ) {

        if( data.models[ index ].url === url ) {

          if( data.models[ index ].image.sizes ) {

            if( data.models[ index ].image.sizes.indexOf( image.size ) === -1 ) {

              data.models[ index ].image.sizes.push( image.size );

            }

          } else {

            data.models[ index ].image.sizes = [ image.size ];

          }

        }

      }

      redis.set( image.account , JSON.stringify( data ) , function( error , response ) {

        socket.broadcast.emit( 'model:image:sizes:put' , { model : url , size : image.size } );

        console.log( error , response );

      });

    });

  });

  socket.on( 'done' , function( image , callback ) {

    console.log( 'ELLLOOOOOOOO' , image );

    callback();

    console.log( 'AN IMAGE WAS RESIZED' , image );

    if( image.bucket === 'twoseventwo.freedommodels.com' ) {

      image.size = 272;

    }

    if( image.bucket === 'sevenfivezero.freedommodels.com' ) {

      image.size = 750;

    }

    if( image.bucket === 'onefivethreesix.freedommodels.com' ) {

      image.size = 1536;

    }

    if( image.bucket === 'twoeighteightzero.freedommodels.com' ) {

      image.size = 2880;

    }

    if( image.bucket === 'original.freedommodels.com' ) {

      image.size = 'original';

    }

    var url = ( image.url.split( '/' )[ image.url.split( '/' ).length - 1 ] ).split( '.' )[ 0 ];

    redis.get( 'freedom' , function( error , response ) {

      var data = JSON.parse( response );

      for( var index = 0; index < data.models.length; index++ ) {

        if( data.models[ index ].url === url ) {

          if( data.models[ index ].image.sizes ) {

            if( data.models[ index ].image.sizes.indexOf( image.size ) === -1 ) {

              data.models[ index ].image.sizes.push( image.size );

            }

          } else {

            data.models[ index ].image.sizes = [ image.size ];

          }

        }

      }

      redis.set( 'freedom' , JSON.stringify( data ) , function( error , response ) {

        socket.broadcast.emit( 'model:image:sizes:put' , { model : url , size : image.size } );

        console.log( error , response );

      });

    });

  });

  socket.on( 'model:image:lambda:launched' , function( data ) {

    console.log( 'LAMBDA LAUNCHED FOR' , data );

    socket.broadcast.emit( 'model:image:lambda:launched' , data.size );

  });

});
