import { useState, useEffect, useRef, useMemo } from 'react';

interface VirtualListProps<T> {
    items: T[];
    height: number;
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    className?: string;
}

export function VirtualList<T>({ items, height, itemHeight, renderItem, className }: VirtualListProps<T>) {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const totalHeight = items.length * itemHeight;

    const visibleNodeCount = Math.ceil(height / itemHeight);
    const startNode = Math.floor(scrollTop / itemHeight);

    // Add buffer to prevent white flash on fast scroll
    const buffer = 5;
    const startNodeBuffered = Math.max(0, startNode - buffer);
    const visibleCountBuffered = visibleNodeCount + 2 * buffer;

    const visibleItems = useMemo(() => {
        return items.slice(startNodeBuffered, Math.min(items.length, startNodeBuffered + visibleCountBuffered)).map((item, index) => ({
            item,
            index: startNodeBuffered + index,
        }));
    }, [items, startNodeBuffered, visibleCountBuffered]);

    const offsetY = startNodeBuffered * itemHeight;

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ height, overflowY: 'auto', position: 'relative' }}
            onScroll={handleScroll}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)`, position: 'absolute', top: 0, left: 0, width: '100%' }}>
                    {visibleItems.map(({ item, index }) => (
                        <div key={index} style={{ height: itemHeight }}>
                            {renderItem(item, index)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
