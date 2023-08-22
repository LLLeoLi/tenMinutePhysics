let threeScene
let renderer
let camera
let cameraControl

// ------------------------------------------------------------------

// physics scene

let physicsScene = {
    gravity: new THREE.Vector3(0.0, -10.0, 0.0),
    dt: 1.0 / 60.0,
    worldSize: { x: 1.5, z: 2.5 },
    paused: true,
    objects: []
}

// ------------------------------------------------------------------
class Ball {
    constructor(pos, radius, vel, scene) {
        // physics data

        this.pos = pos
        this.radius = radius
        this.vel = vel

        // visual mesh
        // 用于渲染球体的几何体
        let geometry = new THREE.SphereGeometry(radius, 32, 32)
        // 给网格对象应用Phong着色模型的材质类型
        let material = new THREE.MeshPhongMaterial({ color: 0xff0000 })
        // 用于渲染球体的网格
        this.visMesh = new THREE.Mesh(geometry, material)
        this.visMesh.position.copy(pos)
        threeScene.add(this.visMesh)
    }

    simulate() {
        this.vel.addScaledVector(physicsScene.gravity, physicsScene.dt)
        this.pos.addScaledVector(this.vel, physicsScene.dt)

        if (this.pos.x < -physicsScene.worldSize.x) {
            this.pos.x = -physicsScene.worldSize.x
            this.vel.x = -this.vel.x
        }
        if (this.pos.x > physicsScene.worldSize.x) {
            this.pos.x = physicsScene.worldSize.x
            this.vel.x = -this.vel.x
        }
        if (this.pos.z < -physicsScene.worldSize.z) {
            this.pos.z = -physicsScene.worldSize.z
            this.vel.z = -this.vel.z
        }
        if (this.pos.z > physicsScene.worldSize.z) {
            this.pos.z = physicsScene.worldSize.z
            this.vel.z = -this.vel.z
        }
        if (this.pos.y < this.radius) {
            this.pos.y = this.radius
            this.vel.y = -this.vel.y
        }

        this.visMesh.position.copy(this.pos)
    }
}

// ------------------------------------------------------------------
// 在教程视频中这个函数写在了initThreeScene()函数中，这里单独抽离出来了
function initPhysics(scene) {
    let radius = 0.2
    let pos = new THREE.Vector3(radius, radius, radius)
    let vel = new THREE.Vector3(2.0, 5.0, 3.0)

    physicsScene.objects.push(new Ball(pos, radius, vel, scene))
}

// ------------------------------------------------------------------
function simulate() {
    // 暂停时不进行模拟
    if (physicsScene.paused) return
    for (let i = 0; i < physicsScene.objects.length; i++) physicsScene.objects[i].simulate()
}

// ------------------------------------------
// Lights Geometry Renderer Camera Controls
function initThreeScene() {
    threeScene = new THREE.Scene()

    // Lights

    // 提供全局光照
    threeScene.add(new THREE.AmbientLight(0x505050))
    threeScene.fog = new THREE.Fog(0x000000, 0, 15)
    // 聚光灯光源
    let spotLight = new THREE.SpotLight(0xffffff)
    spotLight.angle = Math.PI / 5
    spotLight.penumbra = 0.2
    spotLight.position.set(2, 3, 3)
    spotLight.castShadow = true
    spotLight.shadow.camera.near = 3
    spotLight.shadow.camera.far = 10
    spotLight.shadow.mapSize.width = 1024
    spotLight.shadow.mapSize.height = 1024
    threeScene.add(spotLight)
    // 平行光光源
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
    threeScene.add(dirLight)

    // Geometry

    // 创建网格对象，用于渲染地面
    let ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(20, 20, 1, 1), new THREE.MeshPhongMaterial({ color: 0xa0adaf, shininess: 150 }))

    ground.rotation.x = -Math.PI / 2 // rotates X/Y to X/Z
    ground.receiveShadow = true
    threeScene.add(ground)

    let helper = new THREE.GridHelper(20, 20)
    helper.material.opacity = 1.0
    helper.material.transparent = true
    helper.position.set(0, 0.002, 0)
    threeScene.add(helper)

    // Renderer

    renderer = new THREE.WebGLRenderer()
    renderer.shadowMap.enabled = true
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(0.8 * window.innerWidth, 0.8 * window.innerHeight)
    window.addEventListener('resize', onWindowResize, false)
    container.appendChild(renderer.domElement)

    // Camera

    camera = new THREE.PerspectiveCamera(
        // 视角
        70,
        // 宽高比
        window.innerWidth / window.innerHeight,
        // zNear
        0.01,
        // zFear
        100
    )
    camera.position.set(0, 1, 4)
    camera.updateMatrixWorld()

    threeScene.add(camera)
    // 实现交互式相机控制
    cameraControl = new THREE.OrbitControls(camera, renderer.domElement)
    cameraControl.zoomSpeed = 2.0
    cameraControl.panSpeed = 0.4
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
}

function run() {
    let button = document.getElementById('buttonRun')
    if (physicsScene.paused) button.innerHTML = 'Stop'
    else button.innerHTML = 'Run'
    physicsScene.paused = !physicsScene.paused
}

function restart() {
    location.reload()
}

// make browser to call us repeatedly -----------------------------------

function update() {
    // simulate对physicsScene中的所有物体调用simulate()，这里指的就是Ball的simulate()方法
    simulate()
    renderer.render(threeScene, camera)
    cameraControl.update()
    requestAnimationFrame(update)
}

initThreeScene()
initPhysics()
update()
