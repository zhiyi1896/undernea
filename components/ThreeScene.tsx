
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';

interface ThreeSceneProps {
  isScattered: boolean;
  photos: { url: string }[];
}

export interface ThreeSceneHandle {
  handleInteract: (clientX: number, clientY: number) => { isPhoto: boolean; object: any } | null;
}

const ThreeScene = forwardRef<ThreeSceneHandle, ThreeSceneProps>(({ isScattered, photos }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const treeGroupRef = useRef<THREE.Group | null>(null);
  const photoGroupsRef = useRef<THREE.Group[]>([]);
  const animationFrameRef = useRef<number>();
  const clockRef = useRef(new THREE.Clock());

  // Constants
  const TREE_HEIGHT = 110;
  const TREE_BASE_RADIUS = 42;
  const SCATTER_RANGE = 220;
  const LERP_SPEED = 0.08;

  const particleTexture = React.useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.Texture(canvas); tex.needsUpdate = true; return tex;
  }, []);

  useImperativeHandle(ref, () => ({
    handleInteract: (x, y) => {
      if (!cameraRef.current || !sceneRef.current) return null;
      const mouse = new THREE.Vector2(
        (x / window.innerWidth) * 2 - 1,
        -(y / window.innerHeight) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);
      const hits = raycaster.intersectObjects(photoGroupsRef.current, true);
      if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj.parent && !obj.userData.isPhoto) obj = obj.parent;
        return { isPhoto: true, object: obj };
      }
      return null;
    }
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialization
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0004);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    const isMobile = window.innerWidth < 768;
    camera.position.set(0, isMobile ? 50 : 60, isMobile ? 200 : 170);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const treeGroup = new THREE.Group();
    scene.add(treeGroup);
    treeGroupRef.current = treeGroup;

    // Tree Particles (Optimized setup)
    const createTree = () => {
      const geo = new THREE.BufferGeometry();
      const pos = []; const col = [];
      const gold = new THREE.Color(0xFFF180);
      const red = new THREE.Color(0xFF4040);
      for (let i = 0; i < 40000; i++) {
        const y = Math.random() * TREE_HEIGHT;
        const r = Math.pow(Math.random(), 0.5) * ((1 - y / TREE_HEIGHT) * TREE_BASE_RADIUS);
        const a = Math.random() * Math.PI * 2;
        pos.push(r * Math.cos(a), y, r * Math.sin(a));
        const c = Math.random() < 0.8 ? gold : red;
        col.push(c.r, c.g, c.b);
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));

      // Setup Scatters
      const scatteredPos = new Float32Array(pos.length);
      for (let i = 0; i < pos.length / 3; i++) {
        scatteredPos[i * 3] = (Math.random() - 0.5) * SCATTER_RANGE * 2.8;
        scatteredPos[i * 3 + 1] = (Math.random() - 0.5) * SCATTER_RANGE + 30;
        scatteredPos[i * 3 + 2] = (Math.random() - 0.5) * SCATTER_RANGE * 2.8;
      }
      geo.userData.initialPositions = new Float32Array(pos);
      geo.userData.scatteredPositions = scatteredPos;

      const points = new THREE.Points(geo, new THREE.PointsMaterial({
        size: 0.8, vertexColors: true, map: particleTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      treeGroup.add(points);
      return points;
    };

    const treePoints = createTree();

    // Lighting
    scene.add(new THREE.AmbientLight(0x404040));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Render loop
    const animate = () => {
      const delta = clockRef.current.getDelta();
      const time = clockRef.current.getElapsedTime();

      if (treeGroup) {
        treeGroup.rotation.y += isScattered ? delta * 0.05 : delta * 0.15;
      }

      // Update tree particles
      const posAttr = treePoints.geometry.attributes.position as THREE.BufferAttribute;
      const target = isScattered ? treePoints.geometry.userData.scatteredPositions : treePoints.geometry.userData.initialPositions;
      for (let i = 0; i < posAttr.array.length; i++) {
        posAttr.array[i] += (target[i] - posAttr.array[i]) * LERP_SPEED;
      }
      posAttr.needsUpdate = true;

      // Update Photos
      photoGroupsRef.current.forEach((group) => {
          const targetPos = isScattered ? group.userData.scatteredPosition : group.userData.initialPosition;
          const targetScale = isScattered ? 2.5 : 0.4;
          group.position.lerp(targetPos, LERP_SPEED);
          group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), LERP_SPEED);
          if (isScattered) group.rotation.y += delta * 0.3;
      });

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [particleTexture, isScattered]);

  // Handle Photo Changes
  useEffect(() => {
    if (!treeGroupRef.current) return;
    
    // Clean old
    photoGroupsRef.current.forEach(p => treeGroupRef.current?.remove(p));
    photoGroupsRef.current = [];

    const loader = new THREE.TextureLoader();
    photos.forEach((photo, idx) => {
      const group = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 5.5), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      group.add(frame);

      loader.load(photo.url, (tex) => {
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
        pic.position.set(0, 0.5, 0.02);
        group.add(pic);
      });

      const t = Math.random(); 
      const angle = t * Math.PI * 2 * 5; 
      const r = (1 - t) * TREE_BASE_RADIUS + 4.5;
      group.position.set(r * Math.cos(angle), t * TREE_HEIGHT, r * Math.sin(angle));
      group.userData = {
        isPhoto: true,
        initialPosition: group.position.clone(),
        scatteredPosition: new THREE.Vector3((Math.random() - 0.5) * 150, (Math.random() - 0.5) * 100 + 40, (Math.random() - 0.5) * 150)
      };
      treeGroupRef.current?.add(group);
      photoGroupsRef.current.push(group);
    });
  }, [photos]);

  return <div ref={containerRef} className="fixed inset-0 z-0 bg-black" />;
});

export default ThreeScene;
