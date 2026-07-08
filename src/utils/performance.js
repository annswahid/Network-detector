export const throttle = (fn, delay) => {
    let last = 0;
    let timeoutId = null;

    return (...args) => {
        const now = Date.now();
        const remaining = delay - (now - last);

        if (remaining <= 0) {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            last = now;
            fn(...args);
            return;
        }

        if (!timeoutId) {
            timeoutId = setTimeout(() => {
                last = Date.now();
                timeoutId = null;
                fn(...args);
            }, remaining);
        }
    };
};
