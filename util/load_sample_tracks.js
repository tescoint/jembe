'use strict';

/**
 * Module dependencies.
 */
var redis = require('redis');
var url = require('url');
var redisURL = url.parse(process.env.REDISCLOUD_URL);
redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});

var artistIds = require('./artist-ids')
  , http = require('http')
  , JSONStream = require('JSONStream')
  , limit = 10 // The number of songs to retrieve for each artist
  , parser = JSONStream.parse(['results', true])
  , popIds = artistIds.pop
  , rapIds = artistIds.rapper
  , rc = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true})
  , oldiesIds = artistIds.oldies
  , reggaeIds = artistIds.reggae
  , rooms = require('../config').rooms
  , score
  , skip = 0 // Skip counter
  , songId = 0;
rc.auth(redisURL.auth.split(":")[1]);
var options = {
  headers: {'content-type': 'application/json'},
  host: 'itunes.apple.com',
  // Look up multiple artists by their IDs and get `limit` songs for each one
  path: '/lookup?id='+popIds.concat(rapIds, oldiesIds).join()+'&entity=song&limit='+limit,
  port: 80
};

/**
 * Set the rooms in which the songs of a given artist will be loaded.
 */

var updateRooms = function(artistId) {
  rooms = ['mixed'];
  score = 0;
  if (artistId === popIds[0]) {
    rooms.push('hits', 'pop');
    // Set the skip counter (there is no need to update the rooms for the next pop artists)
    skip = popIds.length - 1;
  }
  else{
    rooms.push('rock','oldies');
    skip = oldiesIds.length - 1;
  }
  // else if (artistId === gospelIds[0]){
  //   rooms.push('gospel');
  //   skip = gospelIds.length - 1;
  // }
};

parser.on('data', function(track) {
  if (track.wrapperType === 'artist') {
    if (skip) {
      skip--;
      return;
    }
    updateRooms(track.artistId);
    return;
  }

  rc.hmset('song:'+songId,
    'artistName', track.artistName,
    'trackName', track.trackName,
    'trackViewUrl', track.trackViewUrl,
    'previewUrl', track.previewUrl,
    'artworkUrl60', track.artworkUrl60,
    'artworkUrl100', track.artworkUrl100
  );
  //process.stdout.write(track.artistName);

  rooms.forEach(function(room) {
    var _score = (room === 'mixed') ? songId : score;
    rc.zadd(room, _score, songId);
  });

  score++;
  songId++;
});

parser.on('end', function() {
  rc.quit();
  process.stdout.write('OK\n');
});

rc.del(rooms, function(err) {
  if (err) {
    throw err;
  }
  process.stdout.write('Loading sample tracks... ');
  http.get(options, function(res) {
    res.pipe(parser);
  });
});
