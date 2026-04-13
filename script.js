/** @type {HTMLCanvasElement} */
const canvas = document.querySelector("#myCanvas");
const ctx = canvas.getContext("2d");
const style = getComputedStyle(canvas);
canvas.width = parseInt(style.width);
canvas.height = parseInt(style.height);

/** @type {HTMLCanvasElement} */
const collisionCanvas = document.querySelector("#myCanvas2");// canvas для детекції зіткнень
const collisionCtx = collisionCanvas.getContext("2d");
collisionCanvas.width = parseInt(style.width);
collisionCanvas.height = parseInt(style.height);

const backgroundImage = new Image(); // об'єкт зображення фону
backgroundImage.src = "images/kyiv_background.png"; //шлях до зображення фону

const sound_of_shot = new Audio();
sound_of_shot.src = 'audio/shot.mp3';


canvas.style.cursor = "none"; //приховати стандартне зображення курсора мишки
const crosshair = new Image();
crosshair.src = "images/crosshair.png";// зображення прицілу для курсора миші
let mouseX = 0; // координати для руху прицілу
let mouseY = 0;


let gameFrame = 0; // номер кадру
let gameSpeed = 3; // швидкість руху шахеду
let number_of_tracks = 7; // кількість доріжок для шахедів 
let score = 0; // кількість збитих шахедів
let bestScore = 0; // рекорд
let hits = 0; //кількість влучань в місто
let gameOver = false;
let animationId;

let timeToNewShahed = 0;
let shahedInterval = 1000;
let lastTime = 0;

let shahed_array = [];
let explosions = [];
let building_explosions = [];


