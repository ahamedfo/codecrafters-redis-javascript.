const net = require("net");
const fs = require('fs');
const { join } = require('path');
const { getKeysValues } = require('./parseRDB');
const { time } = require("console");
const dataStore = new Map();
const expiryList = new Map();


let rdb;
// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

function parser(data){
    const buffer = data.toString().split("\r\n");
    return buffer;
}

function configFormat(key = '', value = ''){
    return `*2\r\n$${key.length}\r\n${key}\r\n$${value.length}\r\n${value}\r\n`
}

function serializeRESP(redisPairs, isKey=false){
    let resp = `*${redisPairs.size}\r\n`
    for(const key of redisPairs.keys()){
        resp += `$${key.length}\r\n${key}\r\n`
    }
    return resp
}

const server = net.createServer((connection) => {
    // Handle connection
    connection.on('data', (data) => {
        const buffer = parser(data);
        const [, , command, , key = '', ,value = '', , px=null, ,timeout = ''] = buffer;
        const config = new Map();
        const arguments = process.argv.slice(2)
        const [fileDir, dbFileName] = [arguments[1] ?? null, arguments[3] ?? null]
        const cmd = command.toLowerCase();
        const filePath = `${fileDir}/${dbFileName}`

        if(fileDir && dbFileName){
            config.set('dir', fileDir)
            config.set('dbfilename', dbFileName)
        }

        if(config.get('dir') && config.get('dbfilename')){
            if(fs.existsSync(filePath)){
                rdb = fs.readFileSync(filePath);
                if (!rdb) {
                    throw `Error reading the DB at provided path: ${filePath}`;
                }else {
                    const redisPairs = getKeysValues(rdb);
                    redisPairs.forEach((redisValue, redisKey) => {
                            console.log('this is the redis value', redisValue)
                            if (redisValue.expiry > 0) {
                                dataStore.set(redisKey, { value: redisValue.value, expiry: redisValue.expiry} );
                            } else {
                                dataStore.set(redisKey, redisValue);
                            }
                        }
                    )
                }
            } else{
                console.log(`File not found at ${filePath}`)
            }
        }

        switch(cmd){
        
            case 'config':
                connection.write(configFormat(value, config.get(value)))
                break;
             
            case 'keys':
                const redisPairs = getKeysValues(rdb);
                if(redisPairs){
                    connection.write(serializeRESP(redisPairs, true));
                    break;
                }

            case 'echo':
                const len = buffer[4].length;
                connection.write('$' + len + '\r\n' + buffer[4] + '\r\n');
                break;

            case 'set':
                dataStore.set(key, value);
                if(px){
                    setTimeout(() => {
                        dataStore.delete(key);
                    }, timeout);
                }
                connection.write('+OK\r\n');
                break;

            case 'get':
                const keyProperties = dataStore.get(key);
                console.log(dataStore)
                console.log('this is the value', value)
                console.log('this is the key', key)
                if(keyProperties){
                    console.log('this is the values expiration', keyProperties.expiry)
                    // console.log('this is the current time', Date.getTime())
                    console.log('this is the current time', new Date().getTime())


                    if (keyProperties.expiry && new Date().getTime() > keyProperties.expiry) {
                        console.log('expired')
                        dataStore.delete(key);
                        connection.write('$-1\r\n');
                        break;
                    } else if (keyProperties.expiry) {
                        console.log('not expired')
                        const len = keyProperties.value.length;
                        connection.write('$' + len + '\r\n' + keyProperties.value + '\r\n');
                        break;
                    }

                    console.log('no expiration')

                    const len = keyProperties.length;
                    connection.write('$' + len + '\r\n' + keyProperties + '\r\n');
                    break;
                }
                connection.write('$-1\r\n');
                break;
    
            default:
                connection.write('+PONG\r\n');
                break;
        }
        
        
    });
});

server.listen(6379, "127.0.0.1")

