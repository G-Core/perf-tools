import {
    createBufferWhen,
    createHttpClient,
    createRecordsObserver,
    createPerfStatPackage,
    isFulfilledPerfStatPackage,
} from './perf-lib';

(function() {
    try {
        const httpClient = createHttpClient('https://insights-api.gcorelabs.com/collect');
        const buffer = createBufferWhen((records) => {
            const pack = createPerfStatPackage(records);
            if (isFulfilledPerfStatPackage(pack)) {
                httpClient(pack);
            }
        }, 5, 2000);
        createRecordsObserver(buffer)
    } catch(e) {}
}())
