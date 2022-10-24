/**
  Game.js - Trabajo final - GPC
  Realizado con Three.js_r140

  Mario Andreu Villar
  @author maanvil@inf.upv.es
  @date   Oct,2022
  @license CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
*/

// Módulos necesarios
import * as THREE from '../lib/three.module.js'
import * as CANNON from '../lib/cannon-es.js'
import {OrbitControls} from '../lib/OrbitControls.module.js'
import {GLTFLoader} from '../lib/GLTFLoader.module.js'
import {TWEEN} from '../lib/tween.module.min.js'
import {GUI} from '../lib/lil-gui.module.min.js'
import Stats from '../lib/stats.module.js'

// Globales convenidas por threejs
const renderer = new THREE.WebGLRenderer()
let camera
const scene = new THREE.Scene()

// Globales de configuracion
const MAX_SPACE = 50
const SIZE_QUAD = 5
const OFFSET_Y = 10
const MAX_VIDA = 10
const MAX_TIME = 30
const SIZE_VACA_X = 0.5
const SIZE_VACA_Y = 1
const SIZE_VACA_Z = 0.7
const ALTURA_DULCE = 1.5
const ALTURA_FAROLA = 1.9
const ALTURA_ARBOL = 4.5
const RADIO_PIEDRA = 0.4
const ANCHO_CENITAL = 5
const FADE_DURATION = 0.2
const VELOCIDAD_VACA = 5

// Globales del grafo de escena
let visual = new THREE.Object3D() // Parte visual 
let auxPhysical = new THREE.Object3D() // Wireframe meshes como auxiliar del mundo 
                                       // físico, también contiene los helpers
let vaca3D = new THREE.Object3D()
let paisaje3D = new THREE.Group()
let dulces3D = new THREE.Group()
let flores3D = new THREE.Group()
let arboles3D = new THREE.Group()
let farolas3D = new THREE.Group()
let piedras3D = new THREE.Group()
let dulce3D = new THREE.Object3D()
let tulipan3D = new THREE.Object3D()
let narciso3D = new THREE.Object3D()
let anemona3D = new THREE.Object3D()
let planta3D = new THREE.Object3D()
let arbol3D = new THREE.Object3D()
let farola3D = new THREE.Object3D()
let piedra3D = new THREE.Object3D()

// Objetos
let positions = []  // Posiciones de los objetos para no colisionar
let piedras = []
let arboles = []
let dulces = []
let farolas = []
let boxMesh, boxBody, cabezaMesh, cabezaBody  // Vaca
let paredes = []

// Otras globales
let cenital
let mixer, actionIdle, actionWalk, actionDance, actions
let cameraControls, menuGUI
let cuentaAtras
let materialBlanco
let materialAmarillo
let direccional, focal, luzCencerro
let toMove
let lastColision
let keysPressed = {}
let timeleft = MAX_TIME
let vida = MAX_VIDA
let puntos = 0
let recordsPoints = new Array(3).fill(0)
let recordsDates = new Array(3).fill('-')
let moviendose = false
let lastState = false
let finPartida = false

// Movimiento personaje
let walkDirection = new THREE.Vector3()
let rotateAngle = new THREE.Vector3(0, 1, 0)
let rotateQuarternion = new THREE.Quaternion()
let cameraTarget = new THREE.Vector3()

// Monitor de recursos y físicas
const stats = new Stats()
const reloj = new THREE.Clock()
let world

/*********************************************/
/*********************************************/

// Acciones
init()
loadPhysicalWorld()
loadVisualWorld()
setupGUI()
render()

/*********************************************/
/*********************************************/

/**
 * Inicializa la escena y básicos
 */
function init()
{
    // Inicializa el motor de render
    renderer.setSize(window.innerWidth,window.innerHeight)
    document.getElementById('container').appendChild( renderer.domElement )
    renderer.shadowMap.enabled = true
    renderer.antialias = true
    renderer.autoClear = false
    renderer.setClearColor(0xFFFFFF)

    // Reloj
    reloj.start()

    // Instanciar la camara perspectiva
    const ar = window.innerWidth / window.innerHeight
    camera = new THREE.PerspectiveCamera(75, ar, 0.1, 300)
    camera.position.set(5,6,5)
    camera.lookAt(0,1,0)

    // Controles raton
    cameraControls = new OrbitControls(camera, renderer.domElement)
    cameraControls.target.set(0,1,0)

    // Limitar el zoom
    cameraControls.maxDistance = 0.25*MAX_SPACE
    cameraControls.minDistance = 0.05*MAX_SPACE

    // Estadisticas rendimiento
    stats.showPanel(0)	// FPS inicialmente. Pulsar para cambiar panel.
    stats.domElement.style.cssText = 'position:absolute;bottom:0px;right:0px;'
    document.getElementById( 'container' ).appendChild( stats.domElement )

    // Max barra tiempo y vida
    document.getElementById('healthBar').max = MAX_VIDA
    document.getElementById('progressBar').max = MAX_TIME

    // Mini-vista camara cenital
    setMiniatura()

    // Eventos
    window.addEventListener('resize', updateAspectRatio )
    setupListeners()
}

/**
 * Carga el mundo físico, establece constrains y listeners ante colisiones
 */
