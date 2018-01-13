"use strict";

var itemsJS = {};

itemsJS.Player = function () {
    this.dead = false;
    this.frame = 0;
    this.score = 0;
    this.powerup_lvl = 1;
    this.target_pos = 2;
    this.character = game.add.image(0, 0, 'character');
    this.block = game.add.sprite(BLOCK_X, BLOCK_POS[2], 'parasol');
    this.block.anchor.set(0.1, 0.5);
    this.arm = new itemsJS.Arm(this);
    this.path = new itemsJS.Path();
    this.new_highscore = false;
    this.hit_offset = 100;
    this.hit_sound = game.add.sound("hit");
    this.powerup_sound = game.add.sound("up");

    this.score_up = function(amount) {
        if (this.powerup_lvl > 0 ) {
            this.score += amount;
        }
    };

    this.block_powerup = function(amount) {
        this.hit_sound.play();
        this.score -= amount;
    };

    this.power_up = function () {
        if (this.powerup_lvl > 0 && this.powerup_lvl < BLOCK_SPEEDS.length - 1){
            this.powerup_lvl +=1;
        }
        this.powerup_sound.play();
    };

    this. power_down = function () {
        if (this.powerup_lvl > 0) {
            this.powerup_lvl -= 1;
        }
        this.hit_sound.play();
    };

    this.update = function (dt) {
        this.path.update(dt);
        var pos = this.path.get_pos();
        this.character.x = pos.x;
        this.character.y = pos.y;
        var mov = BLOCK_SPEEDS[this.powerup_lvl] * dt;
        var direction = 0;
        var dif = this.block.y - BLOCK_POS[this.target_pos];
        if (Math.abs(dif) >= mov) {
            if (dif > 0) {
                direction = -1;
            } else {
                direction = 1;
            }
            this.block.y += (mov * direction);
        } else {
            this.block.y = BLOCK_POS[this.target_pos];
        }
        this.arm.update(dt);
    };

    this.death_update = function (dt) {
        this.block.rotation += 2 * dt;
        this.block.y += 250 * dt;
        this.character.x += 150 * dt;
        this.character.y += 450 * dt;
        this.arm.update(dt);
        if (this.character.y > 450 && !this.dead) {
            title.lower();
            this.dead = true;
            window.localStorage.setItem('highscore', highscore);
        }
    };

    this.reset = function () {
        this.score = 0;
        this.powerup_lvl = 1;
        this.target_pos = 2;
        this.block.x = BLOCK_X;
        this.block.y = BLOCK_POS[2];
        this.block.rotation = 0;
        this.dead = false;
        this.new_highscore = false;
    }
};

