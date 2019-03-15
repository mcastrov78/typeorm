import "reflect-metadata";
import {closeTestingConnections, createTestingConnections, reloadTestingDatabases} from "../../../test/utils/test-utils";
import {Connection} from "../../../src";
import {Post} from "./entity/Post";
import {PostCategory} from "./entity/PostCategory";

describe("other issues > entity change in subscribers should affect persistence", () => {

    let connections: Connection[];
    beforeAll(async () => connections = await createTestingConnections({
        entities: [__dirname + "/entity/*{.js,.ts}"],
        subscribers: [__dirname + "/subscriber/*{.js,.ts}"]
    }));
    beforeEach(() => reloadTestingDatabases(connections));
    afterAll(() => closeTestingConnections(connections));

    test("if entity was changed, subscriber should be take updated columns", () => Promise.all(connections.map(async function(connection) {

        const category1 = new PostCategory();
        category1.name = "category #1";

        const post = new Post();
        post.title = "hello world";
        post.category = category1;
        await connection.manager.save(post);

        // check if it was inserted correctly
        const loadedPost = await connection.manager.findOne(Post);
        expect(loadedPost).not.toBeUndefined();
        expect(loadedPost!.active).toEqual(false);

        // now update some property and let update subscriber trigger
        const category2 = new PostCategory();
        category2.name = "category #2";
        loadedPost!.category = category2;
        loadedPost!.active = true;
        loadedPost!.title += "!";
        await connection.manager.save(loadedPost!);

        // check if subscriber was triggered and entity was really taken changed columns in the subscriber
        const loadedUpdatedPost = await connection.manager.findOne(Post);

        expect(loadedUpdatedPost).not.toBeUndefined();
        expect(loadedUpdatedPost!.updatedColumns).toEqual(2);
        expect(loadedUpdatedPost!.updatedRelations).toEqual(1);

        await connection.manager.save(loadedPost!);

    })));

});