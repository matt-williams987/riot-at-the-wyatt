"use strict";

var settings = settingsJS;
var items = itemsJS;
var states = statesJS;

var CONFIG = {
    width: 1280,
    height: 720,
    renderer: Phaser.WEBGL,
    antialias: true,
    parent: "game",
    scaleMode: Phaser.ScaleManager.SHOW_ALL,
};

var FPS = 60;
var BLOCK_POS = [170, 350, 530];
var BOTTLE_POS = BLOCK_POS;
var BOTTLE_SIZE = 50;
var BLOCK_SPEEDS = [0, 1000, 1250, 1500, 2000, 3000, 4250];
var BLOCK_X = 1000;
var BLOCK_LIMIT = 50;  // The depth at which the parasol stops blocking bottles
var BLOCK_L = BLOCK_X + BLOCK_LIMIT;
var BOTTLE_SPEED = settings.play_settings.bottle_speed;
var PU_MULTIPLIER = settings.play_settings.powerup_multiplier;
var START_MIN_INT = settings.play_settings.start_min_int;
var FINAL_MIN_INT = settings.play_settings.final_min_int;
var BOTTLE_RAND_FACTOR = settings.play_settings.bottle_rand_factor;
var INT_REDUCTION = settings.play_settings.interval_reduction;
var SPEEDUP_START = settings.play_settings.speedup_start;
var SPEEDUP_AMOUNT = settings.play_settings.speedup_amount;

var keys; // Object that stores input keys used in game
var kb;   // game.input.keyboard alias
var bg;   // Background object
var music;
var do_reset; // Global reset the game flag. Dumb.
var get_help; // Global get help flag. Dumb.
var controller;
var player;
var cloud;
var title;
var highscore;
var ui;

var game = new Phaser.Game(CONFIG);
game.state.add('boot',   states.boot);
game.state.add('load', states.load);
game.state.add('normal', states.normal);
game.state.add('help',   states.help);
game.state.start('boot');

function reset() {
    do_reset = false;
    states.normal.startup = false;
    title.raise();
    player.reset();
    controller.reset();
    cloud.reset();
};

// This one callback for deciding what to do with all input. Dumb. 
function keypressed() {
    if (keys.high.indexOf(kb.lastKey.keyCode) > -1) {
        player.target_pos = 0;
    } else if (keys.mid.indexOf(kb.lastKey.keyCode) > -1) {
        player.target_pos = 1;
    } else if (keys.low.indexOf(kb.lastKey.keyCode) > -1) {
        player.target_pos = 2;
    } else if (kb.lastKey.keyCode === keys.reset && 
               (((player.powerup_lvl < 1 || states.normal.startup) && title.is_down) || 
               game.state.current === 'help')) {
        do_reset = true;
    } else if (kb.lastKey.keyCode === keys.help && title.is_down) {
        get_help = true;
    }
};

function on_pause() {
     game.sound.pauseAll();
};

function on_resume() {
    game.sound.resumeAll();
};