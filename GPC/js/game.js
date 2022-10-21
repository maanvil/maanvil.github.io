/**
  Game.js - Trabajo final - GPC
  Realizado con Three.js_r140

  Mario Andreu Villar
  @author maanvil@inf.upv.es
*/

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

// Otras globales
let cameraControls, keyboard
let menu
let cenital
const L = 80
let HELPER_FISICA = false
let mixer, actionIdle, actionWalk, actions
const ALTURA_PANCAKE = 14
const MAX_VIDA = 10
const MAX_TIME = 30
const MAX_X = 500
const MAX_Z = 500
let carX, carY, carZ
carX = 4; carY = 9; carZ = 7
let keysPressed = {}
let downloadTimer

// Objetos
let piedras = []
let arboles = []
let pancakes = []
let farolas = []
let vaca3D = new THREE.Object3D()
let boxMesh, boxBody, cabezaMesh, cabezaBody
let flower, stone, tree, cow, pancake, lamp
let orbMx
let orbeX = -15, orbeZ = 0
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
const walkVelocity = 50

// Monitor de recursos
const stats = new Stats();
const reloj = new THREE.Clock();

// Mundo fisico
let world;

/*********************************************/
/*********************************************/
/*********************************************/

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

function addRecord(points)
{
    let min = Math.min.apply(null, recordsPoints)
    let pos = recordsPoints.indexOf(min)

    recordsPoints[pos] = points 
    recordsDates[pos] = new Date().toLocaleString()
}

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

/*********************************************/
/*********************************************/
/*********************************************/

// Acciones
loadPhysicalWorld();
init()
loadVisualWorld();
render();

function updateHTMLstats()
{
    document.getElementById('stats').innerHTML = '<b> Puntos: ' + puntos + ' <b>'
    document.getElementById("healthBar").value = vida
    document.getElementById("time").innerHTML = '<b> Tiempo restante: ' + timeleft + ' s <b>'
    document.getElementById("vida").innerHTML = '<b> Vida: ' + vida + ' <b>'
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
    backWall.position.z = -MAX_Z/2;
    world.addBody( backWall );

    const frontWall = new CANNON.Body( {mass:0} );
    frontWall.addShape( new CANNON.Plane() );
    frontWall.quaternion.setFromEuler(0,Math.PI,0,'XYZ');
    frontWall.position.z = MAX_Z/2;
    world.addBody( frontWall );

    const leftWall = new CANNON.Body( {mass:0} );
    leftWall.addShape( new CANNON.Plane() );
    leftWall.position.x = -MAX_X/2;
    leftWall.quaternion.setFromEuler(0,Math.PI/2,0,'XYZ');
    world.addBody( leftWall );

    const rightWall = new CANNON.Body( {mass:0} );
    rightWall.addShape( new CANNON.Plane() );
    rightWall.position.x = MAX_X/2;
    rightWall.quaternion.setFromEuler(0,-Math.PI/2,0,'XYZ');
    world.addBody( rightWall );

    boxBody = new CANNON.Body({
        mass: 50,
        shape: new CANNON.Box(new CANNON.Vec3(carX/2,carY/2,carZ/2)),
        position: new CANNON.Vec3(0,carY/2+1,0)
    })
    boxBody.linearDamping = 0.99
    boxBody.angularDamping = 0.99

    cabezaBody = new CANNON.Body({
        mass: 0.1,
        shape : new CANNON.Box(new CANNON.Vec3(carX/2,carY/2,carZ)),
        position: new CANNON.Vec3(0,carY*2,carZ/2)
    })
    world.addBody(boxBody)
    world.addBody(cabezaBody)

    const restriccion1 = new CANNON.PointToPointConstraint(boxBody,
        new CANNON.Vec3( 0, carY/2, -carZ/2),
        cabezaBody,
        new CANNON.Vec3( 0, -carY/2, -carZ) ); 
    const restriccion2 = new CANNON.PointToPointConstraint(boxBody,
        new CANNON.Vec3( 0, carY/2, carZ/2),
        cabezaBody,
        new CANNON.Vec3( 0, -carY/2, 0) ); 
    world.addConstraint( restriccion1 );
    world.addConstraint( restriccion2 );

    boxBody.addEventListener('collide', (e) => 
    { 
        if (e.body.id != 0 && e.body.id != 6) 
        {
            console.log('collision with', e.body.id, e.body.name) 

            if (e.body.name == 'piedra')
                vida = Math.max(--vida, 0)
                updateHTMLstats()        
            }
    })

    cabezaBody.addEventListener('collide', (e) => 
    { 
        if (e.body.id != 0 && e.body.id != 5) 
        {
            console.log('collision with', e.body.id, e.body.name) 

            if (e.body.name == 'pancake' && lastColision != e.body.id)
            {
                puntos++
                updateHTMLstats()
                toMove = pancakes.find(x => x[1].id == e.body.id)
            }
        }
        lastColision = e.body.id
    })
}

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

