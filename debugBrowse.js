const opcua = require('node-opcua');
const setup = require('./opcua/namespace').setupNamespace;
const server = new opcua.OPCUAServer({ port: 4334, resourcePath: '/opcua' });

function printMethods(node) {
  const proto = Object.getPrototypeOf(node);
  const methods = Object.getOwnPropertyNames(proto).filter((n) => typeof node[n] === 'function');
  console.log(' methods', methods.sort());
}

server.initialize(() => {
  const ns = server.engine.addressSpace.registerNamespace('http://example.com/simulator');
  console.log('namespace index', ns.index);
  console.log('has addFolder', typeof ns.addFolder);
  console.log('has addObject', typeof ns.addObject);
  console.log('has addVariable', typeof ns.addVariable);
  setup(server, ns);
  const objects = server.engine.addressSpace.rootFolder.objects;
  console.log('objects browseName', objects.browseName.toString(), 'nodeId', objects.nodeId.toString());
  printMethods(objects);
  const cnc = server.engine.addressSpace.findNode('ns=2;s=CNC_Machine');
  console.log('CNC_Machine', cnc ? cnc.browseName.toString() : 'missing');
  if (cnc) {
    printMethods(cnc);
    const br = server.engine.addressSpace.browseSingleNode(cnc.nodeId, {
      browseDirection: opcua.BrowseDirection.Forward,
      referenceTypeId: 'Organizes',
      includeSubtypes: true,
      nodeClassMask: 0,
      resultMask: 0x3f,
    });
    console.log('CNC_Machine browseSingleNode', br.references ? br.references.map(r => ({ browseName: r.browseName.toString(), nodeId: r.nodeId.toString(), referenceTypeId: r.referenceTypeId.toString() })) : 'none');
  }
  server.shutdown(0, () => {});
});