function loadPhysicalWorld()
{
    // Mundo 
    world = new CANNON.World() 
    world.gravity.set(0,-9.8,0) 

    // Suelo
    const groundShape = new CANNON.Plane()
    const ground = new CANNON.Body({ mass: 0 })
    ground.addShape(groundShape)
    ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), -Math.PI/2)
    world.addBody(ground)

    // Paredes
    const backWall = new CANNON.Body({ mass: 0 })
    backWall.addShape( new CANNON.Plane() )
    backWall.position.z = -MAX_SPACE/2
    world.addBody( backWall )

    const frontWall = new CANNON.Body({ mass: 0 })
    frontWall.addShape( new CANNON.Plane() )
    frontWall.quaternion.setFromEuler(0,Math.PI,0,'XYZ')
    frontWall.position.z = MAX_SPACE/2
    world.addBody( frontWall )

    const leftWall = new CANNON.Body({ mass: 0 })
    leftWall.addShape( new CANNON.Plane() )
    leftWall.position.x = -MAX_SPACE/2
    leftWall.quaternion.setFromEuler(0,Math.PI/2,0,'XYZ')
    world.addBody( leftWall )

    const rightWall = new CANNON.Body({ mass: 0 })
    rightWall.addShape( new CANNON.Plane() )
    rightWall.position.x = MAX_SPACE/2
    rightWall.quaternion.setFromEuler(0,-Math.PI/2,0,'XYZ')
    world.addBody( rightWall )

    //-----------------------------------------

    // Cuerpo físico de la vaca

    // boxBody => parte inferior, la que colisiona con rocas
    boxBody = new CANNON.Body({
        mass: 500,
        shape: new CANNON.Box(new CANNON.Vec3(SIZE_VACA_X/2,SIZE_VACA_Y/2,SIZE_VACA_Z/2)),
        position: new CANNON.Vec3(0,SIZE_VACA_Y/2,0)
    })
    boxBody.linearDamping = 0.99
    boxBody.angularDamping = 0.99

    // cabezaBody => parte superior, la que come y golpea árboles
    cabezaBody = new CANNON.Body({
        mass: 0.1,
        shape : new CANNON.Box(new CANNON.Vec3(SIZE_VACA_X/2,SIZE_VACA_Y/2,SIZE_VACA_Z)),
        position: new CANNON.Vec3(0,SIZE_VACA_Y*2,SIZE_VACA_Z/2)
    })

    // Añadimos al mundo
    world.addBody(boxBody)
    world.addBody(cabezaBody)

    // Un par de restricciones para que la cabeza se pegue al cuerpo
    const restriccion1 = new CANNON.PointToPointConstraint
    (
        boxBody,
        new CANNON.Vec3( 0, SIZE_VACA_Y/2, -SIZE_VACA_Z/2),
        cabezaBody,
        new CANNON.Vec3( 0, -SIZE_VACA_Y/2, -SIZE_VACA_Z) 
    ) 
    const restriccion2 = new CANNON.PointToPointConstraint
    (
        boxBody,
        new CANNON.Vec3( 0, SIZE_VACA_Y/2, SIZE_VACA_Z/2),
        cabezaBody,
        new CANNON.Vec3( 0, -SIZE_VACA_Y/2, 0) 
    ) 
    world.addConstraint( restriccion1 )
    world.addConstraint( restriccion2 )

    // Detección de colisiones de la vaca con otras físicas
    boxBody.addEventListener('collide', (e) => 
    { 
        if (e.body.id != 0 && e.body.id != 6) 
        {
            // console.log('collision with', e.body.id, e.body.name) 

            if (e.body.name == 'piedra' && lastColision != e.body.id)
            {
                vida = Math.max(vida - 2, 0)
                updateHTMLstats() 
            }
            else if ((e.body.name == 'arbol' || e.body.name == 'farola') && lastColision != e.body.id)
            {
                vida = Math.max(vida - 1, 0)
                updateHTMLstats() 
            } 
            
            if (vida <= 0 && !finPartida) endGame()
        }
        lastColision = e.body.id
    })

    cabezaBody.addEventListener('collide', (e) => 
    { 
        if (e.body.id != 0 && e.body.id != 5) 
        {
            // console.log('collision with', e.body.id, e.body.name) 

            if (e.body.name == 'dulce' && lastColision != e.body.id)
            {
                puntos++
                updateHTMLstats()
                toMove = dulces.find(x => x[1].id == e.body.id) // Cambiar el dulce de posición
            }
            else if ((e.body.name == 'arbol' || e.body.name == 'farola') && lastColision != e.body.id)
            {
                vida = Math.max(vida - 1, 0)
                updateHTMLstats() 
            } 
            
            if (vida <= 0 && !finPartida) endGame()
        }
        lastColision = e.body.id
    })
}

/**
 * Carga el mundo visual: luces, materiales, modelos, etc.
 * Define el grafo de escena
 */
