module.exports = function (RED) {
    'use strict';

    function EnoceanEsp2ConnectionNode(n) {
        RED.nodes.createNode(this, n);
        this.serialport = n.serialport;
        this.serialbaud = parseInt(n.serialbaud) || 57600;
        this.databits = parseInt(n.databits) || 8;
        this.parity = n.parity || 'none';
        this.stopbits = parseInt(n.stopbits) || 1;
        this.hostname = n.hostname || 'localhost';
        this.hostport = n.hostport || 80;
        this.filepath = n.filepath || '';
    }
    RED.nodes.registerType('enocean-esp2-connection', EnoceanEsp2ConnectionNode);

    RED.httpAdmin.get('/serialports', RED.auth.needsPermission('serial.read'), function (req, res) {
        const serialport = require('serialport');
        serialport.list(function (err, ports) {
            if (err) return console.log(err);
            res.json(ports);
        });
    });
};