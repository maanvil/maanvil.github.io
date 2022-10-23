var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var quad_vertices =
[
-30.0,  30.0, 0.0,
30.0,  30.0, 0.0,
30.0, -30.0, 0.0,
-30.0, -30.0, 0.0
];

var quad_uvs =
[
0.0, 0.0,
1.0, 0.0,
1.0, 1.0,
0.0, 1.0
];

var quad_indices =
[
0, 2, 1, 0, 3, 2
];

var geometry = new THREE.BufferGeometry();

var vertices = new Float32Array( quad_vertices );
// Each vertex has one uv coordinate for texture mapping
var uvs = new Float32Array( quad_uvs);
// Use the four vertices to draw the two triangles that make up the square.
var indices = new Uint32Array( quad_indices )

// itemSize = 3 because there are 3 values (components) per vertex
geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
geometry.setAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );
geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );

// Load the texture asynchronously
var textureLoader = new THREE.TextureLoader();
textureLoader.load('./images/uv-test-bw.jpeg', function (texture){
    console.log('texture loaded');

    var material = new THREE.MeshBasicMaterial( {map: texture });
    var mesh = new THREE.Mesh( geometry, material );
    mesh.position.z = -100;

    scene.add(mesh);

    renderer.render(scene, camera);
}, undefined, function (err) {
    console.error('texture not loaded', err)
});