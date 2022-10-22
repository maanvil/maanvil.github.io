/**
  Game.js - Trabajo final - GPC
  Realizado con Three.js_r140

  Mario Andreu Villar
  @author maanvil@inf.upv.es
  @date   Oct,2022
*/

// Modulos necesarios
import * as THREE from "../lib/three.module.js"
import {OrbitControls} from "../lib/OrbitControls.module.js"
import {GUI} from "../lib/lil-gui.module.min.js"
import Stats from "../lib/stats.module.js";
import {TWEEN} from "../lib/tween.module.min.js"
import * as CANNON from '../lib/cannon-es.js'; 
import {GLTFLoader} from "../lib/GLTFLoader.module.js";

// Globales convenidas por threejs
const renderer = new THREE.WebGLRenderer();
let camera;
const scene = new THREE.Scene();

// Globales de configuracion
const MAX_SPACE = 50
const SIZE_QUAD = 5
const OFFSET_Y = 10
const ALTURA_DULCE = 1.5
const MAX_VIDA = 10
const MAX_TIME = 30
const L = 5
const ALTURA_FAROLA = 1.9
const ALTURA_ARBOL = 3
const RADIO_PIEDRA = 0.4

// Globales del grafo de escena
let visual = new THREE.Object3D()
let auxPhysical = new THREE.Object3D()
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

// Otras globales
let keyboard
let menu
let cenital
let mixer, actionIdle, actionWalk, actionDance, actions
let sizeVacaX, sizeVacaY, sizeVacaZ
sizeVacaX = 0.5; sizeVacaY = 1; sizeVacaZ = 0.7
let keysPressed = {}
let downloadTimer
let materialBlanco
let materialAmarillo
let materialNormal
let direccional, focal

// Objetos
let positions = []
let piedras = []
let arboles = []
let dulces = []
let farolas = []
let boxMesh, boxBody, cabezaMesh, cabezaBody
let toMove
let lastColision
let timeleft = MAX_TIME
let puntos = 0
let vida = MAX_VIDA
let recordsPoints = new Array(3).fill(0)
let recordsDates = new Array(3).fill('-')

// Globales personaje
let moviendose = false
let lastState = false
let dobleClick = false

// temporary data
let walkDirection = new THREE.Vector3()
let rotateAngle = new THREE.Vector3(0, 1, 0)
let rotateQuarternion = new THREE.Quaternion()
let cameraTarget = new THREE.Vector3()

// constants
const fadeDuration = 0.2
const walkVelocity = 5

// Monitor de recursos
const stats = new Stats();
const reloj = new THREE.Clock();

// Mundo fisico
let world;

// Otras globales
let cameraControls, menuGUI

/*********************************************/
/*********************************************/
/*********************************************/

renderer.domElement.addEventListener( 'dblclick', () => endGame() )
document.getElementById("pantallaFin").style.cssText += 'display: none;'

// Acciones
init();
loadPhysicalWorld();
loadVisualWorld();
setupGUI();
render();

function init()
{
    // Instanciar el motor de render
    renderer.setSize(window.innerWidth,window.innerHeight);
    document.getElementById('container').appendChild( renderer.domElement );
    renderer.shadowMap.enabled = true;
    renderer.antialias = true;
    renderer.autoClear = false
    renderer.setClearColor(0xFFFFFF)

    //Lower resolution
    renderer.setPixelRatio( window.devicePixelRatio * 0.5 );

    // Reloj
    reloj.start();

    // Instanciar la camara perspectiva
    const ar = window.innerWidth / window.innerHeight
    camera = new THREE.PerspectiveCamera(75, ar, 0.1, 300)
    camera.position.set(0.5,2,5);
    camera.lookAt(0,1,0)

    // Controles raton
    cameraControls = new OrbitControls(camera, renderer.domElement)
    cameraControls.target.set(0,1,0)

    // Limitar el zoom
    cameraControls.maxDistance = 0.25*MAX_SPACE
    cameraControls.minDistance = 0.05*MAX_SPACE

    // Estadisticas rendimiento
    stats.showPanel(0);	// FPS inicialmente. Pulsar para cambiar panel.
    stats.domElement.style.cssText = 'position:absolute;bottom:0px;right:0px;';
    document.getElementById( 'container' ).appendChild( stats.domElement );

    // Mini-vista camara cenital
    setMiniatura()

    // Eventos
    window.addEventListener('resize', updateAspectRatio )
    setupListeners()
}

