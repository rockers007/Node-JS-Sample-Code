We use component/module base code structure.
    . src/app/locales: In this folder, we define multiple languages constants.
    . src/app/app.js: Here we configure the project security and other third party initializations to use in the entire site.
    . src/app/database.js: Here we configure the database connection to access it in the entire site.
    . src/app/routes.js: Here we defined all authenticated and non-authenticated routes.
    . src/utils: In this folder, we define the global functions and reuse the entire site.
    . test: In this folder, we define the test cases.
    . My investment and Wallet component which have multiple folders like
        1) controller:
            We store here controller files, which calls to particular function in services with model schema and other needed parameters.
        2) model
            We store here model files, in which we create schema for the collection.
        3) routes
            We handle here component base routing, which calls to particular function in controller.
        4) services
            we handle actual logic here