itemsJS.Arm = function (player) {
    this.offsets = {
        upper_length_chop: 35,
        upper_anchor: 0.9,
        upper_y_anchor: 0.5,
        lower_length_chop: -15,
        lower_anchor: 0.9,
        lower_y_anchor: 0.5,
        shoulder_x: 230,
        shoulder_y: 195,
        umbrella_x: 150,
        umbrella_y: 0,
        elbow_increase: -0.1,
    };
    this.player = player;
    this.group = game.add.group();
    this.upper_arm = game.add.sprite(this.player.x + this.offsets.shoulder_x, 
                                     this.player.y + this.offsets.shoulder_y, 'upper');
    this.upper_arm.anchor.set(this.offsets.upper_anchor, this.offsets.upper_y_anchor); 
    this.lower_arm = game.add.sprite(0, 0, 'lower');
    this.lower_arm.anchor.set(this.offsets.lower_anchor, this.offsets.lower_y_anchor);
    this.group.add(this.upper_arm);
    this.group.add(this.lower_arm);

    this.grab_distance = function () {
        var handle = new Phaser.Point(this.player.block.x + this.offsets.umbrella_x, 
                                      this.player.block.y + this.offsets.umbrella_y);
        return this.upper_arm.position.distance(handle);
    };

    this.grab_angle = function () {
        var handle = new Phaser.Point(this.player.block.x + this.offsets.umbrella_x, 
                                      this.player.block.y + this.offsets.umbrella_y);
        return this.upper_arm.position.angle(handle) - Math.PI;
    };

    this.elbow_angle_calc = function () {
        var a = (this.upper_arm.width * this.offsets.upper_anchor) - this.offsets.upper_length_chop;
        var b = (this.lower_arm.width * this.offsets.lower_anchor) - this.offsets.lower_length_chop;
        var c = this.grab_distance(); 
        var cosC = ((a*a) + (b*b) - (c*c))/(2*a*b);
        var C = Math.acos(cosC);
        return C;
    };

    this.update = function(dt) {
        this.upper_arm.x = this.player.character.x + this.offsets.shoulder_x;
        this.upper_arm.y = this.player.character.y + this.offsets.shoulder_y;
        if (this.player.powerup_lvl < 1) {
            this.upper_arm.rotation += 1.0 * dt;
            this.lower_arm.rotation += 1.3 * dt;
        } else {
            var ea = this.elbow_angle_calc();
            var sa = (Math.PI - ea) / 2;
            var ga = this.grab_angle();
            this.upper_arm.rotation = ga - sa;
            this.lower_arm.rotation = (((ga - sa) + Math.PI) - ea) + this.offsets.elbow_increase; 
        }
        var lower_arm_pos = new Phaser.Point();
        // Inexplicable angle offset needed of 0.27ish.
        lower_arm_pos.rotate(this.upper_arm.x, this.upper_arm.y, this.upper_arm.rotation - 0.27, 
            false, this.upper_arm.width - this.offsets.upper_length_chop);
        this.lower_arm.position = lower_arm_pos;
    };
};

itemsJS.BottleController = function (min_int, min_int_limit, bottle_rand_factor, bottle_speed, int_reduction, player) {
    this.player = player;
    this.nb_time = 0;
    this.start_int = min_int;
    this.min_int = this.start_int;
    this.min_int_limit = min_int_limit;
    this.int_reduction = int_reduction;
    this.bottle_rand_factor = bottle_rand_factor;
    this.bottle_rand_range = min_int * bottle_rand_factor;
    this.bottle_array = [];
    this.bottle_speed = bottle_speed;
    this.start_speed = bottle_speed
    this.arcs = {};
    this.speedup_start = SPEEDUP_START;
    for (var i = 0; i < BOTTLE_POS.length; i++) {
        this.arcs[i] = new itemsJS.ArcCalculator(-10, BLOCK_X, BOTTLE_POS[i], 3500, false);
    };

    this.update = function(dt) {
        // Spawn new bottles if needed
        var now = game.time.events.seconds;
        if (now > this.nb_time) {
            var bot_pos = game.math.between(0, 2);
            var pu = this.powerup_decider();
            this.bottle_array.push(new itemsJS.Bottle(bot_pos, this.bottle_speed, pu, this.arcs[bot_pos], true));
            // Set the time of the next bottle.
            this.nb_time = now + this.min_int + (game.math.random(0, this.bottle_rand_range));
            // Do the interval reduction.
            if (this.min_int_limit < this.min_int - this.int_reduction) {
                this.min_int -= this.int_reduction;
                this.bottle_rand_range = this.min_int * this.bottle_rand_factor;
                // console.log("New interval " + this.min_int);
            } else {
                this.min_int = this.min_int_limit;
                this.bottle_rand_range = this.min_int * this.bottle_rand_factor;
            }
            if (this.min_int < this.speedup_start) {
                this.bottle_speed += SPEEDUP_AMOUNT;
                // console.log("Speed increased to" + this.bottle_speed);
            }
        }
        // Update all the bottles in the array
        var new_bottles = [];
        for (var i = 0; i < this.bottle_array.length; i++) {
            // Move position
            this.bottle_array[i].update(dt);
            // Do collisions
            if (this.bottle_array[i].check_collision(this.player.block.y)) {
                if (this.bottle_array[i].powerup !== true) {
                    player.score_up(1);
                } else {
                    player.block_powerup(5); //TODO - Not hardcoded
                }
                this.bottle_array[i].shatter();
            } else if (this.bottle_array[i].check_home() && player.powerup_lvl > 0) {
                if (this.bottle_array[i].powerup !== true) {
                    player.power_down();
                    this.bottle_array[i].shatter();
                } else {
                    player.power_up();
                    this.bottle_array[i].destroy();
                }
            } else if (this.bottle_array[i].check_offscreen()) {
                this.bottle_array[i].destroy();
            }
            // Save bottles of they are not ready for deletion
            if (!this.bottle_array[i].done) {
                new_bottles.push(this.bottle_array[i]);
            }
        }
        this.bottle_array = new_bottles;
    };

    this.powerup_decider = function() {
        return game.math.random(0, 1) < PU_MULTIPLIER;
    };

    this.reset = function() {
        for (var i = 0; i < this.bottle_array.length; i++) {
            this.bottle_array[i].destroy();
        }
        this.nb_time = 0;
        this.min_int = this.start_int;
        this.bottle_array = [];
        this.intro_complete = false;
        this.bottle_speed = this.start_speed;
    };
};