function loadPhysicalWorld()
{
    // Mundo 
    world = new CANNON.World(); 
    world.gravity.set(0,-9.8,0); 

    // Suelo
    const groundShape = new CANNON.Plane();
    const ground = new CANNON.Body({ mass: 0});
    ground.addShape(groundShape);
    ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    world.addBody(ground);

    // Paredes
    const backWall = new CANNON.Body( {mass:0} );
    backWall.addShape( new CANNON.Plane() );
    backWall.position.z = -MAX_SPACE/2;
    world.addBody( backWall );

    const frontWall = new CANNON.Body( {mass:0} );
    frontWall.addShape( new CANNON.Plane() );
    frontWall.quaternion.setFromEuler(0,Math.PI,0,'XYZ');
    frontWall.position.z = MAX_SPACE/2;
    world.addBody( frontWall );

    const leftWall = new CANNON.Body( {mass:0} );
    leftWall.addShape( new CANNON.Plane() );
    leftWall.position.x = -MAX_SPACE/2;
    leftWall.quaternion.setFromEuler(0,Math.PI/2,0,'XYZ');
    world.addBody( leftWall );

    const rightWall = new CANNON.Body( {mass:0} );
    rightWall.addShape( new CANNON.Plane() );
    rightWall.position.x = MAX_SPACE/2;
    rightWall.quaternion.setFromEuler(0,-Math.PI/2,0,'XYZ');
    world.addBody( rightWall );

    boxBody = new CANNON.Body({
        mass: 500,
        shape: new CANNON.Box(new CANNON.Vec3(sizeVacaX/2,sizeVacaY/2,sizeVacaZ/2)),
        position: new CANNON.Vec3(0,sizeVacaY/2,0)
    })
    boxBody.linearDamping = 0.99
    boxBody.angularDamping = 0.99

    cabezaBody = new CANNON.Body({
        mass: 0.1,
        shape : new CANNON.Box(new CANNON.Vec3(sizeVacaX/2,sizeVacaY/2,sizeVacaZ)),
        position: new CANNON.Vec3(0,sizeVacaY*2,sizeVacaZ/2)
    })
    world.addBody(boxBody)
    world.addBody(cabezaBody)

    const restriccion1 = new CANNON.PointToPointConstraint(boxBody,
        new CANNON.Vec3( 0, sizeVacaY/2, -sizeVacaZ/2),
        cabezaBody,
        new CANNON.Vec3( 0, -sizeVacaY/2, -sizeVacaZ) ); 
    const restriccion2 = new CANNON.PointToPointConstraint(boxBody,
        new CANNON.Vec3( 0, sizeVacaY/2, sizeVacaZ/2),
        cabezaBody,
        new CANNON.Vec3( 0, -sizeVacaY/2, 0) ); 
    world.addConstraint( restriccion1 );
    world.addConstraint( restriccion2 );

    boxBody.addEventListener('collide', (e) => 
    { 
        if (e.body.id != 0 && e.body.id != 6) 
        {
            console.log('collision with', e.body.id, e.body.name) 

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
            
            if (vida == 0) endGame()
        }
        lastColision = e.body.id
    })

    cabezaBody.addEventListener('collide', (e) => 
    { 
        if (e.body.id != 0 && e.body.id != 5) 
        {
            console.log('collision with', e.body.id, e.body.name) 

            if (e.body.name == 'dulce' && lastColision != e.body.id)
            {
                puntos++
                updateHTMLstats()
                toMove = dulces.find(x => x[1].id == e.body.id)
            }
        }
        lastColision = e.body.id
    })
}

