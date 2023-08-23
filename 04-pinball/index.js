// drawing setup -------------------------------------------------------

let canvas = document.getElementById('myCanvas')
let c = canvas.getContext('2d')

canvas.width = window.innerWidth - 20
canvas.height = window.innerHeight - 100
// flipper物理高度
let flipperHeight = 1.7

let cScale = canvas.height / flipperHeight
let simWidth = canvas.width / cScale
let simHeight = canvas.height / cScale

function cX(pos) {
    return pos.x * cScale
}

function cY(pos) {
    return canvas.height - pos.y * cScale
}

// vector math -------------------------------------------------------

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
        return this
    }

    dot(v) {
        return this.x * v.x + this.y * v.y
    }
    // 新增函数，将向量逆时针旋转90度
    perp() {
        return new Vector2(-this.y, this.x)
    }
}

// ----------------------------------------------------------------------
function closestPointOnSegment(p, a, b) {
    let ab = new Vector2()
    ab.subtractVectors(b, a)
    let t = ab.dot(ab)
    if (t == 0.0) return a.clone()
    // 这里写成了p.dot(ab) - a.dot(ab)，其实也可以写成p.subtract(a).dot(ab)
    t = Math.max(0.0, Math.min(1.0, (p.dot(ab) - a.dot(ab)) / t))
    let closest = a.clone()
    return closest.add(ab, t)
}

// physics scene -------------------------------------------------------

class Ball {
    constructor(radius, mass, pos, vel, restitution) {
        this.radius = radius
        this.mass = mass
        this.restitution = restitution
        this.pos = pos.clone()
        this.vel = vel.clone()
    }
    simulate(dt, gravity) {
        this.vel.add(gravity, dt)
        this.pos.add(this.vel, dt)
    }
}
// 遮挡物
class Obstacle {
    constructor(radius, pos, pushVel) {
        this.radius = radius
        this.pos = pos.clone()
        // 小球碰撞后的速度
        this.pushVel = pushVel
    }
}
// 挡板
class Flipper {
    constructor(radius, pos, length, restAngle, maxRotation, angularVelocity, restitution) {
        // fixed
        this.radius = radius
        this.pos = pos.clone()
        this.length = length
        this.restAngle = restAngle
        this.maxRotation = Math.abs(maxRotation)
        this.sign = Math.sign(maxRotation)
        this.angularVelocity = angularVelocity
        // changing
        this.rotation = 0.0
        this.currentAngularVelocity = 0.0
        this.touchIdentifier = -1
    }
    simulate(dt) {
        let prevRotation = this.rotation
        let pressed = this.touchIdentifier >= 0
        if (pressed) this.rotation = Math.min(this.rotation + dt * this.angularVelocity, this.maxRotation)
        else this.rotation = Math.max(this.rotation - dt * this.angularVelocity, 0.0)
        this.currentAngularVelocity = (this.sign * (this.rotation - prevRotation)) / dt
    }
    select(pos) {
        let d = new Vector2()
        d.subtractVectors(this.pos, pos)
        return d.length() < this.length
    }
    // 获取挡板的顶点
    getTip() {
        let angle = this.restAngle + this.sign * this.rotation
        let dir = new Vector2(Math.cos(angle), Math.sin(angle))
        let tip = this.pos.clone()
        return tip.add(dir, this.length)
    }
}

let physicsScene = {
    gravity: new Vector2(0.0, -3.0),
    dt: 1.0 / 60.0,
    score: 0,
    paused: true,
    border: [],
    balls: [],
    obstacles: [],
    flippers: []
}