function loadVisualWorld()
{
    // Material a utilizar
    const materialNormal = new THREE.MeshNormalMaterial({wireframe: false, flatShading: true})
    const materialAmarillo = new THREE.MeshBasicMaterial({color : 0xffff00, wireframe : false})
    const materialBlanco = new THREE.MeshStandardMaterial({color : 0xffffff, wireframe : false})
    // scene.fog = new THREE.Fog(0x0000ff, 100, 300);

    const texturaSuelo = new THREE.TextureLoader().load('images/ground.jpg')
    texturaSuelo.repeat.set(5,5)
    texturaSuelo.wrapS = texturaSuelo.wrapT = THREE.RepeatWrapping
    texturaSuelo.magFilter = THREE.LinearFilter
    texturaSuelo.minFilter = THREE.LinearFilter
    const materialSuelo = new THREE.MeshLambertMaterial({color : 0xffffff, map : texturaSuelo})
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(MAX_X,MAX_Z,100,100), materialSuelo)
    suelo.receiveShadow = true
    suelo.rotation.x = -Math.PI/2
    scene.add(suelo)

    const light = new THREE.AmbientLight(0x404040)
    scene.add( light );

    // http://personales.upv.es/rvivo/seminariosgpc2022/3jsapp.html

    // const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    // directionalLight.position.set(-1,1,-1)
    // directionalLight.castShadow = true
    // scene.add( directionalLight )

    // Importar un modelo en gltf
    const glloader = new GLTFLoader();
    glloader.load('models/colored_flower.glb', (obj) => 
    {
        flower = obj.scene
        flower.scale.set(0.15,0.15,0.15)
        flower.traverse( (object) => {if (object.isMesh) object.castShadow = true})

        glloader.load('models/tree.glb', (obj) => 
        {
            tree = obj.scene.children[0]
            tree.scale.set(0.1,0.1,0.1)
            // tree.traverse( (object) => {if (object.isMesh) object.material = materialSuelo })
            // tree.traverse( (object) => {if (object.isMesh) object.material.emissiveIntensity = 0 })
            // tree.traverse( (object) => {if (object.isMesh) object.material.reflectivity = 0 })
            // tree.traverse( (object) => {if (object.isMesh) object.material.lightMapIntensity = 0 })
            // tree.traverse( (object) => {if (object.isMesh) object.material.aoMapIntensity = 0 })

            glloader.load('models/lamp.glb', (obj) => 
            {
                lamp = obj.scene
                lamp.traverse( (object) => {if (object.isMesh) object.castShadow = true})
                
                glloader.load('models/cow.glb', (obj) => 
                {
                    cow = obj.scene.children[0]
                    cow.scale.set(3,3,3)
                    cow.position.y = -carY / 2
                    cow.traverse( (object) => {if (object.isMesh) object.castShadow = true})
                    vaca3D.add(cow)
                    vaca3D.castShadow = true
                    actions = obj.animations  // 0 idle, 1 baile, 2 andar
                    mixer = new THREE.AnimationMixer(vaca3D)
                    actionIdle = mixer.clipAction(actions[0]) 
                    actionWalk = mixer.clipAction(actions[2]) 
                    actionIdle.play()
                    scene.add(vaca3D)

                    glloader.load('models/pancake.glb', (obj) => 
                    {
                        pancake = obj.scene.children[0]
                        pancake.scale.set(0.08,0.08,0.08)
                        pancake.traverse( (object) => {if (object.isMesh) object.castShadow = true})
                    
                        glloader.load('models/natural_stone.glb', (obj) => 
                        {
                            stone = obj.scene.children[0]
                            stone.scale.set(0.05,0.05,0.05)
                            stone.traverse( (object) => {if (object.isMesh) object.castShadow = true})

                            // for(let x = (-MAX_X+50)/2/50; x < MAX_X/2/50; x++)
                            for(let x = -4; x < 5; x++)
                            {
                                for (let z = -4; z < 5; z++)
                                {
                                    if (x == 0 && z == 0) continue

                                    let quad = createQuad(x*50,z*50)
                                    quad.position.x = x*50
                                    quad.position.z = z*50
                                    scene.add(quad)
                                }
                            }

                            pancakes.forEach(p => 
                            {
                                new TWEEN.Tween( p[1].position )
                                .to( {y:ALTURA_PANCAKE-2}, 1000)
                                .repeat(Infinity)
                                .yoyo(true)
                                .easing(TWEEN.Easing.Sinusoidal.InOut)
                                .start()
                            })
                        })
                    })
                })
            })
        })
    });

    // Caja vaca
    const boxGeo = new THREE.BoxGeometry(carX,carY,carZ)
    
    boxMesh = new THREE.Mesh(boxGeo,materialBlanco)
    boxMesh.castShadow = true
    boxMesh.receiveShadow = false
    if (HELPER_FISICA) scene.add(boxMesh)

    cabezaMesh = new THREE.Mesh(new THREE.BoxGeometry(carX,carY,carZ*2),materialAmarillo)
    if (HELPER_FISICA) scene.add(cabezaMesh)

    scene.add(new THREE.AxesHelper(100))
}

