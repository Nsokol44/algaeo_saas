// Sentinel Hub / Copernicus satellite imagery utilities
// Works without API key — layers simply don't render if unconfigured

const SENTINEL_BASE = 'https://services.sentinel-hub.com';

// Build NDVI WMS URL — returns empty if no instance ID configured
export function getNDVITileUrl(instanceId) {
  if (!instanceId) return null;
  return `${SENTINEL_BASE}/ogc/wms/${instanceId}?SERVICE=WMS&REQUEST=GetMap&LAYERS=NDVI&MAXCC=20&WIDTH=512&HEIGHT=512&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&FORMAT=image/png&TRANSPARENT=true&TIME=P1M`;
}

// Build True Color WMS URL
export function getTrueColorTileUrl(instanceId) {
  if (!instanceId) return null;
  return `${SENTINEL_BASE}/ogc/wms/${instanceId}?SERVICE=WMS&REQUEST=GetMap&LAYERS=TRUE-COLOR&MAXCC=20&WIDTH=512&HEIGHT=512&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&FORMAT=image/png&TRANSPARENT=false&TIME=P1M`;
}

// NDVI color ramp — value -1 to 1 → color
export function ndviToColor(value) {
  if (value < 0)    return '#7b3f00'; // bare/water — brown
  if (value < 0.2)  return '#f87171'; // stressed — red
  if (value < 0.35) return '#fbbf24'; // sparse — amber
  if (value < 0.5)  return '#a3e635'; // moderate — yellow-green
  if (value < 0.7)  return '#4ade80'; // healthy — green
  return '#166534';                    // dense — dark green
}

// NDVI legend entries
export const NDVI_LEGEND = [
  { color: '#7b3f00', label: 'Bare / Water',    range: '< 0' },
  { color: '#f87171', label: 'Stressed',         range: '0 – 0.2' },
  { color: '#fbbf24', label: 'Sparse Vegetation',range: '0.2 – 0.35' },
  { color: '#a3e635', label: 'Moderate',         range: '0.35 – 0.5' },
  { color: '#4ade80', label: 'Healthy',          range: '0.5 – 0.7' },
  { color: '#166534', label: 'Dense / Peak',     range: '> 0.7' },
];

// Add satellite layers to a MapLibre map instance
// Safe to call even without instanceId — just skips layer addition
export function addSatelliteLayers(map, instanceId, activeLayer = 'ndvi') {
  if (!instanceId) return;

  const ndviUrl = getNDVITileUrl(instanceId);
  const tcUrl = getTrueColorTileUrl(instanceId);

  if (!map.getSource('sentinel-ndvi') && ndviUrl) {
    map.addSource('sentinel-ndvi', {
      type: 'raster',
      tiles: [ndviUrl],
      tileSize: 512,
      attribution: '© Sentinel Hub, ESA Copernicus',
    });
    map.addLayer({
      id: 'ndvi-layer',
      type: 'raster',
      source: 'sentinel-ndvi',
      paint: { 'raster-opacity': 0.75 },
      layout: { visibility: activeLayer === 'ndvi' ? 'visible' : 'none' },
    }, 'soil-samples'); // insert below sample pins if that layer exists
  }

  if (!map.getSource('sentinel-truecolor') && tcUrl) {
    map.addSource('sentinel-truecolor', {
      type: 'raster',
      tiles: [tcUrl],
      tileSize: 512,
      attribution: '© Sentinel Hub, ESA Copernicus',
    });
    map.addLayer({
      id: 'truecolor-layer',
      type: 'raster',
      source: 'sentinel-truecolor',
      paint: { 'raster-opacity': 1 },
      layout: { visibility: activeLayer === 'truecolor' ? 'visible' : 'none' },
    }, 'soil-samples');
  }
}

export function switchSatelliteLayer(map, layer) {
  if (!map) return;
  try {
    if (map.getLayer('ndvi-layer')) map.setLayoutProperty('ndvi-layer', 'visibility', layer === 'ndvi' ? 'visible' : 'none');
    if (map.getLayer('truecolor-layer')) map.setLayoutProperty('truecolor-layer', 'visibility', layer === 'truecolor' ? 'visible' : 'none');
  } catch (e) { /* layers not yet loaded */ }
}
