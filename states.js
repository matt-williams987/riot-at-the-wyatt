"use strict";

var statesJS = {};

statesJS.boot = {

    preload: function() {
        game.onPause.add(on_pause, window);
        game.onResume.add(on_resume, window);
        kb = game.input.keyboard;
        var key_strings = {up_keys: "QWERTYUIOP", mid_keys: "ASDFGHJKL", low_keys: "ZXCVBNM"};
        keys = {
            "high" : this.setcontrol(key_strings.up_keys),
            "mid"  : this.setcontrol(key_strings.mid_keys),
            "low"  : this.setcontrol(key_strings.low_keys),
            "reset": Phaser.KeyCode.SPACEBAR,
            "help" : Phaser.KeyCode.QUESTION_MARK,
            "other": Phaser.KeyCode.I,
        };
        kb.addCallbacks(window, keypressed);
        game.time.desiredFps = FPS;
        game.scale.pageAlignHorizontally =true;
        game.load.image('bottle', '/assets/whiskey1-small.png');
    },

    create: function() {
        game.state.start('load');
    },

    setcontrol: function(key_string) {
        var a = []
        for (var i =0; i<key_string.length; i++) {
            a.push(Phaser.KeyCode[key_string[i]]);
        }
        return a;
    },
};

statesJS.load = {
    preload: function() {
        var loadingBar = game.add.sprite(game.width/2,game.height/2,'bottle');
        loadingBar.anchor.setTo(0.5, 0.5);
        game.load.setPreloadSprite(loadingBar, 1);
        game.load.audio('song', ['/assets/bgsong1.ogg', '/assets/bgsong1.mp3']);
        game.load.audio('thud', ['/assets/thud.ogg', '/assets/thud.mp3']);
        game.load.audio('whoosh', ['/assets/whoosh.ogg', '/assets/whoosh.mp3']);
        game.load.audio('hit', ['/assets/hit.ogg', '/assets/hit.mp3']);
        game.load.audio('up', ['/assets/up.ogg', '/assets/up.mp3']);
        game.load.image('powerup', '/assets/smelling-small.png');
        game.load.image('background', '/assets/background1.png');
        game.load.image('parasol', '/assets/parasol.png');
        game.load.image('character', '/assets/character.png');
        game.load.image('upper', '/assets/upper.png');
        game.load.image('lower', '/assets/lower.png');
        game.load.image('bigcloud', '/assets/bigcloud.png');
        game.load.image('smallcloud', '/assets/smallcloud.png');
        game.load.image('leg1', '/assets/leg1.png');
        game.load.image('arm1', '/assets/arm1.png');
        game.load.image('title', '/assets/title.png');
        game.load.image('score_badge', '/assets/highscore.png')
        game.load.image('shard', '/assets/shard.png');
        game.load.image('glass_shard', '/assets/glass_shard.png');
        game.load.image('orb', '/assets/orb.png');
        game.load.image('orb_dim', '/assets/orb_dim.png');
        game.load.image('high', '/assets/high.png');
        game.load.image('space', '/assets/space.png');
        game.load.spritesheet('keyboard', '/assets/keyboard.png', 250, 133);
        game.load.image('beer', '/assets/beer1.png');
        game.load.image('plate', '/assets/plate1.png');
        highscore = window.localStorage.getItem('highscore');
        if (highscore === null) { 
            highscore = 0;
        }
    },

    create: function() {
        game.state.start('normal')
    },
};

statesJS.help = {
    helpwords:  "Oh no! A riot has broken out at the Wyatt Saloon. Miss Dallas only has her parasol to defend " + 
                "herself from flying debris! \n\n" +
                "Use the top keyboard row to block high, the home row to block in the middle, and the bottom row to" +
                " block low. \n\n" +
                "Block the debris, but don't block the green smelling salt bottles. The smelling salts will give you" +
                " pep, and vigour.\n\n" +
                "Press            to start.",
    helptext: null,
    helpimages: [
        {img: 'bottle', x: 150, y: 70},
        {img: 'beer'  , x: 250, y: 70},
        {img: 'plate' , x: 350, y: 70},
        {img: 'powerup', x: 250, y: 475},
        {img: 'keyboard', x: 160, y: 275, animate: true},
        {img: 'space', x: 700, y: 610, still: true},
    ],
    bounce_dist: 7,

    create: function() {
        game.stage.backgroundColor = 0xfffCe6;
        var font = {
            font: "bold 20pt Courier New", 
            fill: "black",
            wordWrap: true,
            wordWrapWidth: 500,
        };
        this.helptext = game.add.text(600, 60, this.helpwords, font);
        for (var i=0; i<this.helpimages.length; i++) {
            var img = this.helpimages[i];
            var spr = game.add.sprite(img.x, img.y, img.img);
            if (!img.still){
                var twn = game.add.tween(spr);
                twn.to({y: spr.y + this.bounce_dist}, 1500, Phaser.Easing.Sinusoidal.InOut, true, 0, -1, true);
                twn.start();
                this.bounce_dist = -this.bounce_dist;
            }
            if (img.animate) {
                spr.animations.add('standard', null, 2, true);
                spr.play('standard');
            }
        }
    },

    update: function() {
        if (do_reset) {
            game.state.start('normal');
        }
    },

    shutdown: function() {
        this.helptext.destroy();
        this.helptext = null;
    },
};

statesJS.normal = {
    startup: true,

    create: function() {
        if (!music) {
            music = game.add.audio('song', 0.7, true);
            music.play();
        };
        bg = game.add.image(0,0,'background');
        player = new items.Player();
        controller = new items.BottleController(START_MIN_INT, FINAL_MIN_INT, BOTTLE_RAND_FACTOR, 
                                                BOTTLE_SPEED, INT_REDUCTION, player);
        cloud = new items.Cloud();
        ui = new items.UI();
        title = new items.Title(); 
        do_reset = false;
        this.startup = true;
        title.lower();
    },

    shutdown: function() {

    },

    update: function() {
        if (player.score > highscore) {
            highscore = player.score;
            player.new_highscore = true;
        };
        game.world.bringToTop(title.title_slide);
        game.world.bringToTop(title.badge);
        ui.update();
        var dt = game.time.physicsElapsed;
        if (player.powerup_lvl < 1) {
            // Then we are dead
            player.death_update(dt);
        } else {
            player.update(dt);
        }
        if (this.startup === false) {
            cloud.update(dt);
            if (cloud.intro_complete === true) {
                controller.update(dt);
            }
        }
        if (get_help) {
            get_help = false;
            game.state.start('help');
        }
        if (do_reset) {
            console.log("Minimum interval at death: " + controller.min_int);
            reset();
        }
    },
};