function init()
{
    // Instanciar el motor
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x00F0F0)
    renderer.autoClear = false
    document.getElementById('container').appendChild(renderer.domElement)
    renderer.shadowMap.enabled = true;
    renderer.antialias = true 

    // Reloj
    reloj.start();

    // Instanciar la camara perspectiva
    const ar = window.innerWidth / window.innerHeight
    camera = new THREE.PerspectiveCamera(75, ar, 1, 2000)
    camera.position.set(50,50,50)
    camera.lookAt(0,1,0)

    // setupGui()

    // STATS --> stats.update() en update()
    stats.showPanel(0);	// FPS inicialmente. Picar para cambiar panel.
    stats.domElement.style.cssText = 'position:absolute;bottom:0px;right:0px;';
    document.getElementById( 'container' ).appendChild( stats.domElement );

    // Controles teclado
    // keyboard = new THREEx.KeyboardState(renderer.domElement)
    // renderer.domElement.setAttribute('tabIndex', '0')
    // renderer.domElement.focus()

    // Controles raton
    cameraControls = new OrbitControls(camera, renderer.domElement)
    cameraControls.target.set(0,1,0)
    
    // Limitar el zoom
    cameraControls.maxDistance = 150
    cameraControls.minDistance = 10

    // Mini-vista camara cenital
    setMiniatura()

    // Captura de eventos
    window.addEventListener('resize', updateAspectRatio)
    // keyboard.domElement.addEventListener('keydown', updateTeclado)
    renderer.domElement.addEventListener( 'dblclick', (event) => 
    {
        // Capturar la posicion del click
        let x = event.clientX;
        let y = event.clientY;

        // Normalizar las coordenadas de click
        x = ( x / window.innerWidth ) * 2 - 1;
        y = -( y / window.innerHeight ) * 2 + 1;

        // Rayo e intersecciones
        const rayo = new THREE.Raycaster();
        rayo.setFromCamera( new THREE.Vector2(x,y), camera );
        let intersecciones = rayo.intersectObjects( scene.children, true );
        if (intersecciones[0])
        {
            let point = intersecciones[0].point

            new TWEEN.Tween( boxBody.position )
            .to( 
                {
                    x : [point.x],
                    z : [point.z]
                }, 1000)
            .interpolation(TWEEN.Interpolation.Linear)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onStart(() => {moviendose = true; dobleClick = true})
            .onComplete(() => {moviendose = false; dobleClick = false})
            .start()
        }
    })

    document.getElementById("progressBar").max = MAX_TIME
    document.getElementById("progressBar").value = MAX_TIME
    document.getElementById("healthBar").max = MAX_VIDA
    document.getElementById("healthBar").value = MAX_VIDA
    updateHTMLstats()
}

