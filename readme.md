# NuVotifier API
This is the API for NuVotifier, a plugin that allows players to vote for your server on various Minecraft server lists.
This lib only support the new NuVotifier2 protocol.
## How to use ?

To use the NuVotifier API, you have to init a socket and listen for incoming votes. Here is an example of how to do that:

```javascript
const NuVotifier2Server = require("node-nuvotifier2");

let server = new NuVotifier2Server(options, platforms);
server.handleServer().then(r => {
    console.log("NuVotifier2 server running on port 8192");
});
```

### Options
| Option          | Type    | Description                                                                          |
|-----------------|---------|--------------------------------------------------------------------------------------|
| port            | number  | The port to listen on. Default is 8192.                                              |
| tokenFile       | string  | Path to the file where the different tokens will be stored                           |
| useDefaultToken | boolean | This option will create a "default" token which will be use for any unknown platform |

### Platforms

`platforms` is an array of objects that define the platforms you want to use. The lib will automatically create the tokens for you. Here is an example of some platforms:

```javascript

let server = new NuVotifier2Server(options, ["platform1", "platform2"]);
server.handleServer().then(r => {
    console.log("NuVotifier2 server running on port 8192");
})
```

Automatically, the lib will create random tokens for you in the `tokenFile` file location given. 
Exemple of file : 
```json
{
  "tokens": [
    {
      "platform": "platform1",
      "token": "f68b502297e23cc8139eb61887e8bdbfbcec11eacd5af451efcd0e526c5e10c3414786b3082de464c6c30b5a77b96864d1ac6f446f8bbfd19704968e39ee23a6"
    },
    {
      "platform": "platform2",
      "token": "85bf639438ad6f74644bac52fe9bbd13d84f43316872a8f6ddfd0e92b934e1467ca11ec90dd3494110e4f41d657698d6d8f2b638aed1b1e95c3770bd93bc62f9"
    },
    {
      "platform": "default",
      "token": "160ad7364ad0c98bd27921a2678cd3810729c269cd556d452d1d32774efb87d0913391dd66bbc6c18b50649afe570b35db26ec7c275bbc3b9e7d423261df4631"
    }
  ]
}
```
###### (default platform is created if you defined the option `useDefaultToken`.)

You can manually edit / add tokens in the `tokenFile` file location given, but you have to respect the format of the file.
Any missing platform will be automatically created with a random token.

### Listening for votes
To listen for votes, you can use the `on` method of the server instance. Here is an example of how to do that:

```javascript
server.on("vote", (vote) => {
    console.log(`Username: ${vote.username}`);
    console.log(`ServiceName: ${vote.serviceName}`);
    console.log(`Timestamp: ${vote.timestamp}`);
    console.log(`Address: ${vote.address}`);
});
```

### Full Example
```javascript
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
    console.error("Error:", err);
});
```

## Credits

This library is inspired by the original NuVotifier plugin for Minecraft, and it is designed to work with the [NuVotifier2](https://www.spigotmc.org/resources/nuvotifier.13449/) protocol. The original plugin was created by the [NuVotifier team](https://github.com/NuVotifier).

Made By [Gabidut76](https://github.com/gabidut) 🇫🇷 for [ArktisStudio](https://github.com/ArktisStudio)