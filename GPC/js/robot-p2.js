/**
  robot-p2.js - Practica 2 - GPC
  Brazo articulado realizado con Three.js_r140

  Mario Andreu Villar
  @author maanvil@inf.upv.es
*/

import * as THREE from "../lib/three.module.js"
import {GLTFLoader} from "../lib/GLTFLoader.module.js"
import {OrbitControls} from "../lib/OrbitControls.module.js"

// Variables estandar
let renderer, scene, camera

// Otras globales
let cameraControls
let brazo, antebrazo, nervios, mano
let angulo = 0

init()
loadScene()
render()

function init()
{
    // Instanciar el motor
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth,window.innerHeight)
    document.getElementById('container').appendChild(renderer.domElement)

    // Instanciar la escena
    scene = new THREE.Scene()
    scene.background = new THREE.Color(1,1,1)

    // Instanciar la camara
    camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,1,2000)
    camera.position.set(100,220,150)
    camera.lookAt(0,1,0)

    // Controles raton
    cameraControls = new OrbitControls( camera, renderer.domElement );
    cameraControls.target.set( 0, 120, 0 );
}

function loadScene()
{
    // Material a utilizar
    const material = new THREE.MeshBasicMaterial({color:'red', wireframe:true})
        
    // Suelo de 1000*1000 en el plano XZ
    const suelo = new THREE.Mesh( new THREE.PlaneGeometry(1000,1000,10,10), material)
    suelo.rotation.x = -Math.PI/2

    // Base del robot
    const base = new THREE.Mesh(new THREE.CylinderGeometry(50,50,15,50), material)

    // Brazo del robot: formado por eje, esparrago, rotula y antebrazo
    brazo = new THREE.Object3D()
    
    const eje = new THREE.Mesh(new THREE.CylinderGeometry(20,20,18,50), material)
    eje.rotation.x = -Math.PI/2
    
    const esparrago = new THREE.Mesh(new THREE.BoxGeometry(12,120,18), material)
    esparrago.position.y += 120/2
    esparrago.rotation.y = Math.PI/2

    const rotula = new THREE.Mesh(new THREE.SphereGeometry(20,20,20), material)
    rotula.position.y += 120

    // Antebrazo del robot: formado por disco, nervios y mano
    antebrazo = new THREE.Object3D()

    const disco = new THREE.Mesh(new THREE.CylinderGeometry(22,22,6,50), material)

    nervios = new THREE.Object3D()
    const separacionNervios = 10

    let signo = +1
    for (let i = 1; i <= 4; i++)
    {
        let nervio = new THREE.Mesh(new THREE.BoxGeometry(4,80,4), material)
        nervio.position.y += 80/2
        nervio.position.x += signo * separacionNervios
        nervio.position.z += separacionNervios * ((i%2==0) ? -signo : +signo)

        signo *= (i%2==0) ? -1 : +1
        nervios.add(nervio)
    }

    // Mano del robot: formada por un cilindro y dos pinzas (De & Iz)
    mano = new THREE.Object3D()

    const cilindro = new THREE.Mesh(new THREE.CylinderGeometry(15,15,40,50), material)
    cilindro.rotation.x = -Math.PI/2

    const pinzaDe = new THREE.Object3D()
    const pinzaIz = new THREE.Object3D()

    const baseDe = new THREE.Mesh(new THREE.BoxGeometry(19,20,4), material)
    baseDe.position.x += 19/2
    baseDe.position.y += 20/2
    baseDe.position.z += 4/2

    const baseIz = new THREE.Mesh(new THREE.BoxGeometry(19,20,4), material)
    baseIz.position.x += 19/2
    baseIz.position.y += 20/2
    baseIz.position.z += 4/2

    // Dedo de la pinza (la malla forma el De, con transformaciones creamos el Iz)
    const mallaDedo = new THREE.BufferGeometry()

    const coordenadas = [ // 6 caras x 4 vert x 3 coor = 72 float
        // Front 
        0,0,4,      // 7 -> 0
        19,5,4,     // 0 -> 1
        19,15,4,    // 3 -> 2
        0,20,4,     // 4 -> 3
        // Right
        19,5,4,     // 0 -> 4
        19,5,2,     // 1 -> 5
        19,15,2,    // 2 -> 6
        19,15,4,    // 3 -> 7
        // Back
        19,5,2,     // 1 -> 8
        0,0,0,      // 6 -> 9
        0,20,0,     // 5 ->10
        19,15,2,    // 2 ->11
        // Left
        0,0,0,      // 6 ->12
        0,0,4,      // 7 ->13
        0,20,4,     // 4 ->14
        0,20,0,     // 5 ->15
        // Top
        19,15,4,    // 3 ->16
        19,15,2,    // 2 ->17
        0,20,0,     // 5 ->18
        0,20,4,     // 4 ->19
        // Bottom
        19,5,4,     // 0 ->20
        0,0,4,      // 7 ->21 
        0,0,0,      // 6 ->22
        19,5,2      // 1 ->23
    ]

    const normales = [ // 24 x 3
        // Front
        0,0,1, 0,0,1, 0,0,1, 0,0,1,
        // Right
        1,0,0, 1,0,0, 1,0,0, 1,0,0,
        // Back 
        0.10468,0,-0.99450,
        0.10468,0,-0.99450, 
        0.10468,0,-0.99450,
        0.10468,0,-0.99450,
        // Left
        -1,0,0, -1,0,0, -1,0,0, -1,0,0,
        // Top 
        0.25449,0.96707,0,
        0.25449,0.96707,0,
        0.25449,0.96707,0,
        0.25449,0.96707,0,
        // Bottom
        0.25449,-0.96707,0,
        0.25449,-0.96707,0,
        0.25449,-0.96707,0,
        0.25449,-0.96707,0
    ]

    const indices = [ // 6 caras x 2 triangulos x 3 vertices = 36
        0,1,2,    2,3,0,    // Front
        4,5,6,    6,7,4,    // Right 
        8,9,10,   10,11,8,  // Back
        12,13,14, 14,15,12, // Left
        16,17,18, 18,19,16, // Top
        20,21,22, 22,23,20  // Bottom
    ];

    mallaDedo.setIndex(indices)
    mallaDedo.setAttribute('position', new THREE.Float32BufferAttribute(coordenadas,3))
    mallaDedo.setAttribute('normal', new THREE.Float32BufferAttribute(normales,3))
    
    const dedoDe = new THREE.Mesh(mallaDedo, material)

    const dedoIz = new THREE.Mesh(mallaDedo, material)
    dedoIz.rotation.x += Math.PI
    dedoIz.position.y += 20
    dedoIz.position.z += 4

    // Colocamos a continuacion del paralelepipedo
    dedoDe.position.x += 19
    dedoIz.position.x += 19
    
    // Colocamos respecto al cilindro
    const separacionPinzas = 15

    pinzaDe.position.y -= 20/2
    pinzaDe.position.z -= (4/2 + separacionPinzas)

    pinzaIz.position.y -= 20/2
    pinzaIz.position.z += (separacionPinzas - 4/2)

    //--------------------------------------------

    // Grafo de escena
    scene.add(suelo)
    scene.add(base)

    base.add(brazo)

    brazo.add(eje)
    brazo.add(esparrago)
    brazo.add(rotula)
    brazo.add(antebrazo)

    antebrazo.position.y += 120

    antebrazo.add(disco)
    antebrazo.add(nervios)
    antebrazo.add(mano)

    mano.position.y += 80

    mano.add(cilindro)
    mano.add(pinzaDe)
    mano.add(pinzaIz)

    pinzaDe.add(baseDe)
    pinzaDe.add(dedoDe)

    pinzaIz.add(baseIz)
    pinzaIz.add(dedoIz)

    // Ejes
    scene.add(new THREE.AxesHelper(100))
}

function update()
{
    // Cambios para actualizar la camara segun movimiento del raton
    cameraControls.update();

    // Giro de la escena
    angulo -= 0.001
    scene.rotation.y = angulo
}

function render()
{
    requestAnimationFrame(render)
    update()
    renderer.render(scene,camera)
}
