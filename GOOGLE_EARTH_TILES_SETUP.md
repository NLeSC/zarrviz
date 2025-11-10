# Google Earth 3D Tiles Configuration

## Setup Guide

Your scene has been successfully configured to use Google Earth 3D tiles instead of the basic surface. Here's what you need to know:

### 🔑 API Key (Optional but Recommended)

For production use with actual Google Earth tiles, you'll need a Google Maps API key with the **Photorealistic 3D Tiles API** enabled.

1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the "Photorealistic 3D Tiles API" 
3. Pass it to the GoogleEarthTilesSetup constructor:

```typescript
// In create3DScene.ts, update this line:
googleEarthTilesSetup = new GoogleEarthTilesSetup(scene, camera, renderer, "YOUR_API_KEY_HERE");
```

### 🌍 Current Configuration

**Fallback Mode**: Currently using sample Cesium 3D tiles as a demonstration. The system will automatically fall back to these sample tiles if Google Earth tiles are unavailable.

**Camera Settings**: 
- FOV: 45° (optimized for Earth viewing)
- Near plane: 0.1 (detailed close-up viewing)
- Far plane: 10,000 (wide area coverage)
- Distance range: 1 - 5000 units

### 🎮 New Controls Available

```typescript
// Adjust tile quality (lower = higher quality, slower)
setTilesErrorTarget(6); // Range: 1-20, default: 6

// Control maximum tile depth
setTilesMaxDepth(15); // Range: 5-20, default: 15

// Debug: Show active tile boundaries
toggleTilesDebug(true);

// Access the tiles renderer directly
const tilesRenderer = getTilesRenderer();

// Get tiles bounding box
const bounds = getTilesBounds();

// Raycast against tiles for interaction
const intersections = raycastTiles(raycaster);
```

### 🚀 Performance Tips

1. **Error Target**: Lower values (1-3) = high quality but slower loading
2. **Max Depth**: Higher values (15-20) = more detail but more memory usage
3. **Cache Settings**: Automatically configured for optimal performance

### 🔄 What Changed

- ✅ **Replaced**: Basic plane surface → Google Earth 3D tiles
- ✅ **Enhanced**: Camera controls for geospatial navigation  
- ✅ **Added**: Automatic LOD (Level of Detail) management
- ✅ **Added**: Tile caching and performance optimization
- ✅ **Kept**: Atmospheric rendering (works with tiles)

### 🐛 Troubleshooting

**❌ 404 Error for atmosphere textures?**
- **FIXED**: Basic sky is now used by default to prevent loading errors
- Advanced atmosphere textures are disabled by default
- To enable: `await enableAdvancedAtmosphere("your-texture-url-here")`

**Tiles not loading?**
- Check browser console for API key errors
- Verify internet connection
- Sample tiles will load as fallback

**Performance issues?**
- Increase `errorTarget` value (6-12)
- Decrease `maxDepth` value (8-12)
- Check hardware acceleration is enabled

**Camera too fast/slow?**
- Adjust `dampingFactor` in CameraControls
- Modify `minDistance`/`maxDistance` ranges

**Want advanced atmosphere back?**
```typescript
// Try to enable advanced atmosphere with working texture URL
const success = await enableAdvancedAtmosphere();
console.log(success ? 'Advanced atmosphere enabled!' : 'Still using basic sky');
```

Enjoy your new Google Earth 3D tiles integration! 🌍