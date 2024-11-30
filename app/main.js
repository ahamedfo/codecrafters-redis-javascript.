const net = require("net");
const dict = {};
// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

function parser(data){
    const newData = data.toString().split("\r\n");
    return newData;
}

function setter (key, value, dict){
    dict[key] = value;
    return dict;
}

function getter (key, dict){
    return dict[key];
}

const server = net.createServer((connection) => {
    // Handle connection
    connection.on('data', (data) => {
        

        const newData = parser(data);
        console.log(dict)

        if(newData[2].toLowerCase() == "echo"){
            const len = newData[4].length;
            connection.write('$' + len + '\r\n' + newData[4] + '\r\n');
            return;
        }

        if(newData[2].toLowerCase() == "set"){
            setter(newData[4], newData[6], dict);
            connection.write('+OK\r\n');
            return;
        }

        if( newData[2].toLowerCase() == "get"){
            const value = getter(newData[4], dict);
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

