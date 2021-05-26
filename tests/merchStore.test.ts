import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { DatabaseConnection, MerchFactory, UserFactory } from './data';
import { FeedbackFactory } from './data/FeedbackFactory';
import { ActivityScope, ActivityType, FeedbackStatus, UserAccessType } from '../types';
import { Feedback } from '../api/validators/FeedbackControllerRequests';
import { Config } from '../config';
import { ControllerFactory } from './controllers';

beforeAll(async () => {
    await DatabaseConnection.connect();
});

beforeEach(async () => {
    await DatabaseConnection.clear();
});

afterAll(async () => {
    await DatabaseConnection.clear();
    await DatabaseConnection.close();
});

describe('collection creation', () => {
    test('create a single collection',async () => {
        const conn = await DatabaseConnection.get();
        const [collections] = MerchFactory.createCollections(1);

        const merchStore = ControllerFactory.merchStore(conn);

        collections.forEach(collection => {
            merchStore.createCollection(collection);
        });

        const collectionResult = merchStore.getAllCollections();
        expect(collectionResult).toHaveLength(1);
        expect(collectionResult).toEqual(expect.arrayContaining(collections));

    });
    test('create multiple collections',async () => {
        const conn = await DatabaseConnection.get();
        const [collections] = MerchFactory.createCollections(5);

        const merchStore = ControllerFactory.merchStore(conn);

        collections.forEach(collection => {
            merchStore.createCollection(collection);
        });

        const collectionResult = merchStore.getAllCollections();
        expect(collectionResult).toHaveLength(5);
        expect(collectionResult).toEqual(expect.arrayContaining(collections));

    });
});


describe('collection editing', () => {
    test('Set collection to archive', async () => {
        const conn = await DatabaseConnection.get();
        const item = MerchFactory.fakeItem();
        const [collections] = MerchFactory.collectionsWith([{items:item}]);

        const [user] = UserFactory.create(1);
        await new PortalState().createUsers([user]).write();

        const merchStore = ControllerFactory.merchStore(conn);

        collections.forEach(colletion => {
            merchStore.createCollection(collection);
            merchStore.editCollection({})
        });
    });

});