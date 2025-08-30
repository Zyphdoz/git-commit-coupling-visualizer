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
 * @param children children is expected to be anything that you would normally put inside of an `<svg></svg>` tag.
 * @param viewbox the initial size of the viewbox. note that these values will be changed and managed by this component when the user pans or zooms.
 * @param className optional: you can pass in classes for styling. this would be equivalent to adding classnames to an `<svg></svg>` tag.
 */
export function SVGWithPanAndZoom({ children, viewbox: initialViewbox, className = '' }: SVGWithPanAndZoomProps) {
    const [viewbox, setViewbox] = useState<ViewBox>(initialViewbox);
    const prevMousePositionRef = useRef<{ clientX: number; clientY: number }>(null);

    const [mouseSpeed, setMouseSpeed] = useState(1);

    const svgRef = useRef<SVGSVGElement>(null);

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (!svgRef.current) return;

        const zoomFactor = 1.1;
        const delta = e.deltaY;

        // when we pan, we want the cursor to remain on the same place on the svg.
        // in order to accomplish that, every time we scale the viewbox we also scale the mouseSpeed by the same amount
        if (delta > 0) {
            setMouseSpeed((prevMouseSpeed) => prevMouseSpeed / zoomFactor);
        } else {
            setMouseSpeed((prevMouseSpeed) => prevMouseSpeed * zoomFactor);
        }

        // this code ensures the svg coordinates under the cursor remains the same after zooming
        // which gives us a "zoom towards the cursor" behavior similar to how zooming works in google maps
        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const scale = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;
        setViewbox((prev) => {
            // cursor position relative to SVG element
            const cursorSvgX = prev.x + ((e.clientX - rect.left) / rect.width) * prev.w;
            const cursorSvgY = prev.y + ((e.clientY - rect.top) / rect.height) * prev.h;

            // new width/height after zoom
            const newW = prev.w / scale;
            const newH = prev.h / scale;

            // adjust x/y so cursor point stays fixed
            const newX = cursorSvgX - ((e.clientX - rect.left) / rect.width) * newW;
            const newY = cursorSvgY - ((e.clientY - rect.top) / rect.height) * newH;

            return { x: newX, y: newY, w: newW, h: newH };
        });
    };

    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        prevMousePositionRef.current = { clientX: e.clientX, clientY: e.clientY };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const distanceMoved = {
                x: (prevMousePositionRef.current!.clientX - moveEvent.clientX) / mouseSpeed,
                y: (prevMousePositionRef.current!.clientY - moveEvent.clientY) / mouseSpeed,
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
            className={`border-2 border-red-50 ${className}`}
            ref={svgRef}
            viewBox={`${viewbox.x} ${viewbox.y} ${viewbox.w} ${viewbox.h}`}
            onMouseDown={handleMouseDown}
        >
            {children}
        </svg>
    );
}
