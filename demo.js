const NuVotifier2Server = require("./NuVotifier");

let server = new NuVotifier2Server({
    port: 8192,
    tokenFile: './NuVotifier2.json',
    useDefaultToken: true
}, ["platform1", "platform2"]);
server.handleServer().then(r => {
    console.log("NuVotifier2 server running on port 8192");
})
server.on('vote', (vote) => {
    console.log("Vote received:", vote);
});
server.on('error', (err) => {
    console.error( err);
});