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

    perp() {
        return new Vector2(-this.y, this.x)
    }
}

// scene -------------------------------------------------------

let physicsScene = {
    gravity: new Vector2(0.0, -10.0),
    dt: 1.0 / 60.0,
    numSteps: 1000,
    paused: false,
    wireCenter: new Vector2(),
    wireRadius: 0.0,
    bead: null,
    analyticBead: null
}

// -------------------------------------------------------

class Bead {
    constructor(radius, mass, pos) {
        this.radius = radius
        this.mass = mass
        this.pos = pos.clone()
        this.prevPos = pos.clone()
        this.vel = new Vector2()
    }
    startStep(dt, gravity) {
        this.vel.add(gravity, dt)
        this.prevPos.set(this.pos)
        this.pos.add(this.vel, dt)
    }
    // 更新位置，使其保持在线上
    keepOnWire(center, radius) {
        let dir = new Vector2()
        dir.subtractVectors(this.pos, center)
        let len = dir.length()
        if (len == 0.0) return
        dir.scale(1.0 / len)
        let lambda = physicsScene.wireRadius - len
        this.pos.add(dir, lambda)
        return lambda
    }
    // 更新速度
    endStep(dt) {
        this.vel.subtractVectors(this.pos, this.prevPos)
        this.vel.scale(1.0 / dt)
    }
}

// -------------------------------------------------------
// 解析解Bead
class AnalyticBead {
    constructor(radius, beadRadius, mass, angle) {
        this.radius = radius
        this.beadRadius = beadRadius
        this.mass = mass
        this.angle = angle
        this.omega = 0.0
    }
    simulate(dt, gravity) {
        let acc = (-gravity / this.radius) * Math.sin(this.angle)
        this.omega += acc * dt
        this.angle += this.omega * dt

        let centrifugalForce = this.omega * this.omega * this.radius
        let force = centrifugalForce + Math.cos(this.angle) * Math.abs(gravity)
        return force
    }
    getPos() {
        return new Vector2(Math.sin(this.angle) * this.radius, -Math.cos(this.angle) * this.radius)
    }
}

// -----------------------------------------------------

function setupScene() {
    physicsScene.paused = true

    physicsScene.wireCenter.x = simWidth / 2.0
    physicsScene.wireCenter.y = simHeight / 2.0
    physicsScene.wireRadius = simMinWidth * 0.4
    // bead的初始位置
    let pos = new Vector2(physicsScene.wireCenter.x + physicsScene.wireRadius, physicsScene.wireCenter.y)

    physicsScene.bead = new Bead(0.1, 1.0, pos)

    physicsScene.analyticBead = new AnalyticBead(physicsScene.wireRadius, 0.1, 1.0, 0.5 * Math.PI)

    document.getElementById('force').innerHTML = (0.0).toFixed(3)
    document.getElementById('aforce').innerHTML = (0.0).toFixed(3)
}

// draw -------------------------------------------------------

function drawCircle(pos, radius, filled) {
    c.beginPath()
    c.arc(cX(pos), cY(pos), cScale * radius, 0.0, 2.0 * Math.PI)
    c.closePath()
    if (filled) c.fill()
    else c.stroke()
}

function draw() {
    c.clearRect(0, 0, canvas.width, canvas.height)

    c.fillStyle = '#FF0000'
    c.lineWidth = 2.0
    drawCircle(physicsScene.wireCenter, physicsScene.wireRadius, false)

    c.fillStyle = '#FF0000'

    let bead = physicsScene.bead
    drawCircle(bead.pos, bead.radius, true)

    c.fillStyle = '#00FF00'

    let analyticBead = physicsScene.analyticBead
    let pos = analyticBead.getPos()
    pos.add(physicsScene.wireCenter)
    drawCircle(pos, analyticBead.beadRadius, true)
}

// ------------------------------------------------

function simulate() {
    if (physicsScene.paused) return

    let sdt = physicsScene.dt / physicsScene.numSteps
    let force, analyticForce

    for (let step = 0; step < physicsScene.numSteps; step++) {
        physicsScene.bead.startStep(sdt, physicsScene.gravity)

        let lambda = physicsScene.bead.keepOnWire(physicsScene.wireCenter, physicsScene.wireRadius)

        force = Math.abs(lambda / sdt / sdt)

        physicsScene.bead.endStep(sdt)

        analyticForce = physicsScene.analyticBead.simulate(sdt, -physicsScene.gravity.y)
    }

    document.getElementById('force').innerHTML = force.toFixed(3)
    document.getElementById('aforce').innerHTML = analyticForce.toFixed(3)
}

// --------------------------------------------------------

function run() {
    physicsScene.paused = false
}

function step() {
    physicsScene.paused = false
    simulate()
    physicsScene.paused = true
}

function update() {
    simulate()
    draw()
    requestAnimationFrame(update)
}

setupScene()
update()