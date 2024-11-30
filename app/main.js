const net = require("net");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const server = net.createServer((connection) => {
    // Handle connection
    connection.on('data', (data) => {

        const newData = data.toString().split("\r\n");
        console.log(newData);

        if(newData[2].toLowerCase() == "echo"){
            const len = newData[4].length;
            connection.write('$' + len + '\r\n' + newData[4] + '\r\n');
            return;
        }

        connection.write('+PONG\r\n');

        
    });
});

server.listen(6379, "127.0.0.1")

