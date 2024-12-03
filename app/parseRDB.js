const { redis_main_const, OPCODES } = require('./consts');

function handleLengthEncoding(data,cursor) {
    const byte = data[cursor];
    const lengthType = (byte & 0b11000000) >> 6;
    const lengthValues = [[byte & 0b00111111, cursor + 1], [((byte & 0b00111111) << 8) | data[cursor + 1], cursor + 2], [data.readUInt32BE(cursor + 1), cursor + 5]];
    return (
        lengthValues[lengthType] || new Error(`Invalid length encoding ${lengthType} at ${cursor}`)
    );
}

function getKeysValues(data) {
    const { REDIS_MAGIC_STRING, REDIS_VERSION } = redis_main_const;
    let cursor = REDIS_MAGIC_STRING + REDIS_VERSION;
    let redisPairs = new Map();

    while (cursor < data.length){
        if(data[cursor] == OPCODES.SELECTDB){
            break;
        }
        cursor++;
    }
    cursor++;

    let length;
    [length,cursor] = handleLengthEncoding(data,cursor);
    cursor++; // why are we incrementing cursor here after incrememnting the cursor in the handleLengthEncoding function? - Resize DB

    [length,cursor] = handleLengthEncoding(data,cursor); //size of the hashtable ~ I can use this in the future to get to the next hasttable when i am done parsing the current one
    [length,cursor] = handleLengthEncoding(data,cursor); // size of the expiry hash table

    //traverse the entries in a single database
    while(data[cursor] != OPCODES.EOF) {
        console.log(cursor)
        if (data[cursor] == OPCODES.EXPIRETIME) {
            cursor++;
            cursor+=4;
        } else if (data[cursor] == OPCODES.EXPIRETIMEMS) {
            cursor++;
            cursor+=8;
        }
        // skip 1 byte for flag 
        cursor++;

        // notice he does not do the bit manipulation here to check how many bytes the element
        // that stores the key is ( first cursor + 1 increment ). He just increments the cursor by 1 assuming 
        // that the key will be some 2-4 letter string as stated in the prob statement
        const redisKeyLength = data[cursor]; 
        const redisKey = data.subarray(cursor + 1, cursor + 1 + redisKeyLength).toString();
        // advance past the byte that stores the key length and the key itself
        cursor += redisKeyLength + 1;
        // now parse the value
        const redisValueLength = data[cursor];
        const redisValue = data.subarray(cursor + 1, cursor + 1 + redisValueLength).toString();
        //advance past the byte that stores the value length and the value itself - this is the end of the current key value pair
        cursor += redisValueLength + 1;
        redisPairs.set(redisKey, redisValue);
    }
    return redisPairs;
}

module.exports = {  getKeysValues };