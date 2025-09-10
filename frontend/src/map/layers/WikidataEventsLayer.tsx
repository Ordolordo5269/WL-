import { useEffect, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import { useWikidataEvents, EventType } from '../hooks/useWikidataEvents';
import { formatDateRange, titleOrFallback } from '../utils/format';

interface Props {
  map: mapboxgl.Map | null;
  days: number;
  types: EventType[];
  refreshKey?: number;
}

export default function WikidataEventsLayer({ map, days, types, refreshKey = 0 }: Props) {
  const { data, refresh } = useWikidataEvents({ days, types });

  const sourceId = 'wikidata-events-src';
  const layers = useMemo(() => ({
    clusters: 'wikidata-clusters',
    clusterCount: 'wikidata-cluster-count',
    unclustered: 'wikidata-unclustered'
  }), []);

  useEffect(() => {
    if (!map) return;
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 40,
        clusterMaxZoom: 12
      });
      map.addLayer({
        id: layers.clusters,
        type: 'circle',
        source: sourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            50,
            '#f1f075',
            200,
            '#f28cb1'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            15,
            50,
            20,
            200,
            25
          ]
        }
      });
      map.addLayer({
        id: layers.clusterCount,
        type: 'symbol',
        source: sourceId,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12
        }
      });
      map.addLayer({
        id: layers.unclustered,
        type: 'circle',
        source: sourceId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#11b4da',
          'circle-radius': 6,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff'
        }
      });

      map.on('click', layers.unclustered, (e) => {
        const feature = e.features && e.features[0];
        if (!feature) return;
        const props = feature.properties as any;
        const html = popupHtml(props);
        new mapboxgl.Popup({ closeOnMove: true })
          .setLngLat((feature.geometry as any).coordinates)
          .setHTML(html)
          .addTo(map);
      });
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData(data || { type: 'FeatureCollection', features: [] });
  }, [map, data]);

  useEffect(() => {
    refresh();
  }, [refreshKey]);

  return null;
}

function popupHtml(props: any) {
  const title = titleOrFallback(props.title);
  const type = props.type;
  const time = props.time || formatDateRange(props.range?.start, props.range?.end);
  const country = props.country || 'Unknown';
  const link = props.wp_en ? `<a class="text-blue-400 underline" target="_blank" rel="noopener" href="${props.wp_en}">Wikipedia</a>` : '';
  return `<div class="min-w-[220px]">
    <div class="font-semibold mb-1">${title}</div>
    <div class="text-xs text-gray-300">Type: ${type}</div>
    <div class="text-xs text-gray-300">When: ${time}</div>
    <div class="text-xs text-gray-300">Country: ${country}</div>
    <div class="mt-2">${link}</div>
  </div>`;
}