function updateHTMLstats()
{
    document.getElementById('stats').innerHTML = '<b> Puntos: ' + puntos + ' <b>'
    document.getElementById("healthBar").value = vida
    document.getElementById("time").innerHTML = '<b> Tiempo restante: ' + timeleft + ' s <b>'
    document.getElementById("vida").innerHTML = '<b> Vida: ' + vida + ' <b>'
}

function loadVisualWorld()
{
    // Luces
    const ambiental = new THREE.AmbientLight(0x222222)
    scene.add(ambiental)

    direccional = new THREE.DirectionalLight(0xFFFFFF, 1)
    direccional.position.set(-MAX_SPACE/2, MAX_SPACE/2 - OFFSET_Y, MAX_SPACE/2)
    direccional.castShadow = true
    direccional.shadow.camera.left = -MAX_SPACE/1.5;
    direccional.shadow.camera.right = MAX_SPACE/1.5;
    direccional.shadow.camera.top = MAX_SPACE/1.5;
    direccional.shadow.camera.bottom = -MAX_SPACE/1.5;
    scene.add(direccional)
    auxPhysical.add(new THREE.CameraHelper(direccional.shadow.camera))
    
    focal = new THREE.SpotLight(0xFFFFFF, 0.5)
    focal.position.set(-MAX_SPACE/2, MAX_SPACE/2 - OFFSET_Y, MAX_SPACE/2)
    focal.target.position.set(0,0,0)
    focal.angle = Math.PI
    focal.penumbra = 0.3
    focal.castShadow = true
    focal.shadow.camera.far = MAX_SPACE*2
    focal.shadow.camera.fov = 80
    scene.add(focal)
    auxPhysical.add(new THREE.CameraHelper(focal.shadow.camera))

    // Materiales 
    const texsuelo = new THREE.TextureLoader().load('images/ground.jpg');
    texsuelo.repeat.set(5,5);
    texsuelo.wrapS= texsuelo.wrapT = THREE.RepeatWrapping;

    materialAmarillo = new THREE.MeshLambertMaterial({wireframe: true, color:'yellow'})
    materialBlanco = new THREE.MeshLambertMaterial({wireframe: true, color:'white'})
    materialNormal = new THREE.MeshNormalMaterial({wireframe: false, flatShading: true})
    const matsuelo = new THREE.MeshStandardMaterial({color:"white",map:texsuelo});

    // Suelo
    const suelo = new THREE.Mesh( new THREE.PlaneGeometry(MAX_SPACE,MAX_SPACE, 100,100), matsuelo );
    suelo.rotation.x = -Math.PI/2
    suelo.receiveShadow = true

    // Habitacion
    let path = "./images/Nalovardo/"
    const paredes = [];
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                  map: new THREE.TextureLoader().load(path+"posx.jpg")}) );
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                  map: new THREE.TextureLoader().load(path+"negx.jpg")}) );
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                  map: new THREE.TextureLoader().load(path+"posy.jpg")}) );
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                  map: new THREE.TextureLoader().load(path+"negy.jpg")}) );
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                  map: new THREE.TextureLoader().load(path+"posz.jpg")}) );
    paredes.push( new THREE.MeshBasicMaterial({side:THREE.BackSide,
                  map: new THREE.TextureLoader().load(path+"negz.jpg")}) );
    const habitacion = new THREE.Mesh( new THREE.BoxGeometry(MAX_SPACE,MAX_SPACE,MAX_SPACE),paredes);
    habitacion.position.y += OFFSET_Y
    
    // Modelos y escena
    loadModels() // Cuando los carga todos llama a su vez a allModelsLoaded()

    // Cajas vaca
    boxMesh = new THREE.Mesh(new THREE.BoxGeometry(sizeVacaX,sizeVacaY,sizeVacaZ),materialBlanco)
    auxPhysical.add(boxMesh)
    cabezaMesh = new THREE.Mesh(new THREE.BoxGeometry(sizeVacaX,sizeVacaY,sizeVacaZ*2),materialAmarillo)
    auxPhysical.add(cabezaMesh)


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
    auxPhysical.add( new THREE.AxesHelper(50) );
    scene.add(auxPhysical)
    auxPhysical.visible = false
}