function loadVisualWorld()
{
    // Luces: ambiental
    const ambiental = new THREE.AmbientLight(0x222222)
    scene.add(ambiental)

    // Luces: direccional
    direccional = new THREE.DirectionalLight(0xFFFFFF, 1)
    direccional.position.set(-MAX_SPACE/2, MAX_SPACE/2 - OFFSET_Y, MAX_SPACE/2)
    direccional.castShadow = true
    direccional.shadow.camera.left = -MAX_SPACE/1.5
    direccional.shadow.camera.right = MAX_SPACE/1.5
    direccional.shadow.camera.top = MAX_SPACE/1.5
    direccional.shadow.camera.bottom = -MAX_SPACE/1.5
    scene.add(direccional)
    auxPhysical.add(new THREE.CameraHelper(direccional.shadow.camera))
    
    // Luces: focal
    focal = new THREE.SpotLight(0xFFFFFF, 0.5)
    focal.position.set(-MAX_SPACE/2, MAX_SPACE/2, MAX_SPACE/2)
    focal.target.position.set(0,0,0)
    focal.angle = Math.PI
    focal.penumbra = 0.3
    focal.castShadow = true
    focal.shadow.camera.far = MAX_SPACE*2
    focal.shadow.camera.fov = 80
    scene.add(focal)
    auxPhysical.add(new THREE.CameraHelper(focal.shadow.camera))

    // * hay además una luz puntual en el cencerro; se instancia en allModelsLoaded() *

    // Materiales 
    const texSuelo = new THREE.TextureLoader().load('images/ground.jpg')
    texSuelo.repeat.set(5,5)
    texSuelo.wrapS= texSuelo.wrapT = THREE.RepeatWrapping

    materialAmarillo = new THREE.MeshLambertMaterial({wireframe: true, color:'yellow'})
    materialBlanco = new THREE.MeshLambertMaterial({wireframe: true, color:'white'})
    const matSuelo = new THREE.MeshStandardMaterial({color:'white',map:texSuelo})

    // Suelo
    const suelo = new THREE.Mesh( new THREE.PlaneGeometry(MAX_SPACE, MAX_SPACE, 100, 100), matSuelo )
    suelo.rotation.x = -Math.PI/2
    suelo.receiveShadow = true

    // Habitación
    let path = './images/Nalovardo/'
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                  map: new THREE.TextureLoader().load(path+'posx.jpg')}) )
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                  map: new THREE.TextureLoader().load(path+'negx.jpg')}) )
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                  map: new THREE.TextureLoader().load(path+'posy.jpg')}) )
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                  map: new THREE.TextureLoader().load(path+'negy.jpg')}) )
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                  map: new THREE.TextureLoader().load(path+'posz.jpg')}) )
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                  map: new THREE.TextureLoader().load(path+'negz.jpg')}) )
    const habitacion = new THREE.Mesh(new THREE.BoxGeometry(MAX_SPACE, MAX_SPACE, MAX_SPACE), paredes)
    habitacion.position.y += OFFSET_Y
    
    // Modelos (y escena)
    loadModels() // Cuando los carga todos llama a su vez a ===>>> allModelsLoaded()

    // Cajas vaca (wireframe helpers de físicas)
    boxMesh = new THREE.Mesh(new THREE.BoxGeometry(SIZE_VACA_X,SIZE_VACA_Y,SIZE_VACA_Z), materialBlanco)
    auxPhysical.add(boxMesh)
    cabezaMesh = new THREE.Mesh(new THREE.BoxGeometry(SIZE_VACA_X,SIZE_VACA_Y,SIZE_VACA_Z*2), materialAmarillo)
    auxPhysical.add(cabezaMesh)

    //---------------------------------------------------

    // GRAFO DE ESCENA
    scene.add(visual)
    visual.add(suelo)
    visual.add(habitacion)
    visual.add(vaca3D)
    visual.add(paisaje3D)
    paisaje3D.add(dulces3D)
    paisaje3D.add(flores3D)
    paisaje3D.add(arboles3D)
    paisaje3D.add(farolas3D)
    paisaje3D.add(piedras3D)
    auxPhysical.add( new THREE.AxesHelper(50) )

    scene.add(auxPhysical)
    auxPhysical.visible = false     // Se puede cambiar desde el menú 
}

/**
 * Callback llamado cuando se cargan todos los modelos importados:
 *  - Coloca los modelos en la escena
 *  - Establece el tween de los dulces
 *  - Coloca la luz puntual en el cencerro
 */
function allModelsLoaded()
{
    // Farolas -> Eliminadas porque mermaban mucho el rendimiento

    // putFarola(MAX_SPACE*0.4,MAX_SPACE*0.4)
    // putFarola(MAX_SPACE*0.4,-MAX_SPACE*0.4)
    // putFarola(-MAX_SPACE*0.4,MAX_SPACE*0.4)
    // putFarola(-MAX_SPACE*0.4,-MAX_SPACE*0.4)

    // Repartimos el espacio en cuadrículas 
    // Cada cuadrícula tendrá un par de objetos aleatorios
    for (let x = -(MAX_SPACE/2/SIZE_QUAD-1); x < MAX_SPACE/2/SIZE_QUAD; x++)
    {
        for (let z = -(MAX_SPACE/2/SIZE_QUAD-1); z < MAX_SPACE/2/SIZE_QUAD; z++)
        {
            if (x == 0 && z == 0) continue // En el central solo estará la vaca

            putObjectsInQuad(x*SIZE_QUAD, z*SIZE_QUAD)
        }
    }

    // Animar los dulces (yoyo, efecto levitar)
    dulces.forEach(p => 
    {
        new TWEEN.Tween( p[1].position )
        .to( {y:ALTURA_DULCE-0.3}, 1000)
        .repeat(Infinity)
        .yoyo(true)
        .easing(TWEEN.Easing.Sinusoidal.InOut)
        .start()
    })

    // Luz puntual en el cencerro 
    luzCencerro = new THREE.PointLight('white', 0.2, 3)
    // luzCencerro.castShadow = true    // Me parece que queda mejor si ésta no las genera (y mayor rendimiento)
    luzCencerro.position.set(0, SIZE_VACA_Y*0.4, SIZE_VACA_Z*1,1)
    vaca3D.add(luzCencerro)
    const pointLightHelper = new THREE.PointLightHelper(luzCencerro, 0.25, 'red')
    auxPhysical.add( pointLightHelper )
}

/**
 * Repartimos el espacio en cuadrículas de SIZE_QUAD * SIZE_QUAD
 * Cada cuadrícula tendrá un par de objetos aleatorios
 * @param {number} x Posición x del quad 
 * @param {number} z Posición z del quad 
 */
function putObjectsInQuad(x,z)
{
    let rdm = Math.random()
    if      (rdm < 0.4) putArbol(x,z)
    else if (rdm < 0.7) putPiedra(x,z)
    else                putDulce(x,z)

    // Flor aleatoria
    rdm = Math.random()
    if (rdm < 0.5) putFlor(x,z)
}

/**
 * Coloca un dulce en una posición pseudo-aleatoria 
 *  dentro del quad definido por (x,z)
 * @param {number} x Posición x del quad 
 * @param {number} z Posición z del quad 
 */
function putDulce(x,z)
{
    // Posición pseudo-aleatoria dentro del quad 
    let pos = getNewPosition(-(SIZE_QUAD/2-1), SIZE_QUAD/2-1, x, z)

    // Mesh físico-visual
    let dulceGeo = new THREE.CylinderGeometry(0.7,0.7,0.4,10)  
    let dulceMesh = new THREE.Mesh(dulceGeo, materialBlanco)
    auxPhysical.add(dulceMesh)

    // Modelo
    let dulce = dulce3D.clone()
    dulces3D.add(dulce)

    // Físicas
    let dulceBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Cylinder(0.7,0.7,0.4,10),
        position: new CANNON.Vec3(pos[0], ALTURA_DULCE, pos[1])
    })
    dulceBody.name = 'dulce'
    dulceBody.collisionResponse = false // El dulce NO debe ser un objeto sólido que oponga resistencia
    world.addBody(dulceBody)

    // Almacenamos en global
    dulces.push([dulce,dulceBody,dulceMesh])
}

