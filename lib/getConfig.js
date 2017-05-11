'use strict';

const Loader = require('yaml-config-loader');
const yargs = require('yargs');
const loader = new Loader();
const bunyan = require('bunyan');
const path = require('path');
const includes = require('lodash.includes');
const Promise = require('bluebird');
const eventbus = require('probo-eventbus');

const getConfig = function(done) {
  const logger = bunyan.createLogger({
    name: 'probo-realtime',
    level: (process.env.NODE_ENV === 'development') ? 'debug' : 'info',
    serializers: bunyan.stdSerializers,
    src: true,
  });
  const argv = yargs.argv;

  loader.on('error', function(error) {
    logger.error({error}, error.message);
    throw error;
  });

  loader.add(path.resolve(path.join(__dirname, '..', 'default.config.yaml')), {allowedKeys: true});
  if (argv.config) {
    argv.config = Array.isArray(argv.config) ? argv.config : [argv.config];
    argv.config.forEach(function(file) {
      loader.addFile(path.resolve(file));
    });
  }
  loader.addAndNormalizeObject(process.env);
  loader.addAndNormalizeObject(argv);

  return loader.load(function(error, loadedOptions) {
    if (error) throw error;

    loadedOptions.logger = logger;
    loadedOptions.consumer = new eventbus.plugins[loadedOptions.eventStreams.build_events.plugin].Consumer(loadedOptions.eventStreams.build_events.config);

    const requiredOptions = ['host', 'port', 'eventStreams', 'logger', 'consumer'];
    const loadedKeys = Object.keys(loadedOptions);

    for (var i = 0; i < requiredOptions.length; i++) {
      if (includes(loadedKeys, requiredOptions[i]) === false) {
        throw new Error('Config does not include all the required options');
      }
    }

    return done ? done(error, loadedOptions) : loadedOptions;
  });
};

module.exports = Promise.promisify(getConfig);
