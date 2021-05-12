import {
    createBufferWhen,
    createHttpClient,
    createRecordsObserver,
    createPerfStatPackage,
    isFulfilledPerfStatPackage,
    starFilterPaths
} from './perf-lib';

(function() {
    try {
        const buffer = createBufferWhen((records) => {
            const httpClient = createHttpClient('https://test.gcdn.co');
            const pack = createPerfStatPackage(records, {filter: starFilterPaths, takeConnection: true});
            if (isFulfilledPerfStatPackage(pack)) {
                httpClient(pack);
            }
        }, 5, 2000);

        createRecordsObserver(buffer)
    } catch(e) {}
}())
