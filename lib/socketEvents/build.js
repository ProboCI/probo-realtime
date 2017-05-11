'use strict';

const constants = require('./constants');
const Promise = require('bluebird');

module.exports = (options) => {
  const logger = options.logger.child({component: 'socket-build-events'});

  const ready = Promise.promisify((event, done) => {
    logger.debug({buildId: event.build.id}, `Sending ${constants.BUILD_END} event`);
    options.io.in(event.build.id).emit(constants.BUILD_END, event.build);

    return done ? done(null, event) : event;
  });

  const update = Promise.promisify((event, done) => {
    logger.debug({buildId: event.build.id}, `Sending ${constants.BUILD_UPDATE} event`);
    options.io.in(event.build.id).emit(constants.BUILD_UPDATE, event.build);

    return done ? done(null, event) : event;
  });

  const start = Promise.promisify((event, done) => {
    logger.debug({buildId: event.build.id}, `Sending ${constants.BUILD_START} event`);
    options.io.in(event.build.id).emit(constants.BUILD_START, event.build);

    return done ? done(null, event) : event;
  });

  const reap = Promise.promisify((event, done) => {
    logger.debug({buildId: event.build.id}, `Sending ${constants.BUILD_REAP} event`);
    options.io.in(event.build.id).emit(constants.BUILD_REAP, event.build);

    return done ? done(null, event) : event;
  });

  return {ready, update, start, reap};
};
