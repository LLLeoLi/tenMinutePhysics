let gThreeScene
let gRenderer
let gCamera
let gCameraControl
let gGrabber
let gMouseDown = false

let gPhysicsScene = {
    gravity: new THREE.Vector3(0.0, -10.0, 0.0),
    dt: 1.0 / 60.0,
    worldSize: { x: 1.5, z: 2.5 },
    paused: true,
    objects: []
}

// ------------------------------------------------------------------
class Ball {
    constructor(pos, radius, vel) {
        // physics data

        this.pos = pos
        this.radius = radius
        this.vel = vel
        this.grabbed = false

        // visual mesh

        let geometry = new THREE.SphereGeometry(radius, 32, 32)
        let material = new THREE.MeshPhongMaterial({ color: 0xff0000 })
        this.visMesh = new THREE.Mesh(geometry, material)
        this.visMesh.position.copy(pos)
        this.visMesh.userData = this // for raycasting
        this.visMesh.layers.enable(1)
        gThreeScene.add(this.visMesh)
    }

    simulate() {
        // 如果被抓取，那么我们不进行模拟
        if (this.grabbed) return

        this.vel.addScaledVector(gPhysicsScene.gravity, gPhysicsScene.dt)
        this.pos.addScaledVector(this.vel, gPhysicsScene.dt)

        let size = gPhysicsScene.worldSize

        if (this.pos.x < -size.x) {
            this.pos.x = -size.x
            this.vel.x = -this.vel.x
        }
        if (this.pos.x > size.x) {
            this.pos.x = size.x
            this.vel.x = -this.vel.x
        }
        if (this.pos.z < -size.z) {
            this.pos.z = -size.z
            this.vel.z = -this.vel.z
        }
        if (this.pos.z > size.z) {
            this.pos.z = size.z
            this.vel.z = -this.vel.z
        }
        if (this.pos.y < this.radius) {
            this.pos.y = this.radius
            this.vel.y = -this.vel.y
        }

        this.visMesh.position.copy(this.pos)
        this.visMesh.geometry.computeBoundingSphere()
    }

    startGrab(pos) {
        this.grabbed = true
        this.pos.copy(pos)
        this.visMesh.position.copy(pos)
    }

    moveGrabbed(pos, vel) {
        this.pos.copy(pos)
        this.visMesh.position.copy(pos)
    }

    endGrab(pos, vel) {
        this.grabbed = false
        this.vel.copy(vel)
    }
}

// ------------------------------------------------------------------
function initPhysics() {
    let radius = 0.2
    let pos = new THREE.Vector3(radius, 1.0, radius)
    //				let vel = new THREE.Vector3(2.0, 5.0, 3.0);
    let vel = new THREE.Vector3()

    gPhysicsScene.objects.push(new Ball(pos, radius, vel))
}

// ------------------------------------------------------------------
function simulate() {
    if (gPhysicsScene.paused) return
    for (let i = 0; i < gPhysicsScene.objects.length; i++) gPhysicsScene.objects[i].simulate()

    gGrabber.increaseTime(gPhysicsScene.dt)
}

// ------------------------------------------

function initThreeScene() {
    gThreeScene = new THREE.Scene()

    // Lights

    gThreeScene.add(new THREE.AmbientLight(0x505050))
    gThreeScene.fog = new THREE.Fog(0x000000, 0, 15)

    let spotLight = new THREE.SpotLight(0xffffff)
    spotLight.angle = Math.PI / 5
    spotLight.penumbra = 0.2
    spotLight.position.set(2, 3, 3)
    spotLight.castShadow = true
    spotLight.shadow.camera.near = 3
    spotLight.shadow.camera.far = 10
    spotLight.shadow.mapSize.width = 1024
    spotLight.shadow.mapSize.height = 1024
    gThreeScene.add(spotLight)

    let dirLight = new THREE.DirectionalLight(0x55505a, 1)
    dirLight.position.set(0, 3, 0)
    dirLight.castShadow = true
    dirLight.shadow.camera.near = 1
    dirLight.shadow.camera.far = 10

    dirLight.shadow.camera.right = 1
    dirLight.shadow.camera.left = -1
    dirLight.shadow.camera.top = 1
    dirLight.shadow.camera.bottom = -1

    dirLight.shadow.mapSize.width = 1024
    dirLight.shadow.mapSize.height = 1024
    gThreeScene.add(dirLight)

    // Geometry

    let ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(20, 20, 1, 1), new THREE.MeshPhongMaterial({ color: 0xa0adaf, shininess: 150 }))
    
    ground.rotation.x = -Math.PI / 2 // rotates X/Y to X/Z
    ground.receiveShadow = true
    gThreeScene.add(ground)

    let helper = new THREE.GridHelper(20, 20)
    helper.material.opacity = 1.0
    helper.material.transparent = true
    helper.position.set(0, 0.002, 0)
    gThreeScene.add(helper)

    // Renderer

    gRenderer = new THREE.WebGLRenderer()
    gRenderer.shadowMap.enabled = true
    gRenderer.setPixelRatio(window.devicePixelRatio)
    gRenderer.setSize(0.8 * window.innerWidth, 0.8 * window.innerHeight)
    window.addEventListener('resize', onWindowResize, false)
    container.appendChild(gRenderer.domElement)

    // Camera

    gCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100)
    gCamera.position.set(0, 1, 4)
    gCamera.updateMatrixWorld()

    gThreeScene.add(gCamera)

    gCameraControl = new THREE.OrbitControls(gCamera, gRenderer.domElement)
    gCameraControl.zoomSpeed = 2.0
    gCameraControl.panSpeed = 0.4

    // grabber
    // 创建新的抓取器
    gGrabber = new Grabber()
    container.addEventListener('pointerdown', onPointer, false)
    container.addEventListener('pointermove', onPointer, false)
    container.addEventListener('pointerup', onPointer, false)
}