renderer.domElement.addEventListener( 'dblclick', (event) => endGame() )
document.getElementById("pantallaFin").style.cssText += 'display: none;'

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
    document.getElementById("finText").innerHTML =  `¡Se acabó el tiempo!<br>
Has conseguido recoger <b>${puntos}</b> pancakes<br>
Bien jugado pero, ¿crees que puedes hacerlo mejor?<br>`

    puntos = 0
    vida = MAX_VIDA
    timeleft = MAX_TIME
    updateHTMLstats()
    
    document.getElementById("pantallaFin").style.display = ''
}

function setMiniatura()
{
    cenital = new THREE.OrthographicCamera(-L,L,L,-L,-10,300)

    cenital.position.set(0,250,0)
    cenital.lookAt(0,0,0)
    cenital.up = new THREE.Vector3(0,0,-1)

    // const helper = new THREE.CameraHelper(cenital)
    // scene.add(helper)
}

function createQuad(x,z)
{
    let quad = new THREE.Object3D()
    
    let rdm = Math.random()
    if (rdm > 0.7) // Piedras y flashes 
    {
        // Visual
        let piedraGeo = new THREE.SphereGeometry(3,5,5)  
        let piedraMesh = new THREE.Mesh(piedraGeo,new THREE.MeshBasicMaterial({
            color : 0xffffff,
            wireframe : true
        }))
        if (HELPER_FISICA) scene.add(piedraMesh)

        let piedra3D = new THREE.Object3D()
        let p = stone.clone()
        p.rotation.x = -Math.PI / 2
        p.position.y = -2.5
        piedra3D.add(p)
        scene.add(piedra3D)

        // Fisica
        let piedraBody = new CANNON.Body({
            // type: CANNON.Body.STATIC,
            mass:1,
            shape: new CANNON.Sphere(3),
            position: new CANNON.Vec3(
                x + getRandomIntInclusive(-15,15),
                getRandomIntInclusive(10,50),
                z + getRandomIntInclusive(-15,15)
            )
        })
        piedraBody.name = 'piedra'
        world.addBody(piedraBody)

        piedras.push([piedra3D,piedraBody,piedraMesh])

        // Brilli-brilli
        let flash3D = new THREE.Object3D()
        let f = pancake.clone()
        f.position.y -= 2
        flash3D.add(f)
        scene.add(flash3D)
        let flashGeo = new THREE.CylinderGeometry(5,5,4)  
        let flashMesh = new THREE.Mesh(flashGeo,new THREE.MeshBasicMaterial({
            color : 0xffffff,
            wireframe : true
        }))
        if (HELPER_FISICA) scene.add(flashMesh)
        let flashBody = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Cylinder(5,5,4),
            position: new CANNON.Vec3(
                x + getRandomIntInclusive(-15,15),
                ALTURA_PANCAKE,
                z + getRandomIntInclusive(-15,15)
            )
        })
        flashBody.name = 'pancake'
        flashBody.collisionResponse = false
        world.addBody(flashBody)
        pancakes.push([flash3D,flashBody,flashMesh])
    }
    else if (rdm < 0.32) // Arboles 
    {
        // Visual
        let arbolGeo = new THREE.CylinderGeometry(1,10,30,10)
        let arbolMesh = new THREE.Mesh(arbolGeo, new THREE.MeshBasicMaterial({
            color : 0xffffff,
            wireframe : true
        }))
        if (HELPER_FISICA) scene.add(arbolMesh)

        let arbol3D = new THREE.Object3D()
        let t = tree.clone()
        t.rotation.x = -Math.PI / 2
        t.position.y = -30/2
        arbol3D.add(t)
        scene.add(arbol3D)

        // Fisica
        let arbolBody = new CANNON.Body({
            // type: CANNON.Body.STATIC,
            mass : 0,
            shape: new CANNON.Cylinder(1,10,30,10),
            position: new CANNON.Vec3(
                x + getRandomIntInclusive(-10,10),
                30/2,
                z + getRandomIntInclusive(-10,10)
            )
        })
        arbolBody.name = 'arbol'
        world.addBody(arbolBody)

        arboles.push([arbol3D,arbolBody,arbolMesh])
    }
    else // Flores
    {
        let f = flower.clone()
        f.position.x = getRandomIntInclusive(-10,10)
        f.position.z = getRandomIntInclusive(-10,10)
        quad.add(f)

        if (Math.random() < 0.2)
        {
            // Farolas

            // Visual
            let alturaFarola = 15
            let farolaGeo = new THREE.BoxGeometry(5,alturaFarola,5)  
            let farolaMesh = new THREE.Mesh(farolaGeo,new THREE.MeshBasicMaterial({
                color : 0xffffff,
                wireframe : false
            }))
            farolaMesh.castShadow = true
            if (HELPER_FISICA) scene.add(farolaMesh)

            let l = lamp.clone()
            l.position.y -= alturaFarola/2
            let farola3D = new THREE.Object3D()
            farola3D.add(l)
            scene.add(farola3D)

            // Fisica
            let farolaBody = new CANNON.Body({
                type: CANNON.Body.STATIC,
                shape: new CANNON.Box(new CANNON.Vec3(5/2,alturaFarola/2,5/2)),
                position: new CANNON.Vec3(
                    x + getRandomIntInclusive(-15,15),
                    alturaFarola/2,
                    z + getRandomIntInclusive(-15,15)
                )
            })
            farolaBody.name = 'farola'
            world.addBody(farolaBody)

            let lightF = new THREE.PointLight( 0xffee80, 0.5);

            farolas.push([farola3D,farolaBody,farolaMesh,lightF])

            lightF.position.set(farolaBody.position.x,8,farolaBody.position.z);
            scene.add( lightF );

            if (HELPER_FISICA)
            { 
                const pointLightHelper = new THREE.PointLightHelper( lightF, 1, 0xffff00 );
                scene.add( pointLightHelper );
            }
        }
    }

    return quad
}

