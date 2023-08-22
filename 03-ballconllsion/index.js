// drawing -------------------------------------------------------

let canvas = document.getElementById('myCanvas')
let c = canvas.getContext('2d')

canvas.width = window.innerWidth - 20
canvas.height = window.innerHeight - 100

let simMinWidth = 2.0
let cScale = Math.min(canvas.width, canvas.height) / simMinWidth
let simWidth = canvas.width / cScale
let simHeight = canvas.height / cScale

function cX(pos) {
    return pos.x * cScale
}

function cY(pos) {
    return canvas.height - pos.y * cScale
}

// vector math -------------------------------------------------------
// 带Vectors的函数返回新的Vector，不带Vectors的函数返回this
class Vector2 {
    constructor(x = 0.0, y = 0.0) {
        this.x = x
        this.y = y
    }

    set(v) {
        this.x = v.x
        this.y = v.y
    }

    clone() {
        return new Vector2(this.x, this.y)
    }

    add(v, s = 1.0) {
        this.x += v.x * s
        this.y += v.y * s
        return this
    }

    addVectors(a, b) {
        this.x = a.x + b.x
        this.y = a.y + b.y
        return this
    }

    subtract(v, s = 1.0) {
        this.x -= v.x * s
        this.y -= v.y * s
        return this
    }

    subtractVectors(a, b) {
        this.x = a.x - b.x
        this.y = a.y - b.y
        return this
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y)
    }

    scale(s) {
        this.x *= s
        this.y *= s
    }

    dot(v) {
        return this.x * v.x + this.y * v.y
    }
}

// physics scene -------------------------------------------------------

class Ball {
    constructor(radius, mass, pos, vel) {
        this.radius = radius
        this.mass = mass
        this.pos = pos.clone()
        this.vel = vel.clone()
    }
    simulate(dt, gravity) {
        this.vel.add(gravity, dt)
        this.pos.add(this.vel, dt)
    }
}

let physicsScene = {
    gravity: new Vector2(0.0, 0.0),
    dt: 1.0 / 60.0,
    worldSize: new Vector2(simWidth, simHeight),
    paused: true,
    balls: [],
    restitution: 1.0
}

function setupScene() {
    physicsScene.balls = []
    let numBalls = 20

    for (i = 0; i < numBalls; i++) {
        let radius = 0.05 + Math.random() * 0.1
        let mass = Math.PI * radius * radius
        let pos = new Vector2(Math.random() * simWidth, Math.random() * simHeight)
        let vel = new Vector2(-1.0 + 2.0 * Math.random(), -1.0 + 2.0 * Math.random())

        physicsScene.balls.push(new Ball(radius, mass, pos, vel))
    }
}

// draw -------------------------------------------------------

function draw() {
    c.clearRect(0, 0, canvas.width, canvas.height)

    c.fillStyle = '#FF0000'

    for (i = 0; i < physicsScene.balls.length; i++) {
        let ball = physicsScene.balls[i]
        c.beginPath()
        c.arc(cX(ball.pos), cY(ball.pos), cScale * ball.radius, 0.0, 2.0 * Math.PI)
        c.closePath()
        c.fill()
    }
}

// collision handling -------------------------------------------------------

function handleBallCollision(ball1, ball2, restitution) {
    let dir = new Vector2()
    dir.subtractVectors(ball2.pos, ball1.pos)
    let d = dir.length()
    if (d == 0.0 || d > ball1.radius + ball2.radius) return

    dir.scale(1.0 / d)

    let corr = (ball1.radius + ball2.radius - d) / 2.0
    ball1.pos.add(dir, -corr)
    ball2.pos.add(dir, corr)

    let v1 = ball1.vel.dot(dir)
    let v2 = ball2.vel.dot(dir)

    let m1 = ball1.mass
    let m2 = ball2.mass

    let newV1 = (m1 * v1 + m2 * v2 - m2 * (v1 - v2) * restitution) / (m1 + m2)
    let newV2 = (m1 * v1 + m2 * v2 - m1 * (v2 - v1) * restitution) / (m1 + m2)

    ball1.vel.add(dir, newV1 - v1)
    ball2.vel.add(dir, newV2 - v2)
}

// ------------------------------------------------------

function handleWallCollision(ball, worldSize) {
    if (ball.pos.x < ball.radius) {
        ball.pos.x = ball.radius
        ball.vel.x = -ball.vel.x
    }
    if (ball.pos.x > worldSize.x - ball.radius) {
        ball.pos.x = worldSize.x - ball.radius
        ball.vel.x = -ball.vel.x
    }
    if (ball.pos.y < ball.radius) {
        ball.pos.y = ball.radius
        ball.vel.y = -ball.vel.y
    }

    if (ball.pos.y > worldSize.y - ball.radius) {
        ball.pos.y = worldSize.y - ball.radius
        ball.vel.y = -ball.vel.y
    }
}

// simulation -------------------------------------------------------

function simulate() {
    for (i = 0; i < physicsScene.balls.length; i++) {
        let ball1 = physicsScene.balls[i]
        ball1.simulate(physicsScene.dt, physicsScene.gravity)

        for (j = i + 1; j < physicsScene.balls.length; j++) {
            let ball2 = physicsScene.balls[j]
            handleBallCollision(ball1, ball2, physicsScene.restitution)
        }

        handleWallCollision(ball1, physicsScene.worldSize)
    }
}

function update() {
    simulate()
    draw()
    requestAnimationFrame(update)
}

setupScene()
update()

document.getElementById('restitutionSlider').oninput = function () {
    physicsScene.restitution = this.value / 10.0
}
