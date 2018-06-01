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
    try {
        const header = intBuffer.readUInt8(syncIndex + syncBytes.length);
        const telegramLength = header & 0x1f;

        // slice complete telegramm
        const lengthSyncAndHeader = syncBytes.length + 1;
        if (intBuffer.length >= syncIndex + lengthSyncAndHeader + telegramLength) {
            const processingBuffer = intBuffer.slice(syncIndex, telegramLength + lengthSyncAndHeader);
            const parsed = enocean(processingBuffer);
            callback(null, parsed);
            intBuffer = intBuffer.slice(syncIndex + telegramLength + lengthSyncAndHeader, intBuffer.length);
            processChunk(callback);
        } else {
            return callback();
        }
    } catch (e) {
        return callback(e);
    }
};

module.exports = function (RED) {
    function EnoceanEsp2Node(config) {
        function sendData(err, result) {
            if (err) {
                return RED.log.error(`enocean-esp2 error: ${err}`);
            }
            if (result) {
                const msg = {
                    payload: result
                };
                return node.send(msg);
            }
        }

        RED.nodes.createNode(this, config);
        const node = this;

        node.enoceanDatasource = RED.nodes.getNode(config.datasource);
        if (node.enoceanDatasource) {
            const options = {
                'transportSerialPort': node.enoceanDatasource.serialport,
                'transportSerialBaudrate': node.enoceanDatasource.serialbaud,
                'transportSerialDataBits': node.enoceanDatasource.databits,
                'transportSerialStopBits': node.enoceanDatasource.stopbits,
                'transportSerialParity': node.enoceanDatasource.parity,
                'transportLocalFilePath': node.enoceanDatasource.filepath
            };

            const port = new serialport(options.transportSerialPort, {
                baudRate: options.transportSerialBaudrate
            });

            port.on('error', function (err) {
                return RED.log.error(`enocean-esp2 error: serialport: ${err}`);
            });

            port.on('data', function (data) {
                const totalLength = intBuffer.length + data.length;
                intBuffer = Buffer.concat([intBuffer, data], totalLength);
                processChunk(sendData);
            });

            node.on('close', function () {
                port.close();
            });
        }
    }
    RED.nodes.registerType('enocean-esp2', EnoceanEsp2Node);
};