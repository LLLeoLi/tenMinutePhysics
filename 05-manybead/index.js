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
    endStep(dt) {
        this.vel.subtractVectors(this.pos, this.prevPos)
        this.vel.scale(1.0 / dt)
    }
}

let physicsScene = {
    gravity: new Vector2(0.0, -10.0),
    dt: 1.0 / 60.0,
    numSteps: 100,
    wireCenter: new Vector2(),
    wireRadius: 0.0,
    beads: []
}

// -----------------------------------------------------

function setupScene() {
    physicsScene.beads = []

    physicsScene.wireCenter.x = simWidth / 2.0
    physicsScene.wireCenter.y = simHeight / 2.0
    physicsScene.wireRadius = simMinWidth * 0.4

    let numBeads = 5
    let mass = 1.0

    let r = 0.1
    let angle = 0.0
    for (i = 0; i < numBeads; i++) {
        let mass = Math.PI * r * r
        let pos = new Vector2(physicsScene.wireCenter.x + physicsScene.wireRadius * Math.cos(angle), physicsScene.wireCenter.y + physicsScene.wireRadius * Math.sin(angle))

        physicsScene.beads.push(new Bead(r, mass, pos))
        angle += Math.PI / numBeads
        r = 0.05 + Math.random() * 0.1
    }
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

    for (let i = 0; i < physicsScene.beads.length; i++) {
        let bead = physicsScene.beads[i]
        drawCircle(bead.pos, bead.radius, true)
    }
}

// --- collision handling -------------------------------------------------------

function handleBeadBeadCollision(bead1, bead2) {
    let restitution = 1.0
    let dir = new Vector2()
    dir.subtractVectors(bead2.pos, bead1.pos)
    let d = dir.length()
    if (d == 0.0 || d > bead1.radius + bead2.radius) return

    dir.scale(1.0 / d)

    let corr = (bead1.radius + bead2.radius - d) / 2.0
    bead1.pos.add(dir, -corr)
    bead2.pos.add(dir, corr)

    let v1 = bead1.vel.dot(dir)
    let v2 = bead2.vel.dot(dir)

    let m1 = bead1.mass
    let m2 = bead2.mass

    let newV1 = (m1 * v1 + m2 * v2 - m2 * (v1 - v2) * restitution) / (m1 + m2)
    let newV2 = (m1 * v1 + m2 * v2 - m1 * (v2 - v1) * restitution) / (m1 + m2)

    bead1.vel.add(dir, newV1 - v1)
    bead2.vel.add(dir, newV2 - v2)
}

// ------------------------------------------------

function simulate() {
    let sdt = physicsScene.dt / physicsScene.numSteps

    for (let step = 0; step < physicsScene.numSteps; step++) {
        for (let i = 0; i < physicsScene.beads.length; i++) physicsScene.beads[i].startStep(sdt, physicsScene.gravity)

        for (let i = 0; i < physicsScene.beads.length; i++) {
            physicsScene.beads[i].keepOnWire(physicsScene.wireCenter, physicsScene.wireRadius)
        }

        for (let i = 0; i < physicsScene.beads.length; i++) physicsScene.beads[i].endStep(sdt)

        for (let i = 0; i < physicsScene.beads.length; i++) {
            for (let j = 0; j < i; j++) {
                handleBeadBeadCollision(physicsScene.beads[i], physicsScene.beads[j])
            }
        }
    }
}

// --------------------------------------------------------

function update() {
    simulate()
    draw()
    requestAnimationFrame(update)
}

setupScene()
update()