function updateTeclado(event)
{
    if ( keyboard.pressed('left') ){
        // camera.position.z += 1
        boxBody.position.z += 5
        // cameraControls.target.z += 1
    } 	
    else if ( keyboard.pressed('right') )
    {
        // camera.position.z -= 1
        boxBody.position.z -= 5
        // cameraControls.target.z -= 1
    }
    
    if ( keyboard.pressed('down') )
    {
        // camera.position.x += 1	
        boxBody.position.x += 5	
        // cameraControls.target.x += 1
    }
    else if ( keyboard.pressed('up') ) 
    {
        // camera.position.x -= 1
        boxBody.position.x -= 5
        // cameraControls.target.x -= 1
    }

    if ( keyboard.pressed('1') )
    {
        // camera.position.x += 1	
        boxBody.position.y += 5	
        // cameraControls.target.x += 1
    }
    else if ( keyboard.pressed('3') ) 
    {
        // camera.position.x -= 1
        boxBody.position.y -= 5
        if (boxBody.position.y < 0) boxBody.position.y = 0
        // cameraControls.target.x -= 1
    }

}

/**
 * Isotropía frente a redimension del canvas
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

function setupGui()
{
	// Definicion de los controles
	menu = {
		alambres : false, 
        anima : () => 
        {
            new TWEEN.Tween( boxBody.position )
            .to( 
                {
                    x : [orbeX],
                    z : [orbeZ]
                }, 1000)
            .interpolation(TWEEN.Interpolation.Linear)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start()
        }, 
        vida : MAX_VIDA,
        puntos : 0
	}

	// Creacion interfaz
	const gui = new GUI()

	// Construccion del menu
	const h = gui.addFolder('Info')
	h.add(menu, 'alambres' ).name('Alambres').onChange(
        (checkbox) => HELPER_FISICA = checkbox   
    )
    h.add(menu, 'anima').name('Stop')
    h.add(menu, 'vida', 0, MAX_VIDA, 1).name('Vida').listen()
    h.add(menu, 'puntos', 0, 10, 1).name('Puntos').listen()
}

function update()
{
    const delta = reloj.getDelta();	// tiempo en segundos que ha pasado por si hace falte
	world.fixedStep()					// recalcula el mundo a periodo fijo (60Hz)

    for (let i = 0; i < piedras.length; i++)
    {
        // modelo
        piedras[i][0].position.copy(piedras[i][1].position)
        piedras[i][0].quaternion.copy(piedras[i][1].quaternion)

        // wireframes
        piedras[i][2].position.copy(piedras[i][1].position)
        piedras[i][2].quaternion.copy(piedras[i][1].quaternion)
    }

    for (let i = 0; i < pancakes.length; i++)
    {
        // modelo
        pancakes[i][0].position.copy(pancakes[i][1].position)
        pancakes[i][0].quaternion.copy(pancakes[i][1].quaternion)

        // wireframes
        pancakes[i][2].position.copy(pancakes[i][1].position)
        pancakes[i][2].quaternion.copy(pancakes[i][1].quaternion)
    }

    for (let i = 0; i < arboles.length; i++)
    {
        // modelo
        arboles[i][0].position.copy(arboles[i][1].position)
        arboles[i][0].quaternion.copy(arboles[i][1].quaternion)

        // wireframes
        arboles[i][2].position.copy(arboles[i][1].position)
        arboles[i][2].quaternion.copy(arboles[i][1].quaternion)
    }

    for (let i = 0; i < farolas.length; i++)
    {
        // modelo
        farolas[i][0].position.copy(farolas[i][1].position)
        farolas[i][0].quaternion.copy(farolas[i][1].quaternion)

        // wireframes
        farolas[i][2].position.copy(farolas[i][1].position)
        farolas[i][2].quaternion.copy(farolas[i][1].quaternion)
    }
    
    // modelo 
    vaca3D.position.copy(boxBody.position)
    vaca3D.quaternion.copy(boxBody.quaternion)
    // wireframes
    boxMesh.position.copy(boxBody.position)
    boxMesh.quaternion.copy(boxBody.quaternion)
    cabezaMesh.position.copy(cabezaBody.position)
    cabezaMesh.quaternion.copy(cabezaBody.quaternion)

    // Actualiza el monitor 
	stats.update();

    // Actualiza la interpolacion
    TWEEN.update()

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

    // Mueve el pancake si se lo come (en vez de borrarlo y crear uno nuevo)
    if (toMove)
    {
        let newPositionX = getRandomIntInclusive(-MAX_X/2+50,MAX_X/2-50)
        let newPositionZ = getRandomIntInclusive(-MAX_Z/2+50,MAX_Z/2-50)

        toMove[0].position.set(newPositionX,ALTURA_PANCAKE,newPositionZ)
        toMove[1].position.set(newPositionX,ALTURA_PANCAKE,newPositionZ)
        toMove[2].position.set(newPositionX,ALTURA_PANCAKE,newPositionZ)

        toMove = undefined
    }

    if (boxBody.position.y > 4.5) boxBody.position.y = 4.49999
    if (boxBody.position.y < 4.4) boxBody.position.y = 4.49999
    if (boxBody.quaternion.x > 0.001 || boxBody.quaternion.x < -0.001)
        boxBody.quaternion.x = 0
    if (boxBody.quaternion.z > 0.001 || boxBody.quaternion.z < -0.001)
        boxBody.quaternion.z = 0

    cenital.position.x = boxBody.position.x
    cenital.position.z = boxBody.position.z
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
    
    // El S.R. del viewport es left-bottom con X right y Y up
    renderer.setViewport(0,window.innerHeight-ladoMiniatura+1,ladoMiniatura,ladoMiniatura)
    renderer.render(scene,cenital)

    renderer.setViewport(0,0,window.innerWidth,window.innerHeight)
    renderer.render(scene,camera)

    // renderer2.render( scene, camera );
}

function getRandomIntInclusive(min, max) 
{
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1) + min)
}  


/*****************************************************************/
/*****************************************************************/
/*****************************************************************/

