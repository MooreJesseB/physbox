Physics(function(world) {
  $(window).load(function() {
    var canvas = $("#viewport").get(0);
    var ctx = canvas.getContext('2d');
    var blocks = [];
    var debris = [];
    var bombs = [];
    var circles = [];
    var cleanup = [blocks, debris, bombs, circles];
    var mode = "box";
    var rain = false;
    var rainTimer = false;
    var interval = 0;

    var par = window;

    var renderer = Physics.renderer('canvas', {
      el: viewport,
      width: par.innerWidth - 150,
      height: par.innerHeight - 150,
    });
    world.add(renderer);

    $(par).on('resize', function() {
      canvas.width = par.innerWidth - 150;
      canvas.height = par.innerHeight - 150;
      renderer.el.width = par.innerWidth - 150;
      renderer.el.height = par.innerHeight - 150;
      renderer.width = par.innerWidth - 150;
      renderer.height = par.innerHeight - 150;
    });

    console.log(renderer.el.width);
    
    world.render();

    // subscribe to the ticker to advance the simulation
    Physics.util.ticker.on(function(time, dt) {
      world.step(time);
    });
    // start the ticker
    Physics.util.ticker.start();

    world.on('step', function() {
      world.render();
    });

    world.add(Physics.behavior('constant-acceleration'));

    var bounds = Physics.aabb(0, 0, canvas.width, canvas.height);

    world.add(Physics.behavior('edge-collision-detection', {
      aabb: bounds,
      restitution: 0.25
    }));

    // ensure objects bounce when edge collision is detected
    world.add(Physics.behavior('body-impulse-response'));
    world.add(Physics.behavior('body-collision-detection'));
    world.add(Physics.behavior('sweep-prune'));

    var makeDebris = function(location, count) {
      var temp = [];
      for (var i = 0; i < count; i++) {
        var d = Physics.body('rectangle', {
          x: location.x,
          y: location.y,
          vx: (-1 + Math.random()*2),
          vy: (-1 + Math.random()*2),
          mass: 0.3,
          width: 10,
          height: 10,
          restitution: 0.2,
          styles: {
            fillStyle: '#FF5A1C',
            angleIndicator: 'none'
          }
        });
        debris.push(d);
        world.add(d);

        setTimeout(function() {
          debris.forEach(function(item, index) {
            if (item === d) {
              temp = debris.splice(index, 1);
              world.remove(temp);
              console.log("Got Here", temp);
            }
          });
        }, 5000);

        if (debris.length > 100) {
          temp = debris.splice(0, 1);
          world.remove(temp);
        }
      }
    };

    var impulse = function(location, power) {
      attractor = Physics.behavior('attractor', {
        pos: {x: location.x, y: location.y},
        strength: 0 - power
      });

      world.add(attractor);

      setTimeout(function() {
        world.remove(attractor);  
      }, 50);
    };

    var destroyBlock = function(block) {
    
      var loc = {x: block.state.pos.x, y: block.state.pos.y};

      var tempBlock = blocks.splice(0, 1);
      world.remove(tempBlock);

      makeDebris(loc, 25);
      // impulse(loc, 100);      
    };

    createBlock = function(location) {
      var square = Physics.body('rectangle', {
        x: location.x,
        y: location.y,
        vx: -0.05 + Math.random()*0.1,
        vy: -0.05 + Math.random()*0.1,
        mass: 100,
        width: 50,
        height: 50,
        styles: {
          fillStyle: '#C03602',
          angleIndicator: 'none'
        }
      });
      blocks.push(square);
      world.add(square);
      // square.view.className = "block";

      if (blocks.length > 40) {
        destroyBlock(blocks[0]);
      }
    };

    createBomb = function(location) {
      var bomb = Physics.body('circle', {
        x: location.x,
        y: location.y,
        mass: 1000,
        radius: 25,
        styles: {
          fillStyle: '#FF4702',
          angleIndicator: 'none'
        }
      });
      bomb.view = new Image();
      bomb.view.src = './public/images/bomb_body.png';
      bombs.push(bomb);
      world.add(bomb);

      bombExplode(bomb);

    };

    bombExplode = function(bomb) {
      setTimeout(function(){
        var loc = {x: bomb.state.pos.x, y: bomb.state.pos.y};
        makeDebris(loc, 25);
        impulse(loc, 300);
        bombs.forEach(function(item, index) {
          if (item === bomb) {
            bombs.splice(index, 1);
            world.remove(bomb);
          }
        });
      }, 2000);
    };

    makeRain = function() {
      var xRand = Math.floor(Math.random() * canvas.width);
      var velRand = -3 - Math.random()*3;
      var xVelRand = velRand;
      if (xRand < canvas.width * 0.5) {
        xVelRand = 0 - xVelRand;
      }
      var rainBody = Physics.body('circle', {
        x: xRand,
        y: 25,
        vx: xVelRand *0.4,
        vy: velRand * 2,
        mass: 500,
        radius: 10,
        restitution: 0.35,
        styles: {
          fillStyle: '#C03602',
          angleIndicator: 'none'
        }
      });
      circles.push(rainBody);
      world.add(rainBody);

      if (circles.length > 15) {
        var tempCircle = circles.splice(0, 1);
        world.remove(tempCircle);
      }
    };

    var setRainTimer = function() {
      if (rain) {
        makeRain();
        setTimeout(function() {
          setRainTimer();
        }, Math.floor(Math.random()*200 + 200));  
      }
    };

    $(".bombbutton").on('click', function() {
      $(this).toggleClass("down");
      if (mode !== 'bomb') {
        $('boxbutton').removeClass("down");
        mode = 'bomb';
      }
    });

    $('.boxbutton').on('click', function() {
      $(this).toggleClass("down");
      if (mode !== 'box') {
        $('.bombbutton').removeClass("down");
        mode = 'box';
      }
    });

    $('.rainbutton').on('click', function() {
      $(this).toggleClass("down");
      rain = !rain;
      if (rain) {
        setRainTimer();
      }
    }); 

    $(".eraserbutton").on('click', function() {
      rain = false;
      circles.forEach(function(item) {
        world.removeBody(item);
      });
      circles = [];
      blocks.forEach(function(item) {
        world.removeBody(item);
      });
      blocks = [];
      debris.forEach(function(item) {
        world.removeBody(item);
      });
      debris = [];
    });

    $("#viewport").on('click', function(event) {
      
      coords = {
        x: event.pageX - 75,
        y: event.pageY - 75
      };

      switch(mode) {
        case 'bomb':
          createBomb(coords);
          break;
        case 'box':
          createBlock(coords);
          break;
        default:
          break;
      }
    });

    $(".block").on('click'), function() {
      destroyBlock(this.parent);
    };
  });
});























