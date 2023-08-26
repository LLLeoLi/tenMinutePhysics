let canvas = document.getElementById("myCanvas");
let c = canvas.getContext("2d");
canvas.width = window.innerWidth - 20;
canvas.height = window.innerHeight - 20;

let simMinWidth = 1.0;
let cScale = Math.min(canvas.width, canvas.height) / simMinWidth;

function cX(pos) { return canvas.width / 2 + pos.x * cScale; }
function cY(pos) { return 0.4 * canvas.height - pos.y * cScale; }

class Pendulum {
    // usePBD: 是否使用PBD算法
    constructor(usePBD, color, masses, lengths, angles) {
        this.usePBD = usePBD;
        this.color = color;
        this.masses = [0.0];
        this.lengths = [0.0];
        this.pos = [{x:0.0, y:0.0}];
        this.prevPos = [{x:0.0, y:0.0}];
        this.vel = [{x:0.0, y:0.0}];
        this.theta = [0.0];
        this.omega = [0.0];

        this.trail = new Int32Array(1000);
        this.trailFirst = 0;
        this.trailLast = 0;

        let x = 0.0, y = 0.0;
        for (let i = 0; i < masses.length; i++) {
            this.masses.push(masses[i]);
            this.lengths.push(lengths[i]);
            this.theta.push(angles[i]);
            this.omega.push(0.0);
            x += lengths[i] * Math.sin(angles[i]);
            y += lengths[i] * -Math.cos(angles[i]); 
            this.pos.push({ x:x, y:y});
            this.prevPos.push({ x:x, y:y});
            this.vel.push({x:0, y:0});
        }
    }
    simulate(dt, gravity) {
        if (this.usePBD)
            this.simulatePBD(dt, gravity);
        else
            this.simulateAnalytic(dt, gravity);
    }
    simulatePBD(dt, gravity) 
    {
        let p = this;
        for (let i = 1; i < p.masses.length; i++) {
            p.vel[i].y += dt * gravity;
            p.prevPos[i].x = p.pos[i].x;
            p.prevPos[i].y = p.pos[i].y;
            p.pos[i].x += p.vel[i].x * dt;
            p.pos[i].y += p.vel[i].y * dt;
        }
        for (let i = 1; i < p.masses.length; i++) {
            let dx = p.pos[i].x - p.pos[i-1].x;
            let dy = p.pos[i].y - p.pos[i-1].y;
            let d = Math.sqrt(dx * dx + dy * dy);
            let w0 = p.masses[i - 1] > 0.0 ? 1.0 / p.masses[i - 1] : 0.0;
            let w1 = p.masses[i] > 0.0 ? 1.0 / p.masses[i] : 0.0;
            let corr = (p.lengths[i] - d) / d / (w0 + w1);
            p.pos[i - 1].x -= w0 * corr * dx; 
            p.pos[i - 1].y -= w0 * corr * dy; 
            p.pos[i].x += w1 * corr * dx; 
            p.pos[i].y += w1 * corr * dy; 
        }
        for (let i = 1; i < p.masses.length; i++) {
            p.vel[i].x = (p.pos[i].x - p.prevPos[i].x) / dt;
            p.vel[i].y = (p.pos[i].y - p.prevPos[i].y) / dt;
        }
    }
    simulateAnalytic(dt, gravity) 
    {
        let g = -gravity;
        let m1 = this.masses[1];
        let m2 = this.masses[2];
        let m3 = this.masses[3];
        let l1 = this.lengths[1];
        let l2 = this.lengths[2];
        let l3 = this.lengths[3];
        let t1 = this.theta[1];
        let t2 = this.theta[2];
        let t3 = this.theta[3];
        let w1 = this.omega[1];
        let w2 = this.omega[2];
        let w3 = this.omega[3];

        let b1 = 
            g*l1*m1*Math.sin(t1) + g*l1*m2*Math.sin(t1)+g*l1*m3*Math.sin(t1) + m2*l1*l2*Math.sin(t1-t2)*w1*w2 + 
            m3*l1*l3*Math.sin(t1-t3)*w1*w3       +   m3*l1*l2*Math.sin(t1-t2)*w1*w2  +  
            m2*l1*l2*Math.sin(t2-t1)*(w1-w2)*w2  +   
            m3*l1*l2*Math.sin(t2-t1)*(w1-w2)*w2  +  
            m3*l1*l3*Math.sin(t3-t1)*(w1-w3)*w3;

        let a11 = l1*l1*(m1+m2+m3);
        let a12 = m2*l1*l2*Math.cos(t1-t2) + m3*l1*l2*Math.cos(t1-t2);
        let a13 = m3*l1*l3*Math.cos(t1-t3);

        let b2 = 
            g*l2*m2*Math.sin(t2) + g*l2*m3*Math.sin(t2) + w1*w2*l1*l2*Math.sin(t2-t1)*(m2 + m3) +
            m3*l2*l3*Math.sin(t2-t3)*w2*w3               +    
            (m2 + m3)*l1*l2*Math.sin(t2-t1)*(w1-w2)*w1   +  
            m3*l2*l3*Math.sin(t3-t2)*(w2-w3)*w3; 

        let a21 = (m2 + m3)*l1*l2*Math.cos(t2-t1);
        let a22 = l2*l2*(m2+m3);
        let a23 = m3*l2*l3*Math.cos(t2-t3);

        let b3 = 
            m3*g*l3*Math.sin(t3) - m3*l2*l3*Math.sin(t2-t3)*w2*w3 - m3*l1*l3*Math.sin(t1-t3)*w1*w3 + 
            m3*l1*l3*Math.sin(t3-t1)*(w1-w3)*w1    + 
            m3*l2*l3*Math.sin(t3-t2)*(w2-w3)*w2;

        let a31 = m3*l1*l3*Math.cos(t1-t3);
        let a32 = m3*l2*l3*Math.cos(t2-t3);
        let a33 = m3*l3*l3;

        b1 = -b1;
        b2 = -b2;
        b3 = -b3;

        let det = a11 * (a22 * a33 - a23 * a32) + a21 * (a32 * a13 - a33 * a12) + a31 * (a12 * a23 - a13 * a22);
        if (det == 0.0)
            return;

        let a1 = b1 * (a22 * a33 - a23 * a32) + b2 * (a32 * a13 - a33 * a12) + b3 * (a12 * a23 - a13 * a22);
        let a2 = b1 * (a23 * a31 - a21 * a33) + b2 * (a33 * a11 - a31 * a13) + b3 * (a13 * a21 - a11 * a23);
        let a3 = b1 * (a21 * a32 - a22 * a31) + b2 * (a31 * a12 - a32 * a11) + b3 * (a11 * a22 - a12 * a21);

        a1 /= det;
        a2 /= det;
        a3 /= det;

        this.omega[1] += a1 * dt;
        this.omega[2] += a2 * dt;
        this.omega[3] += a3 * dt;
        this.theta[1] += this.omega[1] * dt;
        this.theta[2] += this.omega[2] * dt;	
        this.theta[3] += this.omega[3] * dt;	

        let x = 0.0, y = 0.0;
        for (let i = 1; i < this.masses.length; i++) {
            x += this.lengths[i] * Math.sin(this.theta[i]);
            y += this.lengths[i] * -Math.cos(this.theta[i]); 
            this.pos[i].x = x;
            this.pos[i].y = y;
        }
    }
    // 更新轨迹
    updateTrail() {
        this.trail[this.trailLast] = cX(this.pos[this.pos.length-1]);
        this.trail[this.trailLast + 1] = cY(this.pos[this.pos.length-1]);
        this.trailLast = (this.trailLast + 2) % this.trail.length;
        if (this.trailLast == this.trailFirst)
            this.trailFirst = (this.trailFirst + 2) % this.trail.length;
    }
    draw() {
        c.strokeStyle = this.color;
        c.lineWidth = 2.0;
        if (this.trailLast != this.trailFirst) {
            let i = this.trailFirst;
            c.beginPath();
            c.moveTo(this.trail[i], this.trail[i + 1]);
            i = (i + 2) % this.trail.length;
            while (i != this.trailLast) {
                c.lineTo(this.trail[i], this.trail[i + 1]);
                i = (i + 2) % this.trail.length;
            }
            c.stroke();
        }

        let p = this;
        c.strokeStyle = "#303030";
        c.lineWidth = 10;
        c.beginPath();
        c.moveTo(cX(p.pos[0]), cY(p.pos[0]));
        for (let i = 1; i < p.masses.length; i++) 
            c.lineTo(cX(p.pos[i]), cY(p.pos[i]));
        c.stroke();
        c.lineWidth = 1;            

        c.fillStyle = this.color;
        for (let i = 1; i < p.masses.length; i++) {
            let r = 0.03 * Math.sqrt(p.masses[i]);
            c.beginPath();			
            c.arc(
                cX(p.pos[i]), cY(p.pos[i]), cScale * r, 0.0, 2.0 * Math.PI); 
            c.closePath();
            c.fill();
        }
    }
}