function allModelsLoaded()
{
    // putFarola(MAX_SPACE*0.4,MAX_SPACE*0.4)
    // putFarola(MAX_SPACE*0.4,-MAX_SPACE*0.4)
    // putFarola(-MAX_SPACE*0.4,MAX_SPACE*0.4)
    // putFarola(-MAX_SPACE*0.4,-MAX_SPACE*0.4)

    // Repartimos el espacio en cuadriculas 
    // Cada cuadricula tendra un par de objetos aleatorios
    for(let x = -(MAX_SPACE/2/SIZE_QUAD-1); x < MAX_SPACE/2/SIZE_QUAD; x++)
    {
        for (let z = -(MAX_SPACE/2/SIZE_QUAD-1); z < MAX_SPACE/2/SIZE_QUAD; z++)
        {
            if (x == 0 && z == 0) continue // En el central solo estara la vaca
            putObjectsInQuad(x*SIZE_QUAD,z*SIZE_QUAD)
        }
    }

    dulces.forEach(p => 
    {
        new TWEEN.Tween( p[1].position )
        .to( {y:ALTURA_DULCE-0.3}, 1000)
        .repeat(Infinity)
        .yoyo(true)
        .easing(TWEEN.Easing.Sinusoidal.InOut)
        .start()
    })

    // Luz puntual
    let light = new THREE.PointLight( 'white', 1);
    // light.castShadow = true // queda mejor si esta no las genera (y mucho mejor rendimiento)

    light.position.set(0,sizeVacaY*0.4,sizeVacaZ*1,1);
    vaca3D.add( light );

    const pointLightHelper = new THREE.PointLightHelper( light, 0.25, 'red' );
    auxPhysical.add( pointLightHelper );
}

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

function putDulce(x,z)
{
    let pos = getNewPosition(-4,4,x,z)

    // Mesh fisico-visual
    let dulceGeo = new THREE.CylinderGeometry(0.7,0.7,0.4,10)  
    let dulceMesh = new THREE.Mesh(dulceGeo, materialBlanco)
    auxPhysical.add(dulceMesh)

    // Modelo
    let dulce = dulce3D.clone()
    dulces3D.add(dulce)

    // Fisica
    let dulceBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Cylinder(0.7,0.7,0.4,10),
        position: new CANNON.Vec3(pos[0], ALTURA_DULCE, pos[1])
    })
    dulceBody.name = 'dulce'
    dulceBody.collisionResponse = false
    world.addBody(dulceBody)

    dulces.push([dulce,dulceBody,dulceMesh])
}

function putPiedra(x,z)
{
    let pos = getNewPosition(-4,4,x,z)

    // Mesh fisico-visual
    let piedraGeo = new THREE.SphereGeometry(RADIO_PIEDRA,5,5)
    let piedraMesh = new THREE.Mesh(piedraGeo, materialBlanco)
    auxPhysical.add(piedraMesh)

    // Modelo
    let piedra = piedra3D.clone()
    piedras3D.add(piedra)

    // Fisica
    let piedraBody = new CANNON.Body({
        mass:10,
        shape: new CANNON.Sphere(RADIO_PIEDRA),
        position: new CANNON.Vec3(pos[0], ALTURA_ARBOL/2, pos[1])
    })
    piedraBody.name = 'piedra'
    world.addBody(piedraBody)

    piedras.push([piedra,piedraBody,piedraMesh])
}