itemsJS.Bottle = function (pos, speed, powerup, arc_controller, rotate) {
    this.shards = null;
     // Set to true when the bottle has shattered and the shatter particles have timed out
    this.done = false;
    this.pos = pos;
    this.speed = speed;
    this.powerup = powerup;
    this.types = ['beer', 'bottle', 'plate'];
    var x = -BOTTLE_SIZE - 100;
    this.prev_x = x;
    if (this.powerup) {
        this.ph_obj = game.add.sprite(x, BOTTLE_POS[this.pos], 'powerup');
    } else {
        var i = Phaser.Math.between(0, this.types.length - 1);
        this.ph_obj = game.add.sprite(x, BOTTLE_POS[this.pos], this.types[i]);
    }
    game.world.moveDown(this.ph_obj);
    this.ph_obj.pivot = this.ph_obj.anchor;
    if (rotate === true) {
        this.ph_obj.rotation = Phaser.Math.random(0, Phaser.Math.PI2)
        this.rot_speed = Phaser.Math.random(-0.4, 0.4);
    } else {
        this.ph_obj.rotation = 0;
        this.rot_speed = 0;
    }
    this.ph_obj.anchor.set(0.5, 0.5);
    this.arc_controller = arc_controller;

    this.update = function(dt) {
        if (this.ph_obj) {
            this.prev_x = this.ph_obj.x;
            this.ph_obj.x += this.speed * dt;
            this.ph_obj.y = this.arc_controller.get_y(this.ph_obj.x);
            this.ph_obj.rotation += this.rot_speed * dt;
        } else if (this.shards) {
            this.shards.update(dt);
            this.done = this.shards.done;
        }
    };
    this.check_collision = function(block_y) {
        if (!this.ph_obj) { return false };
        var edge = this.ph_obj.x + BOTTLE_SIZE/2;
        var prev_edge = this.prev_x + BOTTLE_SIZE/2; // Divide by 2 as origin is in the middle of sprite
        return ((prev_edge < BLOCK_L) && (edge > BLOCK_X)) && (Math.abs(this.ph_obj.y - block_y) < 30);
    };

    this.check_home = function() {
        if (!this.ph_obj) { return false };
        return (this.ph_obj.x + BOTTLE_SIZE) > CONFIG.width - player.hit_offset;
    };

    this.check_offscreen = function() {
        if (!this.ph_obj) { return false };
        return (this.ph_obj.x + BOTTLE_SIZE) > (CONFIG.width + 300);
    };

    this.shatter = function() {
        this.shards = new itemsJS.ShardExplode(this.ph_obj.x, this.ph_obj.y, this.powerup);
        this.ph_obj.destroy();
        this.ph_obj = null;
    };

    this.destroy = function() {
        if (this.shards) { this.shards.destroy() };
        if (this.ph_obj) { this.ph_obj.destroy() };
        this.ph_obj = null;
        this.shards = null;
        this.done = true;
    };
};