/**
 * Coloca una piedra en una posición pseudo-aleatoria 
 *  dentro del quad definido por (x,z)
 * @param {number} x Posición x del quad 
 * @param {number} z Posición z del quad 
 */
function putPiedra(x,z)
{
    // Posición pseudo-aleatoria dentro del quad 
    let pos = getNewPosition(-(SIZE_QUAD/2-1), SIZE_QUAD/2-1, x, z)

    // Mesh físico-visual
    let piedraGeo = new THREE.SphereGeometry(RADIO_PIEDRA,5,5)
    let piedraMesh = new THREE.Mesh(piedraGeo, materialBlanco)
    auxPhysical.add(piedraMesh)

    // Modelo
    let piedra = piedra3D.clone()
    piedras3D.add(piedra)

    // Físicas
    let piedraBody = new CANNON.Body({
        mass:10,
        shape: new CANNON.Sphere(RADIO_PIEDRA),
        position: new CANNON.Vec3(pos[0], ALTURA_ARBOL/2, pos[1])
    })
    piedraBody.name = 'piedra'
    world.addBody(piedraBody)

    // Almacenamos en global
    piedras.push([piedra,piedraBody,piedraMesh])
}

/**
 * Coloca un árbol en una posición pseudo-aleatoria 
 *  dentro del quad definido por (x,z)
 * @param {number} x Posición x del quad 
 * @param {number} z Posición z del quad 
 */
function putArbol(x,z)
{
    // Posición pseudo-aleatoria dentro del quad 
    let pos = getNewPosition(-(SIZE_QUAD/2-1), SIZE_QUAD/2-1, x, z)

    // Mesh físico-visual
    let arbolGeo = new THREE.CylinderGeometry(0.3,0.3,ALTURA_ARBOL,10)  
    let arbolMesh = new THREE.Mesh(arbolGeo, materialBlanco)
    auxPhysical.add(arbolMesh)

    // Modelo
    let arbol = arbol3D.clone()
    arboles3D.add(arbol)

    // Físicas
    let arbolBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Cylinder(0.3,0.3,ALTURA_ARBOL,10),
        position: new CANNON.Vec3(pos[0], ALTURA_ARBOL/2, pos[1])
    })
    arbolBody.name = 'arbol'
    world.addBody(arbolBody)

    // Almacenamos en global
    arboles.push([arbol,arbolBody,arbolMesh])
}

/**
 * Coloca una farola (con luz real) en la posición exacta dada por (x,z) 
 * @param {number} x Posición x de la farola 
 * @param {number} z Posición z de la farola 
 */
function putFarola(x,z)
{
    let pos = [x,z]         // Simplemente por homogeneizar sintaxis
    positions.push(pos)     // Guardamos la pos manualmente (getNewPosition() ya lo hacía en los otros casos)
    
    // Mesh físico-visual
    let anchoFarola = 0.5
    let farolaGeo = new THREE.BoxGeometry(anchoFarola,ALTURA_FAROLA,anchoFarola)  
    let farolaMesh = new THREE.Mesh(farolaGeo, materialBlanco)
    auxPhysical.add(farolaMesh)

    // Modelo
    let farola = farola3D.clone()
    farolas3D.add(farola)

    // Físicas
    let farolaBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(anchoFarola/2,ALTURA_FAROLA/2,anchoFarola/2)),
        position: new CANNON.Vec3(pos[0], ALTURA_FAROLA/2, pos[1])
    })
    farolaBody.name = 'farola'
    world.addBody(farolaBody)

    // Luz puntual
    let light = new THREE.PointLight( 0xffee80, 1)
    light.castShadow = true
    light.position.set(farolaBody.position.x,0.65*ALTURA_FAROLA,farolaBody.position.z)
    farolas3D.add( light )
    const pointLightHelper = new THREE.PointLightHelper( light, 0.25, 'red' )
    auxPhysical.add( pointLightHelper )

    // Almacenamos en global (véase que ésta tiene len=4, también contiene la luz)
    farolas.push([farola,farolaBody,farolaMesh,light])
}

/**
 * Coloca una flor/planta en una posición pseudo-aleatoria 
 *  dentro del quad definido por (x,z)
 * Véase que las flores/plantas no tienen físicas y se pueden atravesar
 * @param {number} x Posición x del quad 
 * @param {number} z Posición z del quad 
 */
function putFlor(x,z)
{
    // Tipo de flor/planta aleatorio
    let rdm = Math.random()

    let flor 
    if      (rdm < 0.25) flor = planta3D.clone()
    else if (rdm < 0.50) flor = narciso3D.clone()
    else if (rdm < 0.75) flor = tulipan3D.clone()
    else                 flor = anemona3D.clone()

    // Posición pseudo-aleatoria dentro del quad 
    let pos = getNewPosition(-(SIZE_QUAD/2-1), SIZE_QUAD/2-1, x, z)

    // Colocamos la flor/planta
    flor.position.x = pos[0]
    flor.position.z = pos[1]
    flores3D.add(flor)
}

/**
 * Genera una posición pseudo-aleatoria dentro de un quad tal que
 *  no colisiona con elementos ya colocados en el mapa
 * @param {number} min Valor mínimo (relativo) de la posición
 * @param {number} max Valor máximo (relativo) de la posición
 * @param {number} x Posición x del quad 
 * @param {number} z Posición z del quad 
 * @returns [resX, resZ] Array con las posiciones nuevas
 */
function getNewPosition(min,max,x,z)
{
    // Generamos las posiciones
    let resX = getRandomIntInclusive(min,max) + x 
    let resZ = getRandomIntInclusive(min,max) + z 

    // Regeneramos hasta evitar colisión
    let collision = positions.findIndex(a => a[0] == resX && a[1] == resZ)
    while (collision != -1)
    {
        resX = getRandomIntInclusive(min,max) + x 
        resZ = getRandomIntInclusive(min,max) + z 
        collision = positions.findIndex(a => a[0] == resX && a[1] == resZ)
    }

    // Almacenamos las posiciones
    positions.push([resX, resZ])

    return [resX, resZ]
}

