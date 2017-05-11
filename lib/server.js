'use strict';

const events = require('events');
const io = require('socket.io');
const through2 = require('through2');
const eventTopics = require('./eventTopics');
const socketEvents = require('./socketEvents');
const _logger = Symbol('_logger');

class Server extends events.EventEmitter {

  /**
   * Create Server
   * @param {object} options - service configuration options
   */
  constructor(options) {
    super();

    this.options = options;
    this[_logger] = options.logger;

    this.on('error', error => {
      this.logger.error({error}, error.message);
    });
  }

  get logger() {
    return this[_logger];
  }

  start(done) {
    const self = this;

    self.options.io = io.listen(self.app);

    self.options.consumer.stream.pipe(through2.obj((data, enc, cb) => {
      self.processMessage(data, (error, results) => {
        if (error) {
          self.logger.error({error}, error.message);
          self.emit('error', error);
        }
        cb();
      });
    }));
  }

  processMessage(event, done) {
    const self = this;
    self.logger.trace({event}, 'Eventbus data received');

    const buildEvents = socketEvents.build(self.options);
    const stepEvents = socketEvents.step(self.options);
    self.emit('buildEventReceived', event.build);

    switch (event.event) {
      // Process build ready events
      case eventTopics.build_events.READY:
        return buildEvents.ready(event)
          .then(results => {
            self.emit('buildReady', event.build);
            self.logger.info({data: event.data}, `Sent build ready event for ${event.build.id}`);
            return done(null, results);
          })
          .catch(error => {
            self.logger.error({error, event}, `Problem processing build ready event: ${error.message}`);
            return done(error);
          });

      // Process build update events
      case eventTopics.build_events.UPDATE:
        return buildEvents.update(event)
          .then(results => {
            self.emit('buildUpdated', event.build);
            self.logger.info({data: event.data}, `Sent build status updated event for ${event.build.id}`);

            // send the step update event, if needed
            if (event.data && event.data.status) {
              if (event.data.status.state === 'running') {
                return stepEvents.running(event);
              }
              else {
                return stepEvents.finish(event);
              }
            }

            // if there was a step update,
            // the step promise is returning. but
            // if there was not a step update
            // return an empty resolved promise.
            return Promise.resolve();
          })
          .then(results => {
            self.emit('stepUpdated', event.build);
            self.logger.info({data: results.data}, `Sent step update event for ${event.build.id}`);
            return done(null, results);
          })
          .catch(error => {
            self.logger.error({error, event}, `Problem processing build update event: ${error.message}`);
            return done(error);
          });

      // Process build start event
      case eventTopics.build_events.START:
        return buildEvents.start(event)
          .then(results => {
            self.emit('buildStarted', event.build);
            self.logger.info({data: event.data}, `Sent build started event for ${event.build.id}`);
            return done(null, results);
          })
          .catch(error => {
            self.logger.error({error, event}, `Problem processing build start event: ${error.message}`);
            return done(error);
          });

      // Process build reap event
      case eventTopics.build_events.REAP:
        return buildEvents.reap(event)
          .then(results => {
            self.emit('buildReaped', event.build);
            self.logger.info({data: event.data}, `Sent build reaped event for ${event.build.id}`);
            return done(null, results);
          })
          .catch(error => {
            self.logger.error({error, event}, `Problem processing build reaped event: ${error.message}`);
            return done(error);
          });

      // Do nothing
      default:
        self.logger.debug({event}, 'Unrecognized event received');
        return done();
    }
  }

  stop() {
    this.options.consumer.destroy();
    this.restServer.stop();
  }
}

module.exports = Server;
