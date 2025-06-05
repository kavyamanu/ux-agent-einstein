const fs = require('fs');

function walk(node, depth = 0) {
  const indent = '  '.repeat(depth);
  const { name, type, absoluteBoundingBox, children } = node;
  if (name || type) {
    console.log(
      `${indent}- ${type}${name ? `: "${name}"` : ''}${
        absoluteBoundingBox
          ? ` [x:${absoluteBoundingBox.x}, y:${absoluteBoundingBox.y}, w:${absoluteBoundingBox.width}, h:${absoluteBoundingBox.height}]`
          : ''
      }`
    );
  }
  if (children && Array.isArray(children)) {
    children.forEach(child => walk(child, depth + 1));
  }
}

function main() {
  const data = JSON.parse(fs.readFileSync('reference-frame.json', 'utf8'));
  // The node tree is under data.nodes[<nodeId>].document
  const nodeId = Object.keys(data.nodes)[0];
  const document = data.nodes[nodeId].document;
  console.log('Figma Frame Structure:');
  walk(document);
}

main();