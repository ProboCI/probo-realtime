'use strict';

const should = require('should');
const socketEventTypes = require('../lib/socketEvents/constants.js');
const eventTopics = require('../lib/eventTopics/constants.js');

describe('Constants', function() {
  it('should have socket type constants, where each is a string', function(done) {
    for (let i in socketEventTypes) {
      if (socketEventTypes.hasOwnProperty(i)) {
        socketEventTypes[i].should.be.a.String;
      }
    }

    done();
  });

  it('should have event listener constants, where each is a string', function(done) {
    for (let i in eventTopics) {
      if (eventTopics.hasOwnProperty(i)) {
        eventTopics[i].should.be.a.Object;

        for (let j in eventTopics[i]) {
          if (eventTopics[i].hasOwnProperty(j)) {
            eventTopics[i][j].should.be.a.String;
          }
        }
      }
    }

    done();
  });
});
