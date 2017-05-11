'use strict';

const constants = require('./constants');
const Promise = require('bluebird');

module.exports = (options) => {
  const logger = options.logger.child({component: 'socket-step-events'});

  const running = Promise.promisify((event, done) => {
    const data = Object.assign({}, event.data, {buildId: event.build.id});
    const stepId = event.data.status.task && event.data.status.task.id ? event.data.status.task.id : null;

    logger.debug({buildId: event.build.id, stepId, data}, `Sending ${constants.STEP_PROGRESS} event`);
    options.io.in(event.build.id).emit(constants.STEP_PROGRESS, data);

    return done ? done(null, event) : event;
  });

  const finish = Promise.promisify((event, done) => {
    const data = Object.assign({}, event.data, {buildId: event.build.id});
    const stepId = event.data.status.task && event.data.status.task.id ? event.data.status.task.id : null;

    logger.debug({buildId: event.build.id, stepId, data}, `Sending ${constants.STEP_FINISH} event`);
    options.io.in(event.build.id).emit(constants.STEP_FINISH, data);

    return done ? done(null, event) : event;
  });

  return {running, finish};
};