itemsJS.ShardExplode = function(x, y, powerup) {

    this.update = function(dt) {
        var i;
        for (i=0; i<this.settings.num_shards; i++) {
            this.shard_array[i].y_speed += this.settings.drop_accel * dt;
            this.shard_array[i].y += this.shard_array[i].y_speed * dt;
            this.shard_array[i].x += this.shard_array[i].x_speed * dt;
        }
    };

    this.smash_sound = function() {
        this.noise.play();
    };

    this.destroy = function() {
        var i;
        for (i=0; i<this.settings.num_shards; i++) {
            this.shard_array[i].destroy();
        }
        this.noise.destroy();
        this.done = true;
    };

    this.settings = {
            drop_accel: 3000,
            num_shards: 6,
            speed_changes: [-70, -50, -20, -30 , 0, 20],
            x_offsets:     [-15, -15,  15,  15,  0, 7],
            y_offsets:     [-15,  15, -15,  15,  7, 0],
    };
    this.noise = game.add.sound("thud", 1.0);
    this.shard_array = [];
    this.done = false;
    var i;
    for (i=0; i<this.settings.num_shards; i++) {
        var rot = Phaser.Math.random(0, Phaser.Math.PI2);
        if (powerup) {
            var shard = game.add.sprite(x + this.settings.x_offsets[i], y + this.settings.y_offsets[i], 'glass_shard');
        } else {
            var shard = game.add.sprite(x + this.settings.x_offsets[i], y + this.settings.y_offsets[i], 'shard');
        }
        shard.rotation = rot;
        shard.anchor.set(0.5, 0.5);
        shard.y_speed = 0;
        shard.x_speed = BOTTLE_SPEED + this.settings.speed_changes[i];
        this.shard_array.push(shard);
    }
    this.timer = game.time.create();
    this.timer.add(1500, this.destroy, this);
    this.timer.start();
    this.smash_sound();
};

itemsJS.ArcCalculator = function (start, end, path_y, drop_y, debug) {
    this.start = start;
    var y = path_y + drop_y;
    var x = start + (end - start)/2;
    this.origin = new Phaser.Point(x, y);
    var point = new Phaser.Point(start, path_y);
    var radius = Phaser.Point.distance(this.origin, point);
    this.circle = new Phaser.Circle(x, y, radius * 2);
    if (debug === true) {
        this.graphics = game.add.graphics();;
        this.graphics.lineStyle(2, 0xFF00FF, 1.0);
        this.graphics.drawCircle(this.circle.x, this.circle.y, this.circle.radius * 2);
    }

    this.get_y = function (distance) {
        // Returns the y position of the object for its position along the path
        var p = new Phaser.Point(distance-this.start, path_y);
        var angle = Phaser.Point.angle(p, this.origin);
        return this.circle.circumferencePoint(angle).y;
    };
};

itemsJS.Path = function () {
    this.points_x = [999.22, 1007.9, 993.44, 1003.0, 998.56, 997.89, 992.33, 982.78, 987.00, 995.00, 1008.3, 
                     1015.4, 1014.6, 1004.3, 989.67, 980.78, 976.78, 988.33, 1001.0, 1024.1, 984.33, 977.00, 
                     979.22, 990.56, 996.78, 1014.6, 1019.2, 999.22];
    this.points_y = [115.78, 134.22, 140.00, 147.33, 141.33, 133.33, 116.00, 108.89, 122.67, 131.11, 143.33, 
                     144.67, 132.89, 117.56, 114.00, 115.33, 124.22, 134.00, 132.00, 142.00, 126.00, 109.33, 
                     101.11, 103.56, 108.22, 125.78, 135.56, 115.78];
    this.speed = 0.06;
    this.progress = 0;

    this.get_pos = function () {
        var px = game.math.catmullRomInterpolation(this.points_x, this.progress);
        var py = game.math.catmullRomInterpolation(this.points_y, this.progress);
        return {x: px, y: py};
    };
    this.update = function (dt) {
        this.progress += this.speed * dt;
        if (this.progress > 1) {
            this.progress -=1;
        }
    }
};

