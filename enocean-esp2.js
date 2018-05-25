'use strict';

const enocean = require('enocean-esp2');
const serialport = require('serialport');

const syncBytes = Buffer.from([0xa5, 0x5a]);
let intBuffer = Buffer.alloc(0);

const processChunk = function (callback) {
    // find start sequence
    const syncIndex = intBuffer.indexOf(syncBytes);
    if (syncIndex === -1) return callback();

    // read header behind sync bytes and read telegram length
    const header = intBuffer.readUInt8(syncIndex + syncBytes.length);
    const telegramLength = header & 0x1f;

    // slice complete telegramm
    const lengthSyncAndHeader = syncBytes.length + 1;
    if (this.intBuffer.length >= syncIndex + lengthSyncAndHeader + telegramLength) {
        const processingBuffer = intBuffer.slice(syncIndex, telegramLength + lengthSyncAndHeader);
        const parsed = enocean(processingBuffer);
        callback(null, parsed);
        intBuffer = intBuffer.slice(syncIndex + telegramLength + lengthSyncAndHeader, intBuffer.length);
        processChunk(callback);
    } else {
        return callback();
    }
};

module.exports = function (RED) {
    function EnoceanEsp2Node(config) {
        function sendData(err, result) {
            if (err) {
                return RED.log.error(`enocean-esp2 error: ${err}`);
            }
            const msg = {
                payload: result
            };
            node.send(msg);
        }

        RED.nodes.createNode(this, config);
        const node = this;

        node.enoceanDatasource = RED.nodes.getNode(config.datasource);
        if (node.enoceanenoceanDatasource) {
            const options = {
                'transportSerialPort': node.enoceanenoceanDatasource.serialport,
                'transportSerialBaudrate': node.enoceanenoceanDatasource.serialbaud,
                'transportSerialDataBits': node.enoceanenoceanDatasource.databits,
                'transportSerialStopBits': node.enoceanenoceanDatasource.stopbits,
                'transportSerialParity': node.enoceanenoceanDatasource.parity,
                'transportLocalFilePath': node.enoceanenoceanDatasource.filepath
            };

            const port = new serialport(options.transportSerialPort, {
                baudRate: options.transportSerialBaudrate
            });

            port.on('error', function (err) {
                RED.log.error(`enocean-esp2 error: ${err.message}`);
            });

            port.on('data', function (data) {
                const totalLength = intBuffer.length + data.length;
                this.intBuffer = Buffer.concat([this.intBuffer, data], totalLength);
                this.processChunk(sendData);
            });

            node.on('close', function () {
                port.close();
            });
        }
    }
    RED.nodes.registerType('enocean-esp2', EnoceanEsp2Node);
};