let scene = {
    gravity : -10.0,
    dt : 0.01,
    numSubSteps : 10000,
    paused : true,
    pendulumPBD : null,
    pendulumAnalytic : null
};

let sceneNr = 0;
// 每次setupScene()都会生成一个新的场景
function setupScene() {
    let angles = [0.5 * Math.PI, Math.PI, Math.PI, Math.PI, Math.PI];
    let lengths = [];
    let masses = [];

    switch(sceneNr % 6) {
        case 0 : {
            lengths = [0.15, 0.15, 0.15];
            masses = [1.0, 1.0, 1.0];
            break;
        }
        case 1 : {
            lengths = [0.06, 0.15, 0.2];
            masses = [1.0, 0.5, 0.1];
            break;
        }
        case 2 : {
            lengths = [0.15, 0.15, 0.15];
            masses = [1.0, 0.01, 1.0];
            break;
        }
        case 3 : {
            lengths = [0.15, 0.15, 0.15];
            masses = [0.01, 1.0, 0.01];
            break;
        }
        case 4 : {
            lengths = [0.2, 0.133, 0.04];
            masses = [0.3, 0.3, 0.3];
            break;
        }
        case 5 : {
            lengths = [0.1, 0.12, 0.1, 0.15, 0.05];
            masses = [0.2, 0.6, 0.4, 0.3, 0.2];
            break;
        }
    }

    scene.pendulumAnalytic = null;

    scene.pendulumPBD = new Pendulum(true, "#FF3030", masses, lengths, angles);
    if (masses.length <= 3)
        scene.pendulumAnalytic = new Pendulum(false, "#00FF00", masses, lengths, angles);
    scene.paused = true;

    sceneNr++;
}