itemsJS.Cloud = function () {
    this.setup = {
        intro_x: -560,
        intro_y: 360,
        x_origin: -20,
        y_origin: 360,
        angle_range: 0.8,
        circle_x: -220,
        circle_y: 350,
        circle_diameter: 560,
        inner_speed: -0.3,
        outer_speed: 0.2,
        delay: 600,
    }
    this.intro_complete = false;
    this.outer = game.add.image(this.setup.intro_x, this.setup.intro_y, 'bigcloud');
    this.outer.anchor.set(0.5, 0.5);
    this.inner = game.add.image(this.setup.intro_x, this.setup.intro_y, 'smallcloud');
    this.inner.anchor.set(0.5, 0.5);

    this.limb = null;
    this.min_angle = -this.setup.angle_range;
    this.max_angle = this.setup.angle_range;
    this.diameter = this.setup.circle_diameter;
    game.world.bringToTop(this.inner);
    this.tween = null;
    this.limb_types = ['arm1', 'leg1'];
    this.limb_index = 0;

    this.place_limb = function () {
        if (this.limb_index < this.limb_types.length - 1) {
            this.limb_index += 1;
        } else {
            this.limb_index = 0;
        }
        this.limb = game.add.image(this.setup.circle_x, this.setup.circle_y, this.limb_types[this.limb_index]);
        game.world.swap(this.limb, this.inner);
        // Choose a point on a circle that is facing player
        var angle = Phaser.Math.random(this.min_angle, this.max_angle);
        var circle = new Phaser.Circle(this.setup.circle_x, this.setup.circle_y, this.diameter);
        var destination = circle.circumferencePoint(angle);
        this.limb.rotation = angle;
        this.tween = game.add.tween(this.limb.position);
        this.tween.to({x: destination.x, y: destination.y}, this.setup.delay, Phaser.Easing.Circular.Out);
        this.tween.to({x: this.setup.circle_x, y: this.setup.circle_y,}, this.setup.delay, Phaser.Easing.Circular.Out);
        this.tween.delay(this.setup.delay, 0);
        this.tween.delay(this.setup.delay, 1);
        this.tween.start();
        this.tween.onComplete.add(this.on_complete, this);
    };

    this.update = function (dt) {
        if (this.intro_complete === true) {
            this.outer.rotation += this.setup.outer_speed * dt;
            this.inner.rotation += this.setup.inner_speed * dt;
            if (this.limb === null) {
                this.place_limb();
            }
        } else {
            this.intro_update(dt);
        }
    };

    this.reset = function () {
        this.on_complete();
        this.inner.x = this.setup.intro_x;
        this.inner.y = this.setup.intro_y;
        this.outer.x = this.setup.intro_x;
        this.inner.y = this.setup.intro_y;
        this.tween = null;
        this.intro_complete = false;
    };

    this.intro_update = function (dt) {
        if (this.outer.x < this.setup.x_origin) {
            this.outer.x += 180 * dt;
            this.inner.x += 180 * dt;
            this.inner.rotation += this.setup.inner_speed * dt;
            this.outer.rotation += this.setup.outer_speed * dt;
        } else {
            this.inner.x = this.setup.x_origin;
            this.outer.x = this.setup.x_origin;
            this.intro_complete = true;
        }
    };

    this.on_complete = function () {
        if (this.limb){
            this.limb.destroy();
            this.limb = null;
        }
    };
};

