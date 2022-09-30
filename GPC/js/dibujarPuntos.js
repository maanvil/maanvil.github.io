/*
    Seminario #1: Dibujar puntos con VBOs
*/

// Shader de vertices
var VSHADER_SOURCE = `
    attribute vec3 posicion;
    varying highp vec4 vColor;

    void main(){
        gl_Position = vec4(posicion,1.0);
        gl_PointSize = 10.0;

        // El sdr es de 2*2 y esta centrado

        highp float dist = sqrt( dot(posicion.xy, posicion.xy) ) / sqrt(2.0);

        vColor = vec4( 1.0 - dist, 1.0 - dist, 1.0 - dist, 1 );
    } 
`;

// Shader de fragmentos
var FSHADER_SOURCE = `
    varying highp vec4 vColor;
    void main(){
        gl_FragColor = vColor;
    }
`;

/*********************************************/

// Globales
var clicks = [];
var bufferVertices = null;

function main()
{
    // Recupera el lienzo
    var canvas = document.getElementById("canvas");
    if (!canvas) 
    {
		console.log("Fallo al recuperar el canvas");
		return;
	}

    var gl = getWebGLContext( canvas );
    if (!gl)
    {
		console.log("Fallo al recuperar el contexto WebGL");
		return;
	}

    // Cargo shaders en programa de GPU
    if (!initShaders(gl,VSHADER_SOURCE,FSHADER_SOURCE))
    {
        console.log("Fallo al inicializar los shaders");
    }

    // Color de borrado del lienzo -azul oscuro-
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Localiza el att posicion en el shader 
    var coordenadas = gl.getAttribLocation(gl.program, 'posicion');

    // Crea buffer, etc ...
    bufferVertices = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferVertices );
    gl.vertexAttribPointer( coordenadas, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( coordenadas );

    // Asignar el mismo color a todos los puntos
    // colorFragmento = gl.getUniformLocation( gl.program, 'color' );

    // Registrar la call-back del click del raton
    canvas.onmousedown = function(evento){ click(evento,gl,canvas); };

    // Dibujar
    render( gl );
    
}

function click( evento, gl, canvas )
{
    // Recuperar la posicion del click
    // El click devuelve la x,y en el sistema de referencia
    // del documento. Los puntos que se pasan al shader deben
    // de estar en el cuadrado de lado dos centrado en el canvas

    let x = evento.clientX;
    let y = evento.clientY;
    
    var rect = evento.target.getBoundingClientRect(); // rectangulo del canvas

    // Conversion de coordenadas al sistema webgl por defecto (cuadrado 2*2)
    x = ((x - rect.left) - canvas.width / 2) * 2 / canvas.width;
    y = (canvas.height / 2 - (y - rect.top)) * 2 / canvas.height;

	// Guardar las coordenadas
	clicks.push(x); clicks.push(y); clicks.push(0.0);

	// Redibujar con cada click
	render( gl );
}

function render( gl )
{
	// Borra el canvas con el color de fondo
	gl.clear( gl.COLOR_BUFFER_BIT );

    var puntos = new Float32Array(clicks); 

	// Fija el color de TODOS los puntos
	// gl.uniform3f(colorFragmento, 1, 1, 0);

	// Rellena los BOs con las coordenadas y colores y lo manda a proceso
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferVertices );
	gl.bufferData( gl.ARRAY_BUFFER, puntos, gl.STATIC_DRAW );
	gl.drawArrays( gl.POINTS, 0, puntos.length/3 )
    gl.drawArrays( gl.LINE_STRIP, 0, puntos.length/3 )
}