function putArbol(x,z)
{
    let pos = getNewPosition(-4,4,x,z)

    // Mesh fisico-visual
    let arbolGeo = new THREE.CylinderGeometry(0.3,0.3,ALTURA_ARBOL,10)  
    let arbolMesh = new THREE.Mesh(arbolGeo, materialBlanco)
    auxPhysical.add(arbolMesh)

    // Modelo
    let arbol = arbol3D.clone()
    arboles3D.add(arbol)

    // Fisica
    let arbolBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Cylinder(0.3,0.3,ALTURA_ARBOL,10),
        position: new CANNON.Vec3(pos[0], ALTURA_ARBOL/2, pos[1])
    })
    arbolBody.name = 'arbol'
    world.addBody(arbolBody)

    arboles.push([arbol,arbolBody,arbolMesh])
}

function putFarola(x,z)
{
    let pos = [x,z]
    positions.push(pos)
    
    // Mesh fisico-visual
    let anchoFarola = 0.5
    let farolaGeo = new THREE.BoxGeometry(anchoFarola,ALTURA_FAROLA,anchoFarola)  
    let farolaMesh = new THREE.Mesh(farolaGeo, materialBlanco)
    auxPhysical.add(farolaMesh)

    // Modelo
    let farola = farola3D.clone()
    farolas3D.add(farola)

    // Fisica
    let farolaBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(anchoFarola/2,ALTURA_FAROLA/2,anchoFarola/2)),
        position: new CANNON.Vec3(pos[0], ALTURA_FAROLA/2, pos[1])
    })
    farolaBody.name = 'farola'
    world.addBody(farolaBody)

    // Luz puntual
    let light = new THREE.PointLight( 0xffee80, 1);
    light.castShadow = true

    farolas.push([farola,farolaBody,farolaMesh,light])

    light.position.set(farolaBody.position.x,0.65*ALTURA_FAROLA,farolaBody.position.z);
    farolas3D.add( light );

    const pointLightHelper = new THREE.PointLightHelper( light, 0.25, 'red' );
    auxPhysical.add( pointLightHelper );
}

function putFlor(x,z)
{
    // Flor aleatoria
    let rdm = Math.random()

    let flor 
    if      (rdm < 0.25) flor = planta3D.clone()
    else if (rdm < 0.50) flor = narciso3D.clone()
    else if (rdm < 0.75) flor = tulipan3D.clone()
    else                 flor = anemona3D.clone()

    let pos = getNewPosition(-4,4,x,z)
    flor.position.x = pos[0]
    flor.position.z = pos[1]
    flores3D.add(flor)
}

function getNewPosition(min,max,x,z)
{
    let resX = getRandomIntInclusive(min,max) + x 
    let resZ = getRandomIntInclusive(min,max) + z 
    let collision = positions.findIndex(a => a[0] == resX && a[1] == resZ)
    while (collision != -1)
    {
        resX = getRandomIntInclusive(min,max) + x 
        resZ = getRandomIntInclusive(min,max) + z 
        collision = positions.findIndex(a => a[0] == resX && a[1] == resZ)
    }
    positions.push([resX, resZ])
    return [resX, resZ]
}

function setupGUI()
{
	// Definicion de los controles
	menuGUI = {
		niebla : true,
        showHelpersFisica : false,
        noche : false
	}

	// Creacion interfaz
	const gui = new GUI({title:''});
    gui.domElement.style.cssText = 'position:absolute;top:28px;right:0px;';

	// Construccion del menu
	const h = gui.addFolder('Ambiente');
	h.add(menuGUI, 'niebla').name('Niebla')
	h.add(menuGUI, 'noche').name('Paisaje nocturno').onChange( noche => 
        {
            focal.intensity = noche ? 0.2 : 0.5 
            direccional.intensity = noche ? 0.5 : 1
        }
    )
	h.add(menuGUI, 'showHelpersFisica').name('Mostrar físicas').onChange( bool => auxPhysical.visible = bool )

}

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

