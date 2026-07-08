import { useEffect, useRef, useMemo, memo } from 'react';
import { throttle } from '../utils/performance';

const SysCallMatrix = memo(({ syscalls }) => {
    const containerRef = useRef(null);
    const shouldAutoScroll = useRef(false);

    // Track if user is near bottom — use ref to avoid re-renders
    const handleScroll = useMemo(() => throttle(() => {
        if (!containerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 60;
    }, 100), []);

    useEffect(() => {
        if (shouldAutoScroll.current && containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [syscalls]);

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className="syscall-matrix"
        >
            <div className="syscall-header">
                <span>Time</span>
                <span>Call</span>
                <span>Status</span>
            </div>

            {syscalls.map((call, index) => (
                <div
                    key={call.timestamp + '-' + call.pid + '-' + index}
                    className={`syscall-row ${call.status === 'blocked' ? 'blocked' : 'allowed'}`}
                >
                    <span className="syscall-time">{new Date(call.timestamp).toLocaleTimeString().split(' ')[0]}</span>
                    <span className="syscall-name">{call.name}(pid={call.pid})</span>
                    <span className="syscall-status">{call.status.toUpperCase()}</span>
                </div>
            ))}
        </div>
    );
});

export default SysCallMatrix;

