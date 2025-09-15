import React, { useState, useRef, useEffect } from 'react';

export type ViewBox = {
    x: number;
    y: number;
    w: number;
    h: number;
};

type SVGWithPanAndZoomProps = {
    children: React.ReactNode;
    viewBox: string;
} & React.SVGProps<SVGSVGElement>;

/**
 * This is like an `<svg></svg>` tag but when you click and drag it pans and when you scroll it zooms.
 * @param viewBox the initial size of the viewBox. note that these values will be changed and managed by this component when the user pans or zooms.
 * If you try to modify the viewBox elsewhere it may cause pan and zoom to behave strangely.
 * Limitations: The width and height of the svg element will be set to the same width and height as the viewBox. (passing in a different width or height will cause the pan speed to not align with the cursor speed)
 * @param children children is expected to be anything that you would normally put inside of an `<svg></svg>` tag.
 */
export function SVGWithPanAndZoom({ children, viewBox, ...rest }: SVGWithPanAndZoomProps) {
    const [viewbox, setViewbox] = useState<ViewBox>(() => {
        // if a viewBox prop was passed in, we use it,
        // otherwise default to "0 0 350 150".
        if (!viewBox || viewBox.split(' ').length !== 4) {
            return { x: 0, y: 0, w: 350, h: 150 };
        }
        const [x, y, w, h] = viewBox.split(' ').map(Number);
        return { x, y, w, h };
    });
    const prevMousePositionRef = useRef<{ clientX: number; clientY: number }>(null);

    const [svgPanSpeed, setSvgPanSpeed] = useState(1);

    const svgRef = useRef<SVGSVGElement>(null);

    const [svgSize, setSvgSize] = useState<{ width: string; height: string }>({
        width: viewBox.split(' ')[2],
        height: viewBox.split(' ')[3],
    });
    // if the parent changes the viewBox prop (which it does on resize),
    // then it will cause panning to go out of sync with the mouse speed.
    // as a quick fix, we reset the viewbox, svgSize and svgPanSpeed when this happens.
    // we could create a better user experience if we instead make it so the svg zoom does not reset and our position in the diagram does not move
    // when the window is resized but that requires more thinking to figure out and this is good enough for now.
    useEffect(() => {
        setViewbox(() => {
            const [x, y, w, h] = viewBox.split(' ').map(Number);
            return { x, y, w, h };
        });
        setSvgSize({ width: viewBox.split(' ')[2], height: viewBox.split(' ')[3] });
        setSvgPanSpeed(1);
    }, [viewBox]);

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (!svgRef.current) return;

        const zoomFactor = 1.1;
        const delta = e.deltaY;

        // when we pan, we want the cursor to remain on the same place on the svg.
        // in order to accomplish that, every time we scale the viewbox we also scale the svgPanSpeed by the same amount
        if (delta > 0) {
            setSvgPanSpeed((prevSvgPanSpeed) => prevSvgPanSpeed / zoomFactor);
        } else {
            setSvgPanSpeed((prevSvgPanSpeed) => prevSvgPanSpeed * zoomFactor);
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

        let isDragging = false;
        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!isDragging) {
                document.body.style.cursor = 'all-scroll';
                isDragging = true;
            }

            const distanceMoved = {
                x: (prevMousePositionRef.current!.clientX - moveEvent.clientX) / svgPanSpeed,
                y: (prevMousePositionRef.current!.clientY - moveEvent.clientY) / svgPanSpeed,
            };

            setViewbox((prevViewbox) => {
                return { ...prevViewbox, x: prevViewbox.x + distanceMoved.x, y: prevViewbox.y + distanceMoved.y };
            });
            prevMousePositionRef.current = { clientX: moveEvent.clientX, clientY: moveEvent.clientY };
        };

        const handleMouseUp = () => {
            document.body.style.cursor = 'default';
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
            width={svgSize.width}
            height={svgSize.height}
            className={`border-2 border-red-50`}
            ref={svgRef}
            viewBox={`${viewbox.x} ${viewbox.y} ${viewbox.w} ${viewbox.h}`}
            onMouseDown={handleMouseDown}
            {...rest}
        >
            {children}
        </svg>
    );
}
