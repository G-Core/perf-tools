(function(){
    if (window && window.performance && window.performance.getEntriesByType) {
        try {
            if (PerformanceObserver.supportedEntryTypes.includes("resource")) {
                const url = 'https://perf.gcdn.co/collect';
                const data = {
                    resources: window.performance.getEntriesByType('resource')
                        .map((e) => ({
                            metrics: {
                                ds: e.domainLookupStart,
                                de: e.domainLookupEnd,
                                cs: e.connectStart,
                                ss: e.secureConnectionStart,
                                ce: e.connectEnd,
                                qs: e.requestStart,
                                ps: e.responseStart,
                                pe: e.responseEnd,
                                ts: e.transferSize,
                            },
                            meta: {
                                n: e.name,
                                i: e.initiatorType,
                                p: e.nextHopProtocol,
                            }
                        })),
                    ts: +Date.now(),
                };

                if (window.navigator.connection) {
                    const c = window.navigator.connection;
                    data.conn = {
                        d: c.downlink,
                        et: c.effectiveType,
                        rtt: c.rtt,
                    }
                }

                const analyticsData = JSON.stringify(data);
                const req = new XMLHttpRequest();
                req.open("POST", url, true);
                req.setRequestHeader("content-type", "application/json");
                req.send(analyticsData);

                if ("function" == typeof window.performance.clearResourceTimings) {
                    window.performance.clearResourceTimings()
                }
            }
        } catch(e) {
            console.error(e);
        }
    }
}())