itemsJS.Title = function () {
    this.bottom_edge = 755;
    this.middle = 620;
    this.badge_rest = -300;
    this.tween = null;
    this.title_slide = game.add.sprite(this.middle, 0, 'title');
    this.title_slide.anchor.set(0.5, 1);
    this.badge = game.add.sprite(this.badge_rest, 200, 'score_badge');
    this.badge_tween = null;
    this.is_up = true;
    this.is_down = false;
    this.sound = game.add.sound('whoosh');
    game.world.bringToTop(this.title_slide);
    game.world.bringToTop(this.badge);

    this.raise = function() {
        if (this.tween) {
            this.tween.stop();
        }
        this.tween = game.add.tween(this.title_slide);
        this.tween.to({y: 0}, 500, Phaser.Easing.Exponential.In, false, 0);
        this.tween.onStart.add(this.on_raise_start, this);
        this.tween.onComplete.add(this.on_raise_complete, this);
        this.tween.start();
    };

    this.lower = function() {
        if (this.tween) {
            this.tween.stop();
        }
        this.tween = game.add.tween(this.title_slide);
        this.tween.to({y: this.bottom_edge}, 650, Phaser.Easing.Exponential.Out, false, 400);
        this.tween.onComplete.add(this.on_lower_complete, this);
        this.tween.onStart.add(this.on_lower_start, this);
        this.tween.start();
    };

    this.on_lower_complete = function() {
        this.is_up = false;
        this.is_down = true;
    };

    this.on_lower_start = function () {
        //Check if we have the high score, and send in the badge if needed
        if (player.new_highscore) {
            if (this.badge_tween) {
                this.badge_tween.stop();
                this.badge_tween = null;
            }
            this.badge_tween = game.add.tween(this.badge);
            this.badge_tween.to({x: 900}, 650, Phaser.Easing.Exponential.Out);
            this.badge_tween.start();
        }
        this.sound.play();
    }

    this.on_raise_complete = function() {
        this.sound.play();
    };

    this.on_raise_start = function() { 
        ui.show();
        this.is_up = true;
        this.is_down = false;
        //Tween the badge out
        if (this.badge_tween) {
            this.badge_tween.stop();
            this.badge_tween = null;
        }
        this.badge_tween = game.add.tween(this.badge);
        this.badge_tween.to({x: this.badge_rest}, 400, Phaser.Easing.Exponential.In);
        this.badge_tween.start();
    };

};

itemsJS.UI = function() {
    this.hide = function() {
        this.score_display.visible = false;
        for (var i = 0; i<this.orbs.length; i++) {
            this.orbs[i].visible = false;
        }
    };

    this.show = function() {
        this.score_display.visible = true;
        for (var i = 0; i<this.orbs.length; i++) {
            this.orbs[i].visible = true;
        }
    };

    this.update = function() {
        this.score_display.text = player.score;
        this.high_score_display.text = highscore;
        if (player.powerup_lvl !== this.prev_power_lvl) {
            for (var i = 0; i<BLOCK_SPEEDS.length - 1; i++) {
                this.orbs[i].loadTexture("orb_dim");
            }
            for (var i = 0; i<player.powerup_lvl; i++) {
                this.orbs[i].loadTexture("orb");
            }
        }
        this.prev_power_lvl = player.powerup_lvl;
    };

    this.high_label = game.add.sprite(30, 5, "high")
    this.prev_power_lvl = 0;
    this.orbs = [];
    this.orb_x = 443;
    this.orb_y = 20;
    this.orb_space = 55;
    this.score_drop = 20;
    for (var i = 0; i<BLOCK_SPEEDS.length - 1; i++) {
        this.orbs.push(game.add.sprite(this.orb_x + i * this.orb_space, this.orb_y, "orb_dim"));
    }
    var high_font = {font: "bold 30pt Courier New", fill: "white", stroke: "black", strokeThickness: 10,};
    var font = {font: "bold 45pt Courier New", fill: "white", stroke: "black", strokeThickness: 10,};
    this.score_display = game.add.text(1245, this.score_drop, " ", font);
    this.score_display.anchor.set(1, 0);
    this.high_score_display = game.add.text(180, this.score_drop, " ", high_font);
    this.hide();
};
