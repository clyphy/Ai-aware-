import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { ParanormalEvent, EventType, Intensity } from '../types';
import { BookOpenCheck } from 'lucide-react';

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

const GhostMap: React.FC<GhostMapProps> = ({ width, height, events, onQueryCodex }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const getColor = (intensity: Intensity): string => {
    switch (intensity) {
      case Intensity.HIGH:
        return '#dc2626'; // Crimson
      case Intensity.MEDIUM:
        return '#ef4444'; // Lighter red
      case Intensity.LOW:
        return '#d1d5db'; // Silver
      default:
        return '#6b7280';
    }
  };

  const getRadius = (intensity: Intensity): number => {
    switch (intensity) {
      case Intensity.HIGH:
        return 10;
      case Intensity.MEDIUM:
        return 6;
      case Intensity.LOW:
        return 4;
      default:
        return 3;
    }
  };
  
  const getPulseClass = (intensity: Intensity): string => {
     switch (intensity) {
      case Intensity.HIGH:
        return 'pulse-crimson';
      case Intensity.MEDIUM:
        return 'pulse-crimson';
      case Intensity.LOW:
        return 'pulse-silver';
      default:
        return '';
    }
  }

  const getAuraRadius = (intensity: Intensity): number => {
    switch (intensity) {
      case Intensity.HIGH:
        return 40;
      case Intensity.MEDIUM:
        return 25;
      case Intensity.LOW:
        return 15;
      default:
        return 10;
    }
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous renders

    const g = svg.append('g');

    // Define filters for glow effects
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'glow');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3.5')
      .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create radius aura circles (drawn first, appear underneath)
    g.selectAll('.aura')
      .data(events)
      .enter()
      .append('circle')
      .attr('class', 'aura')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => getAuraRadius(d.intensity))
      .attr('fill', d => getColor(d.intensity))
      .style('fill-opacity', 0.15)
      .style('pointer-events', 'none');

    // Create event points
    g.selectAll('.event-point')
      .data(events)
      .enter()
      .append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => getRadius(d.intensity))
      .attr('fill', d => getColor(d.intensity))
      .attr('class', d => `event-point ${getPulseClass(d.intensity)}`)
      .style('filter', 'url(#glow)')
      .on('mouseover', (event, d) => {
        const [svgX, svgY] = d3.pointer(event, svg.node());
        setTooltip({ x: svgX, y: svgY, event: d });
      })
      .on('mouseout', () => {
        setTooltip(null);
      });

    // Add scriptural annotations for hotspots
    const hotspots = events.filter(e => e.intensity === Intensity.HIGH);
    g.selectAll('.annotation')
      .data(hotspots)
      .enter()
      .append('text')
      .attr('x', d => d.x + 15)
      .attr('y', d => d.y + 5)
      .text('John 1:5')
      .attr('font-family', 'Roboto Mono')
      .attr('font-size', '12px')
      .attr('fill', '#fca5a5') // light crimson
      .attr('class', 'holographic-glow-crimson')
      .style('pointer-events', 'none');

    // Zoom and Pan functionality
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .translateExtent([[0, 0], [width, height]])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, width, height]);

  return (
    <div className="relative w-full h-full cursor-move" onMouseLeave={() => setTooltip(null)}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-full" />
      {tooltip && (
        <div
          className="absolute p-2 text-sm bg-black/80 backdrop-blur-sm border border-cyan-400/50 rounded-md shadow-lg text-cyan-200 pointer-events-none"
          style={{ left: tooltip.x + 15, top: tooltip.y - 10, maxWidth: '220px' }}
        >
          <p className="font-bold">{tooltip.event.type}</p>
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
