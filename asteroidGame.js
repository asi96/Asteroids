 /**
  * Asteroids in JavaScript
  * 
  * A recreation of the popular Atari 1979 game made in JavaScript.
  * Feel free to play around with the constants to your liking!
  * 
  * @author Anders Simonsen
  */
 
 // Create constants needed for the game
 const FPS = 30; // default standard framerate
 const PLAYER_LIVES = 3; // Amount of lives a player has before game over
 const SPACESHIP_SIZE = 30; // spaceship size in pixels
 const SPACESHIP_TURN_SPEED = 360; // spaceship turn speed in degrees
 const SPACESHIP_THRUST = 5; // spaceship thrust acceleration
 const SPACESHIP_FRICTION = 0.7; // spaceship friction coefficient of space (0 = no friction, 1 = lots of friction)
 const SPACESHIP_EXPLOSION_DURATION = 0.3; // Duration of the ship exploding in seconds
 const SPACESHIP_BLINK_DURATION = 0.1; // Duration of the ships blinks during invulnerability
 const SPACESHIP_INVULNERABILITY_DURATION = 3; // Duration of the ships invulnerability in seconds after respawning
 const ASTEROID_AMOUNT = 3; // Amount of asteroids at the start of game
 const ASTEROID_SPEED = 50; // Max speed at the start for each asteroid in pixels per second
 const ASTEROID_SIZE = 100;  // Size of each asteroid in pixels
 const ASTEROID_VERTICES = 10; // Roughly average number of vertices on each asteroid spawned
 const ASTEROID_RANDOMNESS = 0.4; // The randomness of each asteroids shape - higher value more interesting shapes
 const SHOW_CENTER_CIRCLE = false; // Toggle showing the red center circle for debugging purposes
 const SHOW_BOUNDING_BOXES = false; // Toggle showing the collision boxes for objects
 const LASER_MAX_AMOUNT = 10; // Maximum amount of lasers at the same time
 const LASER_SPEED = 500; // Speed of the laser rays in pixels per second
 const LASER_MAX_DISTANCE = 0.4; // The maximum distance a laser ray can travel before being removed in fraction of screen width
 const LASER_EXPLOSION_DURATION = 0.1; // Duration of the explosion caused by laser hitting asteroids
 const TEXT_FADE_DURATION = 2.5; // Duration of the fade effect in seconds
 const TEXT_FONT_SIZE = 40; // Size of the text font size in pixels
 const SCORE_LARGE = 20; // Score rewarded for hitting a large asteroid
 const SCORE_MEDIUM = 50; // Score rewarded for hitting a medium asteroid
 const SCORE_SMALL = 100; // Score rewarded for hitting a small asteroid
 const SAVE_KEY_SCORE = "highscore"; // Persist the highscore if user closes the window
 const SOUND_ACTIVE = true; // Whether sound should be played
 const MUSIC_ACTIVE = true; // Whether music should be played

 /** @type {HTMLCanvasElement} */
 var canvas = document.getElementById("game_container");
 var context = canvas.getContext("2d");

 // setup variables for the game logic
 var level, asteroids, spaceship, text, textalpha, lives, gamescore, highscore;

 // import sound files
 var aLaser = new GameSound("gamesounds/laser.m4a", 5, 0.5);
 var aLaserHit = new GameSound("gamesounds/hit.m4a", 5);
 var aExplode = new GameSound("gamesounds/explode.m4a", 1, 0.8);
 var aThrust = new GameSound("gamesounds/thrust.m4a", 1, 0.5);

 // import background music
 var gamemusic = new GameMusic("gamesounds/music-low.m4a", "gamesounds/music-high.m4a");
 var asteroidsRemaining, asteroidsTotal;

 startNewGame();

 // Event Handlers
 document.addEventListener("keydown", keyDownPressed);
 document.addEventListener("keyup", keyUpPressed);

 // Define the game loop and speed
 setInterval(update, 1000 / FPS);

 function createAsteroids() {

     // clear out any old asteroids
     asteroids = [];
     var x, y;
     asteroidsTotal = (ASTEROID_AMOUNT + level) * 7;
     asteroidsRemaining = asteroidsTotal;

     for (var i = 0; i < ASTEROID_AMOUNT + level; i++) {
         // Add a bit of randomness to each asteroid postion spawning in
         do {
             x = Math.floor(Math.random() * canvas.width);
             y = Math.floor(Math.random() * canvas.height);
         } while (checkDistanceBetweenPoints(spaceship.x, spaceship.y, x, y) < ASTEROID_SIZE * 2 + spaceship.r);
         asteroids.push(newAsteroid(x, y, Math.ceil(ASTEROID_SIZE / 2)));
     }
 }

 function checkDistanceBetweenPoints(x1, y1, x2, y2) {

     // Enforces a certain buffer zone around the spaceship to prevent asteroids spawning ontop
     return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
 }


 function blowUpSpaceShip() {

     // Make a big explosion on the ship whenever a collision is detected
     spaceship.explosionTime = Math.ceil(SPACESHIP_EXPLOSION_DURATION * FPS);
     aExplode.play();
 }

 function newAsteroid(x, y, r) {

     var difficulty = 1 + 0.1 * level;

     var asteroid = {
         x: x,
         y: y,
         xv: Math.random() * ASTEROID_SPEED * difficulty / FPS * (Math.random() < 0.5 ? 1 : -1),
         yv: Math.random() * ASTEROID_SPEED * difficulty / FPS * (Math.random() < 0.5 ? 1 : -1),
         r: r,
         a: Math.random() * Math.PI * 2, // converted to radians
         randVertices: Math.floor(Math.random() * (ASTEROID_VERTICES + 1) + ASTEROID_VERTICES / 2),
         offset: []
     };

     // create the offset to cause random shapes
     for (var i = 0; i < asteroid.randVertices; i++) {

         asteroid.offset.push(Math.random() * ASTEROID_RANDOMNESS * 2 + 1 - ASTEROID_RANDOMNESS);
     }

     return asteroid;
 }

 function destroyAsteroid(index) {

     var x = asteroids[index].x;
     var y = asteroids[index].y;
     var r = asteroids[index].r;

     // split the asteroid into a smaller pieces depending on its size
     if (r == Math.ceil(ASTEROID_SIZE / 2)) {

         asteroids.push(newAsteroid(x, y, Math.ceil(ASTEROID_SIZE / 4)));
         asteroids.push(newAsteroid(x, y, Math.ceil(ASTEROID_SIZE / 4)));
         gamescore += SCORE_LARGE;

     } else if (r == Math.ceil(ASTEROID_SIZE / 4)) {

         asteroids.push(newAsteroid(x, y, Math.ceil(ASTEROID_SIZE / 8)));
         asteroids.push(newAsteroid(x, y, Math.ceil(ASTEROID_SIZE / 8)));
         gamescore += SCORE_MEDIUM;

     } else {
         gamescore += SCORE_SMALL;
     }

     // Check if the current gamescore is a highscore
     if (gamescore > highscore) {

         highscore = gamescore;
         localStorage.setItem(SAVE_KEY_SCORE, highscore);
     }

     // Destroy the hit asteroid
     asteroids.splice(index, 1);
     aLaserHit.play();

     // Find the ratio of asteroids left to determine music beat speed
     asteroidsRemaining--;
     gamemusic.setAsteroidBeatRatio(asteroidsRemaining == 0 ? 1 : asteroidsRemaining / asteroidsTotal);

     // Check if its the last asteroid - then start a new level
     if (asteroids.length == 0) {

         level++;
         createNewLevel();
     }
 }

 function startNewGame() {

     lives = PLAYER_LIVES;
     gamescore = 0;

     // Check if theres a saved highscore - if not then 0
     var localHighscore = localStorage.getItem(SAVE_KEY_SCORE);
     if (localHighscore == null) {
         highscore = 0;
     } else {
         highscore = parseInt(localHighscore);
     }

     level = 0;
     spaceship = newSpaceShip();
     createNewLevel();
 }

 function createNewLevel() {

     text = "Level " + (level + 1);
     textalpha = 1.0;

     createAsteroids();
 }

 function gameOver() {

     spaceship.dead = true;
     text = "Game Over";
     textalpha = 1.0;
     gamemusic.speed = 1.0;
 }

 function newSpaceShip() {

     return {
         x: canvas.width / 2,
         y: canvas.height / 2,
         r: SPACESHIP_SIZE / 2,
         a: 90 / 180 * Math.PI, // radian conversion
         rotation: 0,
         isThrusting: false,
         thrust: {
             x: 0,
             y: 0
         },
         explosionTime: 0,
         blinkTime: Math.ceil(SPACESHIP_BLINK_DURATION * FPS),
         blinkNumber: Math.ceil(SPACESHIP_INVULNERABILITY_DURATION / SPACESHIP_BLINK_DURATION),
         shootAllowed: true,
         laserRays: [],
         dead: false
     }
 }

 function drawTriangularShip(x, y, a, colour = "white") {

     context.strokeStyle = colour;
     context.lineWidth = SPACESHIP_SIZE / 20;
     context.beginPath();
     context.moveTo( // starting at the top of the ship
         x + 4 / 3 * spaceship.r * Math.cos(a),
         y - 4 / 3 * spaceship.r * Math.sin(a)
     );
     context.lineTo( // draw line to bottom left corner
         x - spaceship.r * (2 / 3 * Math.cos(a) + Math.sin(a)),
         y + spaceship.r * (2 / 3 * Math.sin(a) - Math.cos(a))
     );
     context.lineTo( // draw line to bottom right corner
         x - spaceship.r * (2 / 3 * Math.cos(a) - Math.sin(a)),
         y + spaceship.r * (2 / 3 * Math.sin(a) + Math.cos(a))
     );
     // Use closePath to automatically close the triangle
     context.closePath();
     context.stroke();
 }

 function fireLasers() {

     // Create a laser ray
     if (spaceship.shootAllowed && spaceship.laserRays.length < LASER_MAX_AMOUNT) {
         spaceship.laserRays.push({
             x: spaceship.x + 4 / 3 * spaceship.r * Math.cos(spaceship.a),
             y: spaceship.y - 4 / 3 * spaceship.r * Math.sin(spaceship.a),
             xv: LASER_SPEED * Math.cos(spaceship.a) / FPS,
             yv: LASER_SPEED * Math.sin(spaceship.a) / FPS,
             distance: 0,
             explosionTime: 0
         });
         aLaser.play();
     }

     // Prevent another laser from firing before spacebar is released
     spaceship.shootAllowed = false;

 }

 function keyDownPressed(/** @type {KeyBoardEvent} */ event) {

     // Prevent a dead player from controlling
     if (spaceship.dead) {
         return;
     }

     switch (event.keyCode) {
         case 32: // spacebar pressed down - shoot lasers
             fireLasers();
             break;
         case 37: // left arrow key pressed - rotate left
             spaceship.rotation = SPACESHIP_TURN_SPEED / 180 * Math.PI / FPS;
             break;
         case 38: // up arrow key pressed - move ship forward
             spaceship.isThrusting = true;
             break;
         case 39: // right arrow key pressed - rotate right
             spaceship.rotation = -SPACESHIP_TURN_SPEED / 180 * Math.PI / FPS;
             break;
     }
 }

 function keyUpPressed(/** @type {KeyBoardEvent} */ event) {

     // Prevent a dead player from controlling
     if (spaceship.dead) {
         return;
     }

     switch (event.keyCode) {
         case 32: // spacebar released (allow to shoot again)
             spaceship.shootAllowed = true;
             break;
         case 37: // left arrow key not pressed anymore - stop rotating left
             spaceship.rotation = 0;
             break;
         case 38: // up arrow key not pressed anymore - stop ship moving forward
             spaceship.isThrusting = false;
         case 39: // right arrow key not pressed anymore - stop rotating right
             spaceship.rotation = 0;
             break;
     }
 }

 // Own function to play multiple sounds at once
 function GameSound(source, maxAllowedSounds = 1, vol = 1) {

     this.streamNumber = 0;
     this.streams = [];

     for (var i = 0; i < maxAllowedSounds; i++) {

         this.streams.push(new Audio(source));
         this.streams[i].volume = vol;
     }

     this.play = function () {

         if (SOUND_ACTIVE) {
             this.streamNumber = (this.streamNumber + 1) % maxAllowedSounds;
             this.streams[this.streamNumber].play();
         }
     }

     this.stop = function () {

         this.streams[this.streamNumber].pause();
         this.streams[this.streamNumber].currentTime = 0;
     }
 }

 // Own function to switch between two sounds for the background music
 function GameMusic(source1, source2) {

     this.sound1 = new Audio(source1);
     this.sound2 = new Audio(source2);
     this.soundOnePlaying = true;
     this.speed = 1.0; // beats per second
     this.beatTime = 0; // pause between beats in frames

     this.play = function () {

         if (MUSIC_ACTIVE) {
             if (this.soundOnePlaying) {
                 this.sound1.play();
             } else {
                 this.sound2.play();
             }
             this.soundOnePlaying = !this.soundOnePlaying;
         }
     }

     this.musicTick = function () {

         if (this.beatTime == 0) {
             this.play();
             this.beatTime = Math.ceil(this.speed * FPS);
         } else {
             this.beatTime--;
         }
     }

     this.setAsteroidBeatRatio = function (beatRatio) {

         this.speed = 1.0 - 0.75 * (1.0 - beatRatio);
     }
 }

 // Update function that will run every frame
 function update() {

     var isExploding = spaceship.explosionTime > 0;
     var isBlinkOn = spaceship.blinkNumber % 2 == 0;

     // Tick the game music forward
     gamemusic.musicTick();

     // Background
     context.fillStyle = "black";
     context.fillRect(0, 0, canvas.width, canvas.height);

     // Spaceship thrusting
     if (spaceship.isThrusting && !spaceship.dead) {
         spaceship.thrust.x += SPACESHIP_THRUST * Math.cos(spaceship.a) / FPS;
         spaceship.thrust.y -= SPACESHIP_THRUST * Math.sin(spaceship.a) / FPS;
         aThrust.play();

         // add graphical thrusting to the spaceship
         if (!isExploding && isBlinkOn) {
             context.fillStyle = "red";
             context.strokeStyle = "yellow";
             context.lineWidth = SPACESHIP_SIZE / 10;
             context.beginPath();
             context.moveTo( // starting at the rear left of the thruster
                 spaceship.x - spaceship.r * (2 / 3 * Math.cos(spaceship.a) + 0.5 * Math.sin(spaceship.a)),
                 spaceship.y + spaceship.r * (2 / 3 * Math.sin(spaceship.a) - 0.5 * Math.cos(spaceship.a))
             );
             context.lineTo( // rear centre behind the ship
                 spaceship.x - spaceship.r * 6 / 3 * Math.cos(spaceship.a),
                 spaceship.y + spaceship.r * 6 / 3 * Math.sin(spaceship.a)
             );
             context.lineTo( // draw line to bottom right corner
                 spaceship.x - spaceship.r * (2 / 3 * Math.cos(spaceship.a) - 0.5 * Math.sin(spaceship.a)),
                 spaceship.y + spaceship.r * (2 / 3 * Math.sin(spaceship.a) + 0.5 * Math.cos(spaceship.a))
             );
             // Use closePath to automatically close the triangle
             context.closePath();
             context.fill();
             context.stroke();
         }

     } else {
         // Friction takes over since the ship is no longer thrusting
         spaceship.thrust.x -= SPACESHIP_FRICTION * spaceship.thrust.x / FPS;
         spaceship.thrust.y -= SPACESHIP_FRICTION * spaceship.thrust.y / FPS;
         aThrust.stop();
     }

     // Spaceship
     if (!isExploding) {
         if (isBlinkOn && !spaceship.dead) {

             drawTriangularShip(spaceship.x, spaceship.y, spaceship.a);
         }
         // Blink effect handling
         if (spaceship.blinkNumber > 0) {

             // decrease blink time
             spaceship.blinkTime--;

             // decrease the blink number
             if (spaceship.blinkTime == 0) {

                 spaceship.blinkTime = Math.ceil(SPACESHIP_BLINK_DURATION * FPS);
                 spaceship.blinkNumber--;
             }
         }
     } else {

         // Draw an explosion in the spaceships place
         context.fillStyle = "darkred";
         context.beginPath();
         context.arc(spaceship.x, spaceship.y, spaceship.r * 1.7, 0, Math.PI * 2, false);
         context.fill();

         context.fillStyle = "red";
         context.beginPath();
         context.arc(spaceship.x, spaceship.y, spaceship.r * 1.4, 0, Math.PI * 2, false);
         context.fill();

         context.fillStyle = "orange";
         context.beginPath();
         context.arc(spaceship.x, spaceship.y, spaceship.r * 1.1, 0, Math.PI * 2, false);
         context.fill();

         context.fillStyle = "yellow";
         context.beginPath();
         context.arc(spaceship.x, spaceship.y, spaceship.r * 0.8, 0, Math.PI * 2, false);
         context.fill();

         context.fillStyle = "white";
         context.beginPath();
         context.arc(spaceship.x, spaceship.y, spaceship.r * 0.5, 0, Math.PI * 2, false);
         context.fill();
     }

     // Draw the collision boxes for the spaceship
     if (SHOW_BOUNDING_BOXES) {

         context.strokeStyle = "lime";
         context.beginPath();
         context.arc(spaceship.x, spaceship.y, spaceship.r, 0, Math.PI * 2, false);
         context.stroke();
     }

     // Draw the current asteroids
     var x, y, r, a, vertices, offset;

     for (var i = 0; i < asteroids.length; i++) {

         context.strokeStyle = "slategrey";
         context.lineWidth = SPACESHIP_SIZE / 20;

         // retrieve asteroid variables
         x = asteroids[i].x;
         y = asteroids[i].y;
         r = asteroids[i].r;
         a = asteroids[i].a;
         vertices = asteroids[i].randVertices;
         offset = asteroids[i].offset;

         // draw the path of the asteroids shape
         context.beginPath();
         context.moveTo(
             x + r * offset[0] * Math.cos(a),
             y + r * offset[0] * Math.sin(a),

         );

         // draw the full polygon
         for (var j = 0; j < vertices; j++) {
             context.lineTo(
                 x + r * offset[j] * Math.cos(a + j * Math.PI * 2 / vertices),
                 y + r * offset[j] * Math.sin(a + j * Math.PI * 2 / vertices)
             );
         }
         context.closePath();
         context.stroke();

         // Draw the collision boxes for asteroids
         if (SHOW_BOUNDING_BOXES) {

             context.strokeStyle = "lime";
             context.beginPath();
             context.arc(x, y, r, 0, Math.PI * 2, false);
             context.stroke();
         }

     }

     // Check for collisions
     if (!isExploding) {
         if (spaceship.blinkNumber == 0 && !spaceship.dead) {

             for (var i = 0; i < asteroids.length; i++) {

                 if (checkDistanceBetweenPoints(spaceship.x, spaceship.y, asteroids[i].x, asteroids[i].y) < spaceship.r + asteroids[i].r) {
                     blowUpSpaceShip();
                     destroyAsteroid(i);
                     break;
                 }
             }
         }

         // Rotation
         spaceship.a += spaceship.rotation;

         // Movement
         spaceship.x += spaceship.thrust.x;
         spaceship.y += spaceship.thrust.y;

     } else {

         // Count down the explosion time until a new respawn happens
         spaceship.explosionTime--;

         if (spaceship.explosionTime == 0) {

             lives--;

             if (lives == 0) {
                 gameOver();
             } else {
                 spaceship = newSpaceShip();
             }
         }
     }

     // Prevent ship flying off bounds
     if (spaceship.x < 0 - spaceship.r) {
         spaceship.x = canvas.width + spaceship.r;
     } else if (spaceship.x > canvas.width + spaceship.r) {
         spaceship.x = 0 - spaceship.r;
     }

     if (spaceship.y < 0 - spaceship.r) {
         spaceship.y = canvas.height + spaceship.r;
     } else if (spaceship.y > canvas.height + spaceship.r) {
         spaceship.y = 0 - spaceship.r;
     }

     // move the laser rays
     for (var i = spaceship.laserRays.length - 1; i >= 0; i--) {

         // Remove the ray if it has reached the maximum distance
         if (spaceship.laserRays[i].distance > LASER_MAX_DISTANCE * canvas.width) {

             spaceship.laserRays.splice(i, 1);
             continue;
         }

         // handle explosion if active
         if (spaceship.laserRays[i].explosionTime > 0) {

             spaceship.laserRays[i].explosionTime--;

             // destroy the laser after the explosion has finished
             if (spaceship.laserRays[i].explosionTime == 0) {

                 spaceship.laserRays.splice(i, 1);
                 continue;
             }

         } else {
             // move the laser rays
             spaceship.laserRays[i].x += spaceship.laserRays[i].xv;
             spaceship.laserRays[i].y -= spaceship.laserRays[i].yv;

             // check distance travelled
             spaceship.laserRays[i].distance += Math.sqrt(Math.pow(spaceship.laserRays[i].xv, 2) + Math.pow(spaceship.laserRays[i].yv, 2));
         }
         // take care of rays going off screen
         if (spaceship.laserRays[i].x < 0) {
             spaceship.laserRays[i].x = canvas.width;
         } else if (spaceship.laserRays[i].x > canvas.width) {
             spaceship.laserRays[i].x = 0;
         }
         if (spaceship.laserRays[i].y < 0) {
             spaceship.laserRays[i].y = canvas.height;
         } else if (spaceship.laserRays[i].y > canvas.height) {
             spaceship.laserRays[i].y = 0;
         }
     }

     // Show level text on screen
     if (textalpha >= 0) {

         context.textAlign = "center";
         context.textBaseline = "middle";
         context.fillStyle = "rgba(255, 255, 255, " + textalpha + ")";
         context.font = "small-caps " + TEXT_FONT_SIZE + "px dejavu sans mono";
         context.fillText(text, canvas.width / 2, canvas.height * 0.75);
         textalpha -= (1.0 / TEXT_FADE_DURATION / FPS);
     } else if (spaceship.dead) {
         // Start a new game automatically
         startNewGame();
     }

     // Show the current score the player has
     context.textAlign = "right";
     context.textBaseline = "middle";
     context.fillStyle = "white";
     context.font = TEXT_FONT_SIZE + "px dejavu sans mono";
     context.fillText(gamescore, canvas.width - SPACESHIP_SIZE / 2, SPACESHIP_SIZE);

     // Show the current highscore the player has
     context.textAlign = "center";
     context.textBaseline = "middle";
     context.fillStyle = "white";
     context.font = (TEXT_FONT_SIZE * 0.75) + "px dejavu sans mono";
     context.fillText("BEST: " + highscore, canvas.width / 2, SPACESHIP_SIZE);

     // Show the amount of lives left the player has
     var colourLife;

     for (var i = 0; i < lives; i++) {

         colourLife = isExploding && i == lives - 1 ? "red" : "white";
         drawTriangularShip(SPACESHIP_SIZE + i * SPACESHIP_SIZE * 1.2, SPACESHIP_SIZE, 0.5 * Math.PI, colourLife);
     }

     // check if laser rays hit asteroids
     var ax, ay, ar, lx, ly;

     for (var i = asteroids.length - 1; i >= 0; i--) {

         // store the values in the variables
         ax = asteroids[i].x;
         ay = asteroids[i].y;
         ar = asteroids[i].r;

         // loop through the laser rays
         for (var j = spaceship.laserRays.length - 1; j >= 0; j--) {

             // store the laser values in the variables
             lx = spaceship.laserRays[j].x;
             ly = spaceship.laserRays[j].y;

             // check for hits
             if (spaceship.laserRays[j].explosionTime == 0 && checkDistanceBetweenPoints(ax, ay, lx, ly) < ar) {

                 // remove the hit asteroid and activate laser explosion
                 destroyAsteroid(i);
                 spaceship.laserRays[j].explosionTime = Math.ceil(LASER_EXPLOSION_DURATION * FPS);

                 break;
             }
         }
     }

     // move the asteroids
     for (var i = 0; i < asteroids.length; i++) {
         asteroids[i].x += asteroids[i].xv;
         asteroids[i].y += asteroids[i].yv;

         // prevent the asteroid from disappearing going outside the screen
         if (asteroids[i].x < 0 - asteroids[i].r) {
             asteroids[i].x = canvas.width + asteroids[i].r;
         } else if (asteroids[i].x > canvas.width + asteroids[i].r) {
             asteroids[i].x = 0 - asteroids[i].r;
         }

         if (asteroids[i].y < 0 - asteroids[i].r) {
             asteroids[i].y = canvas.height + asteroids[i].r;
         } else if (asteroids[i].y > canvas.height + asteroids[i].r) {
             asteroids[i].y = 0 - asteroids[i].r;
         }
     }
     // Center of spaceship
     if (SHOW_CENTER_CIRCLE) {
         context.fillStyle = "red";
         context.fillRect(spaceship.x - 1, spaceship.y - 1, 2, 2);
     }

     // Laser rays
     for (var i = 0; i < spaceship.laserRays.length; i++) {

         if (spaceship.laserRays[i].explosionTime == 0) {

             context.fillStyle = "salmon";
             context.beginPath();
             context.arc(spaceship.laserRays[i].x, spaceship.laserRays[i].y, SPACESHIP_SIZE / 15, 0, Math.PI * 2, false);
             context.fill();

         } else {
             // Explosion is happening - draw it
             context.fillStyle = "orangered";
             context.beginPath();
             context.arc(spaceship.laserRays[i].x, spaceship.laserRays[i].y, spaceship.r, 0, Math.PI * 2, false);
             context.fill();
             context.fillStyle = "salmon";
             context.beginPath();
             context.arc(spaceship.laserRays[i].x, spaceship.laserRays[i].y, spaceship.r * 0.75, 0, Math.PI * 2, false);
             context.fill();
             context.fillStyle = "pink";
             context.beginPath();
             context.arc(spaceship.laserRays[i].x, spaceship.laserRays[i].y, spaceship.r * 0.50, 0, Math.PI * 2, false);
             context.fill();
         }
     }
 }