function setupScene() {
    let offset = 0.02
    physicsScene.score = 0

    // border

    physicsScene.border.push(new Vector2(0.74, 0.25))
    physicsScene.border.push(new Vector2(1.0 - offset, 0.4))
    physicsScene.border.push(new Vector2(1.0 - offset, flipperHeight - offset))
    physicsScene.border.push(new Vector2(offset, flipperHeight - offset))
    physicsScene.border.push(new Vector2(offset, 0.4))
    physicsScene.border.push(new Vector2(0.26, 0.25))
    physicsScene.border.push(new Vector2(0.26, 0.0))
    physicsScene.border.push(new Vector2(0.74, 0.0))

    // ball

    {
        physicsScene.balls = []

        let radius = 0.03
        let mass = Math.PI * radius * radius
        let pos = new Vector2(0.92, 0.5)
        let vel = new Vector2(-0.2, 3.5)
        physicsScene.balls.push(new Ball(radius, mass, pos, vel, 0.2))

        pos = new Vector2(0.08, 0.5)
        vel = new Vector2(0.2, 3.5)
        physicsScene.balls.push(new Ball(radius, mass, pos, vel, 0.2))
    }

    // obstacles

    {
        physicsScene.obstacles = []
        let numObstacles = 4

        physicsScene.obstacles.push(new Obstacle(0.1, new Vector2(0.25, 0.6), 2.0))
        physicsScene.obstacles.push(new Obstacle(0.1, new Vector2(0.75, 0.5), 2.0))
        physicsScene.obstacles.push(new Obstacle(0.12, new Vector2(0.7, 1.0), 2.0))
        physicsScene.obstacles.push(new Obstacle(0.1, new Vector2(0.2, 1.2), 2.0))
    }

    // flippers

    {
        let radius = 0.03
        let length = 0.2
        let maxRotation = 1.0
        let restAngle = 0.5
        let angularVelocity = 10.0
        let restitution = 0.0

        let pos1 = new Vector2(0.26, 0.22)
        let pos2 = new Vector2(0.74, 0.22)
        // sign为负，表示挡板向左旋转
        physicsScene.flippers.push(new Flipper(radius, pos1, length, -restAngle, maxRotation, angularVelocity, restitution))
        // sign为正，表示挡板向右旋转
        physicsScene.flippers.push(new Flipper(radius, pos2, length, Math.PI + restAngle, -maxRotation, angularVelocity, restitution))
    }
}

// draw -------------------------------------------------------

function drawDisc(x, y, radius) {
    c.beginPath()
    c.arc(x, y, radius, 0.0, 2.0 * Math.PI)
    c.closePath()
    c.fill()
}

function draw() {
    c.clearRect(0, 0, canvas.width, canvas.height)

    // border

    if (physicsScene.border.length >= 2) {
        c.strokeStyle = '#000000'
        c.lineWidth = 5

        c.beginPath()
        let v = physicsScene.border[0]
        c.moveTo(cX(v), cY(v))
        for (let i = 1; i < physicsScene.border.length + 1; i++) {
            v = physicsScene.border[i % physicsScene.border.length]
            c.lineTo(cX(v), cY(v))
        }
        c.stroke()
        c.lineWidth = 1
    }

    // balls

    c.fillStyle = '#202020'

    for (let i = 0; i < physicsScene.balls.length; i++) {
        let ball = physicsScene.balls[i]
        drawDisc(cX(ball.pos), cY(ball.pos), ball.radius * cScale)
    }

    // obstacles

    c.fillStyle = '#FF8000'

    for (let i = 0; i < physicsScene.obstacles.length; i++) {
        let obstacle = physicsScene.obstacles[i]
        drawDisc(cX(obstacle.pos), cY(obstacle.pos), obstacle.radius * cScale)
    }

    // flippers

    c.fillStyle = '#FF0000'

    for (let i = 0; i < physicsScene.flippers.length; i++) {
        let flipper = physicsScene.flippers[i]
        c.translate(cX(flipper.pos), cY(flipper.pos))
        c.rotate(-flipper.restAngle - flipper.sign * flipper.rotation)

        c.fillRect(0.0, -flipper.radius * cScale, flipper.length * cScale, 2.0 * flipper.radius * cScale)
        drawDisc(0, 0, flipper.radius * cScale)
        drawDisc(flipper.length * cScale, 0, flipper.radius * cScale)
        c.resetTransform()
    }
}

// --- collision handling -------------------------------------------------------

