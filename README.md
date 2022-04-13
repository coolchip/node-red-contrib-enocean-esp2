## node-red-contrib-enocean-esp2
[![npm version](https://badge.fury.io/js/node-red-contrib-enocean-esp2.svg)](https://badge.fury.io/js/node-red-contrib-enocean-esp2)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)](https://github.com/coolchip/node-red-contrib-enocean-esp2)

#### Node-RED Node, that reads and parses the data from a enocean esp2 bus (f.ex. Eltako).

This work depends on the enocean-esp2 Module ([node-enocean-esp2@github](https://github.com/coolchip/node-enocean-esp2) and [enocean-esp2@npm](https://www.npmjs.com/package/enocean-esp2)).

### Install
Just run
```
    npm install node-red-contrib-enocean-esp2
```

### How to use
Connect to your bus system via serial connection and configure the enocean-esp2 node.

### Example
```text
[{"id":"947b7aa99d1d3245","type":"enocean-esp2 in","z":"9b96a3bb13d17436","name":"eltako bus","datasource":"eb7ca5ea.f88618","x":160,"y":380,"wires":[["71bf1fdd8c725128"]]},{"id":"0e3be4e7953b6a1e","type":"debug","z":"9b96a3bb13d17436","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"false","x":470,"y":380,"wires":[]},{"id":"aa8ca5d71a50db41","type":"enocean-esp2 out","z":"9b96a3bb13d17436","name":"eltako bus","datasource":"eb7ca5ea.f88618","x":510,"y":240,"wires":[]},{"id":"71bf1fdd8c725128","type":"function","z":"9b96a3bb13d17436","name":"format","func":"msg.payload = {\n    date: new Date().toISOString(),\n    headerId: msg.payload.headerId,\n    transmitter: msg.payload.transmitterId,\n    PR: msg.payload.PR,\n    valid: msg.payload.valid\n};\nreturn msg;\n","outputs":1,"noerr":0,"initialize":"","finalize":"","libs":[],"x":310,"y":380,"wires":[["0e3be4e7953b6a1e"]]},{"id":"49bd2f6b050f6006","type":"function","z":"9b96a3bb13d17436","name":"EG","func":"const up =  Buffer.from('a55a0b05100000000000122f3091', 'hex');\nconst down =  Buffer.from('a55a0b05700000000000123030f2', 'hex');\n\nconst payload = msg.payload === true ? up : down;\nnode.send({\n    payload\n});\n","outputs":1,"noerr":0,"x":350,"y":200,"wires":[["aa8ca5d71a50db41"]]},{"id":"6638ee2db53094f9","type":"inject","z":"9b96a3bb13d17436","name":"HOCH","props":[{"p":"payload","v":"true","vt":"bool"},{"p":"topic","v":"","vt":"string"}],"repeat":"","crontab":"","once":false,"onceDelay":"","topic":"","payload":"true","payloadType":"bool","x":170,"y":200,"wires":[["49bd2f6b050f6006"]]},{"id":"0ebc8e3618d418ae","type":"inject","z":"9b96a3bb13d17436","name":"RUNTER","props":[{"p":"payload","v":"false","vt":"bool"},{"p":"topic","v":"","vt":"string"}],"repeat":"","crontab":"","once":false,"onceDelay":"","topic":"","payload":"false","payloadType":"bool","x":180,"y":240,"wires":[["49bd2f6b050f6006"]]},{"id":"eb7ca5ea.f88618","type":"enocean-esp2-connection","sourcetype":"serial","serialport":"/dev/ttyEltako","serialbaud":"57600","databits":"8","parity":"none","stopbits":"1","filepath":"/dev/null"}]
```
