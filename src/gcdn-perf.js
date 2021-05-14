import {
    createBufferWhen,
    createHttpClient,
    startRecordsObserver,
    createPerfStatPackage,
    isFulfilledPerfStatPackage,
    createFilterOf
} from './perf-lib';

(function() {
    try {
        const httpClient = createHttpClient('https://insights-api.gcorelabs.com/collect-wg');
        const filter = createFilterOf('http://bogdi.xyz', 'https://bogdi.xyz');
        const handler = createBufferWhen((records) => {
            const pack = createPerfStatPackage(records);
            if (isFulfilledPerfStatPackage(pack)) {
                httpClient(pack);
            }
        }, 10, 1000, filter);
        startRecordsObserver(handler);
    } catch(e) {}
}())
