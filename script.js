/** @type {HTMLCanvasElement} */
const canvas = document.querySelector("#myCanvas");
const ctx = canvas.getContext("2d");

/** @type {HTMLCanvasElement} */
const collisionCanvas = document.querySelector("#myCanvas2");
const collisionCtx = collisionCanvas.getContext("2d");

const backgroundImage = new Image();
backgroundImage.src = "images/kyiv_background.png";

const backgroundImageMobile = new Image();
backgroundImageMobile.src = "images/kyiv_background_mobile.png";

const sound_of_shot = new Audio();
sound_of_shot.src = 'audio/shot.mp3';

canvas.style.cursor = "none";

const crosshair = new Image();
crosshair.src = "images/crosshair.png";

let mouseX = 0;
let mouseY = 0;

let gameFrame = 0;
let gameSpeed = 3;
let number_of_tracks = 7;
let score = 0;
let bestScore = 0;
let hits = 0;
let gameOver = false;
let animationId;

let timeToNewShahed = 0;
let shahedInterval = 1000;
let lastTime = 0;

let shahed_array = [];
let explosions = [];
let building_explosions = [];


function getCanvasMousePos(canvasElement, clientX, clientY) {
    const rect = canvasElement.getBoundingClientRect();
    let x = (clientX - rect.left) / rect.width * canvasElement.width;
    let y = (clientY - rect.top) / rect.height * canvasElement.height;
    return { x, y };
}

function resizeCanvases() {
    const container = document.querySelector('.canvas_container');
    const rect = container.getBoundingClientRect();

    canvas.width = collisionCanvas.width = rect.width;
    canvas.height = collisionCanvas.height = rect.height;
}

