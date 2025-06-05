 // figma-structure-parser.mjs
import fs from 'fs';

function simplify(node) {
  const { name, type, absoluteBoundingBox, children } = node;
  const result = { type };
  if (name) result.name = name;
  if (absoluteBoundingBox) result.layout = absoluteBoundingBox;
  if (children && Array.isArray(children) && children.length > 0) {
    result.children = children.map(simplify);
  }
  return result;
}

function main() {
  const data = JSON.parse(fs.readFileSync('reference-frame.json', 'utf8'));
  const nodeId = Object.keys(data.nodes)[0];
  const document = data.nodes[nodeId].document;
  const simplified = simplify(document);
  fs.writeFileSync('reference-structure.json', JSON.stringify(simplified, null, 2), 'utf8');
  console.log('Saved simplified structure to reference-structure.json');
}

main();