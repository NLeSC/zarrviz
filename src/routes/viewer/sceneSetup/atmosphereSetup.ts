import * as THREE from 'three';
import { 
  SkyMaterial, 
  SunDirectionalLight, 
  PrecomputedTexturesLoader
} from '@takram/three-atmosphere';
import type { PrecomputedTextures } from '@takram/three-atmosphere';

export class AtmosphereSetup {
  private skyMaterial: SkyMaterial | THREE.ShaderMaterial | undefined;
  private sunLight: SunDirectionalLight | THREE.DirectionalLight | undefined;
  private skyMesh: THREE.Mesh | undefined;
  private scene: THREE.Scene;
  private texturesUrl: string;
  private useAdvancedAtmosphere: boolean;

  constructor(scene: THREE.Scene, texturesUrl?: string, useAdvancedAtmosphere = true) {
    this.scene = scene;
    this.useAdvancedAtmosphere = useAdvancedAtmosphere;
    // Use default URL from the package if not provided, but prefer local fallback
    this.texturesUrl = texturesUrl || 'https://media.githubusercontent.com/media/takram-design-engineering/three-geospatial/main/packages/atmosphere/assets';
    
    // Start with basic sky to avoid loading issues
    console.log('🌤️ Initializing atmosphere with basic sky...');
    this.setupBasicSky();
    
    // Try to upgrade to advanced atmosphere asynchronously if enabled
    if (this.useAdvancedAtmosphere) {
      console.log('🚀 Will attempt to upgrade to advanced atmosphere...');
      this.attemptAdvancedAtmosphere();
    } else {
      console.log('ℹ️ Advanced atmosphere disabled, using basic sky only');
    }
  }

  private async attemptAdvancedAtmosphere() {
    try {
      await this.setupAtmosphere();
    } catch (error) {
      console.warn('⚠️ Advanced atmosphere setup failed, keeping basic sky:', error);
    }
  }

  private async setupAtmosphere() {
    try {
      // Try to load precomputed textures for atmospheric scattering
      // First attempt with different formats since the URL might expect different extensions
      const texturesLoader = new PrecomputedTexturesLoader();
      let textures: PrecomputedTextures | null = null;
      
      // Try different texture formats and URLs
      const urlsToTry = [
        `${this.texturesUrl}/transmittance.bin`,
        `${this.texturesUrl}/transmittance.exr`,
        // Fallback to a working URL if available
      ];
      
      for (const url of urlsToTry) {
        try {
          textures = await new Promise<PrecomputedTextures>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
            texturesLoader.load(
              url,
              (result) => {
                clearTimeout(timeout);
                resolve(result);
              },
              undefined,
              (error) => {
                clearTimeout(timeout);
                reject(error);
              }
            );
          });
          console.log(`✅ Loaded atmosphere textures from: ${url}`);
          break;
        } catch (error) {
          console.warn(`⚠️ Failed to load from ${url}:`, error);
          continue;
        }
      }
      
      if (!textures) {
        throw new Error('All texture loading attempts failed');
      }

      // Create sun directional light
      this.sunLight = new SunDirectionalLight({
        transmittanceTexture: textures.transmittanceTexture,
        sunDirection: new THREE.Vector3(0.0, 0.5, 0.5),
        distance: 149597870.7 // Sun-Earth distance in km
      });

      // Create sky material with atmosphere parameters
      this.skyMaterial = new SkyMaterial({
        transmittanceTexture: textures.transmittanceTexture,
        scatteringTexture: textures.scatteringTexture,
        irradianceTexture: textures.irradianceTexture,
        sun: true,
        moon: false,
        ground: true,
        groundAlbedo: new THREE.Color(0.3, 0.3, 0.3)
      });

      // Create a large sphere for the sky
      const skyGeometry = new THREE.SphereGeometry(1000, 64, 32);
      skyGeometry.scale(-1, 1, 1); // Invert to show from inside
      const newSkyMesh = new THREE.Mesh(skyGeometry, this.skyMaterial);
      newSkyMesh.renderOrder = -1; // Render behind everything else

      // Replace existing basic sky if it exists
      if (this.skyMesh) {
        this.scene.remove(this.skyMesh);
        if (this.skyMesh.material && 'dispose' in this.skyMesh.material) {
          (this.skyMesh.material as THREE.Material).dispose();
        }
        this.skyMesh.geometry.dispose();
      }

      // Replace existing basic sun light if it exists
      if (this.sunLight && !(this.sunLight instanceof SunDirectionalLight)) {
        this.scene.remove(this.sunLight);
      }

      this.skyMesh = newSkyMesh;

      // Add components to the scene
      this.scene.add(this.sunLight);
      this.scene.add(this.skyMesh);

      console.log('✅ Advanced atmosphere setup completed successfully (upgraded from basic sky)');
    } catch (error) {
      console.warn('⚠️ Failed to load atmosphere textures, using basic sky:', error);
      this.setupBasicSky();
    }
  }

  private setupBasicSky() {
    // Fallback to basic sky if texture loading fails
    const skyGeometry = new THREE.SphereGeometry(1000, 64, 32);
    skyGeometry.scale(-1, 1, 1);
    
    this.skyMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), 0.6), 0.0)), 1.0);
        }
      `,
      uniforms: {
        topColor: { value: new THREE.Color(0x0077ff) },
        bottomColor: { value: new THREE.Color(0xffffff) }
      },
      side: THREE.BackSide
    });

    this.skyMesh = new THREE.Mesh(skyGeometry, this.skyMaterial);
    this.skyMesh.renderOrder = -1;
    this.scene.add(this.skyMesh);

    // Add basic sun light
    this.sunLight = new THREE.DirectionalLight(0xffffcc, 1.0);
    this.sunLight.position.set(0.0, 0.5, 0.5).normalize().multiplyScalar(1000);
    this.scene.add(this.sunLight);
  }

  public updateSunDirection(direction: THREE.Vector3) {
    if (this.sunLight) {
      if (this.sunLight instanceof SunDirectionalLight) {
        this.sunLight.sunDirection.copy(direction.clone().normalize());
        this.sunLight.update();
      } else {
        // Fallback for basic DirectionalLight
        this.sunLight.position.copy(direction.clone().normalize().multiplyScalar(1000));
      }
    }
  }

  public setSunIntensity(intensity: number) {
    if (this.sunLight) {
      this.sunLight.intensity = intensity;
    }
  }

  public getSkyMaterial(): SkyMaterial | THREE.ShaderMaterial | undefined {
    return this.skyMaterial;
  }

  public getSunLight(): SunDirectionalLight | THREE.DirectionalLight | undefined {
    return this.sunLight;
  }

  public async enableAdvancedAtmosphere(texturesUrl?: string): Promise<boolean> {
    if (texturesUrl) {
      this.texturesUrl = texturesUrl;
    }
    
    try {
      await this.setupAtmosphere();
      return true;
    } catch (error) {
      console.warn('⚠️ Failed to enable advanced atmosphere:', error);
      return false;
    }
  }

  public dispose() {
    if (this.skyMesh) {
      this.scene.remove(this.skyMesh);
      if (this.skyMaterial && 'dispose' in this.skyMaterial) {
        this.skyMaterial.dispose();
      }
      this.skyMesh.geometry.dispose();
    }
    if (this.sunLight) {
      this.scene.remove(this.sunLight);
    }
  }
}