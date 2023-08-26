// 三个参数，实现一个三重摆
let lengths = [0.2, 0.2, 0.2]
let masses = [1.0, 0.5, 0.3]
let angles = [0.5 * Math.PI, Math.PI, Math.PI]

let canvas = document.getElementById('myCanvas')
let c = canvas.getContext('2d')
canvas.width = window.innerWidth - 20
canvas.height = window.innerHeight - 20
let simMinWidth = 1.0
let cScale = Math.min(canvas.width, canvas.height) / simMinWidth

function cX(pos) {
    return canvas.width / 2 + pos.x * cScale
}
function cY(pos) {
    return 0.4 * canvas.height - pos.y * cScale
}

class Pendulum {
    constructor(masses, lengths, angles) {
        this.masses = [0.0]
        this.lengths = [0.0]
        this.pos = [{ x: 0.0, y: 0.0 }]
        this.prevPos = [{ x: 0.0, y: 0.0 }]
        this.vel = [{ x: 0.0, y: 0.0 }]
        let x = 0.0,
            y = 0.0
        for (let i = 0; i < masses.length; i++) {
            this.masses.push(masses[i])
            this.lengths.push(lengths[i])
            x += lengths[i] * Math.sin(angles[i])
            y += lengths[i] * -Math.cos(angles[i])
            this.pos.push({ x: x, y: y })
            this.prevPos.push({ x: x, y: y })
            this.vel.push({ x: 0, y: 0 })
        }
    }
    simulate(dt, gravity) {
        let p = this
        // 逐个进行速度和位置的更新
        for (let i = 1; i < p.masses.length; i++) {
            // 更新速度
            p.vel[i].y += dt * scene.gravity
            // 记录上一帧的位置
            p.prevPos[i].x = p.pos[i].x
            p.prevPos[i].y = p.pos[i].y
            // 更新位置
            p.pos[i].x += p.vel[i].x * dt
            p.pos[i].y += p.vel[i].y * dt
        }
        // 满足约束，这里假设每个小球按照顺序连接建立约束
        for (let i = 1; i < p.masses.length; i++) {
            let dx = p.pos[i].x - p.pos[i - 1].x
            let dy = p.pos[i].y - p.pos[i - 1].y
            let d = Math.sqrt(dx * dx + dy * dy)
            let w0 = p.masses[i - 1] > 0.0 ? 1.0 / p.masses[i - 1] : 0.0
            let w1 = p.masses[i] > 0.0 ? 1.0 / p.masses[i] : 0.0
            // 公式中的 (l-l_0)/((w_1+w_2)*|x_2-x_1|)
            let corr = (p.lengths[i] - d) / d / (w0 + w1)
            // 把Δx补充回来
            p.pos[i - 1].x -= w0 * corr * dx
            p.pos[i - 1].y -= w0 * corr * dy
            p.pos[i].x += w1 * corr * dx
            p.pos[i].y += w1 * corr * dy
        }
        for (let i = 1; i < p.masses.length; i++) {
            p.vel[i].x = (p.pos[i].x - p.prevPos[i].x) / dt
            p.vel[i].y = (p.pos[i].y - p.prevPos[i].y) / dt
        }
    }
    draw() {
        let p = this
        c.strokeStyle = '#303030'
        c.lineWidth = 10
        c.beginPath()
        c.moveTo(cX(p.pos[0]), cY(p.pos[0]))
        for (let i = 1; i < p.masses.length; i++) c.lineTo(cX(p.pos[i]), cY(p.pos[i]))
        c.stroke()
        c.lineWidth = 1

        c.fillStyle = '#FF0000'
        for (let i = 1; i < p.masses.length; i++) {
            let r = 0.05 * Math.sqrt(p.masses[i])
            c.beginPath()
            c.arc(cX(p.pos[i]), cY(p.pos[i]), cScale * r, 0.0, 2.0 * Math.PI)
            c.closePath()
            c.fill()
        }
    }
}

let scene = {
    gravity: -10.0,
    dt: 0.01,
    numSubSteps: 100,
    pendulum: new Pendulum(masses, lengths, angles)
}

function draw() {
    c.fillStyle = '#000000'
    c.fillRect(0, 0, canvas.width, canvas.height)
    scene.pendulum.draw()
}

function simulate() {
    let sdt = scene.dt / scene.numSubSteps
    for (let step = 0; step < scene.numSubSteps; step++) scene.pendulum.simulate(sdt, scene.gravity)
}

function update() {
    simulate()
    draw()
    requestAnimationFrame(update)
}

update()
