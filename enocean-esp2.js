'use strict';

const enocean = require('enocean-esp2');
const serialport = require('serialport');
const events = require('events');

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

    const settings = RED.settings;

    function EnoceanEsp2InNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

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

        node.enoceanDatasource = RED.nodes.getNode(config.datasource);
        if (node.enoceanDatasource) {
            node.port = serialPool.get(this.enoceanDatasource.serialport,
                this.enoceanDatasource.serialbaud,
                this.enoceanDatasource.databits,
                this.enoceanDatasource.parity,
                this.enoceanDatasource.stopbits);

            node.port.on('error', function (err) {
                return RED.log.error(`enocean-esp2 error: serialport: ${err}`);
            });

            node.port.on('data', function (data) {
                const totalLength = intBuffer.length + data.length;
                intBuffer = Buffer.concat([intBuffer, data], totalLength);
                processChunk(sendData);
            });

            node.port.on('ready', function () {
                node.status({
                    fill: 'green',
                    shape: 'dot',
                    text: 'node-red:common.status.connected'
                });
            });

            node.port.on('closed', function () {
                node.status({
                    fill: 'red',
                    shape: 'ring',
                    text: 'node-red:common.status.not-connected'
                });
            });
        } else {
            this.error(RED._('enocean-esp2.errors.missing-conf'));
        }
        node.on('close', function (done) {
            if (node.enoceanDatasource) {
                serialPool.close(node.enoceanDatasource.serialport, done);
            } else {
                done();
            }
        });
    }
    RED.nodes.registerType('enocean-esp2 in', EnoceanEsp2InNode);


    function EnoceanEsp2OutNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.enoceanDatasource = RED.nodes.getNode(config.datasource);
        if (node.enoceanDatasource) {
            node.port = serialPool.get(this.enoceanDatasource.serialport,
                this.enoceanDatasource.serialbaud,
                this.enoceanDatasource.databits,
                this.enoceanDatasource.parity,
                this.enoceanDatasource.stopbits);
            node.addCh = '';

            node.on('input', function (msg) {
                if (msg.hasOwnProperty('payload')) {
                    let payload = msg.payload;
                    if (!Buffer.isBuffer(payload)) {
                        if (typeof payload === 'object') {
                            payload = JSON.stringify(payload);
                        } else {
                            payload = payload.toString();
                        }
                        if (node.out === 'char') {
                            payload += node.addCh;
                        }
                    } else if ((node.addCh !== '') && (node.out === 'char')) {
                        payload = Buffer.concat([payload, new Buffer(node.addCh)]);
                    }
                    node.port.write(payload, function (err) {
                        if (err) {
                            const errmsg = err.toString().replace('Serialport', 'Serialport ' + node.port.serial.path);
                            node.error(errmsg, msg);
                        }
                    });
                }
            });

            node.port.on('ready', function () {
                node.status({
                    fill: 'green',
                    shape: 'dot',
                    text: 'node-red:common.status.connected'
                });
            });

            node.port.on('closed', function () {
                node.status({
                    fill: 'red',
                    shape: 'ring',
                    text: 'node-red:common.status.not-connected'
                });
            });
        } else {
            this.error(RED._('enocean-esp2.errors.missing-conf'));
        }

        this.on('close', function (done) {
            if (this.enoceanDatasource) {
                serialPool.close(this.enoceanDatasource.serialport, done);
            } else {
                done();
            }
        });
    }
    RED.nodes.registerType('enocean-esp2 out', EnoceanEsp2OutNode);


    const serialPool = (function () {
        const connections = {};
        return {
            get: function (port, baud, databits, parity, stopbits) {
                const id = port;
                if (!connections[id]) {
                    connections[id] = (function () {
                        const obj = {
                            _emitter: new events.EventEmitter(),
                            serial: null,
                            _closing: false,
                            tout: null,
                            on: function (a, b) {
                                this._emitter.on(a, b);
                            },
                            close: function (cb) {
                                this.serial.close(cb);
                            },
                            write: function (m, cb) {
                                this.serial.write(m, cb);
                            },
                        };
                        let olderr = '';
                        const setupSerial = function () {
                            obj.serial = new serialport(port, {
                                baudRate: baud,
                                dataBits: databits,
                                parity: parity,
                                stopBits: stopbits,
                                //parser: serialp.parsers.raw,
                                autoOpen: true
                            }, function (err) {
                                if (err) {
                                    if (err.toString() !== olderr) {
                                        olderr = err.toString();
                                        RED.log.error(RED._('enocean-esp2.errors.error', {
                                            port: port,
                                            error: olderr
                                        }));
                                    }
                                    obj.tout = setTimeout(function () {
                                        setupSerial();
                                    }, settings.serialReconnectTime);
                                }
                            });
                            obj.serial.on('error', function (err) {
                                RED.log.error(RED._('enocean-esp2.errors.error', {
                                    port: port,
                                    error: err.toString()
                                }));
                                obj._emitter.emit('closed');
                                obj.tout = setTimeout(function () {
                                    setupSerial();
                                }, settings.serialReconnectTime);
                            });
                            obj.serial.on('close', function () {
                                if (!obj._closing) {
                                    RED.log.error(RED._('enocean-esp2.errors.unexpected-close', {
                                        port: port
                                    }));
                                    obj._emitter.emit('closed');
                                    obj.tout = setTimeout(function () {
                                        setupSerial();
                                    }, settings.serialReconnectTime);
                                }
                            });
                            obj.serial.on('open', function () {
                                olderr = '';
                                RED.log.info(RED._('enocean-esp2.onopen', {
                                    port: port,
                                    baud: baud,
                                    config: databits + '' + parity.charAt(0).toUpperCase() + stopbits
                                }));
                                if (obj.tout) {
                                    clearTimeout(obj.tout);
                                }
                                obj._emitter.emit('ready');
                            });
                            obj.serial.on('data', function (d) {
                                obj._emitter.emit('data', d);
                            });
                            obj.serial.on('disconnect', function () {
                                RED.log.error(RED._('enocean-esp2.errors.disconnected', {
                                    port: port
                                }));
                            });
                        };
                        setupSerial();
                        return obj;
                    }());
                }
                return connections[id];
            },
            close: function (port, done) {
                if (connections[port]) {
                    if (connections[port].tout != null) {
                        clearTimeout(connections[port].tout);
                    }
                    connections[port]._closing = true;
                    try {
                        connections[port].close(function () {
                            RED.log.info(RED._('enocean-esp2.errors.closed', {
                                port: port
                            }));
                            done();
                        });
                    } catch (err) {
                        RED.log.error(err);
                    }
                    delete connections[port];
                } else {
                    done();
                }
            }
        };
    }());
};