// ------- grabber -----------------------------------------------------------

class Grabber {
    constructor() {
        this.raycaster = new THREE.Raycaster()
        // 我们将射线相交检测限制在图层1中的对象上
        this.raycaster.layers.set(1)
        // 定义了射线与线段相交的距离阈值为0.1
        this.raycaster.params.Line.threshold = 0.1
        this.physicsObject = null
        this.distance = 0.0
        this.prevPos = new THREE.Vector3()
        this.vel = new THREE.Vector3()
        this.time = 0.0
    }
    increaseTime(dt) {
        this.time += dt
    }
    updateRaycaster(x, y) {
        let rect = gRenderer.domElement.getBoundingClientRect()
        this.mousePos = new THREE.Vector2()
        this.mousePos.x = ((x - rect.left) / rect.width) * 2 - 1
        this.mousePos.y = -((y - rect.top) / rect.height) * 2 + 1
        this.raycaster.setFromCamera(this.mousePos, gCamera)
    }
    // 传入屏幕坐标
    start(x, y) {
        this.physicsObject = null
        // 更新射线对象
        this.updateRaycaster(x, y)
        let intersects = this.raycaster.intersectObjects(gThreeScene.children)
        if (intersects.length > 0) {
            // 获取第一个物体的userData
            let obj = intersects[0].object.userData
            if (obj) {
                this.physicsObject = obj
                // 公式中的d_down
                this.distance = intersects[0].distance
                // 获取mouse ray与物体的交点
                let pos = this.raycaster.ray.origin.clone()
                // h_1 = r_orig + d_down * r_dir
                pos.addScaledVector(this.raycaster.ray.direction, this.distance)
                // 调用three.jsAPI
                this.physicsObject.startGrab(pos)
                // 保存上一帧的位置，用于计算速度
                this.prevPos.copy(pos)
                this.vel.set(0.0, 0.0, 0.0)
                // 重置时间
                this.time = 0.0
                if (gPhysicsScene.paused) run()
            }
        }
    }
    // 进行移动，主要是利用API更新位置和手动计算速度
    move(x, y) {
        if (this.physicsObject) {
            // 更新射线对象
            this.updateRaycaster(x, y)
            // 获取mouse ray与物体的交点
            let pos = this.raycaster.ray.origin.clone()
            pos.addScaledVector(this.raycaster.ray.direction, this.distance)

            // 根据上次事件的位置和时间计算速度
            this.vel.copy(pos)
            this.vel.sub(this.prevPos)
            if (this.time > 0.0) this.vel.divideScalar(this.time)
            else vel.set(0.0, 0.0, 0.0)


            this.prevPos.copy(pos)
            this.time = 0.0
            // 调用three.jsAPI更新位置和速度
            this.physicsObject.moveGrabbed(pos, this.vel)
        }
    }
    end() {
        if (this.physicsObject) {
            this.physicsObject.endGrab(this.prevPos, this.vel)
            this.physicsObject = null
        }
    }
}

function onPointer(evt) {
    event.preventDefault()
    // 如果鼠标按下，那么我们开始抓取
    if (evt.type == 'pointerdown') {
        gGrabber.start(evt.clientX, evt.clientY)
        gMouseDown = true
        // 如果抓取到物理对象，那么我们关闭相机控制
        if (gGrabber.physicsObject) {
            gCameraControl.saveState()
            gCameraControl.enabled = false
        }
    }
    // 如果鼠标移动，且鼠标按下，那么我们移动抓取器
     else if (evt.type == 'pointermove' && gMouseDown) {
        gGrabber.move(evt.clientX, evt.clientY)
    }
    // 如果鼠标抬起，那么我们结束抓取，重置相机控制
    else if (evt.type == 'pointerup') {
        if (gGrabber.physicsObject) {
            gGrabber.end()
            gCameraControl.reset()
        }
        gMouseDown = false
        gCameraControl.enabled = true
    }
}

// ------------------------------------------------------

function onWindowResize() {
    gCamera.aspect = window.innerWidth / window.innerHeight
    gCamera.updateProjectionMatrix()
    gRenderer.setSize(window.innerWidth, window.innerHeight)
}

function run() {
    let button = document.getElementById('buttonRun')
    if (gPhysicsScene.paused) button.innerHTML = 'Stop'
    else button.innerHTML = 'Run'
    gPhysicsScene.paused = !gPhysicsScene.paused
}

function restart() {
    location.reload()
}

// make browser to call us repeatedly -----------------------------------

function update() {
    simulate()
    gRenderer.render(gThreeScene, gCamera)
    requestAnimationFrame(update)
}

initThreeScene()
onWindowResize()
initPhysics()
update()