document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.querySelector("#startButton");

    resizeCanvases();// Початкове встановлення розмірів

    window.addEventListener('resize', () => {
        resizeCanvases();
    });

    startButton.addEventListener("click", () => {
        cancelAnimationFrame(animationId);
        gameOver = false;
        shahed_array = [];
        explosions = [];
        building_explosions = [];
        hits = 0;
        score = 0;
        animate(0);
    });

    class Explosion {
        constructor(x, y, size) {
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
        update(deltaTime) {
            if (this.frame === 0 && !this.soundPlayed) {
                this.sound.play().catch(() => { });
                this.soundPlayed = true;
            }
            this.timeSinceFrame += deltaTime;
            if (this.timeSinceFrame > this.frameInterval) {
                this.frame++;
                this.timeSinceFrame = 0;
                if (this.frame > this.maxFrame) this.markedForDelition = true;
            }
        }
        draw() {
            ctx.drawImage(this.image, this.spriteWidth * this.frame, 0, this.spriteWidth, this.spriteHeight,
                this.x, this.y, this.size, this.size);
        }
    }

    class BuildingsExplosion {
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
            if (this.frame === 0 && !this.soundPlayed) {
                this.sound.play().catch(() => { });
                this.soundPlayed = true;
            }
            this.timeSinceFrame += deltaTime;
            if (this.timeSinceFrame > this.frameInterval) {
                this.frame++;
                this.timeSinceFrame = 0;
                if (this.frame > this.maxFrame) this.markedForDelition = true;
            }
        }
        draw() {
            ctx.drawImage(this.image, this.spriteWidth * this.frame, 0, this.spriteWidth, this.spriteHeight,
                this.x, this.y, this.size, this.size);
        }
    }

    class Shahed {
        constructor() {
            this.image = new Image();
            this.image.src = "images/shahed.png";
            this.spriteWidth = 1024;
            this.spriteHeight = 994;
            this.sizeModifier = Math.random() * 0.6 + 0.4;
            this.width = (canvas.width * this.sizeModifier) / number_of_tracks;
            this.height = this.width;
            this.x = Math.floor(Math.random() * number_of_tracks) * this.width;
            this.y = -100;
            this.speed = Math.random() * gameSpeed + 1;
            this.markedForDelition = false;
            this.randomColors = [
                Math.floor(Math.random() * 255),
                Math.floor(Math.random() * 255),
                Math.floor(Math.random() * 255)
            ];
            this.color = `rgb(${this.randomColors[0]},${this.randomColors[1]},${this.randomColors[2]})`;
        }
        update() {
            if (this.y > canvas.height * 0.70) {
                this.markedForDelition = true;
                building_explosions.push(new BuildingsExplosion(this.x, this.y, this.width));
                hits++;
            }
            this.y += this.speed;
        }
        draw() {
            collisionCtx.fillStyle = this.color;
            collisionCtx.fillRect(this.x, this.y, this.width, this.height);
            ctx.drawImage(this.image, 0, 0, this.spriteWidth, this.spriteHeight,
                this.x, this.y, this.width, this.height);
        }
    }

    function drawScore() {
        ctx.fillStyle = "black";
        ctx.font = "30px Arial";
        ctx.textAlign = "left";
        ctx.fillText('Score: ' + score, canvas.width*0.05, 100);
    }

    function drawBestScore() {
        ctx.fillStyle = "black";
        ctx.font = "30px Arial";
        ctx.textAlign = "left";
        ctx.fillText('Best score: ' + bestScore, canvas.width * 0.05, 55);
    }

    function drawGameOver() {
        ctx.fillStyle = "black";
        ctx.textAlign = "center";
        ctx.font = "40px Arial";
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
    }


    canvas.addEventListener("mousemove", (e) => {
        const pos = getCanvasMousePos(canvas, e.clientX, e.clientY);
        mouseX = pos.x;
        mouseY = pos.y;
    });

    window.addEventListener('click', e => {
        const pos = getCanvasMousePos(collisionCanvas, e.clientX, e.clientY);
        const clickX = Math.floor(pos.x);
        const clickY = Math.floor(pos.y);

        const detectPixelColor = collisionCtx.getImageData(clickX, clickY, 1, 1);
        const pc = detectPixelColor.data;

        let hit = false;

        shahed_array.forEach(object => {
            if (object.randomColors[0] === pc[0] &&
                object.randomColors[1] === pc[1] &&
                object.randomColors[2] === pc[2]) {
                object.markedForDelition = true;
                score++;
                explosions.push(new Explosion(object.x, object.y, object.width));
                hit = true;
            }
        });

        if (!hit) {
            const rect = collisionCanvas.getBoundingClientRect();
            if (e.clientX > rect.left && e.clientX < rect.right &&
                e.clientY > rect.top && e.clientY < rect.bottom) {
                sound_of_shot.play().catch(() => { });
            }
        }
    });

    function drawCursor() {
        const crosshairSize = 128;
        ctx.drawImage(
            crosshair, 0, 0, 1024, 1024,
            mouseX - (crosshairSize / 2),
            mouseY - (crosshairSize / 2),
            crosshairSize, crosshairSize
        );
    }

    function animate(timestamp = 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        collisionCtx.clearRect(0, 0, canvas.width, canvas.height);

        if (window.matchMedia("(min-width: 1024px)").matches) {
            ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
            drawCursor();
        } else {
            ctx.drawImage(backgroundImageMobile, 0, 0, canvas.width, canvas.height);
        }

        let deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        timeToNewShahed += deltaTime;
        if (timeToNewShahed > shahedInterval) {
            shahed_array.push(new Shahed());
            shahed_array.sort((a, b) => a.width - b.width);
            timeToNewShahed = 0;
        }

        [...shahed_array, ...explosions, ...building_explosions].forEach(obj => obj.update(deltaTime));
        [...shahed_array, ...explosions, ...building_explosions].forEach(obj => obj.draw());

        shahed_array = shahed_array.filter(s => !s.markedForDelition);
        explosions = explosions.filter(e => !e.markedForDelition);
        building_explosions = building_explosions.filter(e => !e.markedForDelition);

        drawBestScore();
        drawScore();

        if (hits > 3) {
            if (score > bestScore) bestScore = score;
            gameOver = true;
        }

        if (!gameOver) {
            animationId = requestAnimationFrame(animate);
        } else {
            drawGameOver();
        }
    }
});