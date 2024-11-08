import {
    MongoDBContainer,
    StartedMongoDBContainer,
} from '@testcontainers/mongodb';

module.exports = async () => {
    const mongo = await new MongoDBContainer('mongo:7.0').start();

    let globalWithMongo = global as typeof globalThis & {
        mongo: StartedMongoDBContainer;
    };
    if (!globalWithMongo.mongo) {
        globalWithMongo.mongo = mongo;
    }
    process.env['MONGO_URL'] = mongo.getConnectionString();
};
