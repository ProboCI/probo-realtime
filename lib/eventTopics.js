'use strict';

module.exports = {};

// Build events
module.exports.build_events = {};
module.exports.build_events.START = 'started';
module.exports.build_events.READY = 'ready';
module.exports.build_events.UPDATE = 'status updated';
module.exports.build_events.REAP = 'reaped';

// Step events
module.exports.step_events = {};
module.exports.step_events.IN_PROGRESS = 'running';
