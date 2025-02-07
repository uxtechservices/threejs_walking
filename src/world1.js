import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { AnimationMixer, Clock, Vector3, TextureLoader, PlaneGeometry, MeshBasicMaterial, Mesh } from 'three';
import { resizer } from './resizer';

class World1 {
    constructor(cam, gameScene, webRenderer, dirLight, ambientLight, controller) {
        this.cam = cam;
        this.gameScene = gameScene;
        this.webRenderer = webRenderer;
        this.dirLight = dirLight;
        this.ambientLight = ambientLight;
        this.controller = controller;
        this.gameScene.add(this.dirLight, this.ambientLight);
        this.soldier = null;
        this.adTextures = []; // Array para almacenar las texturas de los anuncios
        this.adMaterial = null;
        this.adMesh = null; // La malla que mostrará los anuncios
        this.currentAdIndex = 0;
        this.textureLoader = new TextureLoader(); // Instancia para cargar las texturas
        this.adInterval = null; // Para controlar el intervalo del cambio de anuncio

        document.getElementById('scene-container').append(this.webRenderer.domElement);

        this.controller.update();

        resizer(this.cam, this.webRenderer);
        window.addEventListener('resize', () => {
            resizer(this.cam, this.webRenderer);
        });

        this.mixer = null;
        this.clock = new Clock();
        this.clips = {
            Run: null, Walk: null, Idle: null, WalkBack: null, Punch: null,
        };
        this.currentClip = 'Idle';
        this.pressedUp = this.pressedDown = false;
        this.pressedRight = this.pressedLeft = false;
        this.pressedShift = this.punch = false;
        this.rotationRad = (Math.PI / 180) * 4;
        this.rotationAxis = new Vector3(0, 1, 0);
        document.addEventListener('keydown', this.pressedKey.bind(this), false);
        document.addEventListener('keyup', this.releasedKey.bind(this), false);
    }

    async initModels() {
        const loaderGLTF1 = new GLTFLoader();

        const loadLevel = async () => {
            try{
                const gltfLevel = await loaderGLTF1.loadAsync('../assets/wet-intersection.glb');
                const level = gltfLevel.scene;
                level.traverse((child) => {
                    if (child.isMesh) {
                        child.receiveShadow = true;
                    }
                });
                level.rotateX(-Math.PI);
                level.position.set(0, 0.2, 0);
                level.scale.set(0.03, 0.03, 0.03);
                this.gameScene.add(level);
                await this.loadAds(); // Carga los anuncios
                this.createAdMesh(); // Crea la malla para los anuncios
            }catch (error){
                console.error("Error cargando el nivel", error)
            }

        };
    
        const loadSoldier = async () => {
            try {
            const gltfSoldier = await loaderGLTF1.loadAsync('../assets/soldierx.glb');
            this.soldier = gltfSoldier.scene;
            this.soldier.traverse((child) => {
                if (child.isMesh) {
                     child.castShadow = true;
                }
            });
                this.soldier.position.set(0, 0, 0);
                this.gameScene.add(this.soldier);
            this.mixer = new AnimationMixer(this.soldier);
                for (const animation of gltfSoldier.animations) {
                    if (animation.name !== 'mixamo.com') {
                         this.clips[animation.name] = this.mixer.clipAction(animation);
                    }
                }
            this.soldier.add(this.cam);
            this.cam.lookAt(new Vector3(0, 1.5, 0));
            this.dirLight.target = this.soldier;
            } catch (error) {
                console.error("Error cargando el soldado", error)
            }
        };
        loadLevel();
        loadSoldier();
    }

    async loadAds() {
        const adImagePaths = ['../assets/ad1.png', '../assets/ad2.png', '../assets/ad3.png', '../assets/ad4.png'];
        try {
            for (const path of adImagePaths) {
                const texture = await this.textureLoader.loadAsync(path);
                this.adTextures.push(texture);
            }
             console.log('All ads loaded successfully');

        } catch (error) {
           console.error('Error loading ads:', error);
        }
    }

