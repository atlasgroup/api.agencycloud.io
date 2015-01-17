var redis = require( 'redis' ).createClient( 6379 , 'agencycloud.o6hzk8.0001.usw1.cache.amazonaws.com' );

var io = require( 'socket.io' )( process.env.PORT || 8080 );

var crypto = require( 'crypto' );

io.on( 'connection' , function ( socket ) {

  console.log( 'Connection!' );

  socket.emit( 'welcome' , 'Welcome to Agency Cloud.' );

  socket.on( 'preview' , function( url , callback ) {

    callback();

    console.log( 'Removing preview for ' , url );

    redis.get( 'freedom' , function( error , response ) {

      var data = JSON.parse( response );

      for( var model = 0; model < data.models.length; model++ ) {

        for( var album = 0; album < data.models[ model ].albums.length; album++ ) {

          for( var image = 0; image < data.models[ model ].albums[ album ].images.length; image++ ) {

            if( data.models[ model ].albums[ album ].images[ image ].url === url ) {

              delete data.models[ model ].albums[ album ].images[ image ].blob;

              delete data.models[ model ].albums[ album ].images[ image ].file;

              delete data.models[ model ].albums[ album ].images[ image ].index;

              delete data.models[ model ].albums[ album ].images[ image ].preview;

            }

          }

        }

      }

      redis.set( 'freedom' , JSON.stringify( data ) , function( error , response ) {

        socket.broadcast.emit( 'data:update' , JSON.stringify( data ) );

      });

    });

  });

  socket.on( 'data:load' , function( account ) {

    redis.get( account , function( error , data ) {

      console.log( data );

      socket.emit( 'data:loaded' , data );

    });

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

});
