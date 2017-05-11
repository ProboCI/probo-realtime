'use strict';

const should = require('should');
const getConfig = require('../lib/getConfig');

describe('Config loading', function() {
  it('should load config with a callback function', function(done) {
    getConfig(function(err, options) {
      options.should.be.ok;
      options.should.be.a.Object;

      done();
    });
  });

  it('should load the config with a promise', function(done) {
    getConfig()
      .then(function(options) {
        options.should.be.ok;
        done();
      })
      .catch(done);
  });
});