function update()
{
    const delta = reloj.getDelta();	// tiempo en segundos que ha pasado por si hace falte
	world.fixedStep()					// recalcula el mundo a periodo fijo (60Hz)

    // Actualiza el monitor 
	stats.update();

    // Actualiza la interpolacion
    TWEEN.update()

    // Sincronizacion visual-fisico
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

    // Arboles
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

    if (mixer) 
    {
        if (lastState != moviendose) 
        {
            const toPlay = moviendose ? actionWalk : actionIdle
            const current = moviendose ? actionIdle : actionWalk
            
            current.fadeOut(fadeDuration)
            toPlay.reset().fadeIn(fadeDuration).play();

            lastState = moviendose
        }

        mixer.update(delta)
    }

    if (moviendose && !dobleClick) 
    {
console.log("Number of Triangles :", renderer.info.render.triangles);

        // calculate towards camera direction
        var angleYCameraDirection = Math.atan2(
            (camera.position.x - boxBody.position.x), 
            (camera.position.z - boxBody.position.z))

        // diagonal movement angle offset
        let offset = directionOffset(keysPressed)

        // rotate model
        rotateQuarternion.setFromAxisAngle(rotateAngle, angleYCameraDirection + offset)
        vaca3D.quaternion.rotateTowards(rotateQuarternion, 0.2)
        boxBody.quaternion.copy(vaca3D.quaternion)

        // calculate direction
        camera.getWorldDirection(walkDirection)
        walkDirection.y = 0
        walkDirection.normalize()
        walkDirection.applyAxisAngle(rotateAngle, offset)

        // move model & camera
        const moveX = walkDirection.x * walkVelocity * delta
        const moveZ = walkDirection.z * walkVelocity * delta
        vaca3D.position.x -= moveX
        vaca3D.position.z -= moveZ
        boxBody.position.x -= moveX
        boxBody.position.z -= moveZ

        // move cameras
        camera.position.x -= moveX
        camera.position.z -= moveZ

        // update camera target
        cameraTarget.x = vaca3D.position.x
        cameraTarget.y = vaca3D.position.y + 1
        cameraTarget.z = vaca3D.position.z
        cameraControls.target = cameraTarget

    }

    // Mueve el dulce si se lo come (en vez de borrarlo y crear uno nuevo)
    if (toMove)
    {
        let pos = getNewPosition(-MAX_SPACE/2.1, MAX_SPACE/2.1, 0, 0)

        toMove[0].position.set(pos[0],ALTURA_DULCE,pos[1])
        toMove[1].position.set(pos[0],ALTURA_DULCE,pos[1])
        toMove[2].position.set(pos[0],ALTURA_DULCE,pos[1])

        toMove = undefined
    }

    if (boxBody.position.y > 0.5) boxBody.position.y = 0.49999
    if (boxBody.position.y < 0.49) boxBody.position.y = 0.49999
    if (boxBody.quaternion.x > 0.001 || boxBody.quaternion.x < -0.001)
        boxBody.quaternion.x = 0
    if (boxBody.quaternion.z > 0.001 || boxBody.quaternion.z < -0.001)
        boxBody.quaternion.z = 0

    cenital.position.x = boxBody.position.x
    cenital.position.z = boxBody.position.z
}

function render()
{
    requestAnimationFrame(render)
    update()

    renderer.clear()

    /* La miniatura cenital esta superpuesta a la vista 
    general en el angulo superior izquierdo, cuadrada, 
    de 1/4 de la dimensión menor de la vista general */
    let ladoMiniatura
    if (window.innerWidth < window.innerHeight)
        ladoMiniatura = window.innerWidth / 4
    else 
        ladoMiniatura = window.innerHeight / 4
    
    if (menuGUI.niebla) scene.fog = new THREE.FogExp2(menuGUI.noche ? 'black' : 'white', 0)
    else scene.fog = undefined

    // El S.R. del viewport es left-bottom con X right y Y up
    renderer.setViewport(0,window.innerHeight-ladoMiniatura+1,ladoMiniatura,ladoMiniatura)
    renderer.render(scene,cenital)

    if (menuGUI.niebla) scene.fog = new THREE.FogExp2(menuGUI.noche ? 'black' : 'white', 0.1)
    else scene.fog = undefined

    renderer.setViewport(0,0,window.innerWidth,window.innerHeight)
    renderer.render(scene,camera)
}

