'use strict';

/**
 * Module dependencies.
 */

var redis = require('redis');
var url = require('url');

/**
 * Setting up redis clients.
 */
var redisURL = url.parse(process.env.REDISCLOUD_URL);
var songsclient = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
songsclient.auth(redisURL.auth.split(":")[1]);

var usersclient = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
usersclient.auth(redisURL.auth.split(":")[1]);

// var songsclient = redis.createClient(process.env.REDISCLOUD_URL, {no_ready_check: true})
//   , usersclient = redis.createClient(process.env.REDISCLOUD_URL, {no_ready_check: true});

songsclient.on('error', function(err) {
  console.error(err.message);
});

usersclient.on('error', function(err) {
  console.error(err.message);
});

usersclient.select(0);

/**
 * Expose the clients
 */

exports.songs = songsclient;
exports.users = usersclient;
