import { useRef, useEffect } from 'react';

const LogViewer = ({ logs }) => {
    const containerRef = useRef(null);
    const isUserScrolling = useRef(false);
    const scrollTimer = useRef(null);

    useEffect(() => {
        if (!containerRef.current || isUserScrolling.current) return;
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }, [logs]);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 60;
        isUserScrolling.current = !isNearBottom;

        clearTimeout(scrollTimer.current);
        scrollTimer.current = setTimeout(() => {
            isUserScrolling.current = false;
        }, 3000);
    };

    return (
        <div
            className="log-viewer"
            ref={containerRef}
            onScroll={handleScroll}
            style={{ maxHeight: '300px', overflowY: 'auto', overscrollBehavior: 'contain' }}
        >
            {logs.map((log, index) => (
                <div key={index} className="log-entry">
                    <span className="log-timestamp">[{log.timestamp}]</span>
                    {log.message}
                </div>
            ))}
        </div>
    );
};

export default LogViewer;