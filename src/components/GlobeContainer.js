/**
 * GlobeContainer.js - Cesium 3D Globe viewer with markers
 * ES module version
 */

import { getMapStyleForTheme } from '../config/themes.js';
import { resolveThemeColor } from '../utils/themeVars.js';

const EARTH_AT_NIGHT_SERVICE_URL = 'https://tiles.arcgis.com/tiles/P3ePLMYs2RVChkJx/arcgis/rest/services/Earth_at_Night_2016/MapServer';
const CLUSTER_GRID_METERS = 3200;
const MIN_OFFSET_METERS = 220;
const OFFSET_STEP_METERS = 120;
const OFFSETS_PER_RING = 6;
const METERS_PER_DEGREE_LAT = 1 / 111000;

function getClusterCellKey(lat, lon, cellDegrees) {
  const latIndex = Math.floor(lat / cellDegrees);
  const lonIndex = Math.floor(lon / cellDegrees);
  return `${latIndex}:${lonIndex}`;
}

function buildClusterMetadata(projects = []) {
  if (!Array.isArray(projects) || projects.length === 0) return new Map();
  const cellDegrees = CLUSTER_GRID_METERS * METERS_PER_DEGREE_LAT;
  const buckets = new Map();
  projects.forEach(project => {
    if (typeof project?.Latitude !== 'number' || typeof project?.Longitude !== 'number') return;
    const key = getClusterCellKey(project.Latitude, project.Longitude, cellDegrees);
    const bucket = buckets.get(key) || [];
    bucket.push(project);
    buckets.set(key, bucket);
  });

  const metadata = new Map();
  const rad = Math.PI / 180;
  buckets.forEach(bucket => {
    if (bucket.length <= 1) return;
    const angleIncrement = (Math.PI * 2) / bucket.length;
    bucket.forEach((project, index) => {
      const angle = angleIncrement * index;
      const ringLevel = Math.floor(index / OFFSETS_PER_RING);
      const radiusMeters = MIN_OFFSET_METERS + ringLevel * OFFSET_STEP_METERS;
      const latOffset = Math.sin(angle) * radiusMeters * METERS_PER_DEGREE_LAT;
      const cosLat = Math.cos((project.Latitude || 0) * rad) || 1;
      const lonOffset = Math.cos(angle) * radiusMeters * METERS_PER_DEGREE_LAT / cosLat;
      metadata.set(String(project.id), {
        latOffset,
        lonOffset,
        clusterSize: bucket.length
      });
    });
  });

  return metadata;
}

// Initial camera position - Sonora region with wide view
const INITIAL_CAMERA_CONFIG = {
  longitude: -110,    // Western Mexico
  latitude: 29,       // Northern Mexico (Sonora)
  altitude: 30000000  // 30M km altitude - see whole Earth with Sonora centered
};

/**
 * GlobeContainer Component
 *
 * RESPONSIBILITY:
 * - Initialize and manage Cesium 3D viewer
 * - Render project markers (Cesium points)
 * - Handle camera movements and animations
 * - Dispatch click events to parent
 *
 * PROPS:
 * - projects: Array of project objects
 * - selectedProject: Currently selected project
 * - onProjectClick: Callback when marker clicked
 */
