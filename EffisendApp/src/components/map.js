import {
  Camera,
  CircleLayer,
  MapView,
  ShapeSource,
  SymbolLayer,
  UserLocation,
  setAccessToken,
} from "@maplibre/maplibre-react-native";
import { memo, useMemo, useRef, useState } from "react";
import { View } from "react-native";

import { MapStyles } from "../core/styles";
import { normalizeFontSize } from "../core/utils";
import Amenities from "../datasets/amenities.json";
import Gates from "../datasets/gates.json";
import { MapSelectionModal } from "./MapSelectionModal";
import {
  AREA_CONFIG,
  GATE_CLUSTER_COLOR,
  GATE_MARKER_COLOR,
  GATE_MIN_ZOOM,
  GATE_TEXT_COLOR,
  OTHER_COLOR,
  TOKYO_DOME_CITY_COLOR,
  getAreaId
} from "./mapUtils";
import { useMapData } from "./useMapData";

setAccessToken(null);

const MyMap = memo(function MyMap() {
  const mapRef = useRef(null);
  const cameraRef = useRef(null);
  const [selectedPlaces, setSelectedPlaces] = useState([]);
  const [focusedPlace, setFocusedPlace] = useState(null);

  // --- Responsive Sizing ---
  const GATE_CLUSTER_RADIUS = normalizeFontSize(60);
  const GATE_TEXT_SIZE = normalizeFontSize(12);
  const CLUSTER_LABEL_SIZE = normalizeFontSize(12);
  const AMENITY_LABEL_SIZE = normalizeFontSize(12);

  // --- Data Processing ---
  const { dataWithIds, processedGates, combinations, clusterProps, distinctZonesExpression } = useMapData(Amenities, Gates);

  // --- Click Handler ---
  const onShapeSourcePress = async (e) => {
    const feature = e.features[0];
    if (!feature) return;

    // 1. Handle Cluster Click
    if (feature.properties.cluster) {
      const clusterId = feature.properties.cluster_id;
      const sourceId = feature.source; // Correctly get the source ID from the feature

      try {
        const expansionZoom = await mapRef.current.getClusterExpansionZoom(
          sourceId,
          clusterId,
        );
        cameraRef.current.setCamera({
          centerCoordinate: feature.geometry.coordinates,
          zoomLevel: expansionZoom + 0.5,
          animationDuration: 600,
        });
      } catch (err) {
        console.error("Cluster expansion error:", err);
      }
      return;
    }

    // 2. Handle Point Click
    const coordinates = feature.geometry.coordinates;
    const currentZoom = await mapRef.current.getZoom();

    cameraRef.current.setCamera({
      centerCoordinate: coordinates,
      zoomLevel: Math.max(currentZoom, 17.5),
      animationDuration: 500,
    });

    const clickedIds = feature.properties.contained_ids
      ? feature.properties.contained_ids.split(",")
      : [feature.properties.id];

    const allFeatures = [...Amenities.features, ...Gates.features];
    const clickedPlaces = clickedIds.map(id => {
      const original = allFeatures.find(f => f.properties.id === id);
      if (!original) return null;
      return {
        ...original.properties,
        lng: original.geometry?.coordinates?.[0] ?? coordinates[0],
        lat: original.geometry?.coordinates?.[1] ?? coordinates[1],
        areaId: getAreaId(original.properties.area || "Access Gate"),
        category: original.properties.category || (original.properties.id.includes("gate") ? "gate" : "default")
      };
    }).filter(Boolean);

    const uniquePlaces = clickedPlaces.filter(
      (v, i, a) => a.findIndex((t) => t.name === v.name) === i,
    );

    setSelectedPlaces(uniquePlaces);
    setFocusedPlace(uniquePlaces.length === 1 ? uniquePlaces[0] : null);
  };

  // --- Modal UI Handlers ---
  const handleClose = () => {
    setSelectedPlaces([]);
    setFocusedPlace(null);
  };

  // --- Memoized Styles ---
  const styles = useMemo(
    () => ({
      container: MapStyles.mapWebContainer,
      modalOverlay: MapStyles.mapModalOverlay,
      modalContent: MapStyles.mapModalContent,
      header: MapStyles.mapModalHeader,
      title: MapStyles.mapModalTitle,
      areaBadge: MapStyles.mapAreaBadge,
      closeIcon: MapStyles.mapCloseIcon,
      listItem: MapStyles.mapListItem,
      dot: MapStyles.mapDot,
      listItemText: MapStyles.mapListItemText,
      arrow: MapStyles.mapArrow,
      backArrow: MapStyles.mapBackArrow,
      desc: MapStyles.mapDesc,
      infoRow: MapStyles.mapInfoRow,
      label: MapStyles.mapLabel,
      value: MapStyles.mapValue,
      footer: MapStyles.mapFooter,
      btnPrimary: MapStyles.mapBtnPrimary,
      btnText: MapStyles.mapBtnText,
    }),
    [],
  );

  return (
    <View style={MapStyles.mapContainer}>
      <MapView
        ref={mapRef}
        style={MapStyles.mapView}
        styleURL="https://tiles.openfreemap.org/styles/positron"
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [139.753, 35.705],
            zoomLevel: 15.6,
          }}
        />
        <UserLocation />

        {/* Amenities Source & Layers */}
        <ShapeSource
          id="amenities"
          shape={dataWithIds}
          cluster
          clusterRadius={50}
          clusterProperties={clusterProps}
          onPress={onShapeSourcePress}
        >
          <CircleLayer
            id="amenities-clusters"
            filter={["has", "point_count"]}
            style={{
              circleColor: [
                "case",
                [">=", distinctZonesExpression, 3],
                TOKYO_DOME_CITY_COLOR,
                ["==", distinctZonesExpression, 2],
                [
                  "case",
                  ...combinations.flatMap((c) => [c.condition, c.color]),
                  "#777",
                ],
                [
                  "case",
                  ...Object.keys(AREA_CONFIG)
                    .map(Number)
                    .flatMap((id) => [
                      [">", ["coalesce", ["get", `has_${id}`], 0], 0],
                      AREA_CONFIG[id].color,
                    ]),
                  OTHER_COLOR,
                ],
              ],
              circleRadius: [
                "step",
                ["get", "point_count"],
                normalizeFontSize(24),
                5,
                normalizeFontSize(30),
                15,
                normalizeFontSize(38),
              ],
              circleStrokeWidth: normalizeFontSize(4),
              circleStrokeColor: "#ffffff",
              circleOpacity: 0.95,
            }}
          />

          <SymbolLayer
            id="amenities-cluster-labels"
            filter={["has", "point_count"]}
            style={{
              textField: [
                "case",
                [">=", distinctZonesExpression, 3],
                "Tokyo Dome\nCity",
                ["==", distinctZonesExpression, 2],
                [
                  "case",
                  ...combinations.flatMap((c) => [c.condition, c.label]),
                  "Mixed Zone",
                ],
                [
                  "case",
                  ...Object.keys(AREA_CONFIG)
                    .map(Number)
                    .flatMap((id) => [
                      [">", ["coalesce", ["get", `has_${id}`], 0], 0],
                      AREA_CONFIG[id].name,
                    ]),
                  "Zone",
                ],
              ],
              textFont: ["Open Sans Bold"],
              textSize: CLUSTER_LABEL_SIZE,
              textAnchor: "top",
              textOffset: [0, 2.2],
              textIgnorePlacement: true,
              textAllowOverlap: true,
              textColor: "#333",
              textHaloColor: "#fff",
              textHaloWidth: 2,
            }}
          />

          <SymbolLayer
            id="amenities-cluster-count"
            filter={["has", "point_count"]}
            style={{
              textField: "{point_count_abbreviated}",
              textSize: normalizeFontSize(13),
              textFont: ["Open Sans Bold"],
              textColor: "#ffffff",
            }}
          />

          <CircleLayer
            id="amenities-layer"
            filter={["!", ["has", "point_count"]]}
            style={{
              circleRadius: normalizeFontSize(12),
              circleStrokeWidth: 3,
              circleStrokeColor: "#ffffff",
              circleColor: [
                "match",
                ["get", "areaId"],
                ...Object.keys(AREA_CONFIG)
                  .map(Number)
                  .flatMap((id) => [id, AREA_CONFIG[id].color]),
                OTHER_COLOR,
              ],
            }}
          />

          <SymbolLayer
            id="amenities-labels"
            minZoomLevel={16.5}
            filter={["!", ["has", "point_count"]]}
            style={{
              textField: ["get", "name"],
              textFont: ["Open Sans Semibold"],
              textSize: AMENITY_LABEL_SIZE,
              textAnchor: "top",
              textOffset: [0, 1.2],
              textMaxWidth: 15,
              textIgnorePlacement: false,
              textAllowOverlap: false,
              textColor: "#57606F",
              textHaloColor: "#ffffff",
              textHaloWidth: 2,
            }}
          />
        </ShapeSource>

        {/* Gates Source & Layers */}
        <ShapeSource
          id="gates"
          shape={processedGates}
          cluster
          clusterRadius={GATE_CLUSTER_RADIUS}
          onPress={onShapeSourcePress}
        >
          <CircleLayer
            id="gates-clusters"
            minZoomLevel={GATE_MIN_ZOOM}
            filter={["has", "point_count"]}
            style={{
              circleColor: GATE_CLUSTER_COLOR,
              circleRadius: [
                "step",
                ["get", "point_count"],
                normalizeFontSize(18),
                5,
                normalizeFontSize(22),
                15,
                normalizeFontSize(26),
              ],
              circleStrokeWidth: 3,
              circleStrokeColor: "#ffffff",
              circleOpacity: 0.95,
            }}
          />

          <SymbolLayer
            id="gates-cluster-count"
            minZoomLevel={GATE_MIN_ZOOM}
            filter={["has", "point_count"]}
            style={{
              textField: "{point_count_abbreviated}",
              textSize: normalizeFontSize(12),
              textFont: ["Open Sans Bold"],
              textColor: "#ffffff",
            }}
          />

          <SymbolLayer
            id="gates-cluster-labels"
            minZoomLevel={GATE_MIN_ZOOM}
            filter={["has", "point_count"]}
            style={{
              textField: "Gates",
              textFont: ["Open Sans Bold"],
              textSize: CLUSTER_LABEL_SIZE,
              textAnchor: "top",
              textOffset: [0, 2.2],
              textIgnorePlacement: true,
              textAllowOverlap: true,
              textColor: "#333",
              textHaloColor: "#fff",
              textHaloWidth: 2,
            }}
          />

          <CircleLayer
            id="gates-layer"
            minZoomLevel={GATE_MIN_ZOOM}
            filter={["!", ["has", "point_count"]]}
            style={{
              circleRadius: normalizeFontSize(10),
              circleStrokeWidth: 3,
              circleStrokeColor: "#ffffff",
              circleColor: GATE_MARKER_COLOR,
            }}
          />

          <SymbolLayer
            id="gates-labels"
            minZoomLevel={16.5}
            filter={["!", ["has", "point_count"]]}
            style={{
              textField: ["get", "name"],
              textFont: ["Open Sans Semibold"],
              textSize: GATE_TEXT_SIZE,
              textAnchor: "top",
              textOffset: [0, 1.2],
              textIgnorePlacement: false,
              textAllowOverlap: false,
              textColor: GATE_TEXT_COLOR,
              textHaloColor: "#ffffff",
              textHaloWidth: 2,
            }}
          />
        </ShapeSource>
      </MapView>

      {/* Modal UI */}
      <MapSelectionModal
        selectedPlaces={selectedPlaces}
        focusedPlace={focusedPlace}
        setFocusedPlace={setFocusedPlace}
        handleClose={handleClose}
        styles={styles}
      />
    </View>
  );
});

export default MyMap;