document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.querySelector("#startButton");
    startButton.addEventListener("click", ()=>{
        cancelAnimationFrame(animationId);
        gameOver = false;
        shahed_array = [];
        explosions = [];
        building_explosions = [];
        hits = 0;
        score = 0;
        animate(0);});


    class Explosion { //клас для вибуху при збитті шахеду
        constructor(x, y, size){
            this.x = x;
            this.y = y;
            this.spriteWidth = 200;
            this.spriteHeight = 179;
            this.size = size;
            this.image = new Image();
            this.image.src = "images/explosion.png";
            this.frame = 0;
            this.maxFrame = 4;
            this.timeSinceFrame = 0;
            this.frameInterval = 100;
            this.sound = new Audio();
            this.sound.src = "audio/hit.mp3";
            this.markedForDelition = false;
            this.soundPlayed = false;

        }
        update(deltaTime){
            if(this.frame === 0 && this.soundPlayed === false){
                this.sound.play();
                this.sound.play().catch(() => {});
                this.soundPlayed = true;
            }
            this.timeSinceFrame+=deltaTime;
            if(this.timeSinceFrame>this.frameInterval){
                this.frame++;
                this.timeSinceFrame=0;
                if(this.frame>this.maxFrame){
                    this.markedForDelition=true;

                }
            }
           
        }
        draw(){
            ctx.drawImage(this.image, this.spriteWidth*this.frame, 0, this.spriteWidth, this.spriteHeight,
                this.x, this.y, this.size, this.size
            )
        }
    }

    class BuildingsExplosion {  //клас для вибуху при падінні шахеда
        constructor(x, y, size) {
            this.x = x;
            this.y = y;
            this.spriteWidth = 116;
            this.spriteHeight = 115;
            this.size = size;
            this.image = new Image();
            this.image.src = "images/explosion2.png";
            this.frame = 0;
            this.maxFrame = 8;
            this.timeSinceFrame = 0;
            this.frameInterval = 100;
            this.sound = new Audio();
            this.sound.src = "audio/burst.mp3";
            this.markedForDelition = false;
            this.soundPlayed = false;

        }
        update(deltaTime) {
            if (this.frame === 0 && this.soundPlayed === false) {
                this.sound.play();
                this.sound.play().catch(() => { });
                this.soundPlayed = true;
            }
            this.timeSinceFrame += deltaTime;
            if (this.timeSinceFrame > this.frameInterval) {
                this.frame++;
                this.timeSinceFrame = 0;
                if (this.frame > this.maxFrame) {
                    this.markedForDelition = true;

                }
            }

        }
        draw() {
            ctx.drawImage(this.image, this.spriteWidth * this.frame, 0, this.spriteWidth, this.spriteHeight,
                this.x, this.y, this.size, this.size
            )
        }
    }

    class Shahed {
        constructor() {
            this.image = new Image();
            this.image.src = "images/shahed.png"; // шлях до зображення шахеду
            this.spriteWidth = 1024; // оригінальна ширина шахеду
            this.spriteHeight = 994;//оригінальна довжина шахеда
            this.sizeModifier = Math.random()*0.6+0.4;
            this.width = (canvas.width*this.sizeModifier)/ number_of_tracks;// ширина шахеду на полотні
            this.height = this.width;// довжина шахеду на полотні
            this.x = Math.floor(Math.random() * number_of_tracks) * this.width;
            this.y = -100; 
            this.speed = Math.random()*gameSpeed+1; // швидкість шахеду
            this.markedForDelition = false;
            this.randomColors = [Math.floor(Math.random() * 255), // випадковий колір для детекції зіткнень на myCanvas2
                 Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)];
            this.color = "rgb(" + this.randomColors[0] + ',' + this.randomColors[1] + ',' + this.randomColors[2] + ')';                     
        }
        update() {
            if (this.y > canvas.height*0.70){
                this.markedForDelition = true;
                building_explosions.push(new BuildingsExplosion(this.x, this.y, this.width));
                hits++;
            };
            this.y += this.speed;
        }
        draw() {
            collisionCtx.fillStyle= this.color;
            collisionCtx.fillRect(this.x, this.y, this.width, this.height);
            ctx.drawImage(this.image, 0, 0, this.spriteWidth, this.spriteHeight, this.x, this.y, this.width, this.height);
        }

    }

    function drawScore(){
        ctx.fillStyle = "black";
        ctx.font = "30px Arial";
        ctx.textAlign = "left";
        ctx.fillText('Score: ' + score, 55, 100);
    };

    function drawBestScore() {
        ctx.fillStyle = "black";
        ctx.font = "30px Arial";
        ctx.textAlign = "left";
        ctx.fillText('Best score: ' + bestScore, 55, 55);
    };

    function drawGameOver(){
        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        ctx.font = "40px Arial";
        ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
    };

    canvas.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    function drawCursor() {
        let crosshairSize = 128;
        ctx.drawImage(
            crosshair, 0, 0, 1024, 1024,
            mouseX - (crosshairSize/2), mouseY - (crosshairSize/2), crosshairSize, crosshairSize
        );

    }

    window.addEventListener('click', e => {
        const rect = collisionCanvas.getBoundingClientRect(); // рамки об'єкта canvas
        const clickX = e.clientX - rect.left; //дає х координату відносно canvas
        const clickY = e.clientY - rect.top; //дає y координату відносно canvas
        const detectPixelColor = collisionCtx.getImageData(clickX, clickY, 1, 1);
        const pc = detectPixelColor.data; // колір пікселя на який був клік
        shahed_array.forEach(object=>{
            if(object.randomColors[0]===pc[0]&&
                object.randomColors[1] === pc[1] &&
                object.randomColors[2] === pc[2]
            ){object.markedForDelition=true;
            score++;
            explosions.push(new Explosion(object.x, object.y, object.width));
            } else if (e.clientX > rect.x && e.clientX < rect.x+rect.width &&
                e.clientY > rect.y && e.clientY < rect.y+rect.width
            ){
                sound_of_shot.play();
                sound_of_shot.play().catch(() => { });
            }
        })
    });

    function animate(timestamp) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        collisionCtx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
        let deltaTime = timestamp - lastTime;
        lastTime = timestamp;
        timeToNewShahed += deltaTime;
        if (timeToNewShahed > shahedInterval){
            shahed_array.push(new Shahed());
            shahed_array.sort(function(a,b){
                return a.width-b.width;
            })
            timeToNewShahed = 0;
        }
        [...shahed_array, ...explosions, ...building_explosions].forEach(object=>{
            object.update(deltaTime);
        });
        [...shahed_array, ...explosions, ...building_explosions].forEach(object => {
            object.draw();
        });
        shahed_array = shahed_array.filter(shahed => !shahed.markedForDelition);
        explosions = explosions.filter(explosion => !explosion.markedForDelition);
        building_explosions = building_explosions.filter(explosion => !explosion.markedForDelition);
        drawBestScore();
        drawScore();
        if (window.matchMedia("(min-width: 1024px)").matches) { // малювання курсора у вигляді прицілу лише для desktop
            drawCursor();
        }
        if(hits>3){
            if (score > bestScore) {
                bestScore = score;
            }
            gameOver=true;
        };
        if (!gameOver) {
            animationId = requestAnimationFrame(animate);
        } else {
            drawGameOver();
        }
 
    }
});