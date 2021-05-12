const {
    createFilterPaths,
    starFilterPaths,
    createPerfStatPackage,
    isFulfilledPerfStatPackage,
    createFuncWithTimeout,
    createBufferWhen,
} = require('../dist_test/perf-lib.js');
const { expect } = require('chai');

const tick = (milisec = 0) =>
    new Promise((resolve) => {
        setTimeout(() => resolve(), milisec);
    });

const createResourceTiming = (override) => {
    return {
        connectEnd: 0,
        connectStart: 0,
        decodedBodySize: 0,
        domainLookupEnd: 0,
        domainLookupStart: 0,
        duration: 132.74999998975545,
        encodedBodySize: 0,
        entryType: "resource",
        fetchStart: 28.91500003170222,
        initiatorType: "script",
        name: "https://static.gcore.pro/fonts/inter/Inter-SemiBold.woff2",
        nextHopProtocol: "h2",
        redirectEnd: 0,
        redirectStart: 0,
        requestStart: 0,
        responseEnd: 161.66500002145767,
        responseStart: 0,
        secureConnectionStart: 0,
        serverTiming: [],
        startTime: 28.91500003170222,
        transferSize: 0,
        workerStart: 0,
        workerTiming: [],
        ...override,
    }
}

describe('function tests libs', () => {
    it('should trusted path which start with http://gcdn.co or https://gcdn.co', () => {
        const filter = createFilterPaths('^http://gcdn.co', '^https://gcdn.co');

        expect(filter('cdn.gcdn.co')).equal(false);
        expect(filter('http://cdn.gcdn.co')).equal(false);
        expect(filter('https://cdn.gcdn.co')).equal(false);
        expect(filter('ftp://cdn.gcdn.co')).equal(false);
        expect(filter('http://0.gcdn.co')).equal(false);
        expect(filter('http://0.gcdn.co/test')).equal(false);

        expect(filter('https://gcdn.co')).equal(true);
        expect(filter('http://gcdn.co')).equal(true);
        expect(filter('https://gcdn.co/fonts/inter.woff')).equal(true);
        expect(filter('http://gcdn.co/fonts/inter.woff')).equal(true);
    });

    it('should trusted path which equal http://gcdn.co/fonts/inter.woff', () => {
        const filter = createFilterPaths('http://gcdn.co/fonts/inter.woff');

        expect(filter('https://gcdn.co')).equal(false);
        expect(filter('http://gcdn.co')).equal(false);
        expect(filter('https://gcdn.co/fonts/inter.woff')).equal(false);
        expect(filter('https://cdn.gcdn.co/fonts/inter.woff/test')).equal(false);
        expect(filter('http://gcdn.co/fonts/inter.woff')).equal(true);
    });

    it('should trusted any path', () => {
        const filter = starFilterPaths;

        expect(filter('https://gcdn.co')).equal(true);
        expect(filter('http://gcdn.co')).equal(true);
        expect(filter('https://gcdn.co/fonts/inter.woff')).equal(true);
        expect(filter('https://cdn.gcdn.co/fonts/inter.woff/test')).equal(true);
        expect(filter('http://gcdn.co/fonts/inter.woff')).equal(true);
    });

    it('should create fulfilled perf stat package', () => {
        const records = [
            createResourceTiming({name: 'http://gcdn.co/fonts/inter.woff'}),
            createResourceTiming({name: 'http://cdn.gcdn.co/fonts/inter.woff'}),
            createResourceTiming({name: 'http://google.com'}),
            createResourceTiming({name: 'http://ya.ru/index.html'}),
        ];

        window = {
            navigator: {
                connection: {
                    downlink: 100,
                    effectiveType: '2g',
                    rtt: 50
                }
            },
        };

        const filter = createFilterPaths('http://gcdn.co/fonts/inter.woff', '^http://cdn.gcdn.co');
        const pack = createPerfStatPackage(records, {filter, takeConnection: true});
        expect(isFulfilledPerfStatPackage(pack)).equal(true);
        expect(pack.resources.length).equal(2)
        expect(pack.conn).deep.equal({
            d: 100,
            et: '2g',
            rtt: 50
        })
    });

    it('should call function in a 1 second', async () => {
        let calledCount = 0;
        createFuncWithTimeout(() => calledCount++, 1000);
        expect(calledCount).equal(0);
        await tick(1300);
        expect(calledCount).equal(1);
    });

    it('should call function program', async () => {
        let calledCount = 0;
        const spy = createFuncWithTimeout(() => calledCount++, 1000);
        spy();
        spy();
        expect(calledCount).equal(1);
        await tick(2000);
        expect(calledCount).equal(1);
    });

    it('should create buffer with parameters time and count', async () => {
        let calledCount = 0;
        let calledArguments;
        const spy = (args) => {
            calledCount++;
            calledArguments = args;
        };
        const buffer = createBufferWhen(spy, 10, 1000);
        buffer([1,2,3,4,5]);
        buffer([1,2,3,4,5]);

        await tick(1300);
        expect(calledCount).equal(1);
        expect(calledArguments).deep.equal([1,2,3,4,5,1,2,3,4,5]);
    });
});
