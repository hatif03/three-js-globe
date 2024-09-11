// import { render } from 'express/lib/response';
import * as THREE from 'three';
import gsap from 'gsap';
import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';
import atmosphereFragmentShader from './shaders/atmosphereFragment.glsl';
import atmosphereVertexShader from './shaders/atmosphereVertex.glsl';
import './tailwind.css';
import countries from './countries.json';

const canvasContainer = document.querySelector('#canvasContainer');

const scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera( 70, canvasContainer.offsetWidth/canvasContainer.offsetHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: document.querySelector('canvas')
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize( canvasContainer.offsetWidth, canvasContainer.offsetHeight );

// create a sphere
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(5, 50, 50),
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      globalTexture: {
        value: new THREE.TextureLoader().load('./img/globe.jpg') 
      }
    }
  })
);

// create atmosphere
const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(5, 50, 50),
  new THREE.ShaderMaterial({
    vertexShader: atmosphereVertexShader,
    fragmentShader: atmosphereFragmentShader,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  })
);

atmosphere.scale.set(1.1, 1.1, 1.1);
scene.add(atmosphere);

const group = new THREE.Group();
group.add(sphere);
scene.add(group);

const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff
});

const starVertices = [];
for(let i = 0; i < 10000; i++){
  const x = (Math.random() - 0.5) * 2000;
  const y = (Math.random() - 0.5) * 2000;
  const z = -Math.random() * 2000;
  starVertices.push(x, y, z);
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));

const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

camera.position.z = 15;

function createPoint({lat, long, country, population}){
  const scale = population/1000000000;
  const zScale = 0.8*scale;
  const point = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.11, Math.max(zScale, 0.4)),
    new THREE.MeshBasicMaterial({color: '#3BF7FF', opacity: 0.4, transparent: true})
  );

  const latitude = (lat/ 180) * Math.PI;
  const longitude = (long/ 180) * Math.PI;
  const radius = 5

  point.position.x = radius * Math.sin(longitude) * Math.cos(latitude);
  point.position.y = radius * Math.sin(latitude);
  point.position.z = radius * Math.cos(latitude) * Math.cos(longitude);

  point.lookAt(0,0,0);
  point.geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, -zScale/2));

  group.add(point);

  gsap.to(point.scale, {
    duration: 2,
    z: 1.4,
    yoyo: true,
    repeat: -1,
    ease: 'linear',
    delay: Math.random()
  });

  point.country = country
  point.population = new Intl.NumberFormat().format(population)
};

countries.forEach((country) => {
  createPoint({lat: country.latlng[0], long: country.latlng[1], country: country.name.common, population: country.population});
});

createPoint({lat:23.6345, long:-102.5528, country: "Mexico", population: "300mil"});

sphere.rotation.y = -Math.PI / 2;
group.rotation.offset = {
  x:0,
  y:0
}

const mouse = {
  x: undefined,
  y: undefined,
  down: false,
  xPrev: undefined,
  yPrev: undefined
};

const raycaster = new THREE.Raycaster();

const popUpEl = document.querySelector('#popUpEl');
const country = document.querySelector("#country");
const population = document.querySelector("#population");

canvasContainer.addEventListener('mousedown', ({clientX, clientY}) => {
  mouse.down = true;
  mouse.xPrev = clientX;
  mouse.yPrev = clientY;
});

addEventListener('mousemove', (event) => {

  if(innerWidth>=1280){
    mouse.x = ((event.clientX - innerWidth/2)/(innerWidth/2)) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  } else {
    const offset = canvasContainer.getBoundingClientRect().top;
    mouse.x = (event.clientX / innerWidth) * 2 - 1;
    mouse.y = -((event.clientY - offset)/innerHeight) * 2 + 1;
  }

  gsap.set(popUpEl, {
    x: event.clientX,
    y: event.clientY
  });

  if(mouse.down){

    event.preventDefault();

    const deltaX = event.clientX-mouse.xPrev;
    const deltaY = event.clientY-mouse.yPrev;

    group.rotation.offset.y += deltaX*0.005;
    group.rotation.offset.x += deltaY*0.005;

    gsap.to(group.rotation, {
      y: group.rotation.offset.y,
      x: group.rotation.offset.x,
      duration: 2
    });
    
    mouse.xPrev = event.clientX;
    mouse.yPrev = event.clientY;

  }
});

addEventListener('mouseup', (event) => {
  mouse.down = false;
});

addEventListener('resize', () => {
  renderer.setSize(canvasContainer.offsetWidth, canvasContainer.offsetHeight);
  camera = new THREE.PerspectiveCamera(70, canvasContainer.offsetWidth/canvasContainer.offsetHeight, 0.1, 1000);
  camera.position.z = 15;
});

function animate(){
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  group.rotation.y += 0.0002;
  // if(mouse.x){
  //   gsap.to(group.rotation, {
  //     duration: 2,
  //     y: mouse.x * 1.5,
  //     x: -mouse.y * 1.3,
  //   });
  // }

  // update the picking ray with the camera and pointer position
	raycaster.setFromCamera( mouse, camera );

	// calculate objects intersecting the picking ray
	const intersects = raycaster.intersectObjects( group.children.filter(mesh => {
    return mesh.geometry.type === 'BoxGeometry';
  }));

  group.children.forEach(mesh => {
    mesh.material.opacity = 0.4;
  });

  gsap.set(popUpEl, {
    display: 'none'
  });

	for ( let i = 0; i < intersects.length; i ++ ) {

		const box = intersects[i].object;
    box.material.opacity = 1;
    gsap.set(popUpEl, {
      display: 'block'
    });

    country.innerHTML = box.country;
    population.innerHTML = box.population

	}

	renderer.render( scene, camera );

}

animate();


addEventListener('touchmove', (event) => {

  event.clientX = event.touches[0].clientX;
  event.clientY = event.touches[0].clientY;

  const doesIntersect = raycaster.intersectObject(sphere);

  if (doesIntersect.length > 0) mouse.down = true  

  if(mouse.down){

    const offset = canvasContainer.getBoundingClientRect().top;
    mouse.x = (event.clientX / innerWidth) * 2 - 1;
    mouse.y = -((event.clientY - offset)/innerHeight) * 2 + 1;

    gsap.set(popUpEl, {
      x: event.clientX,
      y: event.clientY
    });  

    event.preventDefault();

    const deltaX = event.clientX-mouse.xPrev;
    const deltaY = event.clientY-mouse.yPrev;

    group.rotation.offset.y += deltaX*0.005;
    group.rotation.offset.x += deltaY*0.005;

    gsap.to(group.rotation, {
      y: group.rotation.offset.y,
      x: group.rotation.offset.x,
      duration: 2
    });
    
    mouse.xPrev = event.clientX;
    mouse.yPrev = event.clientY;

  }
},
  {passive: false}
);

addEventListener('touchend', (event) => {
  mouse.down = false;
});