////////////////////////////////////////////////////

/**
 * Configura la GUI desplegable de la derecha
 * Esta GUI permite modificar la escena:
 *  - Activar/desactivar la niebla
 *  - Activar/desactivar el modo noche
 *  - Activar/desactivar la visualización de los helpers y físicas
 */
function setupGUI()
{
	// Definición de los controles
	menuGUI = {
		niebla : true,
        noche : false,
        showHelpersFisica : false
	}

	// Creación de la interfaz (la colocamos por debajo de la barra de puntos, vida, etc.)
	const gui = new GUI({title:''})
    gui.domElement.style.cssText = 'position:absolute;top:28px;right:0px;'; 

	// Construcción del menú
	const h = gui.addFolder('Ambiente')
	h.add(menuGUI, 'niebla').name('Niebla')
	h.add(menuGUI, 'noche').name('Paisaje nocturno').onChange( noche => 
        {
            /* 
             * El modo noche baja la intensidad de la focal y direccional, 
             *  aumenta la intensidad de la puntual (cencerro) y 
             *  cambia el color de fondo de las paredes para que simule 
             *  que el cielo se torna más oscuro 
             */
            focal.intensity = noche ? 0.2 : 0.5
            direccional.intensity = noche ? 0.5 : 1
            luzCencerro.intensity = noche ? 1 : 0.2
            paredes.forEach( p => p.color.set(noche ? 0x4d4dae : 0xffffff) )
        }
    )
	h.add(menuGUI, 'showHelpersFisica').name('Mostrar físicas').onChange( bool => auxPhysical.visible = bool )
}

/**
 * Isotropía frente a redimensión del canvas
 */
function updateAspectRatio()
{
    // Cambia las dimensiones del canvas
    renderer.setSize(window.innerWidth, window.innerHeight)

    // Nuevo relacion aspecto de la camara
    const ar = window.innerWidth / window.innerHeight

    // Camara perspectiva
    camera.aspect = ar
    camera.updateProjectionMatrix()
}

/**
 * Actualización de la escena
 */
function update()
{
    const delta = reloj.getDelta()	// Tiempo en segundos que ha pasado
	world.fixedStep()				// Recalcula el mundo a periodo fijo (60Hz)

    // Actualiza el monitor 
	stats.update()

    // Actualiza la interpolación
    TWEEN.update()

    //-----------------------------------------
    // Sincronización visual-física:

    // Vaca
    // modelo 
    vaca3D.position.copy(boxBody.position)
    vaca3D.quaternion.copy(boxBody.quaternion)
    // wireframes
    boxMesh.position.copy(boxBody.position)
    boxMesh.quaternion.copy(boxBody.quaternion)
    cabezaMesh.position.copy(cabezaBody.position)
    cabezaMesh.quaternion.copy(cabezaBody.quaternion)

    // Farolas
    for (let i = 0; i < farolas.length; i++)
    {
        // modelo
        farolas[i][0].position.copy(farolas[i][1].position)
        farolas[i][0].quaternion.copy(farolas[i][1].quaternion)

        // wireframes
        farolas[i][2].position.copy(farolas[i][1].position)
        farolas[i][2].quaternion.copy(farolas[i][1].quaternion)
    }

    // Árboles
    for (let i = 0; i < arboles.length; i++)
    {
        // modelo
        arboles[i][0].position.copy(arboles[i][1].position)
        arboles[i][0].quaternion.copy(arboles[i][1].quaternion)

        // wireframes
        arboles[i][2].position.copy(arboles[i][1].position)
        arboles[i][2].quaternion.copy(arboles[i][1].quaternion)
    }

    // Piedras
    for (let i = 0; i < piedras.length; i++)
    {
        // modelo
        piedras[i][0].position.copy(piedras[i][1].position)
        piedras[i][0].quaternion.copy(piedras[i][1].quaternion)

        // wireframes
        piedras[i][2].position.copy(piedras[i][1].position)
        piedras[i][2].quaternion.copy(piedras[i][1].quaternion)
    }

    // Dulces
    for (let i = 0; i < dulces.length; i++)
    {
        // modelo
        dulces[i][0].position.copy(dulces[i][1].position)
        dulces[i][0].quaternion.copy(dulces[i][1].quaternion)

        // wireframes
        dulces[i][2].position.copy(dulces[i][1].position)
        dulces[i][2].quaternion.copy(dulces[i][1].quaternion)
    }

    //-----------------------------------------
    // Animación de la vaca

    if (mixer) // Si está definido <=> si ya ha cargado el modelo 
    {
        if (lastState != moviendose & !finPartida) 
        {
            const toPlay = moviendose ? actionWalk : actionIdle
            const current = moviendose ? actionIdle : actionWalk
            
            actionDance.fadeOut(FADE_DURATION) // El baile se apaga siempre
            current.fadeOut(FADE_DURATION)
            toPlay.reset().fadeIn(FADE_DURATION).play()

            lastState = moviendose
        }

        mixer.update(delta)
    }

    //-----------------------------------------
    // Desplazamiento de la vaca (y cámara)

    if (moviendose) 
    {
        // Calcular hacia la dirección de la cámara
        var angleYCameraDirection = Math.atan2(
            (camera.position.x - boxBody.position.x), 
            (camera.position.z - boxBody.position.z))

        // Offset del ángulo de movimiento diagonal
        let offset = directionOffset(keysPressed)

        // Rotamos el modelo
        rotateQuarternion.setFromAxisAngle(rotateAngle, angleYCameraDirection + offset)
        vaca3D.quaternion.rotateTowards(rotateQuarternion, 0.2)
        boxBody.quaternion.copy(vaca3D.quaternion)

        // Calculamos la dirección
        camera.getWorldDirection(walkDirection)
        walkDirection.y = 0
        walkDirection.normalize()
        walkDirection.applyAxisAngle(rotateAngle, offset)

        // Movemos el modelo y la física
        const moveX = walkDirection.x * VELOCIDAD_VACA * delta
        const moveZ = walkDirection.z * VELOCIDAD_VACA * delta
        vaca3D.position.x -= moveX
        vaca3D.position.z -= moveZ
        boxBody.position.x -= moveX
        boxBody.position.z -= moveZ

        // Movemos la cámara perspectiva
        camera.position.x -= moveX
        camera.position.z -= moveZ

        // Actualizamos el target de la cámara
        cameraTarget.x = vaca3D.position.x
        cameraTarget.y = vaca3D.position.y + 1
        cameraTarget.z = vaca3D.position.z
        cameraControls.target = cameraTarget

    }

    //-----------------------------------------
    // Mueve el dulce si se lo come (en vez de borrarlo y crear uno nuevo)

    if (toMove)
    {
        let pos = getNewPosition(-MAX_SPACE/2.1, MAX_SPACE/2.1, 0, 0)

        toMove[0].position.set(pos[0],ALTURA_DULCE,pos[1]) // Modelo
        toMove[1].position.set(pos[0],ALTURA_DULCE,pos[1]) // Body físico
        toMove[2].position.set(pos[0],ALTURA_DULCE,pos[1]) // Mesh

        toMove = undefined
    }

    //-----------------------------------------
    // Evitamos que la vaca vuelque

    if (boxBody.position.y > 0.5) boxBody.position.y = 0.49999
    if (boxBody.position.y < 0.49) boxBody.position.y = 0.49999
    if (boxBody.quaternion.x > 0.001 || boxBody.quaternion.x < -0.001)
        boxBody.quaternion.x = 0
    if (boxBody.quaternion.z > 0.001 || boxBody.quaternion.z < -0.001)
        boxBody.quaternion.z = 0

    //-----------------------------------------
    // La cámara cenital siempre sigue a la vaca
    // No puedo hacer esto con la perspectiva porque rompería OrbitControls

    cenital.position.x = boxBody.position.x
    cenital.position.z = boxBody.position.z
}