////////////////////////////////////////////////////

function startGame() 
{
    puntos = 0
    vida = MAX_VIDA
    timeleft = MAX_TIME
    updateHTMLstats()

    document.getElementById("menu").style.cssText += 'display: none;'
    document.getElementById("pantallaFin").style.cssText += 'display: none;'

    // Cuenta atras
    downloadTimer = setInterval(() => 
    {
        if (--timeleft <= 0)  endGame()
        document.getElementById("progressBar").value = timeleft
        updateHTMLstats()
    }, 
    1000)
}

function endGame() 
{
    clearInterval(downloadTimer)
    addRecord(puntos)
    document.getElementById("finText").innerHTML =  `¡Fin de la partida!<br>
Has conseguido recoger <b>${puntos}</b> dulce${puntos == 1 ? '' : 's'}<br>
Bien jugado pero, ¿crees que puedes hacerlo mejor?<br>`

    puntos = 0
    vida = MAX_VIDA
    timeleft = MAX_TIME
    updateHTMLstats()
    
    document.getElementById("pantallaFin").style.display = ''
}

////////////////////////////////////////////////////

function setMiniatura()
{
    cenital = new THREE.OrthographicCamera(-L,L,L,-L,-10,300)

    cenital.position.set(0,20,0)
    cenital.lookAt(0,0,0)
    cenital.up = new THREE.Vector3(0,0,-1)

    // const helper = new THREE.CameraHelper(cenital)
    // scene.add(helper)
}

function setupListeners()
{
    document.addEventListener('keydown', (event) => 
    {
        moviendose = true
        keysPressed[event.key.toLowerCase()] = true
    })

    document.addEventListener('keyup', (event) => 
    {
        moviendose = false
        keysPressed[event.key.toLowerCase()] = false
    })

    document.getElementById("credits").addEventListener("click", () => 
    {
        let msg = `
        Créditos:
        
        Autor: Mario Andreu Villar
        
        Modelos, texturas y otros: 
            
        Lava: By Alexandre E. 2018 https://www.flickr.com/photos/pmeimon/30529221317
        `
        alert(msg)
    });

    document.getElementById("howToPlay").addEventListener("click", () => 
    {
        let msg = `
        Cómo jugar - Instrucciones
        -----------------------------
        
        Eres una vaca y tienes que comer tantos pancakes como puedas!

        - Dispones de ${MAX_TIME} segundos para recoger los pancakes
        - Inicialmente tienes ${MAX_VIDA} puntos de vida pero cuidado:
            - Las piedras que hay en el suelo restan 2 puntos de vida, no las toques!
            - Chocarte contra un árbol o farola resta 1 punto de vida

        Para moverte puedes utilizar las flechas del teclado, la 
        cámara se moverá contigo ;)

        También puedes mover la cámara por la escena con el ratón
        `
        alert(msg)
    });

    document.getElementById("records").addEventListener("click", () => 
    {
        let msg = 
    `     Records - Top 3    (Se resetean al recargar la página)
        ------------------
    `

        for (let i = 0; i < recordsPoints.length; i++) {
            msg += `      Puntos: ${recordsPoints[i]}     Fecha: ${recordsDates[i]}\n`
        }

        alert(msg)
    });

    document.getElementById("start").addEventListener("click", () => startGame() )

    document.getElementById("restart").addEventListener("click", () => startGame() )
    
    document.getElementById("returnToMenu").addEventListener("click", () =>
    {
        document.getElementById("pantallaFin").style.cssText += 'display: none;'
        document.getElementById("menu").style.display = ''
    })
}

