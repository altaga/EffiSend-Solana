import { useMemo } from "react";
import { AREA_CONFIG, formatAmenityList, getAreaId, mixColors } from "./mapUtils";

export function useMapData(Amenities, Gates) {
  return useMemo(() => {
    const ids = Object.keys(AREA_CONFIG).map(Number);
    const combinations = [];
    
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idA = ids[i];
        const idB = ids[j];
        const nameA = AREA_CONFIG[idA].name.replace("Area", "").replace("Building", "Bldg").trim();
        const nameB = AREA_CONFIG[idB].name.replace("Area", "").replace("Building", "Bldg").trim();
        
        combinations.push({
          condition: [
            "all",
            [">", ["coalesce", ["get", `has_${idA}`], 0], 0],
            [">", ["coalesce", ["get", `has_${idB}`], 0], 0],
          ],
          color: mixColors(AREA_CONFIG[idA].color, AREA_CONFIG[idB].color),
          label: `${nameA} & ${nameB}`,
        });
      }
    }

    const groupedFeatures = {};
    Amenities.features.forEach((feature) => {
      const groupKey = feature.properties.facility || feature.geometry.coordinates.join(",");
      if (!groupedFeatures[groupKey]) groupedFeatures[groupKey] = [];
      groupedFeatures[groupKey].push(feature);
    });

    const mergedFeatures = Object.values(groupedFeatures).map((group) => {
      const baseFeature = group[0];
      const hasFacility = !!baseFeature.properties.facility;
      const [lng, lat] = baseFeature.geometry.coordinates;
      const combinedName = hasFacility
        ? baseFeature.properties.facility
        : formatAmenityList(group.map((f) => f.properties.name));
        
      const containedIds = group.map((f) => f.properties.id).join(",");

      return {
        ...baseFeature,
        properties: {
          ...baseFeature.properties,
          name: combinedName,
          category: hasFacility ? "facility" : baseFeature.properties.category,
          areaId: getAreaId(baseFeature.properties.area),
          contained_ids: containedIds,
          is_merged: group.length > 1,
          lng,
          lat,
        },
      };
    });

    const dataWithIds = { type: "FeatureCollection", features: mergedFeatures };

    const processedGates = {
      type: "FeatureCollection",
      features: Gates.features.map((f) => {
        const [lng, lat] = f.geometry.coordinates;
        const props = { ...f.properties, category: "gate", area: "Access Gate", areaId: 99, lng, lat };
        return {
          ...f,
          properties: { ...props, is_merged: false, contained_ids: f.properties.id },
        };
      }),
    };

    const clusterProps = {};
    ids.forEach((id) => {
      clusterProps[`has_${id}`] = ["+", ["case", ["==", ["get", "areaId"], id], 1, 0]];
    });

    const distinctZonesExpression = [
      "+",
      ...ids.map((id) => ["case", [">", ["coalesce", ["get", `has_${id}`], 0], 0], 1, 0]),
    ];

    return { dataWithIds, processedGates, combinations, clusterProps, distinctZonesExpression, ids };
  }, [Amenities, Gates]);
}