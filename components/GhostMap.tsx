import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { ParanormalEvent, EventType, Intensity } from '../types';
import { BookOpenCheck, Wifi, WifiOff } from 'lucide-react';
import { TURTLE_MOUNTAIN_BOUNDS } from '../constants';

interface GhostMapProps {
  width: number;
  height: number;
  events: ParanormalEvent[];
  onQueryCodex: (event: ParanormalEvent) => void;
}

type TooltipData = {
  x: number;
  y: number;
  event: ParanormalEvent;
};

const generateRandomPointsInBounds = (count: number): { lon: number, lat: number }[] => {
    const [[lonMin, latMin], [lonMax, latMax]] = TURTLE_MOUNTAIN_BOUNDS;
    const lonRange = lonMax - lonMin;
    const latRange = latMax - latMin;
    return Array.from({ length: count }, () => ({
        lon: lonMin + Math.random() * lonRange,
        lat: latMin + Math.random() * latRange,
    }));
};

const GhostMap: React.FC<GhostMapProps> = ({ width, height, events, onQueryCodex }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number, lon: number } | null>(null);
  const [statusText, setStatusText] = useState('AWAITING GEOLOCATION...');

  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserPosition({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
          setStatusText('LIVE TRACKING ACTIVE');
        },
        (error) => {
          console.error("Geolocation error:", error);
          setStatusText('GEOLOCATION FAILED');
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    } else {
      setStatusText('GEOLOCATION NOT SUPPORTED');
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);


  const getColor = (intensity: Intensity): string => {
    switch (intensity) {
      case Intensity.HIGH: return '#dc2626'; // Crimson
      case Intensity.MEDIUM: return '#ef4444'; // Lighter red
      case Intensity.LOW: return '#d1d5db'; // Silver
      default: return '#6b7280';
    }
  };

  const getRadius = (intensity: Intensity): number => {
    switch (intensity) {
      case Intensity.HIGH: return 10;
      case Intensity.MEDIUM: return 6;
      case Intensity.LOW: return 4;
      default: return 3;
    }
  };
  
  const getPulseClass = (intensity: Intensity): string => {
     switch (intensity) {
      case Intensity.HIGH: return 'pulse-crimson';
      case Intensity.MEDIUM: return 'pulse-crimson';
      case Intensity.LOW: return 'pulse-silver';
      default: return '';
    }
  }

  const getAuraRadius = (intensity: Intensity): number => {
    switch (intensity) {
      case Intensity.HIGH: return 50; // Increased for more prominence
      case Intensity.MEDIUM: return 25;
      case Intensity.LOW: return 15;
      default: return 10;
    }
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); 

    const g = svg.append('g');

    // Define filters for glow effects and distortion for events
    const defs = svg.append('defs');

    const eventFilter = defs.append('filter').attr('id', 'event-glow-glitch');
    eventFilter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
    eventFilter.append('feFlood').attr('flood-color', 'currentColor').attr('flood-opacity', '0.8').attr('result', 'floodColor');
    eventFilter.append('feComposite').attr('in', 'floodColor').attr('in2', 'blur').attr('operator', 'in').attr('result', 'coloredBlur');

    // Add turbulence for subtle glitch effect
    eventFilter.append('feTurbulence')
        .attr('type', 'fractalNoise')
        .attr('baseFrequency', '0.01 0.05') // Subtle horizontal noise
        .attr('numOctaves', '1')
        .attr('seed', '0')
        .attr('result', 'turbulence');
    eventFilter.append('feDisplacementMap')
        .attr('in', 'coloredBlur')
        .attr('in2', 'turbulence')
        .attr('scale', '5') // Amount of displacement
        .attr('xChannelSelector', 'R')
        .attr('yChannelSelector', 'G')
        .attr('result', 'distortedGlow');

    const feMergeEvent = eventFilter.append('feMerge');
    feMergeEvent.append('feMergeNode').attr('in', 'distortedGlow');
    feMergeEvent.append('feMergeNode').attr('in', 'SourceGraphic');
    
    // Existing terrain filter
    const terrainFilter = defs.append('filter').attr('id', 'terrain-glow');
    terrainFilter.append('feGaussianBlur').attr('stdDeviation', '1.5').attr('result', 'coloredBlur');
    const terrainMerge = terrainFilter.append('feMerge');
    terrainMerge.append('feMergeNode').attr('in', 'coloredBlur');
    terrainMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const projection = d3.geoMercator().fitExtent(
      [[20, 20], [width - 20, height - 20]], 
      { type: 'MultiPoint', coordinates: TURTLE_MOUNTAIN_BOUNDS }
    );

    const pathGenerator = d3.geoPath().projection(projection);

    // Generate and draw topographic contours
    const densityData = d3.contourDensity()
        .x(d => projection([d.lon, d.lat])[0])
        .y(d => projection([d.lon, d.lat])[1])
        .size([width, height])
        .bandwidth(30)
        .thresholds(10)
        (generateRandomPointsInBounds(300));

    const colorScale = d3.scaleSequential(d3.interpolateCool).domain([0, 0.01]);

    g.selectAll("path.terrain")
      .data(densityData)
      .enter().append("path")
        .attr("d", pathGenerator)
        .attr("fill", "none")
        .attr("stroke", d => colorScale(d.value))
        .attr("stroke-width", 1.5)
        .attr("stroke-linejoin", "round")
        .style('filter', 'url(#terrain-glow)')
        .style('opacity', 0.4);

    // Draw map grid (graticule) - uses CSS for animation
    const graticule = d3.geoGraticule();
    g.append('path')
      .datum(graticule)
      .attr('class', 'graticule') // Applies holographic grid animation from CSS
      .attr('d', pathGenerator)
      .attr('fill', 'none'); // Stroke and stroke-width now handled by CSS

    // Create radius aura circles 
    g.selectAll('.aura')
      .data(events)
      .enter()
      .append('circle')
      .attr('class', 'aura')
      .attr('cx', d => projection([d.lon, d.lat])[0])
      .attr('cy', d => projection([d.lon, d.lat])[1])
      .attr('r', d => getAuraRadius(d.intensity))
      .attr('fill', d => getColor(d.intensity))
      .style('fill-opacity', 0.15)
      .style('pointer-events', 'none');

    // Create event points
    g.selectAll('.event-point')
      .data(events)
      .enter()
      .append('circle')
      .attr('cx', d => projection([d.lon, d.lat])[0])
      .attr('cy', d => projection([d.lon, d.lat])[1])
      .attr('r', d => getRadius(d.intensity))
      .attr('fill', d => getColor(d.intensity))
      .attr('class', d => `event-point ${getPulseClass(d.intensity)}`)
      .style('filter', 'url(#event-glow-glitch)') // Apply new glow/glitch filter
      .on('mouseover', (event, d) => {
        const [svgX, svgY] = d3.pointer(event, svg.node());
        setTooltip({ x: svgX, y: svgY, event: d });
      })
      .on('mouseout', () => setTooltip(null));
      
    // Draw user location as a stylized crosshair
    if (userPosition) {
        const [userX, userY] = projection([userPosition.lon, userPosition.lat]);
        if (userX > 0 && userX < width && userY > 0 && userY < height) {
            const userMarker = g.append('g')
                .attr('transform', `translate(${userX}, ${userY})`)
                .attr('class', 'user-location-marker'); // Keep existing animation

            // Central dot
            userMarker.append('circle')
                .attr('r', 4)
                .attr('fill', '#00f0ff')
                .style('filter', 'url(#event-glow-glitch)');

            // Crosshair lines
            const crosshairLength = 12;
            const crosshairThickness = 1.5;
            userMarker.append('line')
                .attr('x1', -crosshairLength).attr('y1', 0)
                .attr('x2', crosshairLength).attr('y2', 0)
                .attr('stroke', '#00f0ff')
                .attr('stroke-width', crosshairThickness)
                .attr('stroke-linecap', 'round')
                .style('filter', 'url(#event-glow-glitch)');

            userMarker.append('line')
                .attr('x1', 0).attr('y1', -crosshairLength)
                .attr('x2', 0).attr('y2', crosshairLength)
                .attr('stroke', '#00f0ff')
                .attr('stroke-width', crosshairThickness)
                .attr('stroke-linecap', 'round')
                .style('filter', 'url(#event-glow-glitch)');
        }
    }


    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 8])
      .translateExtent([[0, 0], [width, height]])
      .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoom);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, width, height, userPosition]);

  return (
    <div className="relative w-full h-full cursor-move" onMouseLeave={() => setTooltip(null)}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-full" />
      
      <div className="absolute bottom-2 left-2 feature-card p-2 rounded-md text-xs w-64 border-cyan-500/50 bg-black/50">
        <p className="font-bold text-cyan-200 holographic-glow flex items-center">
            {statusText === 'LIVE TRACKING ACTIVE' ? <Wifi className="w-4 h-4 mr-2 text-green-400"/> : <WifiOff className="w-4 h-4 mr-2 text-red-400" />}
            STATUS: {statusText}
        </p>
        <div className="mt-1 border-t border-cyan-500/20 pt-1">
            <p>LAT: {userPosition ? userPosition.lat.toFixed(5) : 'N/A'}</p>
            <p>LON: {userPosition ? userPosition.lon.toFixed(5) : 'N/A'}</p>
        </div>
      </div>
      
      {tooltip && (
        <div
          className="absolute p-2 text-sm bg-black/80 backdrop-blur-sm border border-cyan-400/50 rounded-md shadow-lg text-cyan-200 pointer-events-none z-20"
          style={{ left: tooltip.x + 15, top: tooltip.y - 10, maxWidth: '220px' }}
        >
          <p className="font-bold">{tooltip.event.type}</p>
          <p>COORDS: {tooltip.event.lat.toFixed(4)}, {tooltip.event.lon.toFixed(4)}</p>
          <p>{tooltip.event.description}</p>
          {tooltip.event.type === EventType.EVP && tooltip.event.logId && (
            <button
              onClick={() => onQueryCodex(tooltip.event)}
              className="holographic-button w-full text-xs mt-2 p-1 rounded-md flex items-center justify-center space-x-1 pointer-events-auto"
            >
              <BookOpenCheck className="w-3 h-3" />
              <span>Query Codex</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default GhostMap;