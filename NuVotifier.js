const EventEmitter = require("events");
const crypto = require("crypto");
const net = require("net");
const fs = require("fs");
const path = require("path");
const {PROTOCOL_2_MAGIC} = require("./helpers/constants");

module.exports = class NuVotifier2Server extends EventEmitter {
    /**
     * NuVotifier2Server constructor
     * @param options = {} - Options for the server
     * @param platforms List<string> - List of platforms to support
     */
    constructor(options = {
        port: 8192,
        tokenFile: './NuVotifier2.json',
        useDefaultToken: true
    }, platforms = []) {
        super();
        options = {
            port: options.port || 8192,
            tokenFile: options.tokenFile || path.resolve(__dirname, 'NuVotifier2.json'),
            useDefaultToken: options.useDefaultToken !== undefined ? options.useDefaultToken : true
        }
        this.port = options.port;
        this.challenge = crypto.randomBytes(16).toString('hex');
        this.opts = options;
        if(!fs.existsSync(options.tokenFile)) {
            if(!platforms.includes("default") && options.useDefaultToken) {
                console.log("Adding default platform to the list");
                platforms.push("default");
            }
            console.log("Token file not found, generating new tokens");
            fs.writeFileSync(options.tokenFile, JSON.stringify({tokens: platforms.map((plat) => {
                return {
                    platform: plat,
                    token: crypto.randomBytes(64).toString('hex')
                };
            })}, null, 2));
        }
        this.tokens = JSON.parse(fs.readFileSync(options.tokenFile, 'utf8')).tokens;
        if(!Array.isArray(this.tokens) || this.tokens.length === 0) {
            throw new Error("No tokens found in the token file");
        }
        let platformNames = this.tokens.map((platform) => platform.platform);
        if(!platformNames.includes("default") && options.useDefaultToken) {
            console.log("Adding default platform to the list");
            this.tokens.push({
                platform: "default",
                token: crypto.randomBytes(64).toString('hex')
            });
            fs.writeFileSync(options.tokenFile, JSON.stringify({tokens: this.tokens}, null, 2));
        }
        for(let platform of platforms) {
            if(!this.tokens.find((token) => token.platform === platform)) {
                console.log(`Adding platform ${platform} to the list`);
                this.tokens.push({
                    platform: platform,
                    token: crypto.randomBytes(64).toString('hex')
                });
                fs.writeFileSync(options.tokenFile, JSON.stringify({tokens: this.tokens}, null, 2));
            }
        }
    }

    async handleGreetings(socket) {
        socket.write(`VOTIFIER 2 ${this.challenge}\n`);
    }

    async handleServer(onVote) {
        const self = this;
        this.server = net.createServer();
        this.server.on('connection', function (socket) {
            socket.setTimeout(5000);

            self.handleGreetings(socket).catch(err => {
                self.emit('error', new Error("Error sending greetings: " + err.message));
                socket.end('Error sending greetings.');
                socket.destroy();
            });

            socket.on('error', function (err) {
                self.emit('error', err);
            });

            socket.on('timeout', function () {
                self.emit('error', new Error("Socket timeout"));
                socket.end();
            });

            socket.on('data', async function (data) {

                if(data.length < 10) {
                    socket.end('Invalid data received.');
                    return;
                }

                if(data.readInt16BE(0) === PROTOCOL_2_MAGIC) {
                    const rawStr = data.toString('utf8').trim();

                    const jsonStart = rawStr.indexOf('{');
                    if (jsonStart === -1) throw new Error("Invalid data format");

                    const jsonStr = rawStr.substring(jsonStart);
                    const parsed = JSON.parse(jsonStr);

                    let { signature, payload } = parsed;

                    if(!signature || !payload) {
                        socket.end('Invalid payload received.');
                        return;
                    }
                    payload = JSON.parse(payload);
                    if(payload.challenge !== self.challenge) {
                        self.emit('error', new Error("Invalid challenge token"));
                        socket.end('Invalid challenge token.');
                        return;
                    }

                    let platformToken = self.tokens.find((platform) => {
                        return platform.platform === payload.serviceName;
                    });
                    if(!platformToken && self.opts.useDefaultToken) {
                        console.warn(`Platform ${payload.serviceName} not found in tokens, using default token.`);
                        platformToken = self.tokens.find((platform) => {
                            return platform.platform === "default";
                        });
                    }
                    if(!platformToken && !self.opts.useDefaultToken) {
                        self.emit('error', new Error(`Platform ${payload.serviceName} not found in tokens.`));
                        socket.end('Platform token not found.');
                        return;
                    }
                    let cryptoKey = crypto.createSecretKey(Buffer.from(platformToken.token), 'base64');
                    let sigBytes = Buffer.from(signature, 'base64');
                    let payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
                    let isValid = await self.hmacEncrypt(sigBytes, payloadBytes, cryptoKey);
                    if(!isValid) {
                        self.emit('error', new Error("Signature verification failed for " + payload.serviceName));
                        socket.end('Signature verification failed.');
                        return;
                    }

                    self.emit('vote', {
                        username: payload.username,
                        serviceName: payload.serviceName,
                        timestamp: payload.timestamp,
                        address: payload.address
                    });
                } else {
                    self.emit('error', new Error("Unsupported protocol version"));
                }

                socket.end();
                socket.destroy();
            });

            socket.write('VOTIFIER 1.9\n');
        });

        return new Promise((resolve, reject) => {
            this.server.listen(this.port, () => {
                resolve();
            });
        });


    }

    async hmacEncrypt(signature, message, key) {
        const hmac = crypto.createHmac('sha256', key);
        hmac.update(message);
        return crypto.timingSafeEqual(Buffer.from(signature), hmac.digest());
    }
}