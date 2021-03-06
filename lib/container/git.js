'use strict';

const { join } = require('path');
const chokidar = require('chokidar');
const Griff = require('@mdbarr/griff');
const { debounce } = require('barrkeep/utils');

function Git (container, options = {}) {
  this.render = (useCache = true) => {
    if (useCache && this.cached) {
      container.events.emit({
        type: 'git:repository:svg',
        data: this.cached,
      });
    } else if (this.griff) {
      this.griff.generate().then((svg) => {
        this.cached = svg;
        container.events.emit({
          type: 'git:repository:svg',
          data: this.cached,
        });
      });
    }
  };

  const onAll = debounce(() => {
    this.render(false);
  }, 500);

  this.watch = () => {
    console.log('*generating git watcher:', this.directory);

    this.watcher = chokidar.watch(this.directory, {
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('all', onAll);
  };

  this.start = () => {
    if (container.interview.git) {
      this.griff = new Griff({
        repository: container.interview.repository,
        limit: options.limit || 100,
        background: '#424242',
        data: true,
        descriptions: true,
        stashes: true,
        titles: true,
      });

      this.directory = join(container.interview.repository, '/.git/refs/heads');
      this.cached = '';

      this.watch();

      this.render(false);

      container.events.on('connected', () => {
        this.render();
      });
    }
  };
}

module.exports = (container, options) => new Git(container, options);
