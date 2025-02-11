import { PerspectiveCamera } from 'three';

class Cam {
    constructor() {
        this.camera = new PerspectiveCamera(
            45, // fov = Field Of View
            window.innerWidth / window.innerHeight, // aspect ratio
            0.01, // near clipping plane
            1000, // far clipping plane
        );

        this.camera.position.set(0, 2.5, 4.0);
    }

    createCamera() {
        return this.camera;
    }
}

export { Cam };
