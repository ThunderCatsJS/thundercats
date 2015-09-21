# September 21, 2015 v2.2.1

    * [175090c](../../commit/175090c) use object.assign instead of stampit assign methods

# August 10, 2015 v2.2.0

    * [3f82754](../../commit/3f82754) add Actions spec now takes stampit descriptors. add stamp description as second argument to Store
    * [ffb6f55](../../commit/ffb6f55) add make method binding optional
    * [f1498d9](../../commit/f1498d9) change action mapping fn context to the stamp

# July 30, 2015 v2.1.0

    * [30dbb70](../../commit/30dbb70) add store.shouldStoreNotify
    * [e73938d](../../commit/e73938d) add cat.dispose

# July 21, 2015 v2.0.0

This release has major breaking changes!

    * ThunderCats is now Universal JavaScript First.
    * Stores/Actions/Cat are now [stamps](https://github.com/stampit-org/stampit)
    * Adds hydrate/dehydrate for use with the cat
    * removes waitFor utils: see https://github.com/ThunderCatsJS/thundercats/issues/71
    * removes all react specific components and utils. These are now located at https://github.com/thundercats/thundercats-react
    * many more...

# March 13, 2015 v1.2.0

    * Adds [setStateUtil](https://github.com/r3dm/thundercats/commit/277921014421ca306b890868dc87242fda7d63fe)
    * Feature [getOperations now takes an array of obserables](https://github.com/r3dm/thundercats/commit/f282c1745fdbdf1b3d3e5da22a1d331b93afe094)
    * Feature [Store spec can now take a name](https://github.com/r3dm/thundercats/commit/903531351a127fa7877f9338fa144b9b03217148)

# March 12, 2015 v1.1.0

    * Adds [ObservableStateMixin](https://github.com/r3dm/thundercats/commit58880ab5ce8586794a04b1567aec32071005c06c)
    * Adds [createActions](https://github.com/r3dm/thundercats/commit/e617759a2d4d89fbb7881c1ea558ce3ae4e7ee13) helper method on Actions object
