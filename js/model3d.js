(function () {
  let scene, camera, renderer, model, controls, mixer;
  let clock = new THREE.Clock();
  let container = document.getElementById('model-container');
  let raycaster, mouse;
  let hoverPoints = [];
  let maxPoints = 80;
  let pointGeometry;
  let isHovering = false;
  let lastSpawnTime = 0;

  if (!container) return;

  function init() {
    // --- ESCENA ---
    scene = new THREE.Scene();

    // --- CÁMARA ---
    const width = container.clientWidth;
    const height = container.clientHeight || 600;
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 5);

    // --- RENDERER ---
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // --- LUCES (suaves) ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xff66aa, 0.2);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // --- GEOMETRÍA COMPARTIDA PARA PUNTOS ---
    pointGeometry = new THREE.SphereGeometry(0.02, 8, 8);

    // --- CONTROLES ---
    const ActualOrbitControls = THREE.OrbitControls || (typeof OrbitControls !== 'undefined' ? OrbitControls : null);

    if (ActualOrbitControls) {
      controls = new ActualOrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.5;
      controls.enableZoom = true;
      controls.enablePan = false;
      controls.minDistance = 2;
      controls.maxDistance = 10;
    } else {
      console.warn("OrbitControls no pudo ser inicializado desde el CDN.");
    }

    // --- CARGAR MODELO ---
    const ActualGLTFLoader = THREE.GLTFLoader || (typeof GLTFLoader !== 'undefined' ? GLTFLoader : null);

    if (!ActualGLTFLoader) {
      console.error("GLTFLoader no está disponible. Revisa las etiquetas <script> en tu HTML.");
      return;
    }

    const loader = new ActualGLTFLoader();
    const modelUrl = container.dataset.src || './assets/ivanavenir_3d.glb';

    loader.load(
      modelUrl,
      function (gltf) {
        model = gltf.scene;

        // --- Configurar materiales mate ---
        model.traverse(function (child) {
          if (child.isMesh && child.material) {
            if (child.material.metalness !== undefined) child.material.metalness = 0;
            if (child.material.roughness !== undefined) child.material.roughness = 1;
            if (child.material.envMapIntensity !== undefined) child.material.envMapIntensity = 0;
          }
        });

        // --- Grupo contenedor ---
        const wrapper = new THREE.Group();
        scene.add(wrapper);

        // --- Centrar y escalar ---
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim;
        model.scale.setScalar(scale);

        model.position.x = -center.x * scale;
        model.position.y = -center.y * scale;
        model.position.z = -center.z * scale;

        wrapper.add(model);

        // --- Animaciones ---
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          gltf.animations.forEach(function (clip) {
            mixer.clipAction(clip).play();
          });
        }

        console.log('Modelo 3D cargado correctamente:', modelUrl);
      },
      function (xhr) {
        if (xhr.total > 0) {
          console.log('Cargando modelo: ' + (xhr.loaded / xhr.total * 100).toFixed(0) + '%');
        }
      },
      function (error) {
        console.error('Error al cargar el modelo 3D:', error);
      }
    );

    // --- RAYCASTER ---
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2(-9999, -9999);

    // --- EVENTOS DE MOUSE ---
    renderer.domElement.addEventListener('pointermove', function (event) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      isHovering = true;
    });

    renderer.domElement.addEventListener('pointerleave', function () {
      mouse.x = -9999;
      mouse.y = -9999;
      isHovering = false;
    });

    // --- RESIZE ---
    window.addEventListener('resize', onResize);
  }

  function onResize() {
    if (!container || !renderer || !camera) return;
    const width = container.clientWidth;
    const height = container.clientHeight || 600;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  // --- CREAR PUNTO ROSA DINÁMICO ---
  function createPoint(position, normal) {
    // Material emisivo rosa
    var material = new THREE.MeshBasicMaterial({
      color: 0xff0095,
      transparent: true,
      opacity: 0.85
    });

    var mesh = new THREE.Mesh(pointGeometry, material);
    mesh.position.copy(position);

    // Offset sutil en la dirección de la normal para que estén sobre la superficie
    if (normal) {
      mesh.position.x += normal.x * 0.01;
      mesh.position.y += normal.y * 0.01;
      mesh.position.z += normal.z * 0.01;
    }

    // Datos para animación dinámica
    mesh.userData.basePos = position.clone();
    mesh.userData.normal = normal ? normal.clone() : new THREE.Vector3(0, 1, 0);
    mesh.userData.phase = Math.random() * Math.PI * 2;
    mesh.userData.speed = 0.8 + Math.random() * 0.8;
    mesh.userData.baseScale = 0.8 + Math.random() * 0.4;
    mesh.userData.born = clock.getElapsedTime();

    scene.add(mesh);
    return mesh;
  }

  // --- ACTUALIZAR PUNTOS DINÁMICOS ---
  function updateHover() {
    if (!model || !raycaster || !camera) return;

    var time = clock.getElapsedTime();

    // --- Animar puntos existentes (dinamismo) ---
    for (var i = 0; i < hoverPoints.length; i++) {
      var p = hoverPoints[i];
      var age = time - p.userData.born;

      // --- Aparición suave (primeros 0.3s) ---
      var appearScale = Math.min(age / 0.3, 1);

      // --- Pulsación dinámica ---
      var pulse = Math.sin(time * p.userData.speed + p.userData.phase);
      var scale = p.userData.baseScale * appearScale * (0.85 + pulse * 0.15);
      p.scale.setScalar(scale);

      // --- Vibración sutil en la superficie ---
      var wobble = 0.008;
      p.position.x = p.userData.basePos.x + Math.sin(time * 1.5 + p.userData.phase) * wobble;
      p.position.y = p.userData.basePos.y + Math.cos(time * 1.3 + p.userData.phase) * wobble;
      p.position.z = p.userData.basePos.z + Math.sin(time * 1.7 + p.userData.phase * 1.5) * wobble;

      // --- Opacidad dinámica ---
      p.material.opacity = 0.7 + pulse * 0.2;
    }

    // --- Crear nuevos puntos si hay hover ---
    if (isHovering && mouse.x > -100 && (time - lastSpawnTime) > 0.03) {
      lastSpawnTime = time;
      raycaster.setFromCamera(mouse, camera);
      var intersects = raycaster.intersectObject(model, true);

      if (intersects.length > 0) {
        // Verificar que no haya un punto muy cerca
        var point = intersects[0];
        var tooClose = false;

        for (var j = 0; j < hoverPoints.length; j++) {
          var dist = hoverPoints[j].userData.basePos.distanceTo(point.point);
          if (dist < 0.08) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          // Eliminar el punto más viejo si llegamos al máximo
          if (hoverPoints.length >= maxPoints) {
            var oldest = hoverPoints.shift();
            scene.remove(oldest);
            oldest.material.dispose();
          }

          // Crear nuevo punto
          var normal = point.face ? point.face.normal.clone() : null;
          // Transformar la normal al espacio del mundo
          if (normal && point.object) {
            normal.transformDirection(point.object.matrixWorld);
          }
          var newPoint = createPoint(point.point, normal);
          hoverPoints.push(newPoint);
        }
      }
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    if (controls) controls.update();
    updateHover();
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  // --- INICIAR ---
  function start() {
    init();
    animate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();