/**
 * Renderización de la escena
 */
function render()
{
    requestAnimationFrame(render)
    update()

    renderer.clear()

    /* 
     * La miniatura cenital esta superpuesta a la vista 
     * general en el ángulo superior izquierdo, cuadrada, 
     * de 1/4 de la dimensión menor de la vista general 
     */
    let ladoMiniatura
    if (window.innerWidth < window.innerHeight)
        ladoMiniatura = window.innerWidth / 4
    else 
        ladoMiniatura = window.innerHeight / 4
    
    // NOTA: El S.R. del viewport es left-bottom con X right y Y up
    
    //-----------------------------------------
    // Niebla y renderizado
    // Se activa aquí para que se vea en la cámara perspectiva 
    //   pero no en la vista cenital (ya que se vería todo blanco)

    // A cero para que se vea bien la escena
    scene.fog = new THREE.FogExp2(menuGUI.noche ? 0x4d4dae : 'white', 0) 

    // Renderizamos la cenital 
    renderer.setViewport(0, window.innerHeight-ladoMiniatura+1, ladoMiniatura, ladoMiniatura)
    renderer.render(scene, cenital)

    // Activamos niebla (solo si está activa en menuGUI)
    scene.fog = new THREE.FogExp2(menuGUI.noche ? 0x4d4dae : 'white', menuGUI.niebla ? 0.1 : 0)

    // Renderizamos la perspectiva
    renderer.setViewport(0,0,window.innerWidth,window.innerHeight)
    renderer.render(scene, camera)
}

////////////////////////////////////////////////////
// Lógica básica del juego

/**
 * Inicializa el juego y activa la cuenta atrás
 */
function startGame() 
{
    puntos = 0
    vida = MAX_VIDA
    timeleft = MAX_TIME
    finPartida = false
    updateHTMLstats()

    // Pone a la vaca en modo Idle
    actionDance.fadeOut(FADE_DURATION)
    actionIdle.reset().fadeIn(FADE_DURATION).play()

    // Quita los menús HTML
    document.getElementById('menu').style.cssText += 'display: none;'
    document.getElementById('pantallaFin').style.cssText += 'display: none;'

    // Activa la cuenta atrás
    cuentaAtras = setInterval( () => 
    {
        if (--timeleft <= 0) endGame()
        updateHTMLstats()
    }, 
    1000) // Cada segundo
}

/**
 * Finaliza el juego
 */
function endGame() 
{
    // Apaga el interval
    clearInterval(cuentaAtras)

    // Almacena los puntos
    addRecord(puntos)

    // Configura el cartel de fin
    document.getElementById('finText').innerHTML =  `¡Fin de la partida!<br>
Has conseguido recoger <b>${puntos}</b> dulce${puntos == 1 ? '' : 's'}<br>
Bien jugado pero, ¿crees que puedes hacerlo mejor?<br>`

    // Resetea los stats (por si acaso)
    puntos = 0
    vida = MAX_VIDA
    timeleft = MAX_TIME
    updateHTMLstats()

    // Al finalizar la vaca baila
    finPartida = true
    actionIdle.fadeOut(FADE_DURATION)
    actionWalk.fadeOut(FADE_DURATION)
    actionDance.reset().fadeIn(FADE_DURATION).play()
    
    // Muestra el cartel de fin
    document.getElementById('pantallaFin').style.display = ''
}

////////////////////////////////////////////////////
// Otros métodos 

/**
 * Actualiza la barra superior de estadísticas sobre el juego
 */
function updateHTMLstats()
{
    if (!finPartida) // Si se ha acabado, no actualizamos nada => no se juega
    {
        document.getElementById('stats').innerHTML = '<b> Puntos: ' + puntos + ' <b>'
        document.getElementById('healthBar').value = vida
        document.getElementById('progressBar').value = timeleft
        document.getElementById('vida').innerHTML = '<b> Vida: ' + vida + ' <b>'
        document.getElementById('time').innerHTML = '<b> Tiempo restante: ' + timeleft + ' s <b>'
    }
}

