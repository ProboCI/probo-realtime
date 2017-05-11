'use strict';

const restify = require('restify');
const events = require('events');
const io = require('socket.io');
const requestLogger = require('probo-request-logger');
const through2 = require('through2');
const eventTopics = require('./eventTopics');
const socketEvents = require('./socketEvents');
const _logger = Symbol('_logger');

class Server extends events.EventEmitter {
  /**
   * Create Server
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
    const restServer = restify.createServer({
      name: 'probo-realtime',
      log: self.options.logger.child({component: 'server'}),
    });
    restServer.use(requestLogger({logger: self.logger.child({component: 'requests'})}));
    restServer.on('after', restify.auditLogger({
      log: self.options.logger.child({component: 'server-audit'}),
    }));
    restServer.on('uncaughtException', (req, res, route, err) => {
      req.log.error({err}, err.message);
    });

    restServer.get('/', self.indexRoute.bind(self));

    self.options.io = io.listen(self.app);

    restServer.listen(self.options.port, self.options.host, error => {
      self.logger.info(`REST server listening at ${self.options.host}:${self.options.port}`);
      self.logger.debug({options: self.options}, `REST server config`);
      self.restServer = restServer;

      self.options.consumer.stream.pipe(through2.obj((data, enc, cb) => {
        self.processMessage(data, (error, results) => {
          if (error) {
            self.emit('error', error);
          }
          cb();
        });
      }));

      if (done) return done(error, restServer);
      return self.restServer;
    });
  }

  indexRoute(req, res, next) {
    res.json({test: true});
    return next();
  }

  processMessage(event, done) {
    const self = this;
    const buildEvents = socketEvents.build(self.options);
    const stepEvents = socketEvents.step(self.options);
    self.logger.trace({event}, `Eventbus data received`);
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
        break;

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
        break;

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
        break;

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
        break;

      // Do nothing
      default:
        self.logger.debug({event}, `Unrecognized event received`);
        return done();
        break;
    }
  }

  stop() {
    this.options.consumer.destroy();
    this.restServer.stop();
  }
}

module.exports = Server;
