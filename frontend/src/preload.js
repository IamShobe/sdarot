const {readdirSync, lstatSync, readFileSync, unlinkSync} = require('fs');
const _ = require('lodash');
const YAML = require('yaml');
const exec = require('child_process').exec;
const rimraf = require('rimraf');

const getCommandLine = () => {
   switch (process.platform) {
      case 'darwin' : return 'open';
      case 'win32' : return 'start';
      case 'win64' : return 'start';
      default : return 'xdg-open';
   }
};


const arraysMatch = function (arr1, arr2) {

    // Check if the arrays are the same length
    if (arr1.length !== arr2.length) return false;

    // Check if all items exist and are in the same order
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }

    // Otherwise, return true
    return true;

};

const pad = (n, width, z) => {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};

let config = null;
window.library = [];
const BLACKLIST_NAMES = "__metadata__";

const libraryCallbacks = [];

setInterval(() => {
    if(config) {
        const newRead = readdirSync(`${config.downloadPath}`).filter(
            name => !BLACKLIST_NAMES.includes(name) &&
                lstatSync(`${config.downloadPath}/${name}`).isDirectory()
        );
        if (!arraysMatch(window.library, newRead)) {
            window.library = newRead;
            libraryCallbacks.forEach(callback => callback(newRead))
        }
    }
}, 1000);

window.registerLibChanges = (callback) => {
    libraryCallbacks.push(callback);
    callback(window.library);
};

window.unregisterLibChanges = (callback) => {
    _.remove(libraryCallbacks, (e) => e === callback);
};


window.updateConfig = (c) => {
    config = c;
};


window.watchEpisodesOf = (name, sid, callback) => {
    let episodes = [];
    return setInterval(() => {
        if (!window.library.includes(`${name}_${sid}`)) {
            return [];
        }
        const files = readdirSync(`${config.downloadPath}/${name}_${sid}`);
        const newRead = files.filter(file => file.endsWith(".mp4"));
        if (!arraysMatch(episodes, newRead)) {
            episodes = newRead;
            callback(episodes);
        }
    }, 1000);
};

window.readMetadataOf = (name, sid) => {
    const raw = readFileSync(`${config.metadataDir}/${name}_${sid}_metadata.yaml`, 'utf8');
    return YAML.parse(raw);
};

window.disableEpisodesWatch = (id) => clearInterval(id);

window.episodeName = (name, season, episode) => `${name}_S${pad(season, 2)}E${pad(episode, 2)}.mp4`;

window.launchEpisode = (name, sid, season, episode) => {
    exec(getCommandLine() + ' ' + `${config.downloadPath}/${name}_${sid}/${window.episodeName(name, season, episode)}`);
};

window.deleteEpisode = (name, sid, season, episode) => {
    unlinkSync(`${config.downloadPath}/${name}_${sid}/${window.episodeName(name, season, episode)}`);
};

window.deleteIfEmpty = (name, sid) => {
    const files = readdirSync(`${config.downloadPath}/${name}_${sid}`);
    const newRead = files.filter(file => file.endsWith(".mp4"));
    if (newRead.length === 0) {
        rimraf.sync(`${config.downloadPath}/${name}_${sid}`);
    }
};