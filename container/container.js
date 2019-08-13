#!/usr/bin/env node
'use strict';

require('barrkeep/pp');
const uuid = require('uuid/v4');
const restify = require('restify');
const EventEmitter = require('events');
const Terminal = require('./terminal.js');
const { merge } = require('barrkeep/utils');
const Watershed = require('watershed').Watershed;
const corsMiddleware = require('restify-cors-middleware');

function Container (options = {}) {
  this.version = require('../package').version;
  this.config = merge(require('../defaults'), options, true);

  //////////

  this.events = new EventEmitter();

  //////////

  this.files = require('./files')(this, this.config.container.home);

  //////////

  this.api = restify.createServer({
    name: this.config.name,
    ignoreTrailingSlash: true,
    strictNext: true,
    handleUpgrades: true
  });

  this.api.ws = new Watershed();

  //////////

  this.cors = corsMiddleware({
    origins: [ '*' ],
    allowHeaders: [ 'Authorization' ],
    exposeHeaders: [ 'Authorization' ]
  });

  this.api.pre(this.cors.preflight);
  this.api.use(this.cors.actual);

  //////////

  this.api.use(restify.pre.sanitizePath());
  this.api.pre(restify.plugins.pre.dedupeSlashes());
  this.api.use(restify.plugins.dateParser());
  this.api.use(restify.plugins.queryParser());
  this.api.use(restify.plugins.bodyParser());
  this.api.use(restify.plugins.authorizationParser());

  //////////

  this.api.use((req, res, next) => {
    res.header('interrogative-version', this.version);
    next();
  });

  //////////

  this.api.get('/ws/attach/main', (req, res, next) => {
    if (!res.claimUpgrade) {
      next(new Error('Connection Must Upgrade For WebSockets'));
      return;
    }

    const upgrade = res.claimUpgrade();
    const shed = this.api.ws.accept(req, upgrade.socket, upgrade.head);

    const id = uuid();
    const role = 'admin';
    const user = 'Admin';

    shed.$send = (event) => {
      const message = JSON.stringify(event);
      shed.send(message);
    };

    shed.listener = (event) => {
      if (event.source !== id) {
        shed.$send(event);
      }
    };

    shed.on('text', (data) => {
      if (data !== 'PING') {
        let event;
        try {
          event = JSON.parse(data);
          event.source = id;
          this.events.emit(event);
        } catch (error) {
          // ignore
        }
      }
    });

    this.events.on('message', shed.listener);

    shed.on('end', () => {
      this.events.removeListener('message', shed.listener);
    });

    // Register
    shed.$send({
      type: 'register',
      data: {
        user,
        role
      }
    });

    // Update file Tree
    shed.$send({
      type: 'file-tree',
      data: this.files.tree
    });
  });

  //////////

  const terminals = [];

  this.api.get('/ws/attach/shell', (req, res, next) => {
    if (!res.claimUpgrade) {
      next(new Error('Connection Must Upgrade For WebSockets'));
      return;
    }

    const upgrade = res.claimUpgrade();
    const shed = this.api.ws.accept(req, upgrade.socket, upgrade.head);

    const instance = Number(req.query.instance) || 0;
    const cols = Number(req.query.cols) || 100;
    const rows = Number(req.query.rows) || 24;

    if (!terminals[instance]) {
      terminals[instance] = new Terminal(this, {
        instance,
        cols,
        rows,
        socket: shed
      });
    } else {
      terminals[instance].add(shed);
    }
  });

  //////////

  this.start = (callback) => {
    this.files.start();

    this.api.listen(this.config.container.port, this.config.container.host, () => {
      const address = this.api.address();
      console.log(`${ this.config.name } v${ this.version } listening on http://${ address.address }:${ address.port }`);
      if (callback) {
        return callback(null);
      }
      return true;
    });
  };
}

const container = new Container();
container.start();