function handleBallBallCollision(ball1, ball2) {
    let restitution = Math.min(ball1.restitution, ball2.restitution)
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

// -----------------------------------------------------------------
function handleBallObstacleCollision(ball, obstacle) {
    let dir = new Vector2()
    dir.subtractVectors(ball.pos, obstacle.pos)
    let d = dir.length()
    if (d == 0.0 || d > ball.radius + obstacle.radius) return

    dir.scale(1.0 / d)

    let corr = ball.radius + obstacle.radius - d
    ball.pos.add(dir, corr)

    let v = ball.vel.dot(dir)
    ball.vel.add(dir, obstacle.pushVel - v)

    physicsScene.score++
}

// ----------------------------------------------------------------
function handleBallFlipperCollision(ball, flipper) {
    let closest = closestPointOnSegment(ball.pos, flipper.pos, flipper.getTip())
    let dir = new Vector2()
    dir.subtractVectors(ball.pos, closest)
    let d = dir.length()
    if (d == 0.0 || d > ball.radius + flipper.radius) return

    dir.scale(1.0 / d)
    // 更新位置，这里只需要更新球的位置
    let corr = ball.radius + flipper.radius - d
    ball.pos.add(dir, corr)

    // update velocitiy

    let radius = closest.clone()
    // 加上半径，得到挡板边缘位置
    radius.add(dir, flipper.radius)
    // 得到用于计算线速度的半径向量
    radius.subtract(flipper.pos)
    // 调整方向，使其与挡板运动方向一致
    let surfaceVel = radius.perp()
    // 乘以角速度，得到线速度
    surfaceVel.scale(flipper.currentAngularVelocity)
    // 碰撞方向速度更新
    let v = ball.vel.dot(dir)
    let vnew = surfaceVel.dot(dir)

    ball.vel.add(dir, vnew - v)
}

// ---------------------------------------------------------------------
function handleBallBorderCollision(ball, border) {
    if (border.length < 3) return

    // find closest segment;

    let d = new Vector2()
    let closest = new Vector2()
    let ab = new Vector2()
    let normal

    let minDist = 0.0

    for (let i = 0; i < border.length; i++) {
        let a = border[i]
        let b = border[(i + 1) % border.length]
        let c = closestPointOnSegment(ball.pos, a, b)
        d.subtractVectors(ball.pos, c)
        let dist = d.length()
        if (i == 0 || dist < minDist) {
            minDist = dist
            closest.set(c)
            ab.subtractVectors(b, a)
            normal = ab.perp()
        }
    }

    // push out
    d.subtractVectors(ball.pos, closest)
    let dist = d.length()
    if (dist == 0.0) {
        d.set(normal)
        dist = normal.length()
    }
    d.scale(1.0 / dist)

    if (d.dot(normal) >= 0.0) {
        if (dist > ball.radius) return
        ball.pos.add(d, ball.radius - dist)
    } else ball.pos.add(d, -(dist + ball.radius))

    // update velocity
    let v = ball.vel.dot(d)
    let vnew = Math.abs(v) * ball.restitution

    ball.vel.add(d, vnew - v)
}

// simulation -------------------------------------------------------

function simulate() {
    for (let i = 0; i < physicsScene.flippers.length; i++) physicsScene.flippers[i].simulate(physicsScene.dt)

    for (let i = 0; i < physicsScene.balls.length; i++) {
        let ball = physicsScene.balls[i]
        ball.simulate(physicsScene.dt, physicsScene.gravity)

        for (let j = i + 1; j < physicsScene.balls.length; j++) {
            let ball2 = physicsScene.balls[j]
            handleBallBallCollision(ball, ball2, physicsScene.restitution)
        }

        for (let j = 0; j < physicsScene.obstacles.length; j++) handleBallObstacleCollision(ball, physicsScene.obstacles[j])

        for (let j = 0; j < physicsScene.flippers.length; j++) handleBallFlipperCollision(ball, physicsScene.flippers[j])

        handleBallBorderCollision(ball, physicsScene.border)
    }
}

// ---------------------------------------------------------------

function update() {
    simulate()
    draw()
    document.getElementById('score').innerHTML = physicsScene.score.toString()
    requestAnimationFrame(update)
}

setupScene()
update()

// ------------------------ user interaction ---------------------------

canvas.addEventListener('touchstart', onTouchStart, false)
canvas.addEventListener('touchend', onTouchEnd, false)

canvas.addEventListener('mousedown', onMouseDown, false)
canvas.addEventListener('mouseup', onMouseUp, false)
// 触屏事件
function onTouchStart(event) {
    for (let i = 0; i < event.touches.length; i++) {
        let touch = event.touches[i]

        let rect = canvas.getBoundingClientRect()
        let touchPos = new Vector2((touch.clientX - rect.left) / cScale, simHeight - (touch.clientY - rect.top) / cScale)

        for (let j = 0; j < physicsScene.flippers.length; j++) {
            let flipper = physicsScene.flippers[j]
            if (flipper.select(touchPos)) flipper.touchIdentifier = touch.identifier
        }
    }
}

function onTouchEnd(event) {
    for (let i = 0; i < physicsScene.flippers.length; i++) {
        let flipper = physicsScene.flippers[i]
        if (flipper.touchIdentifier < 0) continue
        let found = false
        for (let j = 0; j < event.touches.length; j++) {
            if (event.touches[j].touchIdentifier == flipper.touchIdentifier) found = true
        }
        if (!found) flipper.touchIdentifier = -1
    }
}
// 鼠标事件
function onMouseDown(event) {
    let rect = canvas.getBoundingClientRect()
    let mousePos = new Vector2((event.clientX - rect.left) / cScale, simHeight - (event.clientY - rect.top) / cScale)

    for (let j = 0; j < physicsScene.flippers.length; j++) {
        let flipper = physicsScene.flippers[j]
        if (flipper.select(mousePos)) flipper.touchIdentifier = 0
    }
}

function onMouseUp(event) {
    for (let i = 0; i < physicsScene.flippers.length; i++) physicsScene.flippers[i].touchIdentifier = -1
}
