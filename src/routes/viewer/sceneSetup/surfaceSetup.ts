import * as THREE from 'three';
import { Ellipsoid } from '@takram/three-geospatial';

export class SurfaceSetup {
  private surface: THREE.Mesh | undefined;
  private surfaceMaterial: THREE.Material | undefined;
  private scene: THREE.Scene;
  private ellipsoid: Ellipsoid;

  constructor(scene: THREE.Scene, ellipsoid?: Ellipsoid) {
    this.scene = scene;
    this.ellipsoid = ellipsoid || Ellipsoid.WGS84;
    this.setupSurface();
  }

  private setupSurface() {
    try {
      // Create an enhanced surface material with geospatial features
      this.surfaceMaterial = this.createGeospatialSurfaceMaterial();
      
      // Create surface geometry - enhanced plane for geospatial representation
      const surfaceGeometry = this.createSurfaceGeometry();
      
      // Create the surface mesh
      this.surface = new THREE.Mesh(surfaceGeometry, this.surfaceMaterial);
      this.surface.name = 'GeospatialSurface';
      
      // Position the surface at ground level
      this.surface.position.set(0, 0, 0);
      
      // Add to scene
      this.scene.add(this.surface);
      
      console.log('✅ Geospatial surface setup completed successfully');
    } catch (error) {
      console.warn('⚠️ Failed to setup geospatial surface, using basic surface:', error);
      this.setupBasicSurface();
    }
  }

  private createGeospatialSurfaceMaterial(): THREE.Material {
    // Enhanced shader material with geospatial features like terrain elevation, 
    // coordinate transformations, and proper Earth curvature representation
    return new THREE.ShaderMaterial({
      vertexShader: `
        uniform mat4 worldToECEF;
        uniform vec3 ellipsoidRadii;
        uniform float heightScale;
        
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vEcefPosition;
        varying float vElevation;
        
        void main() {
          vUv = uv;
          
          // Get world position
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          
          // Transform to ECEF (Earth-Centered, Earth-Fixed) coordinates
          vEcefPosition = (worldToECEF * worldPosition).xyz;
          
          // Calculate elevation based on distance from ellipsoid center
          float distanceFromCenter = length(vEcefPosition);
          float ellipsoidRadius = length(ellipsoidRadii);
          vElevation = (distanceFromCenter - ellipsoidRadius) * heightScale;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D mapTexture;
        uniform vec3 lightDirection;
        uniform float ambientIntensity;
        uniform float diffuseIntensity;
        uniform vec3 surfaceColor;
        
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying vec3 vEcefPosition;
        varying float vElevation;
        
        void main() {
          // Sample the map texture
          vec4 mapColor = texture2D(mapTexture, vUv);
          
          // Calculate normal from ECEF position (pointing outward from Earth center)
          vec3 normal = normalize(vEcefPosition);
          
          // Simple lighting calculation
          float NdotL = max(dot(normal, normalize(lightDirection)), 0.0);
          float lighting = ambientIntensity + diffuseIntensity * NdotL;
          
          // Apply elevation-based color variation
          vec3 elevationColor = mix(
            vec3(0.2, 0.4, 0.8), // Sea level color (blue)
            vec3(0.4, 0.6, 0.2), // High elevation color (green)
            clamp(vElevation * 0.01, 0.0, 1.0)
          );
          
          // Combine map texture with elevation and surface color
          vec3 finalColor = mix(mapColor.rgb, elevationColor, 0.3) * surfaceColor * lighting;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      uniforms: {
        mapTexture: { value: this.loadMapTexture() },
        worldToECEF: { value: new THREE.Matrix4() },
        ellipsoidRadii: { value: new THREE.Vector3(
          this.ellipsoid.radii.x,
          this.ellipsoid.radii.y,
          this.ellipsoid.radii.z
        )},
        heightScale: { value: 1.0 },
        lightDirection: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
        ambientIntensity: { value: 0.3 },
        diffuseIntensity: { value: 0.7 },
        surfaceColor: { value: new THREE.Color(1.0, 1.0, 1.0) }
      },
      transparent: false,
      side: THREE.DoubleSide
    });
  }

  private createSurfaceGeometry(): THREE.BufferGeometry {
    // Create a more detailed plane geometry for better geospatial representation
    const width = 1000; // Scene units
    const height = 1000; // Scene units
    const widthSegments = 64; // More segments for detail
    const heightSegments = 64;
    
    const geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
    
    // Add some subtle surface variation for realism
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Add subtle height variation based on position
      const heightVariation = Math.sin(vertex.x * 0.01) * Math.cos(vertex.y * 0.01) * 0.5;
      vertex.z += heightVariation;
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geometry.computeVertexNormals();
    return geometry;
  }

  private loadMapTexture(): THREE.Texture {
    const textureLoader = new THREE.TextureLoader();
    // Load the existing map texture
    const texture = textureLoader.load('/maps/nl_map 50m per pixel.webp');
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  private setupBasicSurface() {
    // Fallback to enhanced basic surface
    const geometry = new THREE.PlaneGeometry(1000, 1000, 32, 32);
    const material = new THREE.MeshLambertMaterial({
      map: this.loadMapTexture(),
      color: 0xffffff
    });
    
    this.surface = new THREE.Mesh(geometry, material);
    this.surface.name = 'BasicSurface';
    this.scene.add(this.surface);
    this.surfaceMaterial = material;
  }

  public updateWorldToECEF(matrix: THREE.Matrix4) {
    if (this.surfaceMaterial && 'uniforms' in this.surfaceMaterial) {
      const uniforms = (this.surfaceMaterial as THREE.ShaderMaterial).uniforms;
      if (uniforms.worldToECEF) {
        uniforms.worldToECEF.value.copy(matrix);
      }
    }
  }

  public updateLightDirection(direction: THREE.Vector3) {
    if (this.surfaceMaterial && 'uniforms' in this.surfaceMaterial) {
      const uniforms = (this.surfaceMaterial as THREE.ShaderMaterial).uniforms;
      if (uniforms.lightDirection) {
        uniforms.lightDirection.value.copy(direction.normalize());
      }
    }
  }

  public setSurfaceColor(color: THREE.Color) {
    if (this.surfaceMaterial && 'uniforms' in this.surfaceMaterial) {
      const uniforms = (this.surfaceMaterial as THREE.ShaderMaterial).uniforms;
      if (uniforms.surfaceColor) {
        uniforms.surfaceColor.value.copy(color);
      }
    } else if (this.surfaceMaterial && 'color' in this.surfaceMaterial) {
      (this.surfaceMaterial as THREE.MeshLambertMaterial).color.copy(color);
    }
  }

  public getSurface(): THREE.Mesh | undefined {
    return this.surface;
  }

  public getSurfaceMaterial(): THREE.Material | undefined {
    return this.surfaceMaterial;
  }

  public dispose() {
    if (this.surface) {
      this.scene.remove(this.surface);
      if (this.surfaceMaterial) {
        this.surfaceMaterial.dispose();
      }
      this.surface.geometry.dispose();
    }
  }
}