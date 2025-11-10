import * as THREE from 'three';
import { TilesRenderer, B3DMLoader, PNTSLoader, I3DMLoader } from '3d-tiles-renderer';

export class GoogleEarthTilesSetup {
  private tilesRenderer: TilesRenderer | undefined;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private googleEarthUrl: string;
  private isLoaded = false;

  constructor(
    scene: THREE.Scene, 
    camera: THREE.Camera, 
    renderer: THREE.WebGLRenderer,
    apiKey?: string
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // Google Earth Enterprise 3D tiles URL
    // Note: You'll need to replace this with the actual Google Earth tiles URL
    // This is a placeholder - Google Earth tiles require proper authentication
    this.googleEarthUrl = apiKey 
      ? `https://tile.googleapis.com/v1/3dtiles/root.json?key=${apiKey}`
      : 'none'; // Will trigger fallback tile setup
    
    this.setupTilesRenderer();
  }

  private setupTilesRenderer() {
    // If no API key provided, go directly to fallback
    if (this.googleEarthUrl === 'none') {
      console.log('🌍 No Google Earth API key provided, using fallback tiles...');
      this.setupFallbackTiles();
      return;
    }
    
    try {
      console.log('🚀 Attempting Google Earth tiles with API key...');
      
      // Create the tiles renderer
      this.tilesRenderer = new TilesRenderer(this.googleEarthUrl);
      
      // Configure the tiles renderer
      this.configureTilesRenderer();
      
      // Set up loaders for different tile formats
      this.setupLoaders();
      
      // Add event listeners
      this.setupEventListeners();
      
      // Add to scene
      this.scene.add(this.tilesRenderer.group);
      
      console.log('✅ Google Earth 3D tiles setup initiated');
      
      // Set a timeout to fall back if loading takes too long
      setTimeout(() => {
        if (!this.isLoaded) {
          console.warn('⚠️ Google Earth tiles taking too long, switching to fallback...');
          if (this.tilesRenderer) {
            this.scene.remove(this.tilesRenderer.group);
            this.tilesRenderer.dispose();
          }
          this.setupFallbackTiles();
        }
      }, 10000); // 10 second timeout
      
    } catch (error) {
      console.error('❌ Failed to setup Google Earth tiles:', error);
      this.setupFallbackTiles();
    }
  }

  private configureTilesRenderer() {
    if (!this.tilesRenderer) return;

    // Configure rendering options
    this.tilesRenderer.setCamera(this.camera);
    this.tilesRenderer.setResolution(this.camera, 
        this.renderer.domElement.width, 
        this.renderer.domElement.height);
    
    // Configure LOD and performance settings
    this.tilesRenderer.errorTarget = 6; // Lower = higher quality, higher performance cost
    this.tilesRenderer.errorThreshold = 60; // Higher = lower quality, better performance
    this.tilesRenderer.maxDepth = 15; // Maximum tile depth to load
    this.tilesRenderer.displayActiveTiles = false; // Set to true for debugging
    
    // Configure loading behavior
    this.tilesRenderer.lruCache.minSize = 900;
    this.tilesRenderer.lruCache.maxSize = 1300;
    
    // Configure frustum culling
    this.tilesRenderer.optimizeRaycast = true;
  }

  private setupLoaders() {
    if (!this.tilesRenderer) return;

    try {
      // Set up loaders for different tile formats
      const manager = new THREE.LoadingManager();
      
      // B3DM loader for batched 3D models
      const b3dmLoader = new B3DMLoader(manager) as unknown as THREE.Loader;
      this.tilesRenderer.manager.addHandler(/\.b3dm$/, b3dmLoader);
      
      // PNTS loader for point clouds
      const pntsLoader = new PNTSLoader(manager) as unknown as THREE.Loader;
      this.tilesRenderer.manager.addHandler(/\.pnts$/, pntsLoader);
      
      // I3DM loader for instanced 3D models
      const i3dmLoader = new I3DMLoader(manager) as unknown as THREE.Loader;
      this.tilesRenderer.manager.addHandler(/\.i3dm$/, i3dmLoader);
    } catch (error) {
      console.warn('⚠️ Some loaders failed to initialize:', error);
    }
  }