    createAdMesh() {
        if (this.adTextures.length === 0) {
            console.warn('No ads loaded. Aborting mesh creation.');
            return;
        }
    
        // 1. Coordenadas de la esquina (debes ajustarlas a las coordenadas reales de tu modelo)
        const esquinaPosition = new Vector3(5, 2, 5);

        // 2. Crear la geometría del plano para la imagen (más grande)
        const imageGeometry = new PlaneGeometry(4, 4);

        // 3. Crear un material para la imagen
        this.adMaterial = new MeshBasicMaterial({ map: this.adTextures[0], transparent: true });

        // 4. Crear la malla de la imagen
        this.adMesh = new Mesh(imageGeometry, this.adMaterial);

        // 5. Posicionar la malla (imagen)
        this.adMesh.position.copy(esquinaPosition);
        this.adMesh.rotation.set(0, -Math.PI / 2, 0);

        // 6. Añadir la malla de la imagen a la escena
        this.gameScene.add(this.adMesh);
    
        // Iniciar el intervalo para cambiar los anuncios
        this.startAdRotation();
    }

    startAdRotation() {
        this.adInterval = setInterval(() => {
            this.currentAdIndex = (this.currentAdIndex + 1) % this.adTextures.length;
            if (this.adMaterial) {
                this.adMaterial.map = this.adTextures[this.currentAdIndex];
                this.adMaterial.needsUpdate = true; // Importante para actualizar la textura
            }
        }, 2000); // Cambia el anuncio cada 2 segundos (2000 ms)
    }
    
    stopAdRotation() {
        clearInterval(this.adInterval);
    }

    movePlayer() {
        let speed;
        if (this.pressedShift && this.currentClip !== 'WalkBack') {
            speed = 0.1;
        } else {
            speed = 0.02;
        }

        if (this.pressedLeft) {
            this.soldier.position.x -= speed;
            this.soldier.rotateOnAxis(this.rotationAxis, this.rotationRad);
        } else if (this.pressedRight) {
            this.soldier.position.x += speed;
            this.soldier.rotateOnAxis(this.rotationAxis, -(this.rotationRad));
        } else if (this.pressedUp) {
            this.soldier.translateZ(-(speed));
        } else if (this.pressedDown) {
            this.soldier.translateZ(speed);
        }
    }

    transition(action) {
        if (this.currentClip !== action) {
            this.clips[this.currentClip].fadeOut(0.4);
            this.clips[action].reset().fadeIn(0.4).play();
            this.currentClip = action;
        } else {
            this.clips[action].play();
        }
    }

    moved() {
        return this.pressedUp || this.pressedRight || this.pressedLeft;
    }

    animatePlayer() {
        if (this.moved()) {
            if (this.pressedShift) {
                this.transition('Run');
            } else {
                this.transition('Walk');
            }
        } else if (this.pressedDown) {
            this.transition('WalkBack');
        } else if (this.punch) {
            this.transition('Punch');
        } else {
            this.transition('Idle');
        }

        this.mixer.update(this.clock.getDelta());
    }

    pressedKey(evt) {
        switch (evt.key) {
        case 'ArrowUp':
            this.pressedUp = true;
            break;
        case 'ArrowDown':
            this.pressedDown = true;
            break;
        case 'ArrowLeft':
            this.pressedLeft = true;
            break;
        case 'ArrowRight':
            this.pressedRight = true;
            break;
        case 'ShiftLeft':
            this.pressedShift = true;
            break;
        case 'Shift':
            this.pressedShift = true;
            break;
        case 'p':
            this.punch = true;
            break;
        default:
            break;
        }
    }

    releasedKey(evt) {
        switch (evt.key) {
        case 'ArrowUp':
            this.pressedUp = false;
            break;
        case 'ArrowDown':
            this.pressedDown = false;
            break;
        case 'ArrowLeft':
            this.pressedLeft = false;
            break;
        case 'ArrowRight':
            this.pressedRight = false;
            break;
        case 'Shift':
            this.pressedShift = false;
            break;
        case 'p':
            this.punch = false;
            break;
        default:
            break;
        }
    }

    update() {
        this.webRenderer.setAnimationLoop(() => {
            if (this.clips.Idle) {
                this.animatePlayer();
                this.movePlayer();
            }

            this.webRenderer.render(this.gameScene, this.cam);
        });
    }
}

export { World1 };