function draw() {
    // 黑色画布背景
    c.fillStyle = "#000000";
    c.fillRect(0, 0, canvas.width, canvas.height);
    if (scene.pendulumPBD)
        scene.pendulumPBD.draw();
    // 如果模拟步数大于100，才绘制解析解
    if (scene.numSubSteps >= 100) {
        if (scene.pendulumAnalytic)
            scene.pendulumAnalytic.draw();
    }
}

function simulate() {
    // 如果暂停，不进行模拟
    if (scene.paused)
        return;
    let sdt = scene.dt / scene.numSubSteps;
    let trailGap = scene.numSubSteps / 10;

    for (let step = 0; step < scene.numSubSteps; step++) {
        if (scene.pendulumPBD) {
            scene.pendulumPBD.simulate(sdt, scene.gravity);
            if (step % trailGap == 0)
                scene.pendulumPBD.updateTrail();
        }
        if (scene.pendulumAnalytic) {
            scene.pendulumAnalytic.simulate(sdt, scene.gravity);
            if (step % trailGap == 0)
                scene.pendulumAnalytic.updateTrail();
        }
    }
}

document.getElementById("stepsSlider").oninput = function() {
    let steps = [1, 5, 10, 100, 1000, 10000];
    scene.numSubSteps = steps[Number(this.value)];
    document.getElementById("steps").innerHTML = scene.numSubSteps.toString();
}

document.addEventListener("keydown", event => {
    if (event.isComposing || event.keyCode === 229) 
        return;
    if (event.key == 's')
        step();
    });    

function run() {
    scene.paused = false;
}

function step() {
    scene.paused = false;
    simulate();
    scene.paused = true;
}

function update() {
    simulate();
    draw();
    requestAnimationFrame(update);
}
// Restart按钮也会调用该函数
setupScene();
update();	