/**
 * Configura la miniatura (cámara cenital)
 */
function setMiniatura()
{
    cenital = new THREE.OrthographicCamera(-ANCHO_CENITAL,ANCHO_CENITAL,ANCHO_CENITAL,-ANCHO_CENITAL,-10,300)

    cenital.position.set(0,20,0)
    cenital.lookAt(0,0,0)
    cenital.up = new THREE.Vector3(0,0,-1)

    const helper = new THREE.CameraHelper(cenital)
    auxPhysical.add(helper)
}

/**
 * Configura los listeners del juego
 * Incluye los botones HTML
 */
function setupListeners()
{
    // Doble click => Raycaster => Vaca bailar
    renderer.domElement.addEventListener('dblclick', (event) => animate(event) )

    // Tecla pulsada
    document.addEventListener('keydown', (event) => 
    {
        moviendose = true
        keysPressed[event.key.toLowerCase()] = true
    })

    // Tecla levantada
    document.addEventListener('keyup', (event) => 
    {
        moviendose = false
        keysPressed[event.key.toLowerCase()] = false
    })

    // Pulsan en el botón Créditos
    document.getElementById('credits').addEventListener('click', () => 
    {
        let msg = `Autor: Mario Andreu Villar
Licencia: (CC BY-NC-SA 4.0) https://creativecommons.org/licenses/by-nc-sa/4.0/

Licencias de modelos, texturas y otros:
(Sin modificación respecto al original salvo que se indique lo contrario)
- Dancing Cow: By AIUM2 https://skfb.ly/otQGG (CC BY 4.0)
- Pancake: By soidev https://skfb.ly/VYys (CC BY 4.0)
- Natural Stone: By aurelkillers1 https://skfb.ly/oyLEn (CC BY 4.0)
- Spruce Tree - Low Poly: By Alan Zimmerman https://skfb.ly/Yxqv (CC BY 4.0)
- Generic tulip flower: By assetfactory https://skfb.ly/owpvW (CC BY 4.0)
- Generic narcissus flower: By assetfactory https://skfb.ly/owvHL (CC BY 4.0)
- Anemone flower low poly: By assetfactory https://skfb.ly/owzOq (CC BY 4.0)
- Underwater plant pack: (Modificado el color de una de las plantas) By assetfactory https://skfb.ly/o9zMD (CC BY 4.0) 
- Old Japanese Lamp: By MarcHoogkamp https://skfb.ly/TKON (CC BY 4.0)
- Lava (piedras): By Alexandre E. 2018 https://www.flickr.com/photos/pmeimon/30529221317 (CC BY-NC-SA 2.0)
- Suelo: Pond Side Grassy and Muddy Land https://www.texturecan.com/details/258/ (CC0 1.0)
- Paisaje caja (Nalovardo): http://www.humus.name/index.php?page=Textures&ID=59 (CC BY 3.0)
- Parte de la lógica del movimiento (cálculo del offset y demás) del personaje parte de https://www.youtube.com/watch?v=C3s0UHpwlf8 y https://github.com/tamani-coding/threejs-character-controls-example de tamani-coding (MIT License). Este código ha sido posteriormente modificado y adaptado para este trabajo.
`
        alert(msg)
    })

    // Pulsan en el botón Cómo jugar
    document.getElementById('howToPlay').addEventListener('click', () => 
    {
        let msg = `  Cómo jugar - Instrucciones
------------------------------
¡Eres una vaca hambrienta y tienes que comer tantos dulces como puedas!

Puedes controlar a la vaca de dos formas distintas:
  - Opción A: Mantén pulsada la barra espaciadora para que la vaca se mueva hacia delante y utiliza el ratón para mover la cámara y dirigirla. 
  - Opción B: Utiliza las flechas del teclado para desplazar a la vaca. También puedes utilizar el ratón para observar la escena. 

Dispones de ${MAX_TIME} segundos para recoger los dulces.

Inicialmente tienes ${MAX_VIDA} puntos de vida, pero cuidado:
  - Las piedras volcánicas que hay en el suelo restan 2 puntos de vida, ¡no las toques!
  - Chocarte contra un árbol (el tronco no se puede atravesar) resta 1 punto de vida.

Desde el desplegable puedes personalizar el escenario a tu gusto. 
Finalmente, un truco: haz doble clic a la vaca para hacerla bailar. Pulsa cualquier tecla para que vuelva a su estado normal.`
        alert(msg)
    })

    // Pulsan en el botón Récords
    document.getElementById('records').addEventListener('click', () => 
    {
        let msg = ' Records - Top 3    (Se resetean al recargar la página)\n------------------------------------------------------\n'

        for (let i = 0; i < recordsPoints.length; i++) {
            msg += ` Puntos: ${recordsPoints[i]}     Fecha: ${recordsDates[i]}\n`
        }

        alert(msg)
    })

    // Pulsan en el botón Empezar partida
    document.getElementById('start').addEventListener('click', () => startGame() )

    // Pulsan en el botón Volver a jugar
    document.getElementById('restart').addEventListener('click', () => startGame() )
    
    // Pulsan en el botón Menú principal
    document.getElementById('returnToMenu').addEventListener('click', () =>
    {
        document.getElementById('pantallaFin').style.cssText += 'display: none;'
        document.getElementById('menu').style.display = ''
    })
}

/**
 * Realiza un trazado de rayos ante un doble click
 * Si se seleccionó la vaca, ésta se pone a bailar
 * @param {*} event El evento del doble click
 */
function animate(event)
{
    // Capturar y normalizar
    let x = event.clientX
    let y = event.clientY
    x = ( x / window.innerWidth ) * 2 - 1
    y = -( y / window.innerHeight ) * 2 + 1

    // Construir el rayo y detectar la intersección
    const rayo = new THREE.Raycaster()
    rayo.setFromCamera(new THREE.Vector2(x,y), camera)
    let intersecciones = rayo.intersectObjects(vaca3D.children, true)

    // Si se pulsó la vaca, hacer que baile
    if( intersecciones.length > 0 )
    {
        actionIdle.fadeOut(FADE_DURATION)
        actionWalk.fadeOut(FADE_DURATION)
        actionDance.reset().fadeIn(FADE_DURATION).play()
    }
}

