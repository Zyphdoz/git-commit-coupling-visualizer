import React, { useState, useRef, useEffect } from 'react';

export type ViewBox = {
    x: number;
    y: number;
    w: number;
    h: number;
};

type SVGWithPanAndZoomProps = {
    children: React.ReactNode;
    viewbox: ViewBox;
    className?: string;
};

/**
 * This is like an `<svg></svg>` tag but when you click and drag it pans and when you scroll it zooms.
 * @param children children is expected to be anything that you would normally put inside of an `<svg></svg>` tag
 * @param viewbox the initial size of the viewbox. these values will be changed and managed by this component when the user pans or zooms
 * @param className optional: you can pass in classes for styling. this would be equivalent to adding classnames to an `<svg></svg>` tag.
 * @returns
 */
export function SVGWithPanAndZoom({ children, viewbox: initialViewbox, className = '' }: SVGWithPanAndZoomProps) {
    const [viewbox, setViewbox] = useState<ViewBox>(initialViewbox);
    const prevMousePositionRef = useRef<{ clientX: number; clientY: number }>(null);

    const [zoom, setZoom] = useState(1);

    const svgRef = useRef<SVGSVGElement>(null);

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const delta = e.deltaY;

        if (delta > 0) {
            setZoom((prevZoom) => Math.max(prevZoom / zoomFactor, 0.1));
        } else {
            setZoom((prevZoom) => prevZoom * zoomFactor);
        }
    };

    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        prevMousePositionRef.current = { clientX: e.clientX, clientY: e.clientY };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const distanceMoved = {
                x: (prevMousePositionRef.current!.clientX - moveEvent.clientX) / zoom,
                y: (prevMousePositionRef.current!.clientY - moveEvent.clientY) / zoom,
            };

            setViewbox((prevViewbox) => {
                return { ...prevViewbox, x: prevViewbox.x + distanceMoved.x, y: prevViewbox.y + distanceMoved.y };
            });
            prevMousePositionRef.current = { clientX: moveEvent.clientX, clientY: moveEvent.clientY };
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    useEffect(() => {
        const svgElement = svgRef.current;
        if (svgElement) {
            svgElement.addEventListener('wheel', handleWheel, { passive: false });
        }

        return () => {
            if (svgElement) {
                svgElement.removeEventListener('wheel', handleWheel);
            }
        };
    }, []);

    return (
        <svg
            className={`h-full w-full border-2 border-red-50 ${className}`}
            ref={svgRef}
            viewBox={`${viewbox.x} ${viewbox.y} ${viewbox.w / zoom} ${viewbox.h / zoom}`}
            onMouseDown={handleMouseDown}
        >
            {children}
        </svg>
    );
}
