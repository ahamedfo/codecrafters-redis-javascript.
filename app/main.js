const net = require("net");
const fs = require('fs');
const { join } = require('path');
const { getKeysValues } = require('./parseRDB');

const dict = {};
let rdb;
// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

function parser(data){
    const buffer = data.toString().split("\r\n");
    return buffer;
}

function setter (key, value, dict){
    dict[key] = value;
    return dict;
}

function getter (key, dict){
    return dict[key];
}

function configFormat(key = '', value = ''){
    return `*2\r\n$${key.length}\r\n${key}\r\n$${value.length}\r\n${value}\r\n`
}

function serializeRESP(key){
    return `*1\r\n$${key.length}\r\n${key}\r\n`
}

const server = net.createServer((connection) => {
    // Handle connection
    connection.on('data', (data) => {
        const buffer = parser(data);
        const [, , command, , key = '', ,value = '', , px=null, ,timeout = ''] = buffer;
        const dataStore = new Map();
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
                }
            } else{
                console.log(`File not found at ${filePath}`)
            }
        }
        
        if(cmd == 'config'){
            connection.write(configFormat(value, config.get(value)))
            return;
        }

        if (cmd == 'keys'){
            const redisKey = getKeysValues(rdb);
            if(redisKey){
                connection.write(serializeRESP(redisKey));
                return;
            }
        }
            
        if(cmd == "echo"){
            const len = buffer[4].length;
            connection.write('$' + len + '\r\n' + buffer[4] + '\r\n');
            return;
        }

        if(buffer[2].toLowerCase() == "set"){
            setter(buffer[4], buffer[6], dict);
            connection.write('+OK\r\n');
            if(buffer[10]){
                setTimeout(() => {
                    delete dict[buffer[4]];
                }, buffer[10]);
            }
            console.log(buffer[5], buffer[6],buffer[10]);
            return;
        }

        if( buffer[2].toLowerCase() == "get"){
            const value = getter(buffer[4], dict);
            if(value){
                const len = value.length;
                connection.write('$' + len + '\r\n' + value + '\r\n');
                return;
            }
            connection.write('$-1\r\n');
            return;
        }
        connection.write('+PONG\r\n');
    });
});

server.listen(6379, "127.0.0.1")