export function GlobeContainer({
  projects = [],
  selectedProject = null,
  onProjectClick,
  onGlobeReady,
  theme = 'light',
  satelliteView = false,
  autoRotate = false,
  highlightRegion = false
}) {
  const { useEffect, useRef, useState } = React;
  const container3DRef = useRef(null);
  const view3DRef = useRef(null);
  const entitiesRef = useRef({}); // Map of project.id -> Cesium.Entity
  const spinListenerRef = useRef(null);
  const highlightPolygonRef = useRef(null);
  const [markersRevealed, setMarkersRevealed] = useState(false);
  const [viewerReady, setViewerReady] = useState(false);
  const [mapStyle, setMapStyle] = useState(() => satelliteView ? 'satellite' : getMapStyleForTheme(theme)); // 'light', 'dark', 'night', 'satellite'
  const revealTimeoutsRef = useRef([]);
  const clusterMetadata = React.useMemo(() => buildClusterMetadata(projects), [projects]);

  useEffect(() => {
    setMapStyle(prev => {
      const desired = satelliteView ? 'satellite' : getMapStyleForTheme(theme);
      return prev === desired ? prev : desired;
    });
  }, [theme, satelliteView]);



  // PERFORMANCE FLAGS
  const performanceFlags = React.useMemo(() => {
    return {
      isLowPower: !!window.MapAppPerf?.isLowPower,
      prefersReducedMotion: !!window.MapAppPerf?.prefersReducedMotion
    };
  }, []);


  // Initialize 3D viewer
  useEffect(() => {
    if (!container3DRef.current) return;
    if (view3DRef.current) return;

    try {
      // Get quality settings based on device capabilities
      const qualitySettings = window.MapAppPerf ? window.MapAppPerf.getQualitySettings() : {
        resolutionScale: 0.9,
        maximumScreenSpaceError: 3,
        msaaSamples: 2,
        antialias: true,
        maximumAnisotropy: 8,
        tileCacheSize: 100
      };

      // 3D Viewer options derived from CesiumConfig to avoid clashes
      const cfg = window.CesiumConfig && window.CesiumConfig.viewerOptions ? window.CesiumConfig.viewerOptions : {};
      // Map config strings to Cesium providers
      const terrainOpt = (cfg.terrainProvider === 'CESIUM_WORLD_TERRAIN')
        ? Cesium.Terrain.fromWorldTerrain()
        : undefined; // undefined => default flat terrain

      // Create free imagery provider view models for the base layer picker
      const imageryViewModels = [];

      // OpenStreetMap
      imageryViewModels.push(new Cesium.ProviderViewModel({
        name: 'OpenStreetMap',
        iconUrl: Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/openStreetMap.png'),
        tooltip: 'OpenStreetMap - Free, collaborative street map',
        creationFunction: function() {
          return new Cesium.UrlTemplateImageryProvider({
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            subdomains: ['a', 'b', 'c'],
            credit: new Cesium.Credit(' OpenStreetMap contributors')
          });
        }
      }));

      // CartoDB Dark Matter
      imageryViewModels.push(new Cesium.ProviderViewModel({
        name: 'CartoDB Dark',
        iconUrl: Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/mapboxSatellite.png'),
        tooltip: 'CartoDB Dark Matter - Beautiful dark theme',
        creationFunction: function() {
          return new Cesium.UrlTemplateImageryProvider({
            url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            subdomains: ['a', 'b', 'c', 'd'],
            credit: new Cesium.Credit(' CartoDB  OpenStreetMap contributors')
          });
        }
      }));

      // ESRI Dark Gray Canvas - Night Mode
      imageryViewModels.push(new Cesium.ProviderViewModel({
        name: 'Dark Vibe',
        iconUrl: Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/mapboxSatellite.png'),
        tooltip: 'ESRI Dark Gray',
        creationFunction: async function() {
          return await Cesium.ArcGisMapServerImageryProvider.fromUrl(
            'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer',
            {
              credit: new Cesium.Credit('Esri')
            }
          );
        }
      }));

      // ESRI World Imagery (Satellite) - needs async
      imageryViewModels.push(new Cesium.ProviderViewModel({
        name: 'ESRI Satellite',
        iconUrl: Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/esriWorldImagery.png'),
        tooltip: 'ESRI World Imagery - Free satellite view',
        creationFunction: async function() {
          return await Cesium.ArcGisMapServerImageryProvider.fromUrl(
            'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
            {
              credit: new Cesium.Credit(' Esri, Maxar, Earthstar Geographics')
            }
          );
        }
      }));

      const options3D = {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        imageryProviderViewModels: imageryViewModels,
        selectedImageryProviderViewModel: imageryViewModels[0], // Light (OpenStreetMap)
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        fullscreenButton: false,
        vrButton: false,
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
        terrain: terrainOpt,
        shadows: false,
        terrainExaggeration: 1.0,
        msaaSamples: qualitySettings.msaaSamples,
        orderIndependentTranslucency: false,
        contextOptions: {
          webgl: {
            alpha: false,
            depth: true,
            stencil: false,
            antialias: qualitySettings.antialias,
            powerPreference: 'high-performance'
          }
        }
      };

      // Create 3D viewer
      const view3D = new Cesium.Viewer(container3DRef.current, options3D);
      view3DRef.current = view3D;
      setViewerReady(true);
      applyQualitySettings(view3D, qualitySettings);

      const scene = view3D.scene;
      if (scene && scene.globe) {
        scene.globe.show = true;

        const globe = scene.globe;
        globe.depthTestAgainstTerrain = false;
        globe.enableLighting = false;
        globe.showWaterEffect = false;
        scene.skyAtmosphere.show = false;
        scene.fog.enabled = false;
        scene.globe.showGroundAtmosphere = false;
        scene.sun.show = false;
        scene.moon.show = false;
        view3D.targetFrameRate = 60;
        scene.screenSpaceCameraController.minimumZoomDistance = 100;
      }

      // Add 3D floating labels for major cities/regions
      const geoLabels = [
        { name: 'Arizona', lon: -111.5, lat: 34.5 },
        { name: 'Sonora', lon: -110.5, lat: 29.5 },
        { name: 'Phoenix', lon: -112.07, lat: 33.45 },
        { name: 'Tucson', lon: -110.97, lat: 32.22 },
        { name: 'Hermosillo', lon: -110.97, lat: 29.10 },
        { name: 'Nogales', lon: -110.94, lat: 31.34 },
        { name: 'Bisbee', lon: -109.90, lat: 31.45 }
      ];

      geoLabels.forEach(label => {
        view3D.entities.add({
          position: Cesium.Cartesian3.fromDegrees(label.lon, label.lat, 0),
          label: {
            text: label.name,
            font: 'bold 18px Arial',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            translucencyByDistance: new Cesium.NearFarScalar(1000000, 1.0, 3000000, 0.0),
            scale: 1.0,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        });
      });

      // Remove terrain options from the picker
      if (view3D.baseLayerPicker) {
        view3D.baseLayerPicker.viewModel.terrainProviderViewModels.removeAll();
      }

      // Optional globe lighting
      if (typeof cfg.enableLighting === 'boolean') {
        view3D.scene.globe.enableLighting = cfg.enableLighting;
      }
      if (cfg.initialTimeIso) {
        try {
          const t = Cesium.JulianDate.fromIso8601(cfg.initialTimeIso);
          view3D.clock.currentTime = t;
        } catch (e) {
          // Invalid time format, skip
        }
      }

      // Set initial camera position (configurable via INITIAL_CAMERA_CONFIG)
      view3D.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          INITIAL_CAMERA_CONFIG.longitude,
          INITIAL_CAMERA_CONFIG.latitude,
          INITIAL_CAMERA_CONFIG.altitude
        ),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: Cesium.Math.toRadians(0)
        }
      });

      // Setup click handler for 3D view
      const handler = new Cesium.ScreenSpaceEventHandler(view3D.scene.canvas);
      handler.setInputAction((click) => {
        const pickedObject = view3D.scene.pick(click.position);
        if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.projectData) {
          onProjectClick && onProjectClick(pickedObject.id.projectData);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      if (typeof onGlobeReady === 'function') {
        onGlobeReady();
      }

    } catch (error) {
      // Initialization failed, silently skip
    }

    // Cleanup
    return () => {
      clearRevealTimeouts();
      if (view3DRef.current) {
        view3DRef.current.destroy();
        view3DRef.current = null;
      }
      setViewerReady(false);
    };
  }, []);

  // Handle map style changes
  useEffect(() => {
    const view3D = view3DRef.current;
    if (!view3D || !viewerReady) return;

    const layers = view3D.imageryLayers;

    // Map style configurations
    const mapStyleConfigs = {
      light: {
        type: 'UrlTemplate',
        options: {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          subdomains: ['a', 'b', 'c'],
          credit: new Cesium.Credit('OpenStreetMap contributors')
        }
      },
      dark: {
        type: 'UrlTemplate',
        options: {
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          subdomains: ['a', 'b', 'c', 'd'],
          credit: new Cesium.Credit('CartoDB / OpenStreetMap')
        }
      },
      night: {
        type: 'ArcGis',
        url: EARTH_AT_NIGHT_SERVICE_URL,
        options: {
          credit: new Cesium.Credit('NASA Earth Observatory / Esri')
        }
      },
      satellite: {
        type: 'ArcGis',
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
        options: {
          credit: new Cesium.Credit('Esri')
        }
      }
    };

    const config = mapStyleConfigs[mapStyle] || mapStyleConfigs.light;
    if (!config) return;

    let cancelled = false;

    try {
      while (layers.length > 0) {
        layers.remove(layers.get(0), true);
      }

      const addProvider = (provider) => {
        if (!cancelled && provider) {
          layers.addImageryProvider(provider);
        }
      };

      if (config.type === 'UrlTemplate') {
        const provider = new Cesium.UrlTemplateImageryProvider(config.options);
        addProvider(provider);
      } else if (config.type === 'ArcGis') {
        Cesium.ArcGisMapServerImageryProvider.fromUrl(config.url, config.options)
          .then(addProvider)
          .catch(() => {});
      }
    } catch (error) {
      // Map style switch failed, silently skip
    }

    return () => {
      cancelled = true;
    };
  }, [mapStyle, viewerReady]);

  // Update markers when projects change
  useEffect(() => {
    const view3D = view3DRef.current;
    if (!view3D || !Array.isArray(projects)) return;

    const existingEntities = entitiesRef.current;
    const nextIds = new Set();
    const validProjects = [];

    projects.forEach(project => {
      if (!project) return;
      if (typeof project.Latitude !== 'number' || typeof project.Longitude !== 'number') return;
      const projectId = project.id;
      if (projectId === null || projectId === undefined) return;
      const entityId = String(projectId);
      nextIds.add(entityId);
      validProjects.push({ project, entityId });
    });

    Object.entries(existingEntities).forEach(([entityId, entity]) => {
      if (!nextIds.has(entityId)) {
        if (entity) {
          view3D.entities.remove(entity);
        }
        delete existingEntities[entityId];
      }
    });

    const newlyCreated = [];

    validProjects.forEach(({ project, entityId }) => {
      const existing = existingEntities[entityId];
      const clusterInfo = clusterMetadata.get(entityId);
      const latitude = project.Latitude + (clusterInfo?.latOffset || 0);
      const longitude = project.Longitude + (clusterInfo?.lonOffset || 0);
      const entityProjectData = clusterInfo && clusterInfo.clusterSize > 1
        ? { ...project, clusterSize: clusterInfo.clusterSize }
        : project;
      if (existing) {
        existing.projectData = entityProjectData;
        existing.position = Cesium.Cartesian3.fromDegrees(longitude, latitude);
        return;
      }

      const entity = view3D.entities.add({
        position: Cesium.Cartesian3.fromDegrees(
          longitude,
          latitude
        ),
        point: {
          pixelSize: 8,
          color: Cesium.Color.SKYBLUE,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        projectData: entityProjectData
      });

      existingEntities[entityId] = entity;
      newlyCreated.push(entity);
    });

    if (!markersRevealed) {
      revealMarkers();
    } else if (newlyCreated.length > 0) {
      revealMarkers(newlyCreated);
    }
  }, [projects, selectedProject, clusterMetadata]);

  // Fly to selected project
  useEffect(() => {
    const view3D = view3DRef.current;
    if (!view3D || !selectedProject) return;

    view3D.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        selectedProject.Longitude,
        selectedProject.Latitude,
        50000
      ),
      duration: 2.0,
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: Cesium.Math.toRadians(0)
      }
    });

  }, [selectedProject]);

  useEffect(() => {
    const view3D = view3DRef.current;
    Object.values(entitiesRef.current).forEach(entity => {
      if (!entity || !entity.projectData) return;
      const isSelected = !!(selectedProject && entity.projectData.id === selectedProject.id);

      if (isSelected && view3D) {
        view3D.selectedEntity = entity;
      }
    });

    if (!selectedProject && view3D) {
      view3D.selectedEntity = undefined;
    }
  }, [selectedProject]);

  function clearRevealTimeouts() {
    if (!Array.isArray(revealTimeoutsRef.current)) {
      revealTimeoutsRef.current = [];
      return;
    }
    revealTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    revealTimeoutsRef.current = [];
  }

  function applyQualitySettings(viewer, settings) {
    if (!viewer || !settings) return;
    try {
      if (typeof settings.resolutionScale === 'number') {
        viewer.resolutionScale = settings.resolutionScale;
      }

      const scene = viewer.scene;
      if (scene) {
        if (typeof settings.msaaSamples === 'number' && 'msaaSamples' in scene) {
          scene.msaaSamples = settings.msaaSamples;
        }
        if (typeof settings.antialias === 'boolean') {
          if ('fxaa' in scene) {
            scene.fxaa = settings.antialias;
          }
          if (scene.postProcessStages && scene.postProcessStages.fxaa) {
            scene.postProcessStages.fxaa.enabled = settings.antialias;
          }
        }
        if (scene.globe) {
          if (typeof settings.maximumScreenSpaceError === 'number') {
            scene.globe.maximumScreenSpaceError = settings.maximumScreenSpaceError;
          }
          if (typeof settings.tileCacheSize === 'number') {
            scene.globe.tileCacheSize = settings.tileCacheSize;
          }
          if (typeof settings.maximumAnisotropy === 'number' &&
              scene.globe.maximumAnisotropy !== undefined) {
            scene.globe.maximumAnisotropy = settings.maximumAnisotropy;
          }
        }
        if (typeof scene.requestRender === 'function') {
          scene.requestRender();
        }
      }
    } catch (error) {
      // Quality settings update failed, silently skip
    }
  }

  // Reveal markers with a gentle stagger
  function revealMarkers(targetEntities) {
    const view3D = view3DRef.current;
    if (!view3D) return;
    const prefersReduced = performanceFlags.prefersReducedMotion;
    const entities = Array.isArray(targetEntities) && targetEntities.length > 0
      ? targetEntities
      : Object.values(entitiesRef.current);
    if (!entities.length) return;

    clearRevealTimeouts();

    entities.forEach((entity, idx) => {
      const delay = (prefersReduced || performanceFlags.isLowPower) ? 0 : Math.min(idx * 50, 800);
      const reveal = () => {
        if (!entity || (typeof entity.isDestroyed === 'function' && entity.isDestroyed())) return;
        if (entity.point) {
          entity.point.pixelSize = 8;
        }
      };

      if (delay > 0) {
        const timeoutId = setTimeout(reveal, delay);
        revealTimeoutsRef.current.push(timeoutId);
      } else {
        reveal();
      }
    });
    setMarkersRevealed(true);
  }

  // Camera animation to configured center
  function flyToBorderlands(onComplete, instantOverride) {
    const view3D = view3DRef.current;
    if (!view3D) return;
    const { lat, lon, alt } = window.CesiumConfig.camera.center;
    const prefersReduced = performanceFlags.prefersReducedMotion;
    const duration = instantOverride || prefersReduced || performanceFlags.isLowPower ? 0 : 5.0;

    const scene = view3D.scene;
    let restoreQuality;
    if (scene && scene.globe) {
      const globe = scene.globe;
      const original = globe.maximumScreenSpaceError;
      const boosted = performanceFlags.isLowPower ? Math.max(original, 12) : Math.max(original * 1.5, original + 2);
      globe.maximumScreenSpaceError = boosted;
      restoreQuality = () => {
        globe.maximumScreenSpaceError = original;
        scene.requestRender();
      };
    }

    view3D.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
      orientation: {
        heading: Cesium.Math.toRadians(window.CesiumConfig.camera.heading || 0),
        pitch: Cesium.Math.toRadians(-90),
        roll: Cesium.Math.toRadians(window.CesiumConfig.camera.roll || 0)
      },
      duration,
      complete: () => {
        if (typeof restoreQuality === 'function') restoreQuality();
        if (typeof onComplete === 'function') onComplete();
      }
    });
  }

  // Render border wall with effect
  useEffect(() => {
    if (!viewerReady) return;
    const view3D = view3DRef.current;
    const borderConfig = window.MapAppData && window.MapAppData.borderWall;
    if (!view3D || !borderConfig || !Array.isArray(borderConfig.positions)) return;

    const coordinates = [];
    const minHeights = [];
    const maxHeights = [];
    const capHeights = [];
    const baseHeight = borderConfig.baseHeightMeters ?? 0;
    const wallHeight = borderConfig.heightMeters ?? 1400;
    const widthMeters = borderConfig.widthMeters ?? 5000;

    borderConfig.positions.forEach(point => {
      if (typeof point.lon !== 'number' || typeof point.lat !== 'number') return;
      coordinates.push(point.lon, point.lat);
      const pointBase = point.baseHeight ?? baseHeight;
      const pointTop = point.height ?? (baseHeight + wallHeight);
      minHeights.push(pointBase);
      maxHeights.push(pointTop);
      capHeights.push(point.lon, point.lat, pointTop + (borderConfig.capHeightOffset ?? 0));
    });

    if (coordinates.length < 4) return;

    const createdEntities = [];
    const registerEntity = (options) => {
      const entity = view3D.entities.add(options);
      createdEntities.push(entity);
      return entity;
    };

    const borderMaterial = borderConfig.material || {};
    const fallbackFaceColor = resolveThemeColor('var(--border-wall-face, #ff6a3d)', '#ff6a3d');
    const fallbackOuterColor = resolveThemeColor('var(--border-wall-color, #f97316)', '#f97316');
    const fallbackOutlineColor = resolveThemeColor('var(--border-wall-outline, #7a3f00)', '#7a3f00');
    const fallbackGlowColor = resolveThemeColor('var(--border-wall-glow, #ffd166)', '#ffd166');

    const faceColor = Cesium.Color
      .fromCssColorString(resolveThemeColor(borderMaterial.face || borderMaterial.color, fallbackFaceColor))
      .withAlpha(0.9);
    const outerColor = Cesium.Color
      .fromCssColorString(resolveThemeColor(borderMaterial.color, fallbackOuterColor))
      .withAlpha(0.7);
    const outlineColor = Cesium.Color
      .fromCssColorString(resolveThemeColor(borderMaterial.outline, fallbackOutlineColor))
      .withAlpha(0.6);
    const glowColor = Cesium.Color
      .fromCssColorString(resolveThemeColor(borderMaterial.glow, fallbackGlowColor))
      .withAlpha(0.95);

    registerEntity({
      name: borderConfig.name || 'Border Wall - Face',
      wall: {
        positions: Cesium.Cartesian3.fromDegreesArray(coordinates),
        minimumHeights: minHeights,
        maximumHeights: maxHeights,
        material: outerColor,
        outline: true,
        outlineColor: outlineColor
      }
    });

    registerEntity({
      name: borderConfig.name || 'Border Wall - Volume',
      corridor: {
        positions: Cesium.Cartesian3.fromDegreesArray(coordinates),
        width: widthMeters,
        height: baseHeight,
        extrudedHeight: baseHeight + wallHeight,
        material: faceColor,
        outline: true,
        outlineColor: outlineColor,
        cornerType: Cesium.CornerType.BEVELED
      }
    });

    registerEntity({
      name: borderConfig.name || 'Border Wall - Spine',
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(capHeights),
        width: borderConfig.capWidth || 6,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.3,
          color: glowColor
        })
      }
    });

    return () => {
      if (!view3D) return;
      createdEntities.forEach(entity => {
        if (!entity) return;
        if (typeof entity.isDestroyed === 'function') {
          if (!entity.isDestroyed()) {
            view3D.entities.remove(entity);
          }
        } else {
          view3D.entities.remove(entity);
        }
      });
    };
  }, [viewerReady]);

  // Handle auto-rotate
  useEffect(() => {
    const view3D = view3DRef.current;
    if (!view3D || !viewerReady || !autoRotate) return;

    const spinRate = 0.02;
    let previousTime = Date.now();
    let isSpinning = true;

    const listener = view3D.clock.onTick.addEventListener(() => {
      if (!isSpinning) return;
      
      const currentTime = Date.now();
      const delta = (currentTime - previousTime) / 1000;
      previousTime = currentTime;
      view3D.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -spinRate * delta);
    });

    spinListenerRef.current = listener;

    return () => {
      isSpinning = false;
      if (listener && view3D.clock.onTick) {
        view3D.clock.onTick.removeEventListener(listener);
      }
      spinListenerRef.current = null;
    };
  }, [autoRotate, viewerReady]);

  // Handle region highlight polygon
  useEffect(() => {
    const view3D = view3DRef.current;
    if (!view3D || !viewerReady) return;

    // Clean up existing polygon if any
    if (highlightPolygonRef.current && view3D.entities.contains(highlightPolygonRef.current)) {
      view3D.entities.remove(highlightPolygonRef.current);
      highlightPolygonRef.current = null;
    }

    if (highlightRegion) {
      // Create a semi-transparent polygon around Arizona-Sonora border region
      // Approximate bounds: Arizona/Sonora area
      const entity = view3D.entities.add({
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray([
            -114.8, 36.5,  // NW corner
            -109.0, 36.5,  // NE corner
            -109.0, 31.3,  // SE corner
            -114.8, 31.3   // SW corner
          ]),
          material: Cesium.Color.fromAlpha(
            Cesium.Color.fromCssColorString('#FF6B35'),
            0.25
          ),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#FF6B35'),
          outlineWidth: 2
        }
      });

      highlightPolygonRef.current = entity;
      view3D.scene.requestRender();
    } else {
      // Ensure polygon is removed
      if (highlightPolygonRef.current && view3D.entities.contains(highlightPolygonRef.current)) {
        view3D.entities.remove(highlightPolygonRef.current);
        highlightPolygonRef.current = null;
      }
      view3D.scene.requestRender();
    }

    return () => {
      if (highlightPolygonRef.current && view3D.entities.contains(highlightPolygonRef.current)) {
        view3D.entities.remove(highlightPolygonRef.current);
        highlightPolygonRef.current = null;
      }
    };
  }, [highlightRegion, viewerReady]);

  // Render 3D globe
  const containerClasses = ['globe-container'];
  if (performanceFlags.isLowPower || performanceFlags.prefersReducedMotion) {
    containerClasses.push('low-power');
  }

  return React.createElement('div', {
    className: containerClasses.join(' '),
    role: 'application',
    'aria-label': '3D Globe Map'
  },
    React.createElement('div', {
      ref: container3DRef,
      className: 'globe-viewer',
      'aria-label': '3D Map View'
    })
  );
}