function directionOffset(keysPressed) 
{
    let directionOffset = 0 // w

    if (keysPressed['arrowdown']) {
        if (keysPressed['arrowright']) {
            directionOffset = Math.PI / 4 // w+a
        } else if (keysPressed['arrowleft']) {
            directionOffset = - Math.PI / 4 // w+d
        }
    } else if (keysPressed['arrowup']) {
        if (keysPressed['arrowright']) {
            directionOffset = Math.PI / 4 + Math.PI / 2 // s+a
        } else if (keysPressed['arrowleft']) {
            directionOffset = -Math.PI / 4 - Math.PI / 2 // s+d
        } else {
            directionOffset = Math.PI // s
        }
    } else if (keysPressed['arrowright']) {
        directionOffset = Math.PI / 2 // a
    } else if (keysPressed['arrowleft']) {
        directionOffset = - Math.PI / 2 // d
    }

    return directionOffset
}

function loadModels()
{
    // Textura de lava para las piedras
    const texlava = new THREE.TextureLoader().load('images/lava.jpeg');
    texlava.repeat.set(5,5);
    texlava.wrapS= texlava.wrapT = THREE.RepeatWrapping;

    // Modelos importados
    const glloader = new GLTFLoader();
    glloader.load('models/cow.glb', (obj) =>
    {
        vaca3D.add(obj.scene)
        obj.scene.scale.set(0.75,0.75,0.75)
        obj.scene.position.y = -sizeVacaY/2
        vaca3D.name = 'vaca'
        obj.scene.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})
        actions = obj.animations  // 0 idle, 1 baile, 2 andar
        mixer = new THREE.AnimationMixer(vaca3D)
        actionIdle = mixer.clipAction(actions[0]) 
        actionDance = mixer.clipAction(actions[1]) 
        actionWalk = mixer.clipAction(actions[2]) 
        actionIdle.play()

        glloader.load('models/tree.glb', (obj) =>
        {
            arbol3D.add(obj.scene);
            obj.scene.scale.set(0.005,0.005,0.005);
            obj.scene.position.y -= ALTURA_ARBOL/2
            arbol3D.name = 'arbol';
            arbol3D.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})
        
            glloader.load('models/plants.glb', (obj) =>
            {
                planta3D.add(obj.scene);
                obj.scene.scale.set(0.09,0.09,0.09);
                planta3D.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})

                glloader.load('models/anemone.glb', (obj) =>
                {
                    anemona3D.add(obj.scene);
                    obj.scene.scale.set(0.05,0.05,0.05);
                    anemona3D.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})
                
                    glloader.load('models/narcissus.glb', (obj) =>
                    {
                        narciso3D.add(obj.scene);
                        obj.scene.scale.set(0.05,0.05,0.05);
                        narciso3D.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})
                    
                        glloader.load('models/tulip.glb', (obj) =>
                        {
                            tulipan3D.add(obj.scene);
                            obj.scene.scale.set(0.05,0.05,0.05);
                            tulipan3D.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})
                        
                            glloader.load('models/lamp.glb', (obj) =>
                            {
                                farola3D.add(obj.scene)
                                obj.scene.scale.set(0.15,0.15,0.15)
                                obj.scene.position.y -= ALTURA_FAROLA/2
                                farola3D.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})
                            
                                glloader.load('models/pancake.glb', (obj) =>
                                {
                                    dulce3D.add(obj.scene)
                                    obj.scene.scale.set(0.01,0.01,0.01)
                                    obj.scene.position.y -= 0.25
                                    dulce3D.traverse( (ob) => {if (ob.isObject3D) ob.castShadow = true})
                                
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

function addRecord(points)
{
    let min = Math.min.apply(null, recordsPoints)
    let pos = recordsPoints.indexOf(min)

    recordsPoints[pos] = points 
    recordsDates[pos] = new Date().toLocaleString()
}

function getRandomIntInclusive(min, max) 
{
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1) + min)
}  