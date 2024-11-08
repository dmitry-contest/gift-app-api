import { StartedMongoDBContainer } from '@testcontainers/mongodb';

module.exports = async () => {
    let globalWithMongo = global as typeof globalThis & {
        mongo: StartedMongoDBContainer;
    };
    if (globalWithMongo.mongo) {
        mongo: StartedMongoDBContainer;
        await globalWithMongo.mongo.stop();
    }
};