/**
 * Calcula el offset del ángulo de movimiento diagonal
 * @param {*} keysPressed Las teclas pulsadas en un diccionario: (clave:str) tecla -> (valor:bool) pulsada?
 * @returns directionOffset
 */
function directionOffset(keysPressed) 
{
    let directionOffset = 0

    if (keysPressed['arrowdown']) 
    {
        if      (keysPressed['arrowright']) directionOffset =   Math.PI / 4
        else if (keysPressed['arrowleft'] ) directionOffset = - Math.PI / 4
    } 
    else if (keysPressed['arrowup'] || keysPressed[' ']) // ' ' es la barra espaciadora 
    {
        if      (keysPressed['arrowright']) directionOffset =  Math.PI / 4 + Math.PI / 2
        else if (keysPressed['arrowleft'] ) directionOffset = -Math.PI / 4 - Math.PI / 2
        else                                directionOffset =  Math.PI
    } 
    else if (keysPressed['arrowright']) 
    {
        directionOffset = Math.PI / 2
    } 
    else if (keysPressed['arrowleft']) 
    {
        directionOffset = - Math.PI / 2
    }

    return directionOffset
}

/**
 * Carga y configura todos los modelos 
 * 
 * Importante: las callbacks se encadenan para simular un 
 *   comportamiento síncrono en lugar de asíncrono y tener 
 *   la certeza de llamar a allModelsLoaded() SOLO cuando 
 *   realmente se han cargado todos.
 */
function loadModels()
{
    // Textura de lava para las piedras
    const texlava = new THREE.TextureLoader().load('images/lava.jpeg')
    texlava.repeat.set(5,5)
    texlava.wrapS= texlava.wrapT = THREE.RepeatWrapping

    // Modelos importados: encadenamiento de callbacks
    const glloader = new GLTFLoader()

    // VACA
    glloader.load('models/cow.glb', (obj) =>  
    {
        vaca3D.add(obj.scene)
        obj.scene.scale.set(0.75,0.75,0.75)
        obj.scene.position.y = -SIZE_VACA_Y/2
        vaca3D.name = 'vaca'
        obj.scene.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})
        actions = obj.animations  // 0 idle, 1 baile, 2 andar
        mixer = new THREE.AnimationMixer(vaca3D)
        actionIdle = mixer.clipAction(actions[0]) 
        actionDance = mixer.clipAction(actions[1]) 
        actionWalk = mixer.clipAction(actions[2]) 
        actionIdle.play()

        // ÁRBOL
        glloader.load('models/tree.glb', (obj) =>
        {
            arbol3D.add(obj.scene)
            obj.scene.scale.set(0.005,0.005,0.005)
            obj.scene.position.y -= ALTURA_ARBOL/2
            arbol3D.name = 'arbol'
            arbol3D.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})
        
            // PLANTAS
            glloader.load('models/plants.glb', (obj) =>
            {
                planta3D.add(obj.scene)
                obj.scene.children[0].children[0].children[0].children[2].children[0].material.color.set(0x234f1e) // De blanco => a verde
                obj.scene.scale.set(0.09,0.09,0.09)
                planta3D.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})

                // ANÉMONA
                glloader.load('models/anemone.glb', (obj) =>
                {
                    anemona3D.add(obj.scene)
                    obj.scene.scale.set(0.05,0.05,0.05)
                    anemona3D.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})
                
                    // NARCISO
                    glloader.load('models/narcissus.glb', (obj) =>
                    {
                        narciso3D.add(obj.scene)
                        obj.scene.scale.set(0.05,0.05,0.05)
                        narciso3D.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})
                    
                        // TULIPÁN
                        glloader.load('models/tulip.glb', (obj) =>
                        {
                            tulipan3D.add(obj.scene)
                            obj.scene.scale.set(0.05,0.05,0.05)
                            tulipan3D.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})
                        
                            // FAROLA
                            glloader.load('models/lamp.glb', (obj) =>
                            {
                                farola3D.add(obj.scene)
                                obj.scene.scale.set(0.15,0.15,0.15)
                                obj.scene.position.y -= ALTURA_FAROLA/2
                                farola3D.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})
                            
                                // DULCE
                                glloader.load('models/pancake.glb', (obj) =>
                                {
                                    dulce3D.add(obj.scene)
                                    obj.scene.scale.set(0.01,0.01,0.01)
                                    obj.scene.position.y -= 0.25
                                    dulce3D.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})
                                
                                    // PIEDRA
                                    glloader.load('models/stone.glb', (obj) =>
                                    {
                                        piedra3D.add(obj.scene)
                                        obj.scene.scale.set(0.007,0.007,0.005)
                                        obj.scene.position.y -= RADIO_PIEDRA
                                        obj.scene.children[0].children[0].children[0].children[0].material.map = texlava
                                        piedra3D.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})
                                    
                                        allModelsLoaded()
                                    })
                                })
                            })
                        })
                    })
                })
            })
        })
    })  
}

/**
 * Guarda un nuevo récord (lo descarta si no supera al top 3)
 * @param {number} points Puntos del récord a almacenar
 */
function addRecord(points)
{
    // Lista circular de 3 récords, se borra el peor
    let min = Math.min.apply(null, recordsPoints)
    let pos = recordsPoints.indexOf(min)

    // Almacenamos récord y fecha
    if (points > min)
    {
        recordsPoints[pos] = points 
        recordsDates[pos] = new Date().toLocaleString()
    }
}

/**
 * Genera un número entero aleatorio inclusivo entre:
 * @param {number} min El valor mínimo
 * @param {number} max El valor máximo
 * @returns Un entero aleatorio entre estos valores
 */
function getRandomIntInclusive(min, max) 
{
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1) + min)
}  