  private setupEventListeners() {
    if (!this.tilesRenderer) return;

    // Handle tile load events
    this.tilesRenderer.addEventListener('load-tile-set', () => {
      console.log('📡 Tile set loaded');
      this.isLoaded = true;
      
      // Optionally adjust camera position based on tileset bounds
      this.adjustCameraToTileset();
    });

    this.tilesRenderer.addEventListener('load-model', (event) => {
      console.log('🏗️ Model loaded:', event);
    });

    this.tilesRenderer.addEventListener('dispose-model', (event) => {
      console.log('🗑️ Model disposed:', event);
    });

    // Handle errors - using string event type since tile-load-error might not be in the type map
    this.tilesRenderer.addEventListener('error' as string, (event) => {
      console.warn('⚠️ Tile load error:', event);
    });
  }

  private adjustCameraToTileset() {
    if (!this.tilesRenderer) return;

    try {
      const bounds = new THREE.Box3();
      
      // Use getOrientedBounds if available, fallback to manual calculation
      if ('getOrientedBounds' in this.tilesRenderer) {
        (this.tilesRenderer as TilesRenderer & { getOrientedBounds: (bounds: THREE.Box3) => THREE.Box3 }).getOrientedBounds(bounds);
      } else {
        bounds.setFromObject(this.tilesRenderer.group);
      }

      if (!bounds.isEmpty()) {
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        
        // Position camera to view the entire tileset
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = (this.camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
        const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2;
        
        this.camera.position.copy(center);
        this.camera.position.z += distance;
        this.camera.lookAt(center);
        
        console.log('📍 Camera adjusted to tileset bounds');
      }
    } catch (error) {
      console.warn('⚠️ Could not adjust camera to tileset:', error);
    }
  }

  private setupFallbackTiles() {
    console.log('🔄 Setting up fallback sample tiles...');
    
    // Try multiple working tileset URLs
    const fallbackUrls = [
      // Working Cesium Ion hosted samples
      'https://assets.cesium.com/43978/tileset.json', // Cesium World Terrain sample
      'https://assets.cesium.com/96188/tileset.json', // Buildings sample
      // Local generation as last resort
      'local-procedural'
    ];
    
    this.tryFallbackUrls(fallbackUrls);
  }

  private async tryFallbackUrls(urls: string[]) {
    for (const url of urls) {
      try {
        if (url === 'local-procedural') {
          this.createProceduralFallback();
          return;
        }
        
        console.log(`🔍 Trying fallback URL: ${url}`);
        this.tilesRenderer = new TilesRenderer(url);
        this.configureTilesRenderer();
        this.setupLoaders();
        this.setupEventListeners();
        this.scene.add(this.tilesRenderer.group);
        
        // Test if it loads within 5 seconds
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        const loadPromise = new Promise((resolve) => {
          if (this.tilesRenderer) {
            const handler = () => {
              resolve(undefined);
              this.tilesRenderer?.removeEventListener('load-tile-set', handler);
            };
            this.tilesRenderer.addEventListener('load-tile-set', handler);
          }
        });
        
        await Promise.race([loadPromise, timeout]);
        console.log(`✅ Successfully loaded tiles from: ${url}`);
        return;
        
      } catch (error) {
        console.warn(`⚠️ Failed to load from ${url}:`, error);
        if (this.tilesRenderer) {
          this.scene.remove(this.tilesRenderer.group);
          this.tilesRenderer.dispose();
        }
        continue;
      }
    }
  }

  private createProceduralFallback() {
    console.log('🏭 Creating procedural fallback geometry...');
    
    // Create a simple procedural "terrain" as final fallback
    const geometry = new THREE.PlaneGeometry(1000, 1000, 100, 100);
    
    // Add some height variation
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Create simple terrain-like elevation
      const height = Math.sin(vertex.x * 0.01) * Math.cos(vertex.y * 0.01) * 10 +
                     Math.sin(vertex.x * 0.05) * Math.cos(vertex.y * 0.05) * 5;
      vertex.z = height;
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshLambertMaterial({ 
      color: 0x8FBC8F,
      wireframe: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    
    // Create a group to mimic TilesRenderer.group
    const group = new THREE.Group();
    group.add(mesh);
    
    this.scene.add(group);
    
    // Create a mock tiles renderer object
    this.tilesRenderer = {
      group: group,
      dispose: () => {
        this.scene.remove(group);
        geometry.dispose();
        material.dispose();
      },
      update: () => {}, // No-op for procedural geometry
      getOrientedBounds: (target: THREE.Box3) => {
        target.setFromObject(mesh);
        return target;
      },
      raycastFirst: (raycaster: THREE.Raycaster, intersects: THREE.Intersection[] = []) => {
        return raycaster.intersectObject(mesh, false, intersects);
      },
      addEventListener: () => {},
      removeEventListener: () => {},
      manager: { addHandler: () => {} }
    } as unknown as TilesRenderer;
    
    this.isLoaded = true;
    console.log('✅ Procedural fallback terrain created');
  }

  public update() {
    if (this.tilesRenderer) {
      // Update tiles renderer - this should be called in the animation loop
      this.tilesRenderer.setCamera(this.camera);
      this.tilesRenderer.setResolution(
        this.renderer.domElement.width, 
        this.renderer.domElement.height
      );
      this.tilesRenderer.update();
    }
  }

  public setErrorTarget(errorTarget: number) {
    if (this.tilesRenderer) {
      this.tilesRenderer.errorTarget = errorTarget;
    }
  }

  public setMaxDepth(maxDepth: number) {
    if (this.tilesRenderer) {
      this.tilesRenderer.maxDepth = maxDepth;
    }
  }

  public toggleActiveTilesDisplay(show: boolean) {
    if (this.tilesRenderer) {
      this.tilesRenderer.displayActiveTiles = show;
    }
  }

  public getTilesRenderer(): TilesRenderer | undefined {
    return this.tilesRenderer;
  }

  public getLoadedStatus(): boolean {
    return this.isLoaded;
  }

  public getBounds(): THREE.Box3 | null {
    if (this.tilesRenderer) {
      const bounds = new THREE.Box3();
      try {
        // Use getOrientedBounds if available, fallback to manual calculation
        if ('getOrientedBounds' in this.tilesRenderer) {
          (this.tilesRenderer as TilesRenderer & { getOrientedBounds: (bounds: THREE.Box3) => THREE.Box3 }).getOrientedBounds(bounds);
        } else {
          bounds.setFromObject(this.tilesRenderer.group);
        }
        return bounds.isEmpty() ? null : bounds;
      } catch (error) {
        console.warn('⚠️ Failed to get tiles bounds:', error);
        return null;
      }
    }
    return null;
  }

  public raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[] = []): THREE.Intersection[] {
    if (this.tilesRenderer) {
      try {
        // Use raycastFirst if available, fallback to group raycast
        if ('raycastFirst' in this.tilesRenderer) {
          return (this.tilesRenderer as TilesRenderer & { raycastFirst: (raycaster: THREE.Raycaster, intersects?: THREE.Intersection[]) => THREE.Intersection[] }).raycastFirst(raycaster, intersects);
        } else {
          return raycaster.intersectObject(this.tilesRenderer.group, true, intersects);
        }
      } catch (error) {
        console.warn('⚠️ Failed to raycast tiles:', error);
      }
    }
    return [];
  }

  public dispose() {
    if (this.tilesRenderer) {
      this.scene.remove(this.tilesRenderer.group);
      this.tilesRenderer.dispose();
      this.tilesRenderer = undefined;
    }
    this.isLoaded = false;
    console.log('🧹 Google Earth tiles disposed');
  }
}