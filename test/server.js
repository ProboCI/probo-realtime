'use strict';

/* eslint no-unused-expressions: 0 */

const should = require('should'); // eslint-disable-line no-unused-vars
const bunyan = require('bunyan');
const Server = require('../lib/server');
const getConfig = require('../lib/getConfig');

describe('Server', function() {
  let options;

  before(function(done) {
    getConfig()
      .then(function(config) {
        config.should.be.ok;
        config.should.be.a.Object;

        options = config;
        done();
      })
      .catch(done);
  });

  it('should intialize correctly', function(done) {
    let app = new Server(options);
    app.should.be.ok;
    done();
  });

  it('should allow getting options', function(done) {
    let app = new Server(options);
    app.options.should.eql(options);
    done();
  });

  describe('init app', function() {
    let app;

    before(function(done) {
      new Server(options).start(function(error, results) {
        (typeof error).should.be.undefined;
        results.should.be.ok;
        app = results;
        done();
      });
    });

    it('should have a logger which is a bunyan logger', function(done) {
      app.log.should.be.ok;
      let dummyLog = bunyan.createLogger({name: 'dummy-log'});
      (Object.getPrototypeOf(dummyLog)).should.eql(Object.getPrototypeOf(app.log));
      done();
    });

    it('be named correctly', function(done) {
      app.name.should.match('probo-realtime');
      done();
